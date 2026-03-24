import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { pool } from './client'

const CSV_DIR = path.join(__dirname, '../../dtu-course-browser-main/website/static/csv_files')

// Detect semester prefixes from column headers (e.g. "E24", "F25", "E23")
function detectSemesters(headers: string[]): string[] {
    const seen = new Set<string>()
    for (const h of headers) {
        const m = h.match(/^([EF]\d{2})_TOTAL_STUDENTS$/)
        if (m) seen.add(m[1])
    }
    return [...seen]
}

function toNum(val: string): number {
    const n = parseFloat(val)
    return isNaN(n) ? 0 : n
}

function toInt(val: string): number {
    const n = parseInt(val, 10)
    return isNaN(n) ? 0 : n
}

function buildDistribution(row: Record<string, string>, prefix: string) {
    return {
        '12':  toInt(row[`${prefix}_GRADE_12`]         ?? row['GRADE_12']         ?? '0'),
        '10':  toInt(row[`${prefix}_GRADE_10`]         ?? row['GRADE_10']         ?? '0'),
        '7':   toInt(row[`${prefix}_GRADE_7`]          ?? row['GRADE_7']          ?? '0'),
        '4':   toInt(row[`${prefix}_GRADE_4`]          ?? row['GRADE_4']          ?? '0'),
        '02':  toInt(row[`${prefix}_GRADE_02`]         ?? row['GRADE_02']         ?? '0'),
        '00':  toInt(row[`${prefix}_GRADE_00`]         ?? row['GRADE_00']         ?? '0'),
        '-3':  toInt(row[`${prefix}_GRADE_MINUS_3`]    ?? row['GRADE_MINUS_3']    ?? '0'),
        passed:    toInt(row[`${prefix}_PASSED`]       ?? row['PASSED']           ?? '0'),
        notPassed: toInt(row[`${prefix}_FAILED`]       ?? row['FAILED']           ?? '0'),
        absent:    toInt(row[`${prefix}_ABSENT`]       ?? row['ABSENT']           ?? '0'),
        sick: 0,
    }
}

// Convert CSV semester label (e.g. "E24") to a readable string ("Autumn-2024")
function formatSemester(label: string): string {
    const season = label[0] === 'E' ? 'Autumn' : 'Spring'
    const year = 2000 + parseInt(label.slice(1), 10)
    return `${season}-${year}`
}

async function importFile(filePath: string) {
    console.log(`Importing ${path.basename(filePath)}…`)
    const content = fs.readFileSync(filePath, 'utf-8')
    const rows: Record<string, string>[] = parse(content, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        trim: true,
    })

    if (rows.length === 0) return

    const semesters = detectSemesters(Object.keys(rows[0]))
    let courseCount = 0
    let snapshotCount = 0

    for (const row of rows) {
        const courseNumber = row['COURSE']?.trim()
        const name = row['NAME']?.trim()
        if (!courseNumber || !name) continue

        // Upsert course
        await pool.query(
            `INSERT INTO courses (course_number, name, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (course_number) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()`,
            [courseNumber, name]
        )
        courseCount++

        // Insert per-semester snapshots
        for (const sem of semesters) {
            const participants = toInt(row[`${sem}_TOTAL_STUDENTS`])
            if (participants === 0) continue // no data for this semester

            const average = toNum(row[`${sem}_AVERAGE_GRADE`])
            const passPercentage = toNum(row[`${sem}_PERCENT_PASSED`])
            const distribution = buildDistribution(row, sem)
            const semester = formatSemester(sem)

            await pool.query(
                `INSERT INTO grade_snapshots
                    (course_number, semester, average, pass_percentage, participants, distribution)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (course_number, semester) DO UPDATE SET
                    average         = EXCLUDED.average,
                    pass_percentage = EXCLUDED.pass_percentage,
                    participants    = EXCLUDED.participants,
                    distribution    = EXCLUDED.distribution`,
                [courseNumber, semester, average, passPercentage, participants, distribution]
            )
            snapshotCount++
        }
    }

    console.log(`  → ${courseCount} courses, ${snapshotCount} snapshots`)
}

async function importAll() {
    const files = fs.readdirSync(CSV_DIR)
        .filter(f => f.startsWith('extended_csv') && f.endsWith('.csv'))
        .sort()
        .map(f => path.join(CSV_DIR, f))

    console.log(`Found ${files.length} CSV files.\n`)
    for (const f of files) {
        await importFile(f)
    }

    console.log('\nImport complete.')
    await pool.end()
}

importAll().catch(err => {
    console.error('Import failed:', err)
    process.exit(1)
})
