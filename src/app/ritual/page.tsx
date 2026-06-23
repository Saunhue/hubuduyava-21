'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Eye,
  Skull,
  Moon,
  Sun,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Zap,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  Sparkles,
  Link2,
} from "lucide-react"
import { Navbar } from "@/components/birthday/navbar"
import { Particles } from "@/components/birthday/particles"
import { sfx } from "@/components/birthday/sound"

// ============================================================
//  CYNO RITUAL — Judgement of Anubis
//  Rituals 02, 03, 04 (Ritual 01 = candle blow on /home)
//
//  Mechanic:
//   - "Eye of Anubis" symbol flashes somewhere on the playfield.
//   - Player must click it WHILE visible to count a Judgement.
//   - Each ritual has a target number of judgements to pass.
//
//  Fixes from previous version:
//   - Larger hit area (80x80 button, not 56x56)
//   - 250ms grace period after visible window ends (clicks still
//     count) so quick late-clicks don't get unfairly marked as miss
//   - Ritual 04 timing slowed down (visibleMs 800 → 1100)
// ============================================================

type RitualId = 2 | 3 | 4

interface RitualConfig {
  id: RitualId
  title: string
  subtitle: string
  target: number
  durationMs: number
  eyeVisibleMs: number
  spawnCount: number
  flavor: string
}

const RITUALS: Record<RitualId, RitualConfig> = {
  2: {
    id: 2,
    title: "Ritual 02 · Mata Anubis",
    subtitle: "Click the eye when it appears. Collect 5 judgements.",
    target: 5,
    durationMs: 22000,
    eyeVisibleMs: 1700,
    spawnCount: 9,
    flavor:
      "Cyno membuka pengadilan pertamanya. Mata Anubis muncul di padang pasir — kapan saja, di mana saja. Klik tepat saat ia menatapmu.",
  },
  3: {
    id: 3,
    title: "Ritual 03 · Serigala Gurun",
    subtitle: "Mata muncul lebih cepat. 7 judgement untuk lulus.",
    target: 7,
    durationMs: 26000,
    eyeVisibleMs: 1300,
    spawnCount: 12,
    flavor:
      "Dalam kegelapan, mata Anubis berkedip lebih singkat. Konsentrasimu diuji — apakah kamu sanggup menahan tatapannya tujuh kali?",
  },
  4: {
    id: 4,
    title: "Ritual 04 · Mode Jackal",
    subtitle: "Full speed. 9 judgement untuk menyelesaikan ritual.",
    target: 9,
    durationMs: 30000,
    eyeVisibleMs: 1100, // was 800 — slowed down per user feedback
    spawnCount: 15,
    flavor:
      "Cyno memasuki Mode Jackal. Mata Anubis berkilat secepat kilat. Sembilan kali pengadilan — dan kamu menjadi pengendali keadilan.",
  },
}

interface Spawn {
  id: number
  x: number
  y: number
  visibleUntil: number // eye disappears from view at this timestamp
  clickableUntil: number // grace period — clicks until this still count
  clicked: boolean
}

type GameState = "idle" | "playing" | "won" | "lost"

const GRACE_MS = 250 // extra time after visibleUntil during which clicks still count

