import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { WeeklyPlan } from '../types'

function getMondayISO(): string {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + daysToMonday)
  return monday.toISOString().split('T')[0]
}

export function useWeeklyPlan(studentId: string | undefined) {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPlan = useCallback(async () => {
    if (!studentId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error: sbError } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('student_id', studentId)
        .eq('week_start', getMondayISO())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (sbError) throw sbError
      setPlan(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    void fetchPlan()
  }, [fetchPlan])

  return { plan, loading, error, refetch: fetchPlan }
}
