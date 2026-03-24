import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SearchPage from './components/SearchPage'
import CoursePage from './components/CoursePage'
import type { CourseDetail } from './types'

export default function App() {
  const [course, setCourse] = useState<CourseDetail | null>(null)

  return (
    <AnimatePresence mode="wait">
      {course ? (
        <motion.div key="course"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <CoursePage course={course} onBack={() => setCourse(null)} />
        </motion.div>
      ) : (
        <motion.div key="search"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <SearchPage onSelect={setCourse} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
