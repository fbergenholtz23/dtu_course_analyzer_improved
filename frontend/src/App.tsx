import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import SearchPage from './components/SearchPage'
import CoursePage from './components/CoursePage'
import SchedulePlanner from './components/SchedulePlanner'
import type { CourseDetail } from './types'

type View = 'search' | 'course' | 'planner'

export default function App() {
  const [view, setView] = useState<View>('search')
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [light, setLight] = useState(() => localStorage.getItem('theme') === 'light')

  useEffect(() => {
    document.body.classList.toggle('light', light)
    localStorage.setItem('theme', light ? 'light' : 'dark')
  }, [light])

  function openCourse(c: CourseDetail) { setCourse(c); setView('course') }

  return (
    <>
      <button
        onClick={() => setLight(l => !l)}
        title={light ? 'Switch to dark mode' : 'Switch to light mode'}
        style={{
          position: 'fixed', top: 14, right: 20, zIndex: 999,
          background: 'none', border: '1px solid var(--border)',
          color: 'var(--text-muted)', borderRadius: 6,
          padding: '5px 10px', fontSize: 14, cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        {light ? '🌙' : '☀️'}
      </button>

      <AnimatePresence mode="wait">
        {view === 'course' && course ? (
          <motion.div key="course" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <CoursePage course={course} onBack={() => setView('search')} />
          </motion.div>
        ) : view === 'planner' ? (
          <motion.div key="planner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <SchedulePlanner onBack={() => setView('search')} />
          </motion.div>
        ) : (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <SearchPage onSelect={openCourse} onOpenPlanner={() => setView('planner')} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
