import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CourseDetail, CourseSearchResult } from '../types'

function AccordionFilter({ label, options, selected, onChange }: {
  label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 0', color: 'var(--text-sec)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {label}
          {selected.length > 0 && (
            <span style={{
              marginLeft: 6, background: '#cc0000', color: '#fff',
              borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px',
            }}>{selected.length}</span>
          )}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 10 }}>
              {options.map(opt => {
                const active = selected.includes(opt)
                return (
                  <button key={opt} onClick={() => onChange(active ? selected.filter(v => v !== opt) : [...selected, opt])} style={{
                    background: active ? 'var(--text)' : 'none',
                    border: `1px solid ${active ? 'var(--text)' : 'var(--border)'}`,
                    color: active ? 'var(--bg)' : 'var(--text-sec)',
                    borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                  }}>{opt}</button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduleSlot {
  code?: string
  season?: string
  day: string
  start: number
  end: number
}

interface ScheduleSlotGroup {
  code?: string
  season?: string
  slots: ScheduleSlot[]
}

interface PlannedCourse extends CourseDetail {
  color: string
  selectedSlots: ScheduleSlot[]  // all slots for the chosen season/group
}

interface SeasonGroup {
  season?: string
  slots: ScheduleSlot[]
}

interface PendingCourse extends CourseDetail {
  color: string
  seasonGroups: SeasonGroup[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#06b6d4', '#10b981', '#f59e0b', '#6366f1',
  '#14b8a6', '#e11d48',
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const DAY_MAP: Record<string, string> = {
  Mon: 'Monday', Tues: 'Tuesday', Wed: 'Wednesday', Thurs: 'Thursday', Fri: 'Friday',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSchedule(schedule: string | null | undefined): ScheduleSlot[] {
  if (!schedule) return []
  const slots: ScheduleSlot[] = []
  const regex = /(Mon|Tues|Wed|Thurs|Fri)\s+(\d+)-(\d+)/g
  let m
  while ((m = regex.exec(schedule)) !== null) {
    slots.push({ day: DAY_MAP[m[1]], start: parseInt(m[2]), end: parseInt(m[3]) })
  }
  return slots
}

// Group slots by their schedule code.
// If both the A and B variants of a period are present (same season), they are merged
// into a single group under the base code (e.g. E5A + E5B → E5), because together they
// represent the full period. If only one variant is present, it is kept as-is.
// Slots without a code are grouped by season, or all together if no season either.
function groupSlots(slots: ScheduleSlot[]): ScheduleSlotGroup[] {
  // First pass: group by exact code
  const byCode = new Map<string, ScheduleSlotGroup>()
  for (const slot of slots) {
    const key = slot.code ?? slot.season ?? '__all__'
    if (!byCode.has(key)) {
      byCode.set(key, { code: slot.code, season: slot.season, slots: [] })
    }
    byCode.get(key)!.slots.push(slot)
  }

  // Second pass: merge XnA + XnB pairs when both exist and share the same season
  const result: ScheduleSlotGroup[] = []
  const consumed = new Set<string>()
  for (const [key, group] of byCode) {
    if (consumed.has(key)) continue
    const base = key.replace(/[AB]$/, '')
    if (base !== key) {
      const partner = key.endsWith('A') ? base + 'B' : base + 'A'
      const partnerGroup = byCode.get(partner)
      if (partnerGroup && partnerGroup.season === group.season) {
        result.push({ code: base, season: group.season, slots: [...group.slots, ...partnerGroup.slots] })
        consumed.add(key)
        consumed.add(partner)
        continue
      }
    }
    result.push(group)
    consumed.add(key)
  }
  return result
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
}

export default function SchedulePlanner({ onBack }: Props) {
  const [courses, setCourses] = useState<PlannedCourse[]>([])
  const [pending, setPending] = useState<PendingCourse | null>(null)
  const [query, setQuery] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [compatibleOnly, setCompatibleOnly] = useState(false)
  const [languages, setLanguages] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [periods, setPeriods] = useState<string[]>([])
  const [filterOptions, setFilterOptions] = useState<{ languages: string[]; departments: string[]; periods: string[] }>({ languages: [], departments: [], periods: [] })
  const [results, setResults] = useState<CourseSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/filters').then(r => r.json()).then(setFilterOptions).catch(() => {})
  }, [])

  const activeFilters = languages.length + departments.length + periods.length + (compatibleOnly ? 1 : 0)

  const runSearch = useCallback(async () => {
    const hasFilters = languages.length > 0 || departments.length > 0 || periods.length > 0 || compatibleOnly
    if (!query.trim() && !hasFilters) { setResults([]); return }
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set('q', query.trim())
      languages.forEach(l => params.append('language', l))
      departments.forEach(d => params.append('department', d))
      periods.forEach(p => params.append('period', p))
      if (compatibleOnly && courses.length > 0) {
        const occupied = courses.flatMap(c => c.selectedSlots ?? [])
        params.set('occupied', JSON.stringify(occupied))
      }
      const res = await fetch(`/api/courses?${params}`)
      setResults(await res.json())
    } finally {
      setLoading(false)
    }
  }, [query, languages, departments, periods, compatibleOnly, courses])

  const runSearchRef = useRef(runSearch)
  useEffect(() => { runSearchRef.current = runSearch }, [runSearch])

  // Auto-search on typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearchRef.current(), 250)
  }, [query])

  async function addCourse(courseNumber: string) {
    if (courses.some(c => c.course_number === courseNumber)) {
      setQuery(''); setResults([]); return
    }
    setAdding(courseNumber)
    try {
      const res = await fetch(`/api/courses/${courseNumber}`)
      const detail: CourseDetail = await res.json()
      const color = COLORS[courses.length % COLORS.length]
      const raw = detail.info?.scheduleSlots ?? parseSchedule(detail.info?.schedule)
      const slots: ScheduleSlot[] = raw.map(s => ({ ...s, day: DAY_MAP[s.day] ?? s.day }))
      const slotGroups = groupSlots(slots)

      // Group periods by season — if a course has F3A + F4B both in Spring,
      // they should all be added together, not presented as a choice.
      const bySeason = new Map<string, ScheduleSlot[]>()
      for (const group of slotGroups) {
        const key = group.season ?? '__none__'
        if (!bySeason.has(key)) bySeason.set(key, [])
        bySeason.get(key)!.push(...group.slots)
      }
      const seasonGroups: SeasonGroup[] = [...bySeason.entries()].map(([season, s]) => ({
        season: season === '__none__' ? undefined : season,
        slots: s,
      }))

      if (seasonGroups.length > 1) {
        // Course runs in multiple semesters — ask user to pick which semester
        setPending({ ...detail, color, seasonGroups })
      } else {
        // All periods are in the same semester — add all slots directly
        setCourses(prev => [...prev, { ...detail, color, selectedSlots: seasonGroups[0]?.slots ?? [] }])
      }
    } finally {
      setAdding(null)
      setQuery('')
      setResults([])
    }
  }

  function confirmSeason(group: SeasonGroup) {
    if (!pending) return
    setCourses(prev => [...prev, { ...pending, selectedSlots: group.slots }])
    setPending(null)
  }

  function removeCourse(courseNumber: string) {
    setCourses(prev => prev.filter(c => c.course_number !== courseNumber))
  }

  const specialCourses = courses.filter(c => !c.selectedSlots?.length)

  // Find courses that overlap with another course on the same day
  const overlappingCourseNumbers = new Set<string>()
  const scheduled = courses.filter(c => c.selectedSlots?.length)
  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      for (const a of scheduled[i].selectedSlots) {
        for (const b of scheduled[j].selectedSlots) {
          if (a.day === b.day && a.start < b.end && a.end > b.start) {
            overlappingCourseNumbers.add(scheduled[i].course_number)
            overlappingCourseNumbers.add(scheduled[j].course_number)
          }
        }
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 48 }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid var(--border)', padding: '16px 72px 16px 32px',
        display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)',
          padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}>
          ← Back
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
          <span style={{ color: '#cc0000' }}>DTU</span> Schedule Planner
        </span>

        {/* Inline search + filter */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'stretch', position: 'relative' }}>
        <div style={{ position: 'relative', width: 300 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { if (debounceRef.current) clearTimeout(debounceRef.current); setFiltersOpen(false); runSearch() } }}
            placeholder="Add a course…"
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: results.length > 0 ? '8px 8px 0 0' : 8,
              color: 'var(--text)', padding: '8px 12px', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {loading && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12 }}>…</span>
          )}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderTop: 'none', borderRadius: '0 0 8px 8px',
                  zIndex: 100, maxHeight: 240, overflowY: 'auto',
                }}
              >
                {results.map((r, i) => {
                  const already = courses.some(c => c.course_number === r.course_number)
                  return (
                    <button key={r.course_number} onClick={() => addCourse(r.course_number)}
                      disabled={already || adding === r.course_number}
                      style={{
                        width: '100%', background: 'none', border: 'none',
                        borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                        color: already ? 'var(--text-muted)' : 'var(--text-sec)',
                        padding: '10px 12px', textAlign: 'left', cursor: already ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                      }}
                      onMouseEnter={e => { if (!already) e.currentTarget.style.background = 'var(--surface-hover)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', minWidth: 44 }}>{r.course_number}</span>
                      <span>{r.name}</span>
                      {already && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>added</span>}
                      {adding === r.course_number && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>…</span>}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

          {/* Filter button */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            title="Filters"
            style={{
              position: 'relative',
              background: filtersOpen || activeFilters > 0 ? 'var(--surface-hover)' : 'var(--surface)',
              border: `1px solid ${filtersOpen || activeFilters > 0 ? 'var(--text-muted)' : 'var(--border)'}`,
              borderRadius: 8, color: activeFilters > 0 ? 'var(--text)' : 'var(--text-muted)',
              width: 34, flexShrink: 0, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            {activeFilters > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                background: '#cc0000', color: '#fff', borderRadius: '50%',
                fontSize: 8, fontWeight: 700, width: 12, height: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{activeFilters}</span>
            )}
          </button>

          {/* Filter dropdown panel */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -4 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '0 16px 12px', width: 300, zIndex: 200,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}
              >
                {/* Compatible toggle */}
                <button
                  onClick={() => setCompatibleOnly(o => !o)}
                  style={{
                    width: '100%', background: compatibleOnly ? '#22c55e18' : 'none',
                    border: `1px solid ${compatibleOnly ? '#22c55e66' : 'var(--border)'}`,
                    borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                    background: compatibleOnly ? '#22c55e' : 'none',
                    border: `2px solid ${compatibleOnly ? '#22c55e' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {compatibleOnly && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: compatibleOnly ? '#22c55e' : 'var(--text-sec)' }}>Compatible only</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Hide courses that overlap your schedule</div>
                  </div>
                </button>

                <AccordionFilter label="Period"    options={filterOptions.periods}     selected={periods}     onChange={setPeriods} />
                <AccordionFilter label="Institute" options={filterOptions.departments} selected={departments} onChange={setDepartments} />
                <AccordionFilter label="Language"  options={filterOptions.languages}   selected={languages}   onChange={setLanguages} />

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {(languages.length > 0 || departments.length > 0 || periods.length > 0) && (
                    <button
                      onClick={() => { setLanguages([]); setDepartments([]); setPeriods([]) }}
                      style={{
                        flex: 1, background: 'none', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text-muted)', padding: '8px', fontSize: 12, cursor: 'pointer',
                      }}
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); setFiltersOpen(false); runSearchRef.current() }}
                    style={{
                      flex: 1, background: 'var(--surface-hover)', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--text-sec)', padding: '8px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    Search
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 0' }}>

        {/* Added courses legend */}
        {courses.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {courses.map(c => (
              <div key={c.course_number} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--surface)', border: `1px solid ${overlappingCourseNumbers.has(c.course_number) ? '#f97316' : 'var(--border)'}`,
                borderRadius: 8, padding: '6px 10px',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{c.course_number}</span>
                <span style={{ fontSize: 13, color: 'var(--text-sec)' }}>{c.name}</span>
                {overlappingCourseNumbers.has(c.course_number) && (
                  <span style={{ fontSize: 11, color: '#f97316' }}>⚠ overlap</span>
                )}
                <button onClick={() => removeCourse(c.course_number)} style={{
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                  fontSize: 14, padding: '0 2px', lineHeight: 1,
                }}>×</button>
              </div>
            ))}
          </div>
        )}

        {/* Calendar */}
        {(() => {
          const HOUR_H = 52        // px per hour
          const START_H = 8        // first hour shown
          const maxCourseEnd = courses.flatMap(c => c.selectedSlots ?? []).reduce((max, s) => Math.max(max, s.end), 0)
          const END_H = Math.max(18, maxCourseEnd)  // at least 18, extends if a course runs later
          const TOTAL_H = (END_H - START_H) * HOUR_H
          const LABEL_W = 48
          const hours = Array.from({ length: END_H - START_H + 1 }, (_, i) => START_H + i)

          return (
            <div style={{ marginBottom: 32 }}>
              {/* Day headers */}
              <div style={{ display: 'flex', marginLeft: LABEL_W, marginBottom: 4 }}>
                {DAYS.map(day => (
                  <div key={day} style={{
                    flex: 1, textAlign: 'center', fontSize: 13,
                    fontWeight: 600, color: 'var(--text-muted)', paddingBottom: 8,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div style={{ display: 'flex' }}>
                {/* Hour labels */}
                <motion.div
                  animate={{ height: TOTAL_H }}
                  transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                  style={{ width: LABEL_W, flexShrink: 0, position: 'relative', overflow: 'visible' }}
                >
                  <AnimatePresence>
                    {hours.map(h => (
                      <motion.div
                        key={h}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{
                          position: 'absolute',
                          top: (h - START_H) * HOUR_H - 8,
                          right: 8,
                          fontSize: 11,
                          color: 'var(--text-muted)',
                          userSelect: 'none',
                        }}
                      >
                        {h}:00
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {/* Day columns */}
                <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                  {/* Horizontal hour lines spanning all columns */}
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    <AnimatePresence>
                      {hours.map(h => (
                        <motion.div
                          key={h}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{
                            position: 'absolute',
                            top: (h - START_H) * HOUR_H,
                            left: 0, right: 0,
                            borderTop: `1px solid ${h === START_H ? 'var(--border)' : 'var(--border-subtle)'}`,
                          }}
                        />
                      ))}
                    </AnimatePresence>
                    {/* Bottom border */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--border)' }} />
                  </div>

                  {DAYS.map((day, di) => {
                    // Expand to one entry per slot on this day (a course can have multiple)
                    const dayCourses = courses.flatMap(c =>
                      (c.selectedSlots ?? [])
                        .filter(s => s.day === day)
                        .map(slot => ({ ...c, slot }))
                    )

                    return (
                      <motion.div
                        key={day}
                        animate={{ height: TOTAL_H }}
                        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                          flex: 1,
                          position: 'relative',
                          overflow: 'hidden',
                          borderLeft: di === 0 ? '1px solid var(--border)' : '1px solid var(--border-subtle)',
                          borderRight: di === DAYS.length - 1 ? '1px solid var(--border)' : 'none',
                        }}
                      >
                        {dayCourses.map(({ slot, ...c }) => {
                          const top = (slot.start - START_H) * HOUR_H
                          const height = (slot.end - slot.start) * HOUR_H
                          const overlap = overlappingCourseNumbers.has(c.course_number)

                          return (
                            <motion.div
                              key={c.course_number + slot.start}
                              initial={{ opacity: 0, scaleY: 0.9 }}
                              animate={{ opacity: 1, scaleY: 1 }}
                              style={{
                                position: 'absolute',
                                top: top + 2,
                                left: 3,
                                right: 3,
                                height: height - 4,
                                background: c.color + '20',
                                borderLeft: `3px solid ${c.color}`,
                                border: overlap ? `1px solid #f9741688` : `1px solid ${c.color}44`,
                                borderLeftWidth: 3,
                                borderLeftColor: c.color,
                                borderRadius: 4,
                                padding: '5px 7px',
                                overflow: 'hidden',
                                cursor: 'default',
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 700, color: c.color, fontFamily: 'monospace' }}>
                                {c.course_number}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-sec)', lineHeight: 1.3, marginTop: 2 }} title={c.name}>
                                {c.name.length > 28 ? c.name.slice(0, 28) + '…' : c.name}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                                {slot.start}:00–{slot.end}:00
                              </div>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Special / unscheduled courses */}
        {specialCourses.length > 0 && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
              Special / unscheduled courses
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {specialCourses.map(c => (
                <div key={c.course_number} style={{
                  background: c.color + '22', border: `1px solid ${c.color}66`,
                  borderLeft: `3px solid ${c.color}`,
                  borderRadius: 6, padding: '8px 12px',
                }}>
                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: c.color }}>{c.course_number}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-sec)' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {c.info?.schedule ?? 'No schedule info'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {courses.length === 0 && !pending && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 80, fontSize: 14 }}>
            Search for courses above to build your schedule
          </div>
        )}
      </div>

      {/* Slot group picker modal */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 200,
            }}
            onClick={() => setPending(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                padding: 24, width: 400, maxWidth: '90vw',
              }}
            >
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'monospace' }}>
                {pending.course_number}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                {pending.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                This course is offered in multiple semesters — pick one:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pending.seasonGroups.map((group, i) => (
                  <button key={i} onClick={() => confirmSeason(group)} style={{
                    background: 'none', border: `1px solid ${pending.color}66`,
                    borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                    textAlign: 'left', color: 'var(--text-sec)',
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = pending.color + '18' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: pending.color, flexShrink: 0, marginTop: 4,
                    }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {group.season ? (
                          <span style={{
                            fontSize: 11, fontWeight: 500,
                            color: group.season === 'Spring' ? '#22c55e' : '#f97316',
                            background: group.season === 'Spring' ? '#22c55e18' : '#f9741618',
                            border: `1px solid ${group.season === 'Spring' ? '#22c55e44' : '#f9741644'}`,
                            borderRadius: 4, padding: '1px 6px',
                          }}>
                            {group.season}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-sec)' }}>No season info</span>
                        )}
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {group.slots.map((slot, si) => (
                          <div key={si} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {slot.code && <span style={{ fontFamily: 'monospace', marginRight: 4 }}>{slot.code}</span>}
                            {slot.day} · {slot.start}:00–{slot.end}:00
                          </div>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setPending(null)} style={{
                marginTop: 16, background: 'none', border: 'none',
                color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', width: '100%',
              }}>
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
