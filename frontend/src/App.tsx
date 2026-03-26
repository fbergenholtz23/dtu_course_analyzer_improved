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
      <div style={{ position: 'fixed', top: 16, right: 20, zIndex: 999, display: 'flex', gap: 8, alignItems: 'center' }}>
        {view === 'search' && (
          <button
            onClick={() => setView('planner')}
            title="Schedule Planner"
            style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text-muted)', borderRadius: 8,
              padding: '0 12px', cursor: 'pointer', lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 37, fontSize: 14, whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            Schedule Planner
          </button>
        )}
        <button
          onClick={() => setLight(l => !l)}
          title={light ? 'Switch to dark mode' : 'Switch to light mode'}
          style={{
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-muted)', borderRadius: 8,
            padding: 0, cursor: 'pointer', lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 37, height: 37,
          }}
        >
        {light ? (
          // Dark mode: show moon (dark, no fill)
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          // Light mode: show sun (bright, filled)
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
        </button>
      </div>

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
            <SearchPage onSelect={openCourse} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
