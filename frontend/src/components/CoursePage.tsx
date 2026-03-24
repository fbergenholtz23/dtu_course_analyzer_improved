import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { CourseDetail, GradeSnapshot, CourseEvals } from '../types'
import GradeChart from './GradeChart'

interface Props {
  course: CourseDetail
  onBack: () => void
}

function gradeColor(avg: number): string {
  if (avg >= 10) return '#22c55e'
  if (avg >= 7)  return '#84cc16'
  if (avg >= 4)  return '#eab308'
  if (avg >= 2)  return '#f97316'
  return '#dc2626'
}

function evalColor(score: number): string {
  if (score >= 4) return '#22c55e'
  if (score >= 3) return '#84cc16'
  if (score >= 2) return '#eab308'
  return '#f97316'
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: '#21262d',
      border: '1px solid #30363d',
      borderRadius: 6,
      padding: '3px 10px',
      fontSize: 12,
      color: '#c9d1d9',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

function EvalCard({ label, score, votes }: { label: string; score: number | null; votes: number | null }) {
  if (score === null) return null
  const color = evalColor(score)
  return (
    <div style={{
      background: '#161b22',
      border: '1px solid #30363d',
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      flex: 1,
      minWidth: 100,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{score.toFixed(1)}<span style={{ fontSize: 12, color: '#8b949e' }}>/5</span></div>
      <div style={{ fontSize: 12, color: '#e6edf3' }}>{label}</div>
      {votes !== null && <div style={{ fontSize: 11, color: '#8b949e' }}>{votes} responses</div>}
    </div>
  )
}

function EvalsSection({ evals }: { evals: CourseEvals }) {
  const metrics = [
    { label: 'Overall', ...evals.overall },
    { label: 'Learning', ...evals.learning },
    { label: 'Motivation', ...evals.motivation },
    { label: 'Feedback', ...evals.feedback },
    { label: 'Workload', ...evals.workload },
  ]
  const hasAny = metrics.some(m => m.score !== null)
  if (!hasAny) return null
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
      style={{ marginBottom: 32 }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#8b949e', marginBottom: 12 }}>Student evaluations</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {metrics.map(m => (
          <EvalCard key={m.label} label={m.label} score={m.score} votes={m.votes} />
        ))}
      </div>
    </motion.div>
  )
}

