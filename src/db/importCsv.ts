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

function pickFirst(row: Record<string, string>, ...cols: string[]): string | null {
    for (const col of cols) {
        const v = row[col]?.trim()
        if (v && v !== 'None' && v !== 'No data') return v
    }
    return null
}

function binaryToText(row: Record<string, string>, map: [string, string][]): string | null {
    for (const [col, label] of map) {
        if (row[col] === '1') return label
    }
    return null
}

function binaryToList(row: Record<string, string>, map: [string, string][]): string[] {
    return map.filter(([col]) => row[col] === '1').map(([, label]) => label)
}

// Parse the individual binary slot columns, e.g. "F4A (Spring, Tues 13-17)" = 1
const SLOT_REGEX = /^([EF]\d+[AB]?) \((Spring|Autumn), (Mon|Tues|Wed|Thurs|Fri) (\d+)-(\d+)\)$/
const SLOT_DAY_LONG: Record<string, string> = {
    Mon: 'Monday', Tues: 'Tuesday', Wed: 'Wednesday', Thurs: 'Thursday', Fri: 'Friday',
}

function buildScheduleSlots(row: Record<string, string>) {
    const slots: { code: string; season: string; day: string; start: number; end: number }[] = []
    for (const [col, val] of Object.entries(row)) {
        if (val !== '1') continue
        const m = col.match(SLOT_REGEX)
        if (!m) continue
        slots.push({ code: m[1], season: m[2], day: SLOT_DAY_LONG[m[3]] ?? m[3], start: parseInt(m[4]), end: parseInt(m[5]) })
    }
    return slots.length > 0 ? slots : null
}

function buildInfo(row: Record<string, string>) {
    return {
        ects:                  toNum(row['ECTS_POINTS']) || null,
        language:              binaryToText(row, [['Danish', 'Danish'], ['English', 'English']]),
        gradeType:             binaryToText(row, [['SEVEN_STEP_SCALE', '7-step'], ['PASS_OR_FAIL', 'Pass/Fail']]),
        examType:              binaryToList(row, [['Written exam', 'Written exam'], ['Oral exam', 'Oral exam'], ['Report hand-in', 'Report hand-in']]),
        examAid:               binaryToText(row, [['All aid', 'All aid'], ['No computers', 'No computers'], ['No aid', 'No aid']]),
        assignments:           binaryToList(row, [
                                   ['Mandatory reports', 'Mandatory reports'],
                                   ['Mandatory exercises', 'Mandatory exercises'],
                                   ['Mandatory experiments', 'Mandatory experiments'],
                               ]),
        campus:                binaryToList(row, [['CAMPUS_LYNGBY', 'Lyngby'], ['CAMPUS_BALLERUP', 'Ballerup']]),
        courseType:            binaryToList(row, [['BSc', 'BSc'], ['Ph.D.', 'Ph.D.']]),
        schedule:              pickFirst(row, 'TIMETABLE_PLACEMENT'),
        scheduleSlots:         buildScheduleSlots(row),
        semesterPeriod:        pickFirst(row, 'SEMESTER_PERIOD'),
        duration:              pickFirst(row, 'COURSE_DURATION'),
        description:           pickFirst(row, 'COURSE_DESCRIPTION'),
        learningObjectives:    pickFirst(row, 'LEARNING_OBJECTIVES'),
        content:               pickFirst(row, 'COURSE_CONTENT'),
        remarks:               pickFirst(row, 'REMARKS'),
        prerequisites:         pickFirst(row, 'RECOMMENDED_PREREQUISITES'),
        mandatoryPrerequisites: pickFirst(row, 'MANDATORY_PREREQUISITES'),
        department:            pickFirst(row, 'DEPARTMENT_RESPONSIBLE'),
        responsibleName:       pickFirst(row, 'MAIN_RESPONSIBLE_NAME'),
        scopeAndForm:          pickFirst(row, 'SCOPE_AND_FORM'),
        homePage:              pickFirst(row, 'HOME_PAGE'),
    }
}

function evalScore(row: Record<string, string>, col: string): number | null {
    const v = parseFloat(row[col])
    return isNaN(v) ? null : v
}

function evalVotes(row: Record<string, string>, col: string): number | null {
    const v = parseInt(row[col], 10)
    return isNaN(v) ? null : v
}

function buildEvals(row: Record<string, string>) {
    const metric = (name: string) => ({
        score: evalScore(row, `${name}_AVERAGE_SCORE`),
        votes: evalVotes(row, `${name}_VOTES`),
    })
    const r = {
        learning:   metric('LEARNING'),
        motivation: metric('MOTIVATION'),
        feedback:   metric('FEEDBACK'),
        workload:   metric('WORKLOAD'),
        overall:    metric('RATING'),
    }
    // Return null if we have no eval data at all
    const hasData = Object.values(r).some(m => m.score !== null)
    return hasData ? r : null
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

        const info = buildInfo(row)
        const evals = buildEvals(row)

        // Upsert course
        await pool.query(
            `INSERT INTO courses (course_number, name, info, evals, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (course_number) DO UPDATE SET
                name       = EXCLUDED.name,
                info       = EXCLUDED.info,
                evals      = EXCLUDED.evals,
                updated_at = NOW()`,
            [courseNumber, name, info, evals]
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
