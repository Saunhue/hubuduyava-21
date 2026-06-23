'use client'

import { motion } from "framer-motion"

interface BalloonProps {
  color: string
  delay: number
  x: number
  duration: number
  size?: number
}

function Balloon({ color, delay, x, duration, size = 60 }: BalloonProps) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${x}%`, bottom: -100 }}
      initial={{ y: 0, opacity: 0 }}
      animate={{
        y: [0, -800, -1200],
        opacity: [0, 1, 1, 0],
        x: [0, 30, -20, 10],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <div className="relative" style={{ width: size, height: size * 1.2 }}>
        {/* Balloon body */}
        <div
          className="w-full h-full rounded-full relative"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${color}, ${color}dd, ${color}aa)`,
            boxShadow: `inset -8px -8px 16px rgba(0,0,0,0.15), 0 4px 12px ${color}44`,
          }}
        >
          {/* Highlight */}
          <div
            className="absolute rounded-full bg-white/40"
            style={{ width: '25%', height: '25%', top: '15%', left: '20%' }}
          />
        </div>
        {/* Balloon knot */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ bottom: -6, width: 0, height: 0 }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              background: color,
              transform: 'rotate(45deg)',
            }}
          />
        </div>
        {/* String */}
        <svg
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: size * 1.2, height: 80 }}
          width="2"
          viewBox="0 0 2 80"
        >
          <path d="M1,0 Q3,20 1,40 Q-1,60 1,80" stroke="#999" strokeWidth="1" fill="none" />
        </svg>
      </div>
    </motion.div>
  )
}

const BALLOON_COLORS = [
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
  "#a855f7", // purple-500
  "#d946ef", // fuchsia-500
  "#f59e0b", // amber-500
  "#fb923c", // orange-400
  "#facc15", // yellow-400
]

export function Balloons() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {BALLOON_COLORS.map((color, i) => (
        <Balloon
          key={i}
          color={color}
          delay={i * 1.2}
          x={(i * 14 + 8) % 95}
          duration={12 + (i % 4) * 2}
          size={50 + (i % 3) * 15}
        />
      ))}
    </div>
  )
}
