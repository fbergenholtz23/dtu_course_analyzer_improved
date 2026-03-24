import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CourseSearchResult, CourseDetail } from '../types'

interface Filters {
  languages: string[]
  departments: string[]
  seasons: string[]
}

interface Props {
  onSelect: (course: CourseDetail) => void
  onOpenPlanner: () => void
}

export default function SearchPage({ onSelect, onOpenPlanner }: Props) {
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('')
  const [department, setDepartment] = useState('')
  const [season, setSeason] = useState('')
  const [filters, setFilters] = useState<Filters>({ languages: [], departments: [], seasons: [] })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [results, setResults] = useState<CourseSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/filters')
      .then(r => r.json())
      .then(setFilters)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      if (language)   params.set('language', language)
      if (department) params.set('department', department)
      if (season)     params.set('season', season)

      if (!params.toString()) { setResults([]); return }

      setLoading(true)
      try {
        const res = await fetch(`/api/courses?${params}`)
        setResults(await res.json())
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [query, language, department, season])

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

  const activeFilters = [language, department, season].filter(Boolean).length

  const selectStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-sec)',
    padding: '8px 10px',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
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
            <span style={{ color: '#f10e0e' }}>DTU</span>
            <span style={{ color: 'var(--text)' }}> Courses</span>
          </div>
          <div style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 15 }}>
            Search 2,691 courses · 6 years of grade data
          </div>
          <button onClick={onOpenPlanner} style={{
            marginTop: 16, background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-muted)', borderRadius: 8, padding: '8px 20px',
            fontSize: 13, cursor: 'pointer',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            Schedule Planner →
          </button>
        </div>

        {/* Search box + filter button */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by course name or number…"
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                color: 'var(--text)',
                padding: '14px 16px',
                fontSize: 16,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {loading && (
              <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }}>
                …
              </div>
            )}
          </div>

          {/* Filter icon button */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            title="Filters"
            style={{
              position: 'relative',
              background: filtersOpen || activeFilters > 0 ? 'var(--surface-hover)' : 'var(--surface)',
              border: `1px solid ${filtersOpen || activeFilters > 0 ? 'var(--text-muted)' : 'var(--border)'}`,
              borderRadius: 10,
              color: activeFilters > 0 ? 'var(--text)' : 'var(--text-muted)',
              width: 48,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            {activeFilters > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                background: '#cc0000', color: '#fff', borderRadius: '50%',
                fontSize: 9, fontWeight: 700, width: 14, height: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                <select value={season} onChange={e => setSeason(e.target.value)} style={selectStyle}>
                  <option value="">All periods</option>
                  {filters.seasons.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select value={department} onChange={e => setDepartment(e.target.value)} style={selectStyle}>
                  <option value="">All institutes</option>
                  {filters.departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select value={language} onChange={e => setLanguage(e.target.value)} style={selectStyle}>
                  <option value="">All languages</option>
                  {filters.languages.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>

                {activeFilters > 0 && (
                  <button
                    onClick={() => { setLanguage(''); setDepartment(''); setSeason('') }}
                    style={{
                      background: 'none', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', borderRadius: 8,
                      padding: '8px 10px', fontSize: 12, cursor: 'pointer', flexShrink: 0,
                    }}
                    title="Clear filters"
                  >
                    ✕
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                overflow: 'hidden',
                marginTop: 10,
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
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                    color: 'var(--text-sec)',
                    padding: '12px 16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: 48 }}>
                    {r.course_number}
                  </span>
                  <span style={{ fontSize: 14 }}>{r.name}</span>
                  {selecting === r.course_number && (
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>loading…</span>
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
