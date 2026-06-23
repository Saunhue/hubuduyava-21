'use client'

import { motion } from "framer-motion"
import { useMemo } from "react"

interface LightningBolt {
  id: number
  d: string
  delay: number
  scale: number
}

// Deterministic pseudo-random — stable per trigger
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

// Generate jagged lightning paths in a 100x100 viewBox
function generateBolts(trigger: number): LightningBolt[] {
  return Array.from({ length: 6 }, (_, i) => {
    const startX = 10 + i * 16
    let path = `M ${startX} 0`
    let x = startX
    let y = 0
    while (y < 100) {
      const step = 4 + seededRandom(trigger * 100 + i * 7) * 6
      y += step
      x += (seededRandom(trigger * 100 + i * 7 + 1) - 0.5) * 14
      path += ` L ${x} ${y}`
    }
    return {
      id: trigger * 100 + i,
      d: path,
      delay: seededRandom(trigger * 100 + i * 7 + 2) * 0.25,
      scale: 0.7 + seededRandom(trigger * 100 + i * 7 + 3) * 0.5,
    }
  })
}

interface LightningProps {
  trigger: number
}

export function Lightning({ trigger }: LightningProps) {
  const bolts = useMemo(() => {
    if (trigger === 0) return []
    return generateBolts(trigger)
  }, [trigger])

  if (trigger === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Background flash — bright purple explosion */}
      <motion.div
        key={`flash-${trigger}`}
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(168,85,247,0.6), rgba(124,58,237,0.2) 40%, transparent 70%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0.4, 0] }}
        transition={{ duration: 0.7, times: [0, 0.15, 0.4, 1] }}
      />

      {/* Lightning bolts SVG */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {bolts.map((bolt) => (
          <motion.path
            key={bolt.id}
            d={bolt.d}
            stroke="#e9d5ff"
            strokeWidth="0.25"
            fill="none"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{
              opacity: [0, 1, 1, 0.6, 0],
              pathLength: [0, 1, 1, 1, 1],
            }}
            transition={{
              duration: 0.7,
              delay: bolt.delay,
              times: [0, 0.15, 0.4, 0.7, 1],
            }}
            style={{
              filter: 'drop-shadow(0 0 3px #a855f7) drop-shadow(0 0 6px #7c3aed) drop-shadow(0 0 12px #7c3aed)',
              transform: `scale(${bolt.scale})`,
              transformOrigin: 'top center',
            }}
          />
        ))}
      </svg>

      {/* Secondary smaller flash overlay */}
      <motion.div
        key={`flash2-${trigger}`}
        className="absolute inset-0 bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.15, 0] }}
        transition={{ duration: 0.3, times: [0, 0.3, 1] }}
      />
    </div>
  )
}
