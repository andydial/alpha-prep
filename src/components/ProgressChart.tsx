import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { supabase } from '../lib/supabase'

interface DayPoint {
  date: string   // e.g. "Jun 1"
  accuracy: number
}

interface Props {
  studentId: string
}

export function ProgressChart({ studentId }: Props) {
  const [data, setData] = useState<DayPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - 14)

      const { data: rows } = await supabase
        .from('sessions')
        .select('started_at, total_questions, correct_count')
        .eq('student_id', studentId)
        .gte('started_at', since.toISOString())
        .gt('total_questions', 0)
        .order('started_at', { ascending: true })

      if (!rows) { setLoading(false); return }

      // Group by calendar day
      const byDay: Record<string, { correct: number; total: number }> = {}
      for (const row of rows) {
        const d = new Date(row.started_at)
        const key = d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
        if (!byDay[key]) byDay[key] = { correct: 0, total: 0 }
        byDay[key].correct += row.correct_count
        byDay[key].total += row.total_questions
      }

      const points: DayPoint[] = Object.entries(byDay).map(([date, v]) => ({
        date,
        accuracy: Math.round((v.correct / v.total) * 100),
      }))

      setData(points)
      setLoading(false)
    }
    void load()
  }, [studentId])

  if (loading) {
    return <div className="h-48 flex items-center justify-center text-gray-500 text-sm">Loading chart…</div>
  }

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 text-sm">
        Complete sessions to see your trend
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="date" tick={{ fill: '#4b5563', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#4b5563', fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
          labelStyle={{ color: '#9ca3af' }}
          itemStyle={{ color: '#3b82f6' }}
          formatter={(v) => [`${v}%`, 'Accuracy']}
        />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
