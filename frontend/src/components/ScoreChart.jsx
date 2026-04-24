import { memo } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useReducedMotion } from '../hooks/useReducedMotion'

function ScoreChart({ entries }) {
  const reduced = useReducedMotion()
  const hasData = Array.isArray(entries) && entries.length > 0

  return (
    <section className="score-distribution-module">
      <div className="module-label">SCORE DISTRIBUTION</div>
      <div className={`panel chart-stage score-distribution-shell ${reduced ? '' : 'perspective-3d'}`}>
        <div className="score-distribution-inner">
          {!hasData ? (
            <div className="score-distribution-skeleton" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={entries} layout="vertical" margin={{ left: 12, right: 12 }} barCategoryGap={10}>
                <defs>
                  <linearGradient id="goldBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#C9943A" />
                    <stop offset="100%" stopColor="#F0C060" />
                  </linearGradient>
                  <filter id="barGlow">
                    <feGaussianBlur stdDeviation="2.8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <XAxis type="number" stroke="#C9943A" tick={{ fill: '#C9943A', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="participant" type="category" stroke="#C9943A" width={100} tick={{ fill: '#C9943A', fontFamily: 'JetBrains Mono', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar
                  dataKey="totalScore"
                  fill="url(#goldBar)"
                  radius={[10, 10, 10, 10]}
                  animationDuration={1200}
                  animationEasing="ease-out"
                  filter="url(#barGlow)"
                >
                  {entries.map((entry) => (
                    <Cell key={entry.participant} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  )
}

export default memo(ScoreChart)
