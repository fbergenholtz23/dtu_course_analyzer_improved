import { Router, Request, Response } from 'express'
import { sanitizeCookie } from '../utils/sanitize'
import { fetchCourse, fetchUrl } from '../scraper/fetchCourse'
import { getCourseLinks } from '../scraper/getCourseLinks'
import { parseCourse, parseCourseName } from '../scraper/parseCourse'
import { ScrapeResult } from '../types'

const router = Router()

// POST /api/grades
// Body: { cookie: string, courseNumbers: string[] }
router.post('/grades', async (req: Request, res: Response) => {
    try {
        const { cookie, courseNumbers } = req.body as { cookie: string; courseNumbers: string[] }

        if (!cookie || typeof cookie !== 'string') {
            res.status(400).json({ error: 'Missing session cookie' })
            return
        }
        if (!Array.isArray(courseNumbers) || courseNumbers.length === 0) {
            res.status(400).json({ error: 'Missing courseNumbers array' })
            return
        }

        const sessionCookie = sanitizeCookie(cookie)

        const results = await Promise.all(
            courseNumbers.map(async (courseNumber) => {
                const infoHtml = await fetchCourse(courseNumber, sessionCookie)
                const { gradeLinks } = getCourseLinks(infoHtml)

                if (gradeLinks.length === 0) {
                    return null
                }

                const name = parseCourseName(infoHtml, courseNumber)

                // Use the most recent grade link (last in list)
                const gradeHtml = await fetchUrl(gradeLinks[gradeLinks.length - 1], sessionCookie)
                return parseCourse(gradeHtml, courseNumber, name)
            })
        )

        const courseGrades = results.filter((r) => r !== null)

        const payload: ScrapeResult = {
            timeStamp: new Date(),
            courseGrades,
        }

        res.json(payload)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        res.status(500).json({ error: message })
    }
})

export default router
