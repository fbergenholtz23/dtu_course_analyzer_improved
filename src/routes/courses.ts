import { Router, Request, Response } from 'express'
import { pool } from '../db/client'

const router = Router()

// GET /api/filters — distinct values for filter dropdowns
router.get('/filters', async (_req: Request, res: Response) => {
    const [langs, depts, seasons] = await Promise.all([
        pool.query(`
            SELECT DISTINCT info->>'language' AS value
            FROM courses
            WHERE info->>'language' IS NOT NULL
            ORDER BY value
        `),
        pool.query(`
            SELECT DISTINCT info->>'department' AS value
            FROM courses
            WHERE info->>'department' IS NOT NULL
            ORDER BY value
        `),
        pool.query(`
            SELECT DISTINCT s->>'season' AS value
            FROM courses, jsonb_array_elements(info->'scheduleSlots') AS s
            WHERE info->'scheduleSlots' IS NOT NULL
            ORDER BY value
        `),
    ])
    res.json({
        languages: langs.rows.map(r => r.value),
        departments: depts.rows.map(r => r.value),
        seasons: seasons.rows.map(r => r.value),
    })
})

// GET /api/courses?q=&language=&department=&season=
router.get('/courses', async (req: Request, res: Response) => {
    const q          = (req.query.q          as string ?? '').trim()
    const language   = (req.query.language   as string ?? '').trim()
    const department = (req.query.department as string ?? '').trim()
    const season     = (req.query.season     as string ?? '').trim()

    const hasQuery   = q !== ''
    const hasFilters = language !== '' || department !== '' || season !== ''

    if (!hasQuery && !hasFilters) {
        res.json([])
        return
    }

    const conditions: string[] = []
    const params: string[] = []

    if (hasQuery) {
        params.push(`%${q}%`)
        conditions.push(`(course_number ILIKE $${params.length} OR name ILIKE $${params.length})`)
    }
    if (language) {
        params.push(language)
        conditions.push(`info->>'language' = $${params.length}`)
    }
    if (department) {
        params.push(department)
        conditions.push(`info->>'department' = $${params.length}`)
    }
    if (season) {
        params.push(season)
        conditions.push(`EXISTS (
            SELECT 1 FROM jsonb_array_elements(info->'scheduleSlots') AS s
            WHERE s->>'season' = $${params.length}
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
