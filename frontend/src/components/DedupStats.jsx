import CountUp from 'react-countup'
import { memo } from 'react'

function DedupStats({ totalEvents, duplicates, unique }) {
  const cards = [
    { label: 'Total Events Received', value: totalEvents },
    { label: 'Duplicates Removed', value: duplicates },
    { label: 'Unique Events Processed', value: unique },
  ]
  return (
    <div className="grid md:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div className="panel glass" key={card.label}>
          <div className="text-xs text-[#4A5568] tracking-[0.22em] uppercase font-mono">{card.label}</div>
          <div className="text-3xl font-bold text-[#F0C060] mt-2">
            <CountUp end={card.value} duration={0.6} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default memo(DedupStats)
