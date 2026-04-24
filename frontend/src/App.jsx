import { useCallback, useEffect, useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import { Route, Routes } from 'react-router-dom'
import PollProgress from './components/PollProgress'
import DedupStats from './components/DedupStats'
import Leaderboard from './components/Leaderboard'
import ScoreChart from './components/ScoreChart'
import SubmissionResult from './components/SubmissionResult'
import AuditLog from './components/AuditLog'
import SceneBackground from './components/SceneBackground'
import HeroSection from './components/HeroSection'
import SpectatePage from './pages/SpectatePage'
import { useSSE } from './hooks/useSSE'
import { useSpectator } from './hooks/useSpectator'

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const apiUrl = (path) => `${API_BASE}${path}`

const defaultPolls = Array.from({ length: 10 }, (_, poll) => ({
  poll,
  status: 'idle',
  eventsFound: 0,
  duplicatesSkipped: 0,
  totalUnique: 0,
}))

function DashboardPage() {
  const [regNo, setRegNo] = useState('')
  const [jobId, setJobId] = useState('')
  const [polls, setPolls] = useState(defaultPolls)
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState(null)
  const [submit, setSubmit] = useState(null)
  const [audit, setAudit] = useState([])
  const [auditDerivedLeaderboard, setAuditDerivedLeaderboard] = useState([])
  const [lastAuditLength, setLastAuditLength] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const spectator = useSpectator(jobId)

  const onSseMessage = useCallback((payload) => {
    setPolls((prev) => prev.map((p) => (p.poll === payload.poll ? payload : p)))
    if (payload.status === 'fetching') setStatus('running')
  }, [])
  useSSE(jobId, onSseMessage)

  useEffect(() => {
    if (status !== 'running') return undefined
    const tick = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(tick)
  }, [status])

  const run = async (isReplay = false) => {
    setStatus('running')
    setResult(null)
    setSubmit(null)
    setAudit([])
    setAuditDerivedLeaderboard([])
    setLastAuditLength(0)
    setSeconds(0)
    setPolls(defaultPolls)
    const endpoint = isReplay ? '/api/quiz/replay' : '/api/quiz/run'
    const response = await fetch(apiUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regNo }),
    })
    const data = await response.json()
    setJobId(data.jobId)
  }

  useEffect(() => {
    if (!jobId) return
    const int = setInterval(async () => {
      const response = await fetch(apiUrl(`/api/quiz/result?jobId=${encodeURIComponent(jobId)}`))
      const data = await response.json()
      if (data.leaderboardResult) {
        setResult(data.leaderboardResult)
        setSubmit(data.submitResponse)
        setStatus('complete')
        clearInterval(int)
      }
    }, 1500)
    return () => clearInterval(int)
  }, [jobId])

  useEffect(() => {
    if (status !== 'complete' || !submit?.isCorrect) return
    confetti({ particleCount: 180, spread: 95, origin: { y: 0.65 } })
  }, [status, submit])

  useEffect(() => {
    if (!jobId || status !== 'running') return
    const int = setInterval(async () => {
      const response = await fetch(apiUrl(`/api/quiz/audit/${encodeURIComponent(jobId)}`))
      const events = await response.json()
      setAudit(events)

      const scoreMap = new Map()
      const seen = new Set()
      events.forEach((event) => {
        const key = `${event.roundId}:${event.participant}`
        if (!event.duplicate && !seen.has(key)) {
          seen.add(key)
          scoreMap.set(event.participant, (scoreMap.get(event.participant) ?? 0) + event.score)
        }
      })
      const ranked = Array.from(scoreMap.entries())
        .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
        .map(([participant, totalScore], idx) => ({ rank: idx + 1, participant, totalScore }))
      setAuditDerivedLeaderboard(ranked)

      if (events.length > lastAuditLength) {
        setLastAuditLength(events.length)
      }
    }, 1000)
    return () => clearInterval(int)
  }, [jobId, lastAuditLength, status])

  const dedupMetrics = useMemo(() => ({
    total: status === 'running'
      ? polls.reduce((sum, poll) => sum + (poll.eventsFound ?? 0), 0)
      : (result?.totalEventsReceived ?? 0),
    duplicates: status === 'running'
      ? polls.reduce((sum, poll) => sum + (poll.duplicatesSkipped ?? 0), 0)
      : (result?.duplicatesRemoved ?? 0),
    unique: status === 'running'
      ? polls.reduce((max, poll) => Math.max(max, poll.totalUnique ?? 0), 0)
      : (result?.uniqueEventsProcessed ?? 0),
  }), [polls, result, status])

  const liveLeaderboard = status === 'running'
    ? ((spectator.leaderboard?.length ? spectator.leaderboard : auditDerivedLeaderboard) ?? [])
    : (result?.leaderboard ?? [])

  return (
    <div className="min-h-screen bg-[#080A0F] text-gray-100 p-4 md:p-8 relative overflow-x-hidden">
      <SceneBackground />
      <div className="max-w-7xl mx-auto space-y-5 relative z-10">
        <HeroSection regNo={regNo} setRegNo={setRegNo} run={run} status={status} seconds={seconds} />

        <PollProgress polls={polls} />
        <DedupStats totalEvents={dedupMetrics.total} duplicates={dedupMetrics.duplicates} unique={dedupMetrics.unique} />
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <ScoreChart entries={liveLeaderboard} />
          <AuditLog events={audit} />
        </div>
        <Leaderboard entries={liveLeaderboard} grandTotal={result?.grandTotal ?? liveLeaderboard.reduce((sum, row) => sum + row.totalScore, 0)} />
        <SubmissionResult submit={submit} />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/spectate" element={<SpectatePage />} />
    </Routes>
  )
}
