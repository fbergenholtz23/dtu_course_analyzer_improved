import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { GradeDistribution } from '../types'

const GRADE_COLORS: Record<string, string> = {
  '-3': '#7f1d1d',
  '00': '#dc2626',
  '02': '#f97316',
  '4':  '#eab308',
  '7':  '#84cc16',
  '10': '#22c55e',
  '12': '#16a34a',
}

interface Props {
  distribution: GradeDistribution
}

export default function GradeChart({ distribution }: Props) {
  const data = (['-3', '00', '02', '4', '7', '10', '12'] as const)
    .map((grade) => ({ grade, count: distribution[grade] }))
    .filter((d) => d.count > 0)

  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
        <XAxis
          dataKey="grade"
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'var(--surface-subtle)', opacity: 0.6 }}
          contentStyle={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text-sec)',
            fontSize: 13,
          }}
          labelStyle={{ color: 'var(--text-sec)' }}
          itemStyle={{ color: 'var(--text-sec)' }}
          formatter={(value) => [value, 'students']}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade] ?? '#6b7280'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