export default function RitualPage() {
  const [currentRitualId, setCurrentRitualId] = useState<RitualId>(2)
  const [gameState, setGameState] = useState<GameState>("idle")
  const [judgements, setJudgements] = useState(0)
  const [misses, setMisses] = useState(0)
  const [spawns, setSpawns] = useState<Spawn[]>([])
  const [timeLeft, setTimeLeft] = useState(0)
  const [wolfMode, setWolfMode] = useState(false)
  const [completed, setCompleted] = useState<Set<RitualId>>(new Set())
  // Seal-break animation state — plays after Ritual 04 wins, before Next button
  const [sealBreaking, setSealBreaking] = useState(false)
  const [sealBroken, setSealBroken] = useState(false)

  const ritual = RITUALS[currentRitualId]
  const spawnIdRef = useRef(0)
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const startTimeRef = useRef(0)
  const judgementsRef = useRef(0)
  const missesRef = useRef(0)

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t))
    timeoutsRef.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const startRitual = useCallback(
    (rid: RitualId) => {
      clearTimers()
      const cfg = RITUALS[rid]
      setCurrentRitualId(rid)
      setJudgements(0)
      judgementsRef.current = 0
      setMisses(0)
      missesRef.current = 0
      setSpawns([])
      setWolfMode(false)
      setGameState("playing")
      setTimeLeft(Math.ceil(cfg.durationMs / 1000))
      sfx.reveal()

      const now = Date.now()
      startTimeRef.current = now

      const leadIn = 600
      const tail = 800
      const span = cfg.durationMs - leadIn - tail
      const slot = span / cfg.spawnCount

      const spawnTimes: number[] = []
      for (let i = 0; i < cfg.spawnCount; i++) {
        const base = leadIn + i * slot
        const jitter = (Math.random() - 0.5) * slot * 0.6
        spawnTimes.push(Math.max(leadIn, base + jitter))
      }

      spawnTimes.forEach((t) => {
        const timer = setTimeout(() => {
          const id = ++spawnIdRef.current
          // Keep eyes inside the playfield with sensible margins so
          // they don't render off the edge (where clicks would miss)
          const x = 12 + Math.random() * 76
          const y = 18 + Math.random() * 64
          const visibleUntil = Date.now() + cfg.eyeVisibleMs
          const clickableUntil = visibleUntil + GRACE_MS

          setSpawns((prev) => [...prev, { id, x, y, visibleUntil, clickableUntil, clicked: false }])
          sfx.eyeFlash()

          // Expire timer — only count as miss if NOT clicked by then
          const expireTimer = setTimeout(() => {
            setSpawns((prev) => {
              const sp = prev.find((s) => s.id === id)
              if (sp && !sp.clicked) {
                missesRef.current += 1
                setMisses(missesRef.current)
                sfx.lose()
              }
              return prev.filter((s) => s.id !== id)
            })
          }, cfg.eyeVisibleMs + GRACE_MS)
          timeoutsRef.current.push(expireTimer)
        }, t)
        timeoutsRef.current.push(timer)
      })

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        const remaining = Math.max(0, Math.ceil((cfg.durationMs - elapsed) / 1000))
        setTimeLeft(remaining)
        if (remaining <= 0) clearInterval(interval)
      }, 250)
      timeoutsRef.current.push(interval as unknown as ReturnType<typeof setTimeout>)

      const endTimer = setTimeout(() => {
        const finalJ = judgementsRef.current
        const won = finalJ >= cfg.target
        if (won) {
          setCompleted((prev) => new Set(prev).add(cfg.id))
          if (cfg.id === 4) {
            setWolfMode(true)
            // Trigger seal-break animation for Law room unlock
            setTimeout(() => {
              setSealBreaking(true)
              sfx.seal()
              // Mark ritual done in sessionStorage so home page unlocks Law
              // (sessionStorage = cleared when tab is closed → seals come back)
              try { sessionStorage.setItem("yava21_ritual_done", "1") } catch {}
              // After seal break completes, show Next button
              setTimeout(() => {
                setSealBreaking(false)
                setSealBroken(true)
                sfx.reveal()
              }, 2400)
            }, 800)
          }
          sfx.win()
        } else {
          sfx.lose()
        }
        setGameState(won ? "won" : "lost")
      }, cfg.durationMs + 100)
      timeoutsRef.current.push(endTimer)
    },
    [clearTimers]
  )

  const onEyeClick = (id: number) => {
    const now = Date.now()
    setSpawns((prev) => {
      const sp = prev.find((s) => s.id === id)
      // Click valid if: not already clicked AND within clickable window
      // (visibleUntil + grace period)
      if (!sp || sp.clicked) return prev
      if (now > sp.clickableUntil) return prev
      judgementsRef.current += 1
      setJudgements(judgementsRef.current)
      sfx.judgement()
      return prev.map((s) => (s.id === id ? { ...s, clicked: true } : s))
    })
    // Remove the eye after a short fade-out
    const removeTimer = setTimeout(() => {
      setSpawns((prev) => prev.filter((s) => s.id !== id))
    }, 250)
    timeoutsRef.current.push(removeTimer)
  }

  const goNext = () => {
    const next = currentRitualId < 4 ? ((currentRitualId + 1) as RitualId) : null
    if (next) {
      sfx.click()
      startRitual(next)
    }
  }

  const restart = () => {
    sfx.click()
    startRitual(currentRitualId)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-amber-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
      </div>
      <Navbar />
      <Particles />

      <main className="relative z-10 pt-20 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/home"
            onClick={() => sfx.click()}
            onMouseEnter={() => sfx.hover()}
            className="inline-flex items-center gap-1.5 text-xs font-mono tracking-[0.2em] uppercase text-purple-400/80 hover:text-purple-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" />
            Back Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-3 text-amber-400/80 mb-4">
              <span className="w-8 h-px bg-amber-500/40" />
              <span className="text-xs tracking-[0.5em] font-mono">
                JUDGEMENT ·{" "}
                <ruby>
                  審判<rt>しんぱん</rt>
                </ruby>
              </span>
              <span className="w-8 h-px bg-amber-500/40" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-black uppercase mb-3">
              Ritual <span className="text-amber-400">Cyno</span>
            </h1>
            <p className="text-white/60 max-w-xl mx-auto">
              Tiga ritual menunggu. Setiap ritual menuntut fokus yang lebih tajam.
              Selesaikan ketiganya untuk membuka Mode Jackal — bentuk terkuat Cyno.
            </p>
          </motion.div>

          {/* Ritual selector — text rows, no boxes */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10">
            {([2, 3, 4] as RitualId[]).map((rid) => {
              const cfg = RITUALS[rid]
              const isDone = completed.has(rid)
              const isActive = currentRitualId === rid && gameState !== "idle"
              return (
                <button
                  key={rid}
                  onClick={() => {
                    if (gameState === "playing") return
                    sfx.click()
                    setCurrentRitualId(rid)
                    setGameState("idle")
                  }}
                  disabled={gameState === "playing"}
                  onMouseEnter={() => sfx.hover()}
                  className={`relative p-3 sm:p-4 border text-left transition-all ${
                    isActive
                      ? "border-amber-500 bg-amber-500/5"
                      : isDone
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-purple-500/20 hover:border-purple-400/40"
                  } ${gameState === "playing" ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono tracking-[0.2em] text-amber-400/70">
                      RITUAL · 0{rid}
                    </span>
                    {isDone && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                  </div>
                  <p className="text-xs sm:text-sm font-bold uppercase">
                    {cfg.title.split("·")[1].trim()}
                  </p>
                  <p className="text-[10px] text-white/40 mt-1">Target: {cfg.target}</p>
                </button>
              )
            })}
          </div>

          {/* Current ritual panel — single bordered region */}
          <div className="border border-purple-500/20 bg-black/40 backdrop-blur-sm">
            <div className="p-5 border-b border-purple-500/15">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase">{ritual.title}</h2>
                  <p className="text-xs text-white/50 mt-1">{ritual.subtitle}</p>
                </div>
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <p className="text-2xl font-black font-mono text-amber-400">
                      {judgements}
                      <span className="text-sm text-white/40">/{ritual.target}</span>
                    </p>
                    <p className="text-[10px] tracking-widest text-white/40 uppercase">Hit</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black font-mono text-red-400">{misses}</p>
                    <p className="text-[10px] tracking-widest text-white/40 uppercase">Miss</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black font-mono text-purple-400">{timeLeft}s</p>
                    <p className="text-[10px] tracking-widest text-white/40 uppercase">Left</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Playfield */}
            <div className="relative h-[420px] sm:h-[480px] overflow-hidden bg-gradient-to-b from-[#0a0510] to-[#050208]">
              <div
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(251,191,36,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.5) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />

              {gameState === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-6"
                  >
                    <Eye className="w-14 h-14 text-amber-400/80" />
                  </motion.div>
                  <p className="text-sm text-white/70 max-w-md mb-2 italic">
                    &ldquo;{ritual.flavor}&rdquo;
                  </p>
                  <p className="text-xs text-white/40 mb-8">
                    {ritual.spawnCount} kemunculan mata · {(ritual.eyeVisibleMs / 1000).toFixed(1)}s window + grace
                  </p>
                  <button
                    onClick={() => startRitual(currentRitualId)}
                    onMouseEnter={() => sfx.hover()}
                    className="group inline-flex items-center gap-3 px-6 py-3 border border-amber-500/50 hover:border-amber-400 hover:bg-amber-500/5 transition-colors"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold uppercase tracking-[0.2em]">
                      Start Ritual
                    </span>
                  </button>
                </div>
              )}

              {gameState === "playing" &&
                spawns.map((s) => (
                  <motion.button
                    key={s.id}
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    onClick={() => onEyeClick(s.id)}
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
                    aria-label="Eye of Anubis — click to judge"
                  >
                    {/* Larger hit area: 80x80 transparent button with visible
                        56x56 eye in the center. The padding ensures clicks
                        near the eye count, even if not pixel-perfect on the icon. */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
                      <motion.div
                        animate={{
                          scale: [1, 1.08, 1],
                          filter: [
                            "drop-shadow(0 0 8px rgba(251,191,36,0.6))",
                            "drop-shadow(0 0 16px rgba(251,191,36,0.9))",
                            "drop-shadow(0 0 8px rgba(251,191,36,0.6))",
                          ],
                        }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full border-2 border-amber-400 bg-black/70"
                      >
                        <Eye className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300" />
                        <svg
                          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
                          viewBox="0 0 64 64"
                        >
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="rgba(251,191,36,0.2)"
                            strokeWidth="2"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="2"
                            strokeDasharray={2 * Math.PI * 28}
                            strokeDashoffset={0}
                            style={{
                              animation: `eyeCountdown${s.id} ${ritual.eyeVisibleMs}ms linear forwards`,
                            }}
                          />
                        </svg>
                        <style jsx>{`
                          @keyframes eyeCountdown${s.id} {
                            from { stroke-dashoffset: 0; }
                            to { stroke-dashoffset: ${2 * Math.PI * 28}; }
                          }
                        `}</style>
                      </motion.div>
                    </div>
                  </motion.button>
                ))}

              {gameState === "won" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/60">
                  {/* Seal-break animation overlay (plays when Ritual 04 completes) */}
                  <AnimatePresence>
                    {(sealBreaking || sealBroken) && currentRitualId === 4 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
                      >
                        {sealBreaking && (
                          <>
                            {/* Sealed lock with chains */}
                            <motion.div
                              initial={{ scale: 1, opacity: 1 }}
                              animate={{ scale: [1, 1.1, 1, 1.15, 1.2], opacity: [1, 1, 1, 1, 0.8] }}
                              transition={{ duration: 0.8, times: [0, 0.3, 0.5, 0.7, 1] }}
                              className="relative"
                            >
                              <div className="relative w-24 h-24 rounded-full border-2 border-purple-500/60 bg-purple-950/40 flex items-center justify-center">
                                <Lock className="w-10 h-10 text-purple-300" />
                                {/* Chain arcs around the lock */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                                  <motion.path
                                    d="M 20 50 Q 20 20 50 20"
                                    fill="none"
                                    stroke="#a855f7"
                                    strokeWidth="2"
                                    strokeDasharray="4 3"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                                    transition={{ duration: 0.8 }}
                                  />
                                  <motion.path
                                    d="M 80 50 Q 80 20 50 20"
                                    fill="none"
                                    stroke="#a855f7"
                                    strokeWidth="2"
                                    strokeDasharray="4 3"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                                    transition={{ duration: 0.8, delay: 0.1 }}
                                  />
                                  <motion.path
                                    d="M 20 50 Q 20 80 50 80"
                                    fill="none"
                                    stroke="#a855f7"
                                    strokeWidth="2"
                                    strokeDasharray="4 3"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                                    transition={{ duration: 0.8, delay: 0.15 }}
                                  />
                                  <motion.path
                                    d="M 80 50 Q 80 80 50 80"
                                    fill="none"
                                    stroke="#a855f7"
                                    strokeWidth="2"
                                    strokeDasharray="4 3"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                  />
                                </svg>
                              </div>
                            </motion.div>

                            {/* Shatter burst */}
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: [0, 1.8, 3], opacity: [0, 1, 0] }}
                              transition={{ duration: 1, delay: 0.4, times: [0, 0.4, 1] }}
                              className="absolute"
                            >
                              <div className="w-32 h-32 rounded-full border-4 border-purple-300" />
                            </motion.div>

                            {/* Shards flying outward */}
                            {[...Array(8)].map((_, i) => {
                              const angle = (i * 360) / 8
                              const rad = (angle * Math.PI) / 180
                              const dx = Math.cos(rad) * 100
                              const dy = Math.sin(rad) * 100
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                  animate={{ x: dx, y: dy, opacity: [0, 1, 0], scale: [0, 1, 0.5] }}
                                  transition={{ duration: 1, delay: 0.4 }}
                                  className="absolute"
                                >
                                  <Sparkles className="w-4 h-4 text-purple-300" />
                                </motion.div>
                              )
                            })}

                            <motion.p
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: [0, 1, 1], y: [10, 0, 0] }}
                              transition={{ duration: 0.8, delay: 0.6 }}
                              className="absolute bottom-16 text-xs font-mono tracking-[0.4em] uppercase text-purple-300"
                            >
                              SEAL · BREAKING...
                            </motion.p>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Main win content (shown after seal completes, or immediately for rituals 02/03) */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="mb-4"
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-400" />
                  </motion.div>
                  <h3 className="text-2xl font-black uppercase text-green-400 mb-2">
                    Ritual Selesai
                  </h3>
                  <p className="text-sm text-white/70 mb-1">
                    {judgements} hit · {misses} miss
                  </p>
                  {wolfMode && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-xs text-amber-400 mb-2 tracking-widest uppercase font-mono"
                    >
                      ★ Mode Jackal Terbuka ★
                    </motion.p>
                  )}
                  {/* Seal-broken confirmation — only after Ritual 04 seal animation */}
                  {currentRitualId === 4 && sealBroken && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-xs text-purple-300 mb-4 tracking-widest uppercase font-mono flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Room Law · Segel Pecah
                      <Unlock className="w-3.5 h-3.5" />
                    </motion.p>
                  )}
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={restart}
                      onMouseEnter={() => sfx.hover()}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-white/20 hover:border-white/40 text-xs uppercase tracking-widest"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                    {currentRitualId < 4 ? (
                      <button
                        onClick={goNext}
                        onMouseEnter={() => sfx.hover()}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs uppercase tracking-widest"
                      >
                        Next Ritual
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : (
                      // Ritual 04 — Next button only shows AFTER seal is broken
                      sealBroken ? (
                        <Link
                          href="/room"
                          onClick={() => sfx.click()}
                          onMouseEnter={() => sfx.hover()}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs uppercase tracking-widest"
                        >
                          Next: Room Law
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 text-white/30 text-xs uppercase tracking-widest cursor-not-allowed">
                          <Lock className="w-3 h-3" />
                          Next: Room Law · Sealed
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {gameState === "lost" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/60">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="mb-4"
                  >
                    <XCircle className="w-16 h-16 text-red-400" />
                  </motion.div>
                  <h3 className="text-2xl font-black uppercase text-red-400 mb-2">
                    Ritual Gagal
                  </h3>
                  <p className="text-sm text-white/70 mb-4">
                    Cuma {judgements} dari {ritual.target} judgement. Coba lagi — mata muncul dengan pola baru.
                  </p>
                  <button
                    onClick={restart}
                    onMouseEnter={() => sfx.hover()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs uppercase tracking-widest"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-purple-500/15 flex items-center justify-between flex-wrap gap-2">
              <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase">
                <Sun className="inline w-3 h-3 mr-1 text-amber-400/60" />
                Eye = hit · Miss eye = miss
              </p>
              <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase">
                <Moon className="inline w-3 h-3 mr-1 text-purple-400/60" />
                Ritual {currentRitualId} / 4
              </p>
            </div>
          </div>

          {/* Tips — paragraph, no box */}
          <div className="mt-8">
            <p className="text-xs font-mono tracking-[0.2em] uppercase text-purple-400/80 mb-3">
              <Skull className="inline w-3.5 h-3.5 mr-1" />
              Catatan Mahamatra
            </p>
            <p className="text-sm text-white/60 leading-relaxed">
              Setiap ritual kasih kamu lebih banyak mata daripada target — jadi nggak perlu sempurna.
              Ritme lebih penting daripada kecepatan: baca pola munculnya, lalu klik tenang. Mata
              tetap di layar selama <span className="text-amber-300">{(ritual.eyeVisibleMs / 1000).toFixed(1)}s</span>,
              plus grace period 250ms buat klik yang agak telat — itu jendelamu.
              <br /><br />
              <span className="text-purple-300 italic">
                Pesan dari Kirie: nggak usah buru-buru, Yav. Mata munculnya random, tapi timing-nya bisa kamu baca. Tarik napas, klik pas keliatan, jangan klik sebelum keliatan. Hit area-nya juga udah dibikin lebih gede, jadi nggak usah presisi banget.
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
