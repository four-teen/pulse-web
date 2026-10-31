import { useCallback, useEffect, useState } from 'react'
import { ApiError, presidentApi } from '../../api'
import type { DashboardData } from './data'

export default function useDashboard(onSessionExpired?: () => void) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => setRevision(value => value + 1), [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    presidentApi.dashboard().then(result => { if (active) setData(result) }).catch((failure: unknown) => {
      if (!active) return
      if (failure instanceof ApiError && failure.status === 401) { onSessionExpired?.(); return }
      setError(failure instanceof Error ? failure.message : 'University records are unavailable. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision, onSessionExpired])

  return { data, loading, error, refresh }
}
