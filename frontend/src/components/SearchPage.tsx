import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CourseSearchResult, CourseDetail } from '../types'

interface FilterOptions {
  languages: string[]
  departments: string[]
  periods: string[]
}

interface Props {
  onSelect: (course: CourseDetail) => void
}

function AccordionFilter({ label, options, selected, onChange }: {
  label: string
  options: string[]
  selected: string[]
  onChange: (val: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [overflow, setOverflow] = useState<'hidden' | 'visible'>('hidden')

  function handleToggle() {
    if (open) { setOverflow('hidden'); setOpen(false) }
    else setOpen(true)
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <button
        onClick={handleToggle}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 0', color: 'var(--text-sec)',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600 }}>
          {label}
          {selected.length > 0 && (
            <span style={{
              marginLeft: 6, background: '#cc0000', color: '#fff',
              borderRadius: 10, fontSize: 12, fontWeight: 700, padding: '1px 7px',
            }}>{selected.length}</span>
          )}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', transition: 'transform 0.15s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            onAnimationComplete={() => { if (open) setOverflow('visible') }}
            style={{ overflow }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 15, maxHeight: 220, overflowY: 'auto' }}>
              {options.map(opt => {
                const active = selected.includes(opt)
                return (
                  <button key={opt} onClick={() => onChange(active ? selected.filter(v => v !== opt) : [...selected, opt])} style={{
                    background: active ? 'var(--text)' : 'none',
                    border: `1px solid ${active ? 'var(--text)' : 'var(--border)'}`,
                    color: active ? 'var(--bg)' : 'var(--text-sec)',
                    borderRadius: 6, padding: '5px 13px', fontSize: 15, cursor: 'pointer',
                  }}>
                    {opt}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SearchPage({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [periods, setPeriods] = useState<string[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ languages: [], departments: [], periods: [] })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [results, setResults] = useState<CourseSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeFilters = languages.length + departments.length + periods.length
  const [filterPanelOverflow, setFilterPanelOverflow] = useState<'hidden' | 'visible'>('hidden')

  useEffect(() => {
    fetch('/api/filters').then(r => r.json()).then(setFilterOptions).catch(() => {})
  }, [])

  const runSearch = useCallback(async () => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    languages.forEach(l => params.append('language', l))
    departments.forEach(d => params.append('department', d))
    periods.forEach(p => params.append('period', p))
    if (!params.toString()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/courses?${params}`)
      setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }, [query, languages, departments, periods])

  // Always keep a ref to the latest runSearch so debounce never calls a stale version
  const runSearchRef = useRef(runSearch)
  useEffect(() => { runSearchRef.current = runSearch }, [runSearch])

  // Auto-search on typing only when no filters active
  useEffect(() => {
    if (activeFilters > 0) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearchRef.current(), 250)
  }, [query, activeFilters])

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

  const filterBtnStyle: React.CSSProperties = {
    position: 'relative',
    background: filtersOpen || activeFilters > 0 ? 'var(--surface-hover)' : 'var(--surface)',
    border: `1px solid ${filtersOpen || activeFilters > 0 ? 'var(--text-muted)' : 'var(--border)'}`,
    borderRadius: 999,
    color: activeFilters > 0 ? 'var(--text)' : 'var(--text-muted)',
    width: 63, cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: '100%', maxWidth: 700 }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}>
          <div style={{ fontSize: 55, fontWeight: 800, letterSpacing: -1.5 }}>
            <span style={{ color: '#f10e0e' }}>DTU</span>
            <span style={{ color: 'var(--text)' }}> Courses</span>
          </div>
          <div style={{ color: 'var(--text-muted)', marginTop: 10, fontSize: 19 }}>
            Search 2,691 courses · 6 years of grade data
          </div>
        </div>

        {/* Search box + filter button */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', flex: 1  }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { if (debounceRef.current) clearTimeout(debounceRef.current); runSearch() } }}
              placeholder="Search by course name or number…"
              style={{
                width: '100%',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 999, color: 'var(--text)',
                padding: '18px 20px', fontSize: 20, outline: 'none', boxSizing: 'border-box',
              }}
            />
            {loading && (
              <div style={{ position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 16 }}>…</div>
            )}
          </div>

          {/* Filter button */}
          <button onClick={() => { if (filtersOpen) setFilterPanelOverflow('hidden'); setFiltersOpen(o => !o) }} title="Filters" style={filterBtnStyle}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            {activeFilters > 0 && (
              <span style={{
                position: 'absolute', top: 5, right: 5,
                background: '#cc0000', color: '#fff', borderRadius: '50%',
                fontSize: 10, fontWeight: 700, width: 15, height: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{activeFilters}</span>
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
              onAnimationComplete={() => { if (filtersOpen) setFilterPanelOverflow('visible') }}
              style={{ overflow: filterPanelOverflow }}
            >
              <div style={{
                marginTop: 10, padding: '0 20px 15px',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13,
              }}>
                <AccordionFilter label="Period"    options={filterOptions.periods}     selected={periods}     onChange={setPeriods} />
                <AccordionFilter label="Institute" options={filterOptions.departments} selected={departments} onChange={setDepartments} />
                <AccordionFilter label="Language"  options={filterOptions.languages}   selected={languages}   onChange={setLanguages} />

                <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                  {activeFilters > 0 && (
                    <button onClick={() => { setLanguages([]); setDepartments([]); setPeriods([]) }} style={{
                      flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: 10,
                      color: 'var(--text-muted)', padding: '11px', fontSize: 15, cursor: 'pointer',
                    }}>
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); runSearch() }}
                    style={{
                      flex: 1, background: 'var(--surface-hover)', border: '1px solid var(--border)',
                      borderRadius: 10, color: 'var(--text-sec)', padding: '11px',
                      fontSize: 16, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Search
                  </button>
                </div>
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
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 13, overflow: 'hidden', marginTop: 13,
              }}
            >
              {results.map((r, i) => (
                <button
                  key={r.course_number}
                  onClick={() => handleSelect(r.course_number)}
                  disabled={selecting === r.course_number}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                    color: 'var(--text-sec)', padding: '15px 20px', textAlign: 'left',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 15,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontSize: 15, color: 'var(--text-muted)', fontFamily: 'monospace', minWidth: 60 }}>
                    {r.course_number}
                  </span>
                  <span style={{ fontSize: 17 }}>{r.name}</span>
                  {selecting === r.course_number && (
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 15 }}>loading…</span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      <div style={{ textAlign: 'center', marginTop: 48, color: 'var(--text-muted)', fontSize: 12 }}>
        Made by Frederik Bergenholtz
      </div>
      </motion.div>
    </div>
  )
}
