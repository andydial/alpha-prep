import { useState, useEffect } from 'react'
import { type User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { type Profile } from '../types'

interface UseUserResult {
  user: User | null
  profile: Profile | null
  loading: boolean
}

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  useEffect(() => {
    let currentUserId: string | null = null

    supabase.auth.getSession().then(({ data: { session } }) => {
      currentUserId = session?.user?.id ?? null
      setUser(session?.user ?? null)
      if (session?.user) {
        void fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      currentUserId = session?.user?.id ?? null
      setUser(session?.user ?? null)
      if (session?.user) {
        void fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Re-fetch profile when the tab regains focus so XP/level/streak
    // stay current after returning from a completed session.
    function handleVisibility() {
      if (document.visibilityState === 'visible' && currentUserId) {
        void fetchProfile(currentUserId)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return { user, profile, loading }
}
