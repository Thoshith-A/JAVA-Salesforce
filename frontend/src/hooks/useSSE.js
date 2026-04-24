import { useEffect, useRef } from 'react'

export function useSSE(jobId, onMessage) {
  const sourceRef = useRef(null)

  useEffect(() => {
    if (!jobId) return undefined
    sourceRef.current = new EventSource(`/api/quiz/progress/${jobId}`)
    sourceRef.current.onmessage = (event) => {
      if (!event?.data) return
      onMessage(JSON.parse(event.data))
    }
    return () => {
      sourceRef.current?.close()
    }
  }, [jobId, onMessage])
}
