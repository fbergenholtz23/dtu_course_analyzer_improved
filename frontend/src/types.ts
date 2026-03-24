export interface GradeDistribution {
  '-3': number
  '00': number
  '02': number
  '4': number
  '7': number
  '10': number
  '12': number
  absent: number
  sick: number
  passed: number
  notPassed: number
}

export interface GradeSnapshot {
  semester: string
  average: number
  pass_percentage: number
  participants: number
  distribution: GradeDistribution
}

export interface CourseSearchResult {
  course_number: string
  name: string
}

export interface CourseDetail extends CourseSearchResult {
  snapshots: GradeSnapshot[]
}
