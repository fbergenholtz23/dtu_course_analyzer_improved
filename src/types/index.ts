export interface CourseGrades {
    courseNumber: string
    name: string
    average: number
    passPercentage: number
    participants: number
    distribution: GradeDistribution
}

export interface GradeDistribution {
    "-3": number
    "00": number
    "02": number
    "4": number
    "7": number
    "10": number
    "12": number
    absent: number
    sick: number
    passed: number
    notPassed: number
}


export interface ScrapeResult {
    timeStamp: Date
    courseGrades: CourseGrades[]
}