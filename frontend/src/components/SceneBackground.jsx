import { memo, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useReducedMotion } from '../hooks/useReducedMotion'

function ArenaScene() {
  const torusRef = useRef(null)
  const particlesRef = useRef(null)
  const lightRefs = [useRef(null), useRef(null), useRef(null)]

  const particlePositions = useMemo(() => {
    const arr = new Float32Array(400 * 3)
    for (let i = 0; i < 400; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 40
      arr[i * 3 + 1] = Math.random() * 20 - 10
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40
    }
    return arr
  }, [])

  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()
    if (torusRef.current) {
      torusRef.current.rotation.y += 0.001
      torusRef.current.rotation.x = Math.sin(t * 0.12) * 0.1
    }
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.006 + Math.sin(t * 0.4 + i) * 0.001
        positions[i] += Math.sin(t * 0.35 + i) * 0.002
        if (positions[i + 1] > 14) positions[i + 1] = -10
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
    camera.position.x = Math.sin(t * 0.08) * 0.8
    camera.position.y = 3 + Math.cos(t * 0.08) * 0.4
    camera.lookAt(0, 0, 0)
  })

  return (
    <>
      <fogExp2 attach="fog" args={['#080A0F', 0.018]} />
      <ambientLight intensity={0.2} />
      <mesh ref={torusRef} position={[0, 4, -8]}>
        <torusKnotGeometry args={[8, 1.2, 240, 32]} />
        <meshBasicMaterial color="#C9943A" wireframe transparent opacity={0.06} />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particlePositions}
            count={particlePositions.length / 3}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.08} color="#F0C060" transparent opacity={0.6} />
      </points>

      {[-8, 0, 8].map((x, idx) => (
        <mesh key={x} ref={lightRefs[idx]} position={[x, 10, -6]} rotation={[-Math.PI / 2.7, 0, 0]}>
          <coneGeometry args={[4.2, 15, 24, 1, true]} />
          <shaderMaterial
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            uniforms={{ uColor: { value: new THREE.Color('#F0C060') }, uOpacity: { value: 0.08 } }}
            vertexShader={`
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={`
              uniform vec3 uColor;
              uniform float uOpacity;
              varying vec2 vUv;
              void main() {
                float alpha = (1.0 - vUv.y) * uOpacity;
                gl_FragColor = vec4(uColor, alpha);
              }
            `}
          />
        </mesh>
      ))}

      <gridHelper args={[120, 80, '#C9943A', '#C9943A']} position={[0, -2.5, 0]} />
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} intensity={0.8} radius={0.4} />
      </EffectComposer>
    </>
  )
}

function SceneBackground() {
  const reduced = useReducedMotion()
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false
  if (reduced || isMobile) return null

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none">
      <Canvas
        camera={{ position: [0, 3, 15], fov: 48 }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <color attach="background" args={['#080A0F']} />
        <ArenaScene />
      </Canvas>
    </div>
  )
}

export default memo(SceneBackground)
