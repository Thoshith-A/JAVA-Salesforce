import { memo, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'

const display = 'QUIZ ARENA'
const subtitleText = 'LIVE LEADERBOARD ENGINE'

function HeroSection({
  regNo,
  setRegNo,
  run,
  status,
  seconds,
}) {
  const reduced = useReducedMotion()
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (reduced) {
      setTyped(subtitleText)
      return undefined
    }
    let i = 0
    const int = setInterval(() => {
      i += 1
      setTyped(subtitleText.slice(0, i))
      if (i >= subtitleText.length) clearInterval(int)
    }, 50)
    return () => clearInterval(int)
  }, [reduced])

  const chars = useMemo(() => display.split(''), [])
  const ringClass = status === 'running' ? 'ring-running' : status === 'complete' ? 'ring-complete' : 'ring-idle'

  return (
    <motion.div className="panel perspective-3d obsidian-hero" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <motion.h1 className="arena-title" variants={{ animate: { transition: { staggerChildren: 0.04 } } }} initial="initial" animate="animate">
        {chars.map((ch, i) => (
          <motion.span
            key={`${ch}-${i}`}
            style={{ display: 'inline-block' }}
            variants={{
              initial: { opacity: 0, rotateX: -90, y: 60 },
              animate: { opacity: 1, rotateX: 0, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
            }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </motion.span>
        ))}
      </motion.h1>
      <div className="arena-subtitle">{typed}</div>
      <div className="mt-4 flex flex-col md:flex-row gap-3 items-center">
        <input
          className="glass arena-input w-full md:w-80"
          placeholder="Registration Number"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
        />
        <button onClick={() => run(false)} className="arena-btn">Run Pipeline</button>
        <button onClick={() => run(true)} className="arena-btn arena-btn-alt">Replay</button>
        <div className={`status-orbit ${ringClass}`}>
          <div className="status-dot" />
        </div>
        <span className="text-xs tracking-[0.35em] text-gold uppercase">{status}</span>
        <span className="text-sm font-mono text-slate-400">Time: {seconds}s</span>
      </div>
    </motion.div>
  )
}

export default memo(HeroSection)
