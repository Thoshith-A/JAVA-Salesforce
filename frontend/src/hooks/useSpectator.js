import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const MAX_RETRIES = 3

export function useSpectator(jobId) {
  const [leaderboard, setLeaderboard] = useState([])
  const [pollNumber, setPollNumber] = useState(0)
  const [totalPolls, setTotalPolls] = useState(10)
  const [rankChanges, setRankChanges] = useState([])
  const [connectedSpectators, setConnectedSpectators] = useState(0)
  const [eventFeed, setEventFeed] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState('')
  const clientRef = useRef(null)
  const retriesRef = useRef(0)

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate()
      clientRef.current = null
    }
    setIsConnected(false)
  }, [])

  const connect = useCallback(() => {
    if (!jobId) return
    disconnect()
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 0,
      onConnect: () => {
        setIsConnected(true)
        setError('')
        retriesRef.current = 0
        client.subscribe(`/topic/spectator/${jobId}`, (message) => {
          const payload = JSON.parse(message.body)
          setLeaderboard(payload.leaderboard ?? [])
          setPollNumber(payload.pollNumber ?? 0)
          setTotalPolls(payload.totalPolls ?? 10)
          setRankChanges(payload.rankChanges ?? [])
          setConnectedSpectators(payload.connectedSpectators ?? 0)
          const summary = `Poll ${payload.pollNumber} complete — ${payload.newEventsThisPoll} events, ${payload.duplicatesThisPoll} duplicates skipped`
          setEventFeed((prev) => [summary, ...prev].slice(0, 20))
        })
        client.subscribe(`/topic/spectator/${jobId}/events`, (message) => {
          const eventTrace = JSON.parse(message.body)
          const line = eventTrace.duplicate
            ? `Poll ${eventTrace.pollNumber}: duplicate skipped ${eventTrace.participant} (${eventTrace.roundId})`
            : `Poll ${eventTrace.pollNumber}: accepted ${eventTrace.participant} +${eventTrace.score}`
          setEventFeed((prev) => [line, ...prev].slice(0, 20))
        })
      },
      onStompError: (frame) => {
        setError(frame.headers?.message || 'WebSocket error')
      },
      onWebSocketClose: () => {
        setIsConnected(false)
        if (retriesRef.current >= MAX_RETRIES) {
          setError('Unable to reconnect after 3 attempts')
          return
        }
        retriesRef.current += 1
        const delay = 500 * (2 ** retriesRef.current)
        setTimeout(() => connect(), delay)
      },
    })
    clientRef.current = client
    client.activate()
  }, [disconnect, jobId])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return useMemo(() => ({
    leaderboard,
    pollNumber,
    totalPolls,
    rankChanges,
    connectedSpectators,
    eventFeed,
    isConnected,
    error,
    retry: connect,
  }), [leaderboard, pollNumber, totalPolls, rankChanges, connectedSpectators, eventFeed, isConnected, error, connect])
}
