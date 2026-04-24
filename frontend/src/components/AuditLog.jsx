import { memo, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function AuditLog({ events }) {
  const scrollContainerRef = useRef(null)
  const isUserScrollingRef = useRef(false)
  const prevCountRef = useRef(0)
  const [showNewPill, setShowNewPill] = useState(false)

  const onScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    isUserScrollingRef.current = !isAtBottom
    if (isAtBottom) {
      setShowNewPill(false)
    }
  }

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const hasNewEvents = events.length > prevCountRef.current
    prevCountRef.current = events.length
    if (!hasNewEvents) return

    if (!isUserScrollingRef.current) {
      // Keep updates local to this container and avoid smooth animation,
      // which can trigger perceived page pull on some browsers.
      el.scrollTop = el.scrollHeight
      setShowNewPill(false)
    } else {
      setShowNewPill(true)
    }
  }, [events])

  const jumpToLatest = () => {
    const el = scrollContainerRef.current
    if (!el) return
    isUserScrollingRef.current = false
    setShowNewPill(false)
    el.scrollTop = el.scrollHeight
  }

  return (
    <section className="audit-module-section">
      <div className="module-label">LIVE TRACE FEED</div>
      <div className="terminal-shell h-full">
        <div className="terminal-head">
          <span className="dot red" />
          <span className="dot yellow" />
          <span className="dot green" />
          <span className="ml-3 text-[11px] text-[#7f8ea3]">arena-audit.log</span>
        </div>
        <div
          ref={scrollContainerRef}
          onScroll={onScroll}
          onWheel={(e) => e.stopPropagation()}
          onWheelCapture={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchMoveCapture={(e) => e.stopPropagation()}
          className="terminal-body scanline-overlay audit-scroll space-y-2 text-xs font-mono p-3"
        >
          <AnimatePresence initial={false}>
            {events.map((event, idx) => (
              <motion.div
                key={`${event.poll}-${event.roundId}-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-[#1e2b3a] rounded p-2 bg-black/50"
              >
                <div className="text-[#8fa0b8]">
                  poll={event.poll} round={event.roundId} participant={event.participant} score={event.score}
                </div>
                <div className={event.duplicate ? 'text-[#FF4C1A]' : 'text-[#A8D8F0]'}>
                  {event.duplicate ? `⚠ duplicate_skipped: ${event.reason}` : '✓ accepted'}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showNewPill && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="new-events-pill"
            onClick={jumpToLatest}
          >
            ↓ New events
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  )
}

export default memo(AuditLog)
