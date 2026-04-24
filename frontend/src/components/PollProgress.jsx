import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useReducedMotion } from '../hooks/useReducedMotion'

function PollProgress({ polls }) {
  const reduced = useReducedMotion()
  const allDone = useMemo(() => polls.length > 0 && polls.every((p) => p.status === 'done'), [polls])

  return (
    <div className="panel">
      <h3 className="text-lg font-semibold mb-4">Live Poll Progress</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 perspective-3d">
        {polls.map((poll, index) => {
          const tone = poll.status === 'done'
            ? 'bg-[#0f1a17] border-[#3c9c6d]'
            : poll.status === 'fetching'
              ? 'bg-[#231e10] border-[#C9943A]'
              : 'bg-[#1E2530] border-[#313a49]'
          const rotationSkew = reduced ? {} : { rotateY: (index % 5) - 2 }
          const fetching = poll.status === 'fetching'
          const done = poll.status === 'done'

          return (
            <motion.div
              key={poll.poll}
              layout
              className={`rounded-xl border p-3 poll-card-3d ${tone} ${fetching ? 'poll-shimmer' : ''}`}
              initial={{ opacity: 0.6, scale: 0.96 }}
              animate={{
                opacity: 1,
                scale: fetching ? 1.06 : done ? 0.97 : 1,
                rotateX: fetching ? -8 : done ? 4 : 0,
                z: fetching ? 16 : 0,
                ...rotationSkew,
              }}
              transition={{ type: 'spring', stiffness: 280, damping: 26, delay: allDone ? index * 0.08 : 0 }}
            >
              <div className="text-sm text-gray-200">Poll {poll.poll}</div>
              <div className="text-xs mt-1">Events: {poll.eventsFound}</div>
              <div className="text-xs">Dupes: {poll.duplicatesSkipped}</div>
              <div className="text-xs uppercase mt-1">{poll.status}</div>
              {done && (
                <motion.div
                  initial={{ rotateY: 180, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.45 }}
                  className="absolute right-2 top-2 text-emerald-300"
                >
                  ✓
                </motion.div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(PollProgress)
