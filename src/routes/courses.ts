import { Router, Request, Response } from 'express'
import { pool } from '../db/client'

const router = Router()

// Helper to read a query param as a string array (handles single value or array)
function asArray(val: unknown): string[] {
    if (!val) return []
    return [val].flat().map(v => String(v).trim()).filter(Boolean)
}

// GET /api/filters — distinct values for filter dropdowns
router.get('/filters', async (_req: Request, res: Response) => {
    const [langs, depts, periods] = await Promise.all([
        pool.query(`
            SELECT DISTINCT info->>'language' AS value
            FROM courses
            WHERE info IS NOT NULL
              AND info->>'language' IS NOT NULL
            ORDER BY value
        `),
        pool.query(`
            SELECT DISTINCT info->>'department' AS value
            FROM courses
            WHERE info IS NOT NULL
              AND info->>'department' IS NOT NULL
            ORDER BY value
        `),
        pool.query(`
            SELECT DISTINCT s->>'code' AS value
            FROM courses,
                 jsonb_array_elements(info->'scheduleSlots') AS s
            WHERE info IS NOT NULL
              AND jsonb_typeof(info->'scheduleSlots') = 'array'
              AND s->>'code' IS NOT NULL
            ORDER BY value
        `),
    ])
    res.json({
        languages:   langs.rows.map(r => r.value),
        departments: depts.rows.map(r => r.value),
        periods:     periods.rows.map(r => r.value),
    })
})

// GET /api/courses?q=&language=&department=&period=&occupied=<json>
// Each filter param can be repeated for multi-select (e.g. language=Danish&language=English)
router.get('/courses', async (req: Request, res: Response) => {
    const q           = (req.query.q as string ?? '').trim()
    const languages   = asArray(req.query.language)
    const departments = asArray(req.query.department)
    const periods     = asArray(req.query.period)
    const occupiedRaw = (req.query.occupied as string ?? '').trim()

    const hasQuery   = q !== ''
    const hasFilters = languages.length > 0 || departments.length > 0 || periods.length > 0 || occupiedRaw !== ''

    if (!hasQuery && !hasFilters) {
        res.json([])
        return
    }

    const conditions: string[] = []
    const params: unknown[] = []

    if (hasQuery) {
        params.push(`%${q}%`)
        conditions.push(`(course_number ILIKE $${params.length} OR name ILIKE $${params.length})`)
    }
    if (languages.length) {
        params.push(languages)
        conditions.push(`info->>'language' = ANY($${params.length})`)
    }
    if (departments.length) {
        params.push(departments)
        conditions.push(`info->>'department' = ANY($${params.length})`)
    }
    if (periods.length) {
        params.push(periods)
        conditions.push(`(
            jsonb_typeof(info->'scheduleSlots') = 'array'
            AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(info->'scheduleSlots') AS s
                WHERE s->>'code' = ANY($${params.length})
            )
        )`)
    }
    if (occupiedRaw) {
        let occupied: unknown
        try { occupied = JSON.parse(occupiedRaw) } catch { occupied = [] }
        params.push(JSON.stringify(occupied))
        conditions.push(`(
            jsonb_typeof(info->'scheduleSlots') != 'array'
            OR NOT EXISTS (
                SELECT 1
                FROM jsonb_array_elements(info->'scheduleSlots') AS s,
                     jsonb_array_elements($${params.length}::jsonb) AS o
                WHERE s->>'day' = o->>'day'
                  AND (s->>'start')::int < (o->>'end')::int
                  AND (s->>'end')::int   > (o->>'start')::int
            )
        )`)
    }

    const { rows } = await pool.query(
        `SELECT course_number, name
         FROM courses
         WHERE ${conditions.join(' AND ')}
         ORDER BY course_number
         LIMIT 50`,
        params
    )
    res.json(rows)
})

// GET /api/courses/:number
router.get('/courses/:number', async (req: Request, res: Response) => {
    const courseNumber = req.params.number

    const courseRes = await pool.query(
        `SELECT course_number, name, info, evals FROM courses WHERE course_number = $1`,
        [courseNumber]
    )
    if (courseRes.rows.length === 0) {
        res.status(404).json({ error: 'Course not found' })
        return
    }

    const snapshotsRes = await pool.query(
        `SELECT semester, average, pass_percentage, participants, distribution
         FROM grade_snapshots
         WHERE course_number = $1
         ORDER BY semester`,
        [courseNumber]
    )

    res.json({
        ...courseRes.rows[0],
        snapshots: snapshotsRes.rows.map(s => ({
            ...s,
            average: parseFloat(s.average),
            pass_percentage: parseFloat(s.pass_percentage),
            participants: parseInt(s.participants, 10),
        })),
    })
})

export default router
