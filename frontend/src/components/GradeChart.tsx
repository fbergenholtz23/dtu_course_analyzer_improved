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
          tick={{ fill: '#8b949e', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#8b949e', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 8,
            color: '#c9d1d9',
            fontSize: 13,
          }}
          labelStyle={{ color: '#c9d1d9' }}
          itemStyle={{ color: '#c9d1d9' }}
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
