import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { CourseDetail, GradeSnapshot } from '../types'
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
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e6edf3', marginBottom: 24 }}>{course.name}</div>
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

        {/* Grade average trend */}
        {trendData.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '20px 24px', marginBottom: 32 }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8b949e', marginBottom: 16 }}>Average grade over time</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trendData}>
                <XAxis dataKey="semester" tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} ticks={[0, 2, 4, 7, 10, 12]} tick={{ fill: '#8b949e', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, color: '#c9d1d9', fontSize: 13 }}
                  formatter={(v) => [v, 'avg grade']}
                />
                <ReferenceLine y={2} stroke="#30363d" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="average" stroke="#cc0000" strokeWidth={2} dot={{ fill: '#cc0000', r: 3 }} />
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
