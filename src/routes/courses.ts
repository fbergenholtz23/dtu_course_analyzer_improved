import { Router, Request, Response } from 'express'
import { pool } from '../db/client'

const router = Router()

// GET /api/courses?q=searchterm
router.get('/courses', async (req: Request, res: Response) => {
    const q = (req.query.q as string ?? '').trim()
    if (!q) {
        res.json([])
        return
    }
    const { rows } = await pool.query(
        `SELECT course_number, name
         FROM courses
         WHERE course_number ILIKE $1 OR name ILIKE $1
         ORDER BY course_number
         LIMIT 20`,
        [`%${q}%`]
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
