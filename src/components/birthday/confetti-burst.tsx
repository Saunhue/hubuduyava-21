'use client'

import { motion } from "framer-motion"
import { useMemo } from "react"

interface ConfettiPiece {
  id: number
  x: number
  rotation: number
  color: string
  delay: number
  duration: number
  size: number
  shape: 'circle' | 'square' | 'rect' | 'slash'
}

// Dark-themed confetti: purple, deep purple, white, near-black
const COLORS = [
  "#a855f7", // purple-500
  "#7c3aed", // violet-600
  "#c084fc", // purple-400
  "#ffffff", // white
  "#27272a", // zinc-800
  "#d8b4fe", // purple-300
]

// Deterministic pseudo-random — stable per trigger (avoids SSR mismatch)
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function generatePieces(trigger: number): ConfettiPiece[] {
  return Array.from({ length: 70 }, (_, i) => {
    const r1 = seededRandom(trigger * 1000 + i)
    const r2 = seededRandom(trigger * 1000 + i + 500)
    const r3 = seededRandom(trigger * 1000 + i + 1000)
    const r4 = seededRandom(trigger * 1000 + i + 1500)
    const r5 = seededRandom(trigger * 1000 + i + 2000)
    return {
      id: trigger * 1000 + i,
      x: r1 * 100,
      rotation: r2 * 720 - 360,
      color: COLORS[Math.floor(r3 * COLORS.length)],
      delay: r4 * 0.3,
      duration: 2 + r5 * 1.5,
      size: 6 + r1 * 10,
      shape: (['circle', 'square', 'rect', 'slash'] as const)[Math.floor(r2 * 4)],
    }
  })
}

interface ConfettiBurstProps {
  trigger: number
}

export function ConfettiBurst({ trigger }: ConfettiBurstProps) {
  const pieces = useMemo(() => {
    if (trigger === 0) return []
    return generatePieces(trigger)
  }, [trigger])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => {
        const isSlash = piece.shape === 'slash'
        return (
          <motion.div
            key={piece.id}
            className="absolute top-0"
            style={{
              left: `${piece.x}%`,
              width: isSlash ? 2 : piece.shape === 'rect' ? piece.size * 0.4 : piece.size,
              height: isSlash ? piece.size * 1.5 : piece.shape === 'rect' ? piece.size * 1.4 : piece.size,
              background: piece.color,
              borderRadius: piece.shape === 'circle' ? '50%' : piece.shape === 'rect' ? '1px' : '0',
              boxShadow: piece.color === '#a855f7' || piece.color === '#7c3aed' || piece.color === '#c084fc' || piece.color === '#d8b4fe'
                ? `0 0 6px ${piece.color}` : 'none',
            }}
            initial={{ y: -50, opacity: 1, rotate: 0 }}
            animate={{
              y: 1100,
              opacity: [1, 1, 0.7, 0],
              rotate: piece.rotation,
              x: [0, 25, -15, 8],
            }}
            transition={{
              duration: piece.duration,
              delay: piece.delay,
              ease: "easeOut",
            }}
          />
        )
      })}
    </div>
  )
}
