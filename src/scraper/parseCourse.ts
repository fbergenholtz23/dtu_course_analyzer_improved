import * as cheerio from 'cheerio'
import { CourseGrades, GradeDistribution } from '../types'

// Maps the Danish grade labels on kurser.dtu.dk to our GradeDistribution keys
const GRADE_LABEL_MAP: Record<string, keyof GradeDistribution> = {
    '-3': '-3',
    '00': '00',
    '02': '02',
    '4': '4',
    '7': '7',
    '10': '10',
    '12': '12',
    'Bestået': 'passed',
    'Ikke bestået': 'notPassed',
    'Syge': 'sick',
    'Fraværende': 'absent',
}

export function parseCourseName(html: string, courseNumber: string): string {
    const $ = cheerio.load(html)

    // Grade link texts look like "02402 Statistik (Polyteknisk grundlag) v25"
    // Strip the leading course number and trailing semester token (e.g. "v25", "E25")
    let name = ''
    $('a').each((_, el) => {
        const href = $(el).attr('href') ?? ''
        if (!href.includes('karakterer')) return
        const text = $(el).text().trim()
        // Remove course number prefix then semester suffix
        const withoutNumber = text.replace(new RegExp(`^${courseNumber}\\s+`), '')
        const withoutSemester = withoutNumber.replace(/\s+[A-Za-z]\d+.*$/, '').trim()
        if (withoutSemester) {
            name = withoutSemester
            return false // break out of .each()
        }
    })
    return name
}

export function parseCourse(html: string, courseNumber: string, name?: string): CourseGrades {
    const $ = cheerio.load(html)
    const tables = $('table')

    // --- Summary stats from tables[0] ---
    // Row labels (Danish):
    //   "Antal tilmeldte" → registered count
    //   "Antal bestået"   → "401 (79 % af de tilmeldte, 86 % af de fremmødte)"
    //   "Eksamensgennemsnit" → average
    let participants = 0
    let passPercentage = 0
    let average = 0

    $(tables[0]).find('tr').each((_, row) => {
        const cells = $(row).find('td')
        if (cells.length < 2) return
        const label = $(cells[0]).text().trim().toLowerCase()
        const cellText = $(cells[1]).text().trim()

        if (label.includes('tilmeldte')) {
            participants = parseInt(cellText, 10) || 0
        } else if (label.includes('bestået')) {
            // Extract the first percentage in the cell, e.g. "79" from "(79 % af de tilmeldte...)"
            const match = cellText.match(/\(\s*(\d+)/)
            if (match) passPercentage = parseInt(match[1], 10)
        } else if (label.includes('gennemsnit')) {
            average = parseFloat(cellText.replace(',', '.')) || 0
        }
    })

    // --- Grade distribution from tables[2] ---
    const distribution: GradeDistribution = {
        '-3': 0, '00': 0, '02': 0, '4': 0,
        '7': 0, '10': 0, '12': 0,
        absent: 0, sick: 0, passed: 0, notPassed: 0,
    }

    $(tables[2]).find('tr').each((_, row) => {
        const cells = $(row).find('td')
        if (cells.length < 2) return
        const label = $(cells[0]).text().trim()
        const count = parseInt($(cells[1]).text().trim(), 10)
        if (isNaN(count)) return

        const key = GRADE_LABEL_MAP[label]
        if (key) distribution[key] = count
    })

    const resolvedName = name || $('h1').first().text().trim() || courseNumber

    return { courseNumber, name: resolvedName, average, passPercentage, participants, distribution }
}
