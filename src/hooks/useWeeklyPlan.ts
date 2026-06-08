import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { WeeklyPlan } from '../types'

export function useWeeklyPlan(studentId: string | undefined) {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!studentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
      return
    }
    const fetchPlan = async () => {
      try {
        const { data, error: sbError } = await supabase
          .from('weekly_plans')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        if (sbError) throw sbError
        setPlan(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }
    void fetchPlan()
  }, [studentId])

  return { plan, loading, error }
}
