import * as cheerio from 'cheerio'

export interface CourseLinks {
    gradeLinks: string[]
    reviewLinks: string[]
}

export function getCourseLinks(html: string): CourseLinks {
    const $ = cheerio.load(html)
    const gradeLinks: string[] = []
    const reviewLinks: string[] = []

    $('a').each((_, el) => {
        const href = $(el).attr('href') ?? ''
        if (href.includes('karakterer')) {
            gradeLinks.push(href.startsWith('http') ? href : `https://kurser.dtu.dk${href}`)
        } else if (href.includes('evaluering')) {
            reviewLinks.push(href.startsWith('http') ? href : `https://kurser.dtu.dk${href}`)
        }
    })

    return { gradeLinks, reviewLinks }
}
