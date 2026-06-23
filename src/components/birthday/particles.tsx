'use client'

import { motion } from "framer-motion"

// Floating electric embers — purple particles drifting upward,
// inspired by Cyno's Electro energy.
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: (i * 5.5 + 3) % 100,
  delay: i * 0.7,
  duration: 9 + (i % 5) * 2,
  size: 1.5 + (i % 3),
}))

export function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            bottom: -20,
            width: p.size,
            height: p.size,
            background: '#c084fc',
            boxShadow: '0 0 6px #a855f7, 0 0 12px #7c3aed',
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{
            y: [0, -800, -1200],
            opacity: [0, 0.7, 0],
            x: [0, 25, -15, 8],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  )
}
