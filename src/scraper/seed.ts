import axios from 'axios'
import * as cheerio from 'cheerio'
import { pool } from '../db/client'
import { getCourseLinks } from './getCourseLinks'
import { parseCourse, parseCourseName } from './parseCourse'

const BASE = 'https://kurser.dtu.dk'
const ARCHIVE_YEAR = '2024-2025'
const DELAY_MS = 300

// Cookie is only needed for fetching grade links + grade pages (karakterer.dtu.dk)
const COOKIE = process.env.COOKIE
if (!COOKIE) {
    console.error('Error: COOKIE environment variable is required.')
    console.error('Usage: COOKIE=your-session-id npm run seed')
    process.exit(1)
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPublic(url: string): Promise<string> {
    const res = await axios.get<string>(url, { timeout: 15000 })
    return res.data
}

async function fetchWithAuth(url: string): Promise<string> {
    const res = await axios.get<string>(url, {
        timeout: 15000,
        headers: { Cookie: `ASP.NET_SessionId=${COOKIE}` },
    })
    return res.data
}

// The archive is public — no cookie needed.
// Pages: /archive/2024-2025/coursecode/01 … 88, KU
async function discoverAllCourseNumbers(): Promise<string[]> {
    const prefixes = [
        ...Array.from({ length: 88 }, (_, i) => String(i + 1).padStart(2, '0')),
        'KU',
    ]

    const all: string[] = []
    for (const prefix of prefixes) {
        const url = `${BASE}/archive/${ARCHIVE_YEAR}/coursecode/${prefix}`
        try {
            const html = await fetchPublic(url)
            const $ = cheerio.load(html)
            $('a[href*="/course/"]').each((_, el) => {
                const href = $(el).attr('href') ?? ''
                // Links are like /course/2024-2025/02402 — extract the number
                const match = href.match(/\/course\/[\w-]+\/(\d+)$/)
                if (match) all.push(match[1])
            })
        } catch {
            // prefix doesn't exist — skip silently
        }
        await sleep(DELAY_MS)
        process.stdout.write(`  prefix ${prefix}: ${all.length} courses found\r`)
    }
    console.log()
    return [...new Set(all)]
}

function semesterFromUrl(url: string): string {
    const parts = url.split('/')
    return parts[parts.length - 1] ?? 'unknown'
}

async function seedCourse(courseNumber: string): Promise<void> {
    try {
        const infoHtml = await fetchWithAuth(`${BASE}/course/${courseNumber}/info`)
        const { gradeLinks } = getCourseLinks(infoHtml)
        if (gradeLinks.length === 0) return

        const name = parseCourseName(infoHtml, courseNumber) || courseNumber

        await pool.query(
            `INSERT INTO courses (course_number, name, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (course_number) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
            [courseNumber, name]
        )

        for (const link of gradeLinks) {
            const semester = semesterFromUrl(link)
            try {
                const gradeHtml = await fetchWithAuth(link)
                const grades = parseCourse(gradeHtml, courseNumber, name)
                await pool.query(
                    `INSERT INTO grade_snapshots
                        (course_number, semester, average, pass_percentage, participants, distribution)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (course_number, semester) DO UPDATE SET
                        average         = EXCLUDED.average,
                        pass_percentage = EXCLUDED.pass_percentage,
                        participants    = EXCLUDED.participants,
                        distribution    = EXCLUDED.distribution`,
                    [courseNumber, semester, grades.average, grades.passPercentage, grades.participants, grades.distribution]
                )
            } catch {
                // skip bad semester pages silently
            }
            await sleep(DELAY_MS)
        }

        console.log(`  ✓ ${courseNumber} — ${name} (${gradeLinks.length} semesters)`)
    } catch (err) {
        console.warn(`  ✗ ${courseNumber}: ${err instanceof Error ? err.message : err}`)
    }
}

async function seed() {
    console.log(`Discovering courses from archive ${ARCHIVE_YEAR}…`)
    const courseNumbers = await discoverAllCourseNumbers()
    console.log(`Found ${courseNumbers.length} courses.\n`)

    for (let i = 0; i < courseNumbers.length; i++) {
        process.stdout.write(`[${i + 1}/${courseNumbers.length}] `)
        await seedCourse(courseNumbers[i])
    }

    console.log('\nSeed complete.')
    await pool.end()
}

seed().catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
})
