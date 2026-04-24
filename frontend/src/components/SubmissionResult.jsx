import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function ConfettiField() {
  const pointsRef = useRef(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(100 * 3)
    for (let i = 0; i < 100; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 12
      arr[i * 3 + 1] = (Math.random() - 0.5) * 6
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return arr
  }, [])
  useFrame(({ clock }) => {
    if (!pointsRef.current) return
    const t = clock.getElapsedTime()
    const arr = pointsRef.current.geometry.attributes.position.array
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] += 0.02 - Math.abs(Math.sin(t + i)) * 0.006
      arr[i] += Math.sin(t * 0.6 + i) * 0.004
      if (arr[i + 1] > 5) arr[i + 1] = -4
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true
  })
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={positions.length / 3} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.12} color={new THREE.Color('#F0C060')} transparent opacity={0.85} />
    </points>
  )
}

function SubmissionResult({ submit }) {
  if (!submit) return null
  const ok = submit.isCorrect
  const [showOverlay, setShowOverlay] = useState(false)
  const [soundOn, setSoundOn] = useState(false)

  useEffect(() => {
    if (!ok) return
    setShowOverlay(true)
    const timeout = setTimeout(() => setShowOverlay(false), 4000)
    return () => clearTimeout(timeout)
  }, [ok])

  useEffect(() => {
    if (!soundOn) return
    const audio = new window.AudioContext()
    const freqs = [261.63, 329.63, 392.0]
    const gains = []
    const now = audio.currentTime
    freqs.forEach((freq) => {
      const osc = audio.createOscillator()
      const gain = audio.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.12, now + 2)
      osc.connect(gain).connect(audio.destination)
      osc.start(now)
      osc.stop(now + 2.2)
      gains.push(gain)
    })
    return () => {
      gains.forEach((g) => g.disconnect())
      audio.close()
    }
  }, [soundOn])

  return (
    <>
      {showOverlay && (
        <motion.div className="fixed inset-0 z-40 bg-[#080A0F]/80 backdrop-blur-2xl flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Canvas className="absolute inset-0">
            <ConfettiField />
          </Canvas>
          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 220, damping: 22 }}
          >
            <div className="submitted-title">SUBMITTED</div>
            <motion.div
              className="panel mt-6 min-w-[320px] mx-auto text-left"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 200, damping: 22 }}
            >
              <div className="text-sm text-slate-200">Submitted Total: {submit.submittedTotal}</div>
              <div className="text-sm text-slate-200">Expected Total: {submit.expectedTotal}</div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
      <motion.div layout className={`panel ${ok ? 'border-green-500/40' : 'border-red-500/40'}`}>
        <h3 className="text-lg font-semibold mb-2">Submission Result</h3>
        <div className={ok ? 'text-green-400' : 'text-red-400'}>
          {ok ? '✔ Correct Submission' : '✖ Validation Failed'}
        </div>
        <div className="text-sm mt-2 text-gray-300">Idempotent: {String(submit.isIdempotent)}</div>
        <div className="text-sm text-gray-300">Submitted Total: {submit.submittedTotal}</div>
        <div className="text-sm text-gray-300">Expected Total: {submit.expectedTotal}</div>
        <div className="text-xs text-gray-400 mt-2">{submit.message}</div>
        {ok && (
          <button className="mt-3 text-xs px-2 py-1 rounded border border-[#C9943A]/40 text-[#F0C060]" onClick={() => setSoundOn(true)}>
            🔈 enable ambient swell
          </button>
        )}
      </motion.div>
    </>
  )
}

export default memo(SubmissionResult)
