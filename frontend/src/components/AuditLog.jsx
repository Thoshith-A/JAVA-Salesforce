import { memo, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

function AuditLog({ events }) {
  const scrollContainerRef = useRef(null)
  const prevCountRef = useRef(0)
  const lastScrollTopRef = useRef(0)
  const lastScrollHeightRef = useRef(0)
  const hasInitializedRef = useRef(false)
  const [showNewPill, setShowNewPill] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const onScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    lastScrollTopRef.current = el.scrollTop
    lastScrollHeightRef.current = el.scrollHeight
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 8) {
      setShowNewPill(false)
      setPendingCount(0)
    }
  }

  useLayoutEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return

    const hasNewEvents = events.length > prevCountRef.current
    const newItems = hasNewEvents ? events.length - prevCountRef.current : 0
    const previousScrollHeight = lastScrollHeightRef.current || el.scrollHeight
    const previousScrollTop = lastScrollTopRef.current || el.scrollTop
    prevCountRef.current = events.length

    // First render: just snapshot sizes, no scroll movement.
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      lastScrollHeightRef.current = el.scrollHeight
      lastScrollTopRef.current = el.scrollTop
      return
    }

    if (!hasNewEvents) {
      lastScrollHeightRef.current = el.scrollHeight
      lastScrollTopRef.current = el.scrollTop
      return
    }

    // ABSOLUTELY NO AUTO-SCROLL. We only lock the user's visible pixel offset
    // so new items being appended below never shift what they are reading.
    // Items are appended to the bottom, so scrollTop does not need to change,
    // but we re-assert it defensively to neutralize any browser scroll anchoring.
    el.scrollTop = previousScrollTop

    setShowNewPill(true)
    setPendingCount((count) => count + newItems)

    lastScrollHeightRef.current = el.scrollHeight
    lastScrollTopRef.current = el.scrollTop
    // Suppress pill if user happens to already be at bottom.
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 8) {
      setShowNewPill(false)
      setPendingCount(0)
    }
  }, [events])

  const jumpToLatest = () => {
    const el = scrollContainerRef.current
    if (!el) return
    setShowNewPill(false)
    setPendingCount(0)
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
          className="terminal-body scanline-overlay audit-scroll space-y-2 text-xs font-mono p-3"
        >
          <AnimatePresence initial={false}>
            {events.map((event, idx) => (
              <motion.div
                key={`${event.poll}-${event.roundId}-${event.participant}-${event.score}-${event.duplicate}-${event.emittedAt ?? idx}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
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
            ↓ New events {pendingCount > 0 ? `(${pendingCount})` : ''}
          </motion.button>
        )}
      </AnimatePresence>
    </section>
  )
}

export default memo(AuditLog)
