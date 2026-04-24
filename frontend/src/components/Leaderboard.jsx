import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, LayoutGroup, animate, motion, useMotionValue, useTransform } from 'framer-motion'

const rowVariants = {
  initial: (index) => ({ opacity: 0, x: -24, scale: 0.96, transition: { delay: index * 0.06 } }),
  animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } },
  exit: { opacity: 0, x: 24, scale: 0.96 },
}

function Leaderboard({ entries, grandTotal }) {
  const stableEntries = useMemo(() => entries ?? [], [entries])
  const maxScore = Math.max(...stableEntries.map((entry) => entry.totalScore), 1)
  const previousRanksRef = useRef(new Map())
  const previousScoresRef = useRef(new Map())
  const timeoutsRef = useRef(new Map())
  const [rankDeltas, setRankDeltas] = useState({})
  const [scoreFlashes, setScoreFlashes] = useState({})
  const [initialStaggerDone, setInitialStaggerDone] = useState(false)

  useEffect(() => {
    if (!initialStaggerDone && stableEntries.length > 0) {
      setInitialStaggerDone(true)
    }
  }, [initialStaggerDone, stableEntries.length])

  useEffect(() => {
    const nextDeltas = {}
    const nextFlashes = {}

    stableEntries.forEach((entry) => {
      const prevRank = previousRanksRef.current.get(entry.participant)
      const prevScore = previousScoresRef.current.get(entry.participant)
      const rankDelta = prevRank == null ? null : prevRank - entry.rank

      if (rankDelta && rankDelta !== 0) {
        nextDeltas[entry.participant] = rankDelta
        const existing = timeoutsRef.current.get(entry.participant)
        if (existing) clearTimeout(existing)
        const timeout = setTimeout(() => {
          setRankDeltas((current) => ({ ...current, [entry.participant]: null }))
        }, 2500)
        timeoutsRef.current.set(entry.participant, timeout)
      }

      if (prevScore != null && entry.totalScore > prevScore) {
        nextFlashes[entry.participant] = true
        setTimeout(() => {
          setScoreFlashes((current) => ({ ...current, [entry.participant]: false }))
        }, 600)
      }

      previousRanksRef.current.set(entry.participant, entry.rank)
      previousScoresRef.current.set(entry.participant, entry.totalScore)
    })

    if (Object.keys(nextDeltas).length > 0) {
      setRankDeltas((current) => ({ ...current, ...nextDeltas }))
    }
    if (Object.keys(nextFlashes).length > 0) {
      setScoreFlashes((current) => ({ ...current, ...nextFlashes }))
    }

  }, [stableEntries])

  useEffect(() => () => {
    timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
  }, [])

  const rankLabel = (rank) => (rank === 1 ? '👑' : rank === 2 ? '#2' : rank === 3 ? '#3' : `#${rank}`)

  return (
    <section className="scoreboard-module-section">
      <div className="module-label">LIVE SCOREBOARD</div>
      <div className="panel leaderboard-stage h-full">
        <div className="leaderboard-scroll-wrap">
          <table className="w-full text-sm">
            <thead className="text-gray-400">
              <tr>
                <th className="text-left py-2">Rank</th>
                <th className="text-left py-2">Participant</th>
                <th className="text-left py-2">Score</th>
                <th className="text-left py-2">Relative</th>
              </tr>
            </thead>
            <LayoutGroup id="live-scoreboard-layout">
              <AnimatePresence mode="popLayout" initial={!initialStaggerDone}>
                <motion.tbody layout>
                  {stableEntries.map((entry, index) => (
                    <motion.tr
                      key={entry.participant}
                      layout="position"
                      layoutId={`scoreboard-${entry.participant}`}
                      custom={index}
                      variants={rowVariants}
                      initial={initialStaggerDone ? false : 'initial'}
                      animate="animate"
                      exit="exit"
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 28,
                        layout: {
                          type: 'spring',
                          stiffness: 340,
                          damping: 30,
                          mass: 0.8,
                        },
                      }}
                      className="border-t border-gray-800 will-change-transform"
                    >
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className={entry.rank === 1 ? 'crown-float text-[#F0C060] text-2xl' : entry.rank === 2 ? 'metal-silver' : entry.rank === 3 ? 'metal-bronze' : 'text-[#4A5568]'}>
                            {rankLabel(entry.rank)}
                          </span>
                          {rankDeltas[entry.participant] != null && rankDeltas[entry.participant] !== 0 && (
                            <motion.span
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`text-xs px-2 py-0.5 rounded ${
                                rankDeltas[entry.participant] > 0
                                  ? 'bg-green-500/20 text-green-300'
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {rankDeltas[entry.participant] > 0
                                ? `▲ +${rankDeltas[entry.participant]}`
                                : `▼ ${rankDeltas[entry.participant]}`}
                            </motion.span>
                          )}
                        </div>
                      </td>
                      <td>{entry.participant}</td>
                      <td>
                        <AnimatedScore value={entry.totalScore} flash={scoreFlashes[entry.participant]} />
                      </td>
                      <td className="w-64">
                        <div className="h-2 rounded bg-gray-800">
                          <motion.div
                            className="h-2 rounded bg-gradient-to-r from-cyan-400 to-purple-500"
                            animate={{ width: `${(entry.totalScore / maxScore) * 100}%` }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  <tr className="border-t border-[#C9943A]/60 font-semibold sticky bottom-0 bg-[#10161f]">
                    <td colSpan={2} className="py-2">Grand Total</td>
                    <td>{grandTotal}</td>
                    <td />
                  </tr>
                </motion.tbody>
              </AnimatePresence>
            </LayoutGroup>
          </table>
        </div>
      </div>
    </section>
  )
}

function AnimatedScore({ value, flash }) {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (latest) => Math.round(latest))

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [mv, value])

  return (
    <span className={`inline-block relative ${flash ? 'score-flash' : ''}`}>
      <motion.span>{rounded}</motion.span>
      {flash && (
        <span className="score-particles">
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </span>
  )
}

export default memo(Leaderboard)
