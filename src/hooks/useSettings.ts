import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export type Settings = Record<string, string>

export function useSettings() {
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('settings').select('key, value')
      if (data) {
        const map: Settings = {}
        for (const row of data) map[row.key] = row.value
        setSettings(map)
      }
      setLoading(false)
    }
    void fetchSettings()
  }, [])

  return { settings, loading }
}