function SnapshotCard({ snap, index }: { snap: GradeSnapshot; index: number }) {
  const color = gradeColor(snap.average)
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      style={{
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 10,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: '#8b949e' }}>{snap.semester}</div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{snap.average.toFixed(1)}</div>
          <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>avg</div>
        </div>
        <div style={{ width: 1, height: 32, background: '#30363d' }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#e6edf3' }}>{Number(snap.pass_percentage).toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>passed</div>
        </div>
        <div style={{ width: 1, height: 32, background: '#30363d' }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#e6edf3' }}>{snap.participants.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#8b949e', marginTop: 2 }}>students</div>
        </div>
      </div>
      <GradeChart distribution={snap.distribution} />
    </motion.div>
  )
}

export default function CoursePage({ course, onBack }: Props) {
  const snapshots = [...course.snapshots].sort((a, b) => a.semester.localeCompare(b.semester))
  const latest = snapshots[snapshots.length - 1]
  const info = course.info
  const evals = course.evals

  const trendData = snapshots
    .filter(s => s.average > 0)
    .map(s => ({ semester: s.semester, average: Number(s.average.toFixed(2)) }))

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 48 }}>
      {/* Top bar */}
      <div style={{
        borderBottom: '1px solid #30363d',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        position: 'sticky',
        top: 0,
        background: '#0d1117',
        zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: '1px solid #30363d', color: '#8b949e',
          padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
        }}>
          ← Back
        </button>
        <span style={{ fontWeight: 700, fontSize: 16, color: '#e6edf3' }}>
          <span style={{ color: '#cc0000' }}>DTU</span> Grades
        </span>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 0' }}>
        {/* Course header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 4 }}>{course.course_number}</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e6edf3', marginBottom: 16 }}>{course.name}</div>

          {/* Info badges */}
          {info && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
              {info.ects       && <Badge>{info.ects} ECTS</Badge>}
              {info.language   && <Badge>{info.language}</Badge>}
              {info.gradeType  && <Badge>{info.gradeType}</Badge>}
              {info.examType?.map(e => <Badge key={e}>{e}</Badge>)}
              {info.semesterPeriod && <Badge>{info.semesterPeriod}</Badge>}
              {info.schedule   && <Badge>{info.schedule}</Badge>}
              {info.campus?.map(c => <Badge key={c}>{c}</Badge>)}
              {info.department && <Badge>{info.department.replace(/^\d+ /, '')}</Badge>}
            </div>
          )}

          {/* Instructor */}
          {info?.responsibleName && info.responsibleName !== 'NO_DATA' && (
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: '#21262d', border: '1px solid #30363d',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#8b949e', fontWeight: 600, flexShrink: 0,
              }}>
                {info.responsibleName.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#e6edf3' }}>{info.responsibleName}</div>
                <div style={{ fontSize: 12, color: '#8b949e' }}>Course responsible</div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Summary stats */}
        {latest && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}
          >
            {[
              { label: 'Latest avg grade', value: latest.average.toFixed(2), color: gradeColor(latest.average) },
              { label: 'Latest pass rate', value: `${Number(latest.pass_percentage).toFixed(1)}%` },
              { label: 'Semesters of data', value: snapshots.length.toString() },
            ].map(s => (
              <div key={s.label} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.color ?? '#e6edf3' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#8b949e', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Evaluations */}
        {evals && <EvalsSection evals={evals} />}

        {/* Description */}
        {info?.description && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.13 }}
            style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '20px 24px', marginBottom: 32 }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8b949e', marginBottom: 10 }}>Description</div>
            <div style={{ fontSize: 14, color: '#c9d1d9', lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: info.description }} />
          </motion.div>
        )}

        {/* Prerequisites */}
        {(info?.prerequisites || info?.mandatoryPrerequisites) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.14 }}
            style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '20px 24px', marginBottom: 32 }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8b949e', marginBottom: 10 }}>Prerequisites</div>
            {info.mandatoryPrerequisites && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#f97316', marginRight: 8 }}>Required</span>
                <span style={{ fontSize: 14, color: '#c9d1d9' }}>{info.mandatoryPrerequisites}</span>
              </div>
            )}
            {info.prerequisites && (
              <div>
                <span style={{ fontSize: 12, color: '#8b949e', marginRight: 8 }}>Recommended</span>
                <span style={{ fontSize: 14, color: '#c9d1d9' }}>{info.prerequisites}</span>
              </div>
            )}
          </motion.div>
        )}

        {/* Grade average trend */}
        {trendData.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '20px 24px', marginBottom: 32 }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8b949e', marginBottom: 16 }}>Average grade over time</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData}>
                <defs>
                  {/* y coords calibrated to domain [0,12] in 160px chart (top margin ~5, bottom ~25 for axis) */}
                  <linearGradient id="gradeGradient" x1="0" y1="5" x2="0" y2="135" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#16a34a" /> {/* 12 */}
                    <stop offset="17%"  stopColor="#22c55e" /> {/* 10 */}
                    <stop offset="42%"  stopColor="#84cc16" /> {/* 7  */}
                    <stop offset="67%"  stopColor="#eab308" /> {/* 4  */}
                    <stop offset="83%"  stopColor="#f97316" /> {/* 2  */}
                    <stop offset="100%" stopColor="#dc2626" /> {/* 0  */}
                  </linearGradient>
                </defs>
                <XAxis dataKey="semester" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} ticks={[0, 2, 4, 7, 10, 12]} tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, color: '#c9d1d9', fontSize: 13 }}
                  formatter={(v) => [v, 'avg grade']}
                />
                <ReferenceLine y={2} stroke="#30363d" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="url(#gradeGradient)"
                  strokeWidth={2}
                  dot={(props: any) => (
                    <circle key={props.key} cx={props.cx} cy={props.cy} r={4}
                      fill={gradeColor(props.value)} stroke="#0d1117" strokeWidth={1} />
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Per-semester cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {[...snapshots].reverse().map((snap, i) => (
            <SnapshotCard key={snap.semester} snap={snap} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
