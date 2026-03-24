import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CourseDetail, CourseSearchResult } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlannedCourse extends CourseDetail {
  color: string
  selectedSlot: ScheduleSlot  // the single slot the user chose
}

interface PendingCourse extends CourseDetail {
  color: string
  slots: ScheduleSlot[]
}

interface ScheduleSlot {
  code?: string
  season?: string
  day: string
  start: number
  end: number
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



// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void
}

export default function SchedulePlanner({ onBack }: Props) {
  const [courses, setCourses] = useState<PlannedCourse[]>([])
  const [pending, setPending] = useState<PendingCourse | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CourseSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
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
      if (slots.length > 1) {
        // Multiple slots — ask user to pick one
        setPending({ ...detail, color, slots })
      } else {
        // Zero or one slot — add directly
        setCourses(prev => [...prev, { ...detail, color, selectedSlot: slots[0] ?? null as any }])
      }
    } finally {
      setAdding(null)
      setQuery('')
      setResults([])
    }
  }

  function confirmSlot(slot: ScheduleSlot) {
    if (!pending) return
    setCourses(prev => [...prev, { ...pending, selectedSlot: slot }])
    setPending(null)
  }

  function removeCourse(courseNumber: string) {
    setCourses(prev => prev.filter(c => c.course_number !== courseNumber))
  }

  const specialCourses = courses.filter(c => !c.selectedSlot)

  // Find courses that overlap with another course on the same day
  const overlappingCourseNumbers = new Set<string>()
  const scheduled = courses.filter(c => c.selectedSlot)
  for (let i = 0; i < scheduled.length; i++) {
    for (let j = i + 1; j < scheduled.length; j++) {
      const a = scheduled[i].selectedSlot, b = scheduled[j].selectedSlot
      if (a.day === b.day && a.start < b.end && a.end > b.start) {
        overlappingCourseNumbers.add(scheduled[i].course_number)
        overlappingCourseNumbers.add(scheduled[j].course_number)
      }
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 48 }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid #30363d', padding: '16px 32px',
        display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, background: '#0d1117', zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid #30363d', color: '#8b949e',
          padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}>
          ← Back
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#e6edf3' }}>
          <span style={{ color: '#cc0000' }}>DTU</span> Schedule Planner
        </span>

        {/* Inline search */}
        <div style={{ position: 'relative', marginLeft: 'auto', width: 320 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Add a course…"
            style={{
              width: '100%', background: '#161b22', border: '1px solid #30363d',
              borderRadius: results.length > 0 ? '8px 8px 0 0' : 8,
              color: '#e6edf3', padding: '8px 12px', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {loading && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#8b949e', fontSize: 12 }}>…</span>
          )}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#161b22', border: '1px solid #30363d',
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
                        borderTop: i === 0 ? 'none' : '1px solid #21262d',
                        color: already ? '#8b949e' : '#c9d1d9',
                        padding: '10px 12px', textAlign: 'left', cursor: already ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                      }}
                      onMouseEnter={e => { if (!already) e.currentTarget.style.background = '#1c2128' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                    >
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8b949e', minWidth: 44 }}>{r.course_number}</span>
                      <span>{r.name}</span>
                      {already && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8b949e' }}>added</span>}
                      {adding === r.course_number && <span style={{ marginLeft: 'auto', fontSize: 11, color: '#8b949e' }}>…</span>}
                    </button>
                  )
                })}
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
                background: '#161b22', border: `1px solid ${overlappingCourseNumbers.has(c.course_number) ? '#f97316' : '#30363d'}`,
                borderRadius: 8, padding: '6px 10px',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#8b949e', fontFamily: 'monospace' }}>{c.course_number}</span>
                <span style={{ fontSize: 13, color: '#c9d1d9' }}>{c.name}</span>
                {overlappingCourseNumbers.has(c.course_number) && (
                  <span style={{ fontSize: 11, color: '#f97316' }}>⚠ overlap</span>
                )}
                <button onClick={() => removeCourse(c.course_number)} style={{
                  background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer',
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
          const END_H = 18         // last hour shown
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
                    fontWeight: 600, color: '#8b949e', paddingBottom: 8,
                    borderBottom: '1px solid #30363d',
                  }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div style={{ display: 'flex' }}>
                {/* Hour labels */}
                <div style={{ width: LABEL_W, flexShrink: 0, position: 'relative', height: TOTAL_H }}>
                  {hours.map(h => (
                    <div key={h} style={{
                      position: 'absolute',
                      top: (h - START_H) * HOUR_H - 8,
                      right: 8,
                      fontSize: 11,
                      color: '#8b949e',
                      userSelect: 'none',
                    }}>
                      {h}:00
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                  {/* Horizontal hour lines spanning all columns */}
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {hours.map(h => (
                      <div key={h} style={{
                        position: 'absolute',
                        top: (h - START_H) * HOUR_H,
                        left: 0, right: 0,
                        borderTop: `1px solid ${h === START_H ? '#30363d' : '#21262d'}`,
                      }} />
                    ))}
                    {/* Bottom border */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid #30363d' }} />
                  </div>

                  {DAYS.map((day, di) => {
                    const dayCourses = courses
                      .filter(c => c.selectedSlot?.day === day)
                      .map(c => ({ ...c, slot: c.selectedSlot }))

                    return (
                      <div key={day} style={{
                        flex: 1,
                        position: 'relative',
                        height: TOTAL_H,
                        borderLeft: di === 0 ? '1px solid #30363d' : '1px solid #21262d',
                        borderRight: di === DAYS.length - 1 ? '1px solid #30363d' : 'none',
                      }}>
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
                              <div style={{ fontSize: 11, color: '#c9d1d9', lineHeight: 1.3, marginTop: 2 }} title={c.name}>
                                {c.name.length > 28 ? c.name.slice(0, 28) + '…' : c.name}
                              </div>
                              <div style={{ fontSize: 10, color: '#8b949e', marginTop: 4 }}>
                                {slot.start}:00–{slot.end}:00
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
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
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8b949e', marginBottom: 12 }}>
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
                  <div style={{ fontSize: 13, color: '#c9d1d9' }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>
                    {c.info?.schedule ?? 'No schedule info'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {courses.length === 0 && !pending && (
          <div style={{ textAlign: 'center', color: '#8b949e', marginTop: 80, fontSize: 14 }}>
            Search for courses above to build your schedule
          </div>
        )}
      </div>

      {/* Slot picker modal */}
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
                background: '#161b22', border: '1px solid #30363d', borderRadius: 12,
                padding: 24, width: 360, maxWidth: '90vw',
              }}
            >
              <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 4, fontFamily: 'monospace' }}>
                {pending.course_number}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e6edf3', marginBottom: 4 }}>
                {pending.name}
              </div>
              <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 20 }}>
                This course has multiple schedule groups — pick one:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pending.slots.map((slot, i) => (
                  <button key={i} onClick={() => confirmSlot(slot)} style={{
                    background: 'none', border: `1px solid ${pending.color}66`,
                    borderRadius: 8, padding: '12px 16px', cursor: 'pointer',
                    textAlign: 'left', color: '#c9d1d9',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = pending.color + '18' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: pending.color, flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {slot.day}
                        {slot.season && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 500,
                            color: slot.season === 'Spring' ? '#22c55e' : '#f97316',
                            background: slot.season === 'Spring' ? '#22c55e18' : '#f9741618',
                            border: `1px solid ${slot.season === 'Spring' ? '#22c55e44' : '#f9741644'}`,
                            borderRadius: 4, padding: '1px 6px',
                          }}>
                            {slot.season}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#8b949e' }}>{slot.start}:00–{slot.end}:00</div>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setPending(null)} style={{
                marginTop: 16, background: 'none', border: 'none',
                color: '#8b949e', fontSize: 13, cursor: 'pointer', width: '100%',
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
