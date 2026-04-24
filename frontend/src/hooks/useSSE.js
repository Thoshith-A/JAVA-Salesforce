import { useEffect, useRef } from 'react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')

export function useSSE(jobId, onMessage) {
  const sourceRef = useRef(null)

  useEffect(() => {
    if (!jobId) return undefined
    sourceRef.current = new EventSource(`${API_BASE}/api/quiz/progress/${encodeURIComponent(jobId)}`)
    sourceRef.current.onmessage = (event) => {
      if (!event?.data) return
      onMessage(JSON.parse(event.data))
    }
    return () => {
      sourceRef.current?.close()
    }
  }, [jobId, onMessage])
}
