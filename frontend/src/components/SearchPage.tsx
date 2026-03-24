import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CourseSearchResult, CourseDetail } from '../types'

interface Props {
  onSelect: (course: CourseDetail) => void
}

export default function SearchPage({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CourseSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/courses?q=${encodeURIComponent(query)}`)
        setResults(await res.json())
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [query])

  async function handleSelect(courseNumber: string) {
    setSelecting(courseNumber)
    try {
      const res = await fetch(`/api/courses/${courseNumber}`)
      const detail: CourseDetail = await res.json()
      onSelect(detail)
    } finally {
      setSelecting(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 560 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
            <span style={{ color: '#cc0000' }}>DTU</span>
            <span style={{ color: '#e6edf3' }}> Grades</span>
          </div>
          <div style={{ color: '#8b949e', marginTop: 8, fontSize: 15 }}>
            Search 2,691 courses · 6 years of grade data
          </div>
        </div>

        {/* Search box */}
        <div style={{ position: 'relative' }}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by course name or number…"
            style={{
              width: '100%',
              background: '#161b22',
              border: '1px solid #30363d',
              borderRadius: results.length > 0 ? '10px 10px 0 0' : 10,
              color: '#e6edf3',
              padding: '14px 16px',
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {loading && (
            <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#8b949e', fontSize: 13 }}>
              …
            </div>
          )}
        </div>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: '#161b22',
                border: '1px solid #30363d',
                borderTop: 'none',
                borderRadius: '0 0 10px 10px',
                overflow: 'hidden',
              }}
            >
              {results.map((r, i) => (
                <button
                  key={r.course_number}
                  onClick={() => handleSelect(r.course_number)}
                  disabled={selecting === r.course_number}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid #21262d',
                    color: '#c9d1d9',
                    padding: '12px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1c2128')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: 12, color: '#8b949e', fontFamily: 'monospace', minWidth: 48 }}>
                    {r.course_number}
                  </span>
                  <span style={{ fontSize: 14 }}>{r.name}</span>
                  {selecting === r.course_number && (
                    <span style={{ marginLeft: 'auto', color: '#8b949e', fontSize: 12 }}>loading…</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
