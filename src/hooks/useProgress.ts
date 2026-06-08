import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Mastery } from '../types'

export function useProgress(studentId: string | undefined) {
  const [mastery, setMastery] = useState<Mastery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMastery = useCallback(async () => {
    if (!studentId) { setLoading(false); return }
    setLoading(true)
    setMastery([])
    try {
      const { data, error: sbError } = await supabase
        .from('mastery')
        .select('*')
        .eq('student_id', studentId)
        .order('score_alltime', { ascending: true })
      if (sbError) throw sbError
      setMastery(data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMastery()
  }, [fetchMastery])

  return { mastery, loading, error, refetch: fetchMastery }
}
