'use client'

import { motion, AnimatePresence } from "framer-motion"

// "ROOM" ability dome — inspired by Trafalgar Law's Ope Ope no Mi.
// Expands outward from the cake center when the candle is blown.
interface RoomEffectProps {
  active: boolean
}

export function RoomEffect({ active }: RoomEffectProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.2 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            duration: 0.9,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <svg
            viewBox="0 0 500 500"
            className="w-full h-full"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))',
            }}
          >
            <defs>
              <radialGradient id="roomFill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0" />
                <stop offset="60%" stopColor="#a855f7" stopOpacity="0.05" />
                <stop offset="92%" stopColor="#a855f7" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="roomStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>

            {/* Inner gradient fill */}
            <circle cx="250" cy="250" r="240" fill="url(#roomFill)" />

            {/* Outer ring (solid, thin) */}
            <circle
              cx="250"
              cy="250"
              r="240"
              fill="none"
              stroke="#a855f7"
              strokeWidth="1.5"
              opacity="0.7"
            />

            {/* Rotating dashed ring */}
            <motion.circle
              cx="250"
              cy="250"
              r="240"
              fill="none"
              stroke="url(#roomStroke)"
              strokeWidth="2"
              strokeDasharray="14 8"
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: '250px 250px' }}
            />

            {/* Inner rotating ring (opposite direction) */}
            <motion.circle
              cx="250"
              cy="250"
              r="220"
              fill="none"
              stroke="#d8b4fe"
              strokeWidth="0.8"
              strokeDasharray="4 12"
              opacity="0.5"
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: '250px 250px' }}
            />

            {/* Geometric markers around the dome — like Law's sigils */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
              const rad = (angle * Math.PI) / 180
              const x = 250 + 240 * Math.cos(rad)
              const y = 250 + 240 * Math.sin(rad)
              return (
                <motion.g
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0.6, 1], scale: 1 }}
                  transition={{
                    duration: 1.2,
                    delay: 0.3 + i * 0.05,
                    times: [0, 0.4, 0.7, 1],
                  }}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                >
                  <circle cx={x} cy={y} r="4" fill="none" stroke="#c084fc" strokeWidth="1" />
                  <circle cx={x} cy={y} r="1.5" fill="#e9d5ff" />
                </motion.g>
              )
            })}

            {/* Center crosshair */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0.2, 0.4] }}
              transition={{ duration: 3, repeat: Infinity, times: [0, 0.3, 0.6, 1] }}
            >
              <line x1="250" y1="230" x2="250" y2="270" stroke="#a855f7" strokeWidth="0.5" opacity="0.6" />
              <line x1="230" y1="250" x2="270" y2="250" stroke="#a855f7" strokeWidth="0.5" opacity="0.6" />
            </motion.g>
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
