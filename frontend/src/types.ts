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

export interface CourseInfo {
  ects: number | null
  language: string | null
  gradeType: string | null
  examType: string[]
  examAid: string | null
  assignments: string[]
  campus: string[]
  courseType: string[]
  schedule: string | null
  scheduleSlots: { code: string; season: string; day: string; start: number; end: number }[] | null
  semesterPeriod: string | null
  duration: string | null
  description: string | null
  learningObjectives: string | null
  content: string | null
  remarks: string | null
  prerequisites: string | null
  mandatoryPrerequisites: string | null
  department: string | null
  responsibleName: string | null
  scopeAndForm: string | null
  homePage: string | null
}

export interface EvalMetric {
  score: number | null
  votes: number | null
}

export interface CourseEvals {
  learning: EvalMetric
  motivation: EvalMetric
  feedback: EvalMetric
  workload: EvalMetric
  overall: EvalMetric
}

export interface CourseSearchResult {
  course_number: string
  name: string
}

export interface CourseDetail extends CourseSearchResult {
  snapshots: GradeSnapshot[]
  info: CourseInfo | null
  evals: CourseEvals | null
}
