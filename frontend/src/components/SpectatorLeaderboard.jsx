import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSpectator } from '../hooks/useSpectator'

export default function SpectatorLeaderboard({ jobId }) {
  const {
    leaderboard,
    pollNumber,
    totalPolls,
    rankChanges,
    connectedSpectators,
    eventFeed,
    isConnected,
    error,
    retry,
  } = useSpectator(jobId)
  const [badgeMap, setBadgeMap] = useState({})

  useEffect(() => {
    if (!rankChanges.length) return
    const updates = {}
    rankChanges.forEach((change) => {
      updates[change.participant] = change.delta
    })
    setBadgeMap((prev) => ({ ...prev, ...updates }))
    const timeout = setTimeout(() => setBadgeMap({}), 2000)
    return () => clearTimeout(timeout)
  }, [rankChanges])

  const completed = pollNumber >= totalPolls
  const progress = Math.min(100, (pollNumber / totalPolls) * 100)
  const status = useMemo(() => (completed ? 'Final results' : `Poll ${pollNumber} / ${totalPolls}`), [completed, pollNumber, totalPolls])

  if (!isConnected && !error) {
    return <div className="panel animate-pulse h-64">Connecting spectator stream...</div>
  }
  if (error) {
    return (
      <div className="panel space-y-3">
        <div className="text-red-300">{error}</div>
        <button className="px-3 py-2 rounded bg-cyan-500 text-gray-950" onClick={retry}>Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="panel">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{status}</div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${completed ? 'bg-green-400' : 'bg-cyan-400 animate-pulse'}`} />
            <span>{connectedSpectators} spectators watching</span>
          </div>
        </div>
        <div className="mt-3 h-2 bg-gray-800 rounded">
          <div className="h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        {completed && <div className="mt-2 text-green-300 text-sm font-medium">Final results</div>}
      </div>

      <div className="panel">
        <h3 className="font-semibold mb-3">Live Spectator Leaderboard</h3>
        <AnimatePresence initial={false}>
          {leaderboard.map((entry) => (
            <motion.div
              key={entry.participant}
              layout
              initial={{ opacity: 0.7, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="border border-gray-800 rounded p-3 mb-2 flex items-center justify-between bg-gray-900/70"
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-cyan-300">#{entry.rank}</span>
                <span>{entry.participant}</span>
              </div>
              <div className="flex items-center gap-3">
                <span>{entry.totalScore}</span>
                {badgeMap[entry.participant] && (
                  <motion.span
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 2 }}
                    className={`text-xs px-2 py-1 rounded ${badgeMap[entry.participant] > 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}
                  >
                    {badgeMap[entry.participant] > 0 ? `+${badgeMap[entry.participant]}` : badgeMap[entry.participant]}
                  </motion.span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="panel h-80">
        <h3 className="font-semibold mb-3">Live Score Distribution</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={leaderboard} layout="vertical" margin={{ left: 8, right: 8 }}>
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis dataKey="participant" type="category" width={100} stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="totalScore" fill="#22d3ee" radius={[0, 6, 6, 0]} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3 className="font-semibold mb-3">Event Feed</h3>
        <div className="max-h-[200px] overflow-y-auto space-y-2 text-sm text-gray-300">
          {eventFeed.map((item, index) => (
            <div key={`${item}-${index}`} className="border border-gray-800 rounded px-2 py-1">{item}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
