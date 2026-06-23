'use client'

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Gift as GiftIcon,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  Eye,
  ScanLine,
  Zap,
  Crosshair,
  Diamond,
  Sparkles,
  Lock,
  Unlock,
  Heart,
} from "lucide-react"
import { Navbar } from "@/components/birthday/navbar"
import { Particles } from "@/components/birthday/particles"
import { ConfettiBurst } from "@/components/birthday/confetti-burst"
import { Lightning } from "@/components/birthday/lightning"
import { sfx } from "@/components/birthday/sound"

// ============================================================
//  GIFT CLAIM — Multi-stage interactive ritual
//
//  Layout (per user spec):
//   1. IDENTITY BOX (no photo) — Yava bounty-style card
//      "YAVA · ONLY ALIVE · BOUNTY: ∞ (atau 1× hadiah spesial dari Kirie)"
//   2. THREE GAMES (in order):
//      a) Scan       — hold to scan, reveal the seal
//      b) Counter Shock — click to charge to 100%, lightning strikes
//      c) Injection Shot — precision timing click (3 hits)
//   3. After all 3 games complete → gift claimed screen
//      (matches dropped screenshots design)
//      - "VOUCHER · CLAIMED" / "HADIAH DIKLAIM" / "贈り物"
//      - Three-column: PENERIMA | PEMBERI | TANGGAL
//      - "BERLAKU SELAMANYA" (1× use, no expiry)
//      - Hidden message reveal
//   4. After claim → secondary voucher for when physical gift is taken
//      - Must answer Kirie's secret code to unlock tear mode
//      - Then slash to tear (only Kirie knows the answer → only Kirie tears)
// ============================================================

type Phase = "intro" | "games" | "claimed" | "voucher"

const SECRET_QUESTION = "Who are Kirie's first and second sons in Keyfam?"
const SECRET_ANSWER = "Keith Kirei and Keiz Kanne" // exact match (case-sensitive)

export default function GiftPage() {
  const [phase, setPhase] = useState<Phase>("intro")
  const [gameIdx, setGameIdx] = useState(0) // 0=scan, 1=counter, 2=injection
  const [gamesDone, setGamesDone] = useState<boolean[]>([false, false, false])
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [lightningTrigger, setLightningTrigger] = useState(0)
  // Gate: user must have completed Cyno ritual + Law room before they can
  // start the gift ritual. sessionStorage keys match the home page.
  // sessionStorage is cleared when the tab is closed → if Yava closes
  // the tab and reopens the site, this gate re-seals automatically.
  // (Clearing browser history does NOT reset sessionStorage.)
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => {
    try {
      const r = sessionStorage.getItem("yava21_ritual_done") === "1"
      const rm = sessionStorage.getItem("yava21_room_done") === "1"
      setUnlocked(r && rm)
    } catch {
      setUnlocked(false)
    }
  }, [])

  const handleGameComplete = (idx: number) => {
    const next = [...gamesDone]
    next[idx] = true
    setGamesDone(next)
    sfx.win()
    if (idx < 2) {
      // Move to next game after a short delay
      setTimeout(() => {
        setGameIdx(idx + 1)
        sfx.reveal()
      }, 1500)
    } else {
      // All games done → mark gift done in sessionStorage + claim phase
      try { sessionStorage.setItem("yava21_gift_done", "1") } catch {} // cleared on tab close
      setTimeout(() => {
        setPhase("claimed")
        setConfettiTrigger((t) => t + 1)
        sfx.reveal()
      }, 1500)
    }
  }

  const reset = () => {
    sfx.click()
    setPhase("intro")
    setGameIdx(0)
    setGamesDone([false, false, false])
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-amber-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
      </div>
      <Navbar />
      <Particles />
      <ConfettiBurst trigger={confettiTrigger} />
      <Lightning trigger={lightningTrigger} />

      <main className="relative z-10 pt-20 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/home"
            onClick={() => sfx.click()}
            onMouseEnter={() => sfx.hover()}
            className="inline-flex items-center gap-1.5 text-xs font-mono tracking-[0.2em] uppercase text-purple-400/80 hover:text-purple-300 transition-colors mb-8"
          >
            <ArrowLeft className="w-3 h-3" />
            Back Home
          </Link>

          {/* ====== IDENTITY BOX (top, no photo) ====== */}
          <IdentityBox />

          {/* ====== INTRO PHASE ====== */}
          {phase === "intro" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-10 text-center"
            >
              <div className="inline-flex items-center gap-3 text-amber-400/80 mb-4">
                <span className="w-8 h-px bg-amber-500/40" />
                <span className="text-xs tracking-[0.5em] font-mono">
                  HADIAH · DARI KIRIE
                </span>
                <span className="w-8 h-px bg-amber-500/40" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-black uppercase mb-4 leading-tight">
                Klaim <span className="text-purple-400">Voucher</span>
              </h1>
              <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto mb-10 leading-relaxed">
                Voucher ini disegel pakai technique Ope Ope no Mi.
                Untuk bukanya, kamu harus lewati 3 tahap: <span className="text-cyan-300">Scan</span> untuk lihat isinya,{" "}
                <span className="text-amber-300">Counter Shock</span> buat nge-charge, lalu{" "}
                <span className="text-pink-300">Injection Shot</span> untuk presisi strike.
              </p>

              {/* 5-stage progress preview (intro → scan → counter → injection → claim) */}
              <div className="flex items-center justify-center gap-2 mb-10">
                {["Start", "Scan", "Counter", "Injection", "Claim"].map((label, i) => (
                  <div key={label} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full border border-purple-500/40 flex items-center justify-center text-[10px] font-mono text-purple-300/60">
                        {i + 1}
                      </div>
                      <span className="text-[9px] font-mono text-white/40 mt-1 uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                    {i < 4 && <div className="w-6 h-px bg-purple-500/30 mx-1 mb-4" />}
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  sfx.click()
                  setPhase("games")
                }}
                onMouseEnter={() => sfx.hover()}
                disabled={!unlocked}
                className={`group inline-flex items-center gap-3 px-8 py-4 border-2 transition-colors ${
                  unlocked
                    ? "border-purple-400 bg-purple-500/10 hover:bg-purple-500/20"
                    : "border-purple-500/30 bg-purple-500/5 cursor-not-allowed opacity-60"
                }`}
              >
                {unlocked ? (
                  <>
                    <Zap className="w-4 h-4 text-purple-300 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-bold uppercase tracking-[0.3em]">
                      Mulai Ritual
                    </span>
                    <ChevronRight className="w-4 h-4 text-purple-300 group-hover:translate-x-1 transition-transform" />
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-purple-400/60" />
                    <span className="text-sm font-bold uppercase tracking-[0.3em] text-purple-300/60">
                      Tersegel · Selesaikan Cyno &amp; Law dulu
                    </span>
                  </>
                )}
              </button>

              {!unlocked && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-6 inline-flex items-center gap-2 px-4 py-2 border border-purple-500/30 bg-purple-500/5"
                >
                  <Lock className="w-3 h-3 text-purple-400/60" />
                  <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-purple-300/60">
                    Sealed · Ope Ope no Mi
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ====== GAMES PHASE ====== */}
          {phase === "games" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mt-10"
            >
              {/* Progress dots */}
              <div className="flex items-center justify-center gap-3 mb-10">
                {["Scan", "Counter", "Injection"].map((label, i) => (
                  <div key={label} className="flex items-center">
                    <div className={`flex flex-col items-center`}>
                      <motion.div
                        animate={gamesDone[i] ? { scale: [1, 1.3, 1] } : {}}
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
                          gamesDone[i]
                            ? "border-green-400 bg-green-500/15 text-green-400"
                            : i === gameIdx
                            ? "border-purple-400 bg-purple-500/15 text-purple-300"
                            : "border-white/15 text-white/30"
                        }`}
                      >
                        {gamesDone[i] ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span className="text-xs font-mono">{i + 1}</span>
                        )}
                      </motion.div>
                      <span className="text-[10px] font-mono text-white/50 mt-1.5 uppercase tracking-wider">
                        {label}
                      </span>
                    </div>
                    {i < 2 && (
                      <div className={`w-10 h-px mx-1 mb-5 ${gamesDone[i] ? "bg-green-400/50" : "bg-purple-500/20"}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Render current game */}
              {gameIdx === 0 && (
                <ScanGame onComplete={() => handleGameComplete(0)} done={gamesDone[0]} />
              )}
              {gameIdx === 1 && (
                <CounterShockGame
                  onComplete={() => handleGameComplete(1)}
                  done={gamesDone[1]}
                  onLightning={() => setLightningTrigger((t) => t + 1)}
                />
              )}
              {gameIdx === 2 && (
                <InjectionShotGame onComplete={() => handleGameComplete(2)} done={gamesDone[2]} />
              )}
            </motion.div>
          )}

          {/* ====== CLAIMED PHASE (matches dropped screenshots) ====== */}
          {phase === "claimed" && (
            <ClaimedGift onReset={reset} onProceedToVoucher={() => setPhase("voucher")} />
          )}

          {/* ====== VOUCHER TEAR PHASE (only Kirie can tear) ====== */}
          {phase === "voucher" && (
            <VoucherTear onBack={() => setPhase("claimed")} />
          )}
        </div>
      </main>
    </div>
  )
}

// ============================================================
//  IDENTITY BOX (no photo, bounty-style)
// ============================================================
function IdentityBox() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative border-2 border-amber-700/50 bg-gradient-to-b from-amber-950/20 to-black p-6 sm:p-8 text-center"
    >
      {/* WANTED / BOUNTY header — "only alive" (not dead or alive) */}
      <p className="text-[10px] font-mono tracking-[0.5em] text-amber-500/70 uppercase mb-1">
        WANTED · ONLY ALIVE
      </p>
      <p className="text-xs font-mono tracking-[0.3em] text-amber-500/50 uppercase mb-4">
        生存のみ · ALIVE
      </p>

      {/* Name big */}
      <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-[0.1em] text-amber-200 mb-2">
        YAVA
      </h2>
      <p className="text-[10px] font-mono tracking-[0.4em] text-amber-500/60 uppercase mb-6">
        alias · 21 · DKV · artist
      </p>

      {/* Bounty box — infinity only, no berry logo */}
      <div className="inline-block px-6 py-3 border border-amber-700/40 bg-amber-950/30 mb-4">
        <p className="text-[10px] font-mono tracking-[0.4em] text-amber-500/60 uppercase mb-1">
          BOUNTY
        </p>
        <p className="text-2xl sm:text-3xl font-black font-mono text-amber-300 flex items-center justify-center">
          <span>∞</span>
        </p>
        <p className="text-[10px] font-mono text-amber-500/50 italic mt-1">
          (atau 1× Hadiah Spesial dari Kirie — mana yang lebih besar)
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 max-w-md mx-auto">
        <div>
          <p className="text-[10px] font-mono tracking-widest text-amber-500/60 uppercase">Status</p>
          <p className="text-sm font-bold text-white">Only Alive</p>
        </div>
        <div>
          <p className="text-[10px] font-mono tracking-widest text-amber-500/60 uppercase">Affiliation</p>
          <p className="text-sm font-bold text-white">Heart Pirates</p>
        </div>
        <div>
          <p className="text-[10px] font-mono tracking-widest text-amber-500/60 uppercase">Devil Fruit</p>
          <p className="text-sm font-bold text-white">Ope Ope no Mi</p>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[10px] font-mono tracking-[0.3em] text-amber-500/40 uppercase mt-6">
        ◆ issued 22.06 · registered in ROOM log ◆
      </p>
    </motion.div>
  )
}

// ============================================================
//  GAME 1 — SCAN (hold to scan)
// ============================================================
function ScanGame({ onComplete, done }: { onComplete: () => void; done: boolean }) {
  const [progress, setProgress] = useState(0)
  const [scanning, setScanning] = useState(false)
  const holdRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startHold = () => {
    if (done || scanning) return
    holdRef.current = true
    setScanning(true)
    sfx.scan()
    const startTime = Date.now()
    const DURATION = 5500 // 5.5s hold to complete — feels like a real scan
    intervalRef.current = setInterval(() => {
      if (!holdRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setScanning(false)
        return
      }
      const elapsed = Date.now() - startTime
      const pct = Math.min(100, (elapsed / DURATION) * 100)
      setProgress(pct)
      // Periodic scan pulse sounds (every 20%)
      if (Math.floor(pct) % 20 === 0 && Math.floor(pct) > 0 && Math.floor(pct) !== Math.floor((pct - 1))) sfx.tick()
      if (pct >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        holdRef.current = false
        setScanning(false)
        sfx.reveal()
        onComplete()
      }
    }, 50)
  }

  const endHold = () => {
    holdRef.current = false
    if (intervalRef.current) clearInterval(intervalRef.current)
    setScanning(false)
    // If not complete, decay progress slowly
    if (progress < 100) {
      const decay = setInterval(() => {
        setProgress((p) => {
          if (p <= 0) {
            clearInterval(decay)
            return 0
          }
          return Math.max(0, p - 2)
        })
      }, 30)
      setTimeout(() => clearInterval(decay), 2000)
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className="text-center">
      <p className="text-[10px] font-mono tracking-[0.4em] text-cyan-400/80 uppercase mb-2">
        STAGE 01 · SCAN
      </p>
      <h2 className="text-2xl sm:text-3xl font-black uppercase mb-3">
        <ruby>
          診察<rt>しんさつ</rt>
        </ruby>{" "}
        · Scan the Seal
      </h2>
      <p className="text-sm text-white/60 max-w-md mx-auto mb-8">
        Tahan tombol di bawah untuk memindai segel. Tahan sampai 100% — lepaskan sebelumnya, progress decay.
      </p>

      {/* Scan target visual */}
      <div className="relative w-64 h-64 mx-auto mb-8 border-2 border-cyan-500/40 bg-black/60 overflow-hidden">
        {/* The seal inside — slowly reveals as progress increases */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={scanning ? { rotate: 360 } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Lock className={`w-20 h-20 ${progress >= 100 ? "text-green-400" : "text-cyan-400/60"}`} />
          </motion.div>
        </div>

        {/* Scanning beam */}
        {scanning && (
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, 256, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-0.5 bg-cyan-400 pointer-events-none"
            style={{ boxShadow: "0 0 12px #22d3ee, 0 0 24px #22d3ee" }}
          />
        )}

        {/* Progress bar at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-cyan-400 transition-all"
            style={{ width: `${progress}%`, boxShadow: "0 0 8px #22d3ee" }}
          />
        </div>

        {/* Reveal overlay mask — top portion hidden until scanned */}
        <div
          className="absolute inset-0 bg-black/80 pointer-events-none flex items-center justify-center"
          style={{ opacity: Math.max(0, 1 - progress / 100) }}
        >
          <span className="text-[10px] font-mono tracking-[0.4em] text-cyan-300/70 uppercase">
            SEALED
          </span>
        </div>

        {progress >= 100 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="absolute top-2 right-2"
          >
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          </motion.div>
        )}
      </div>

      {/* Progress percent */}
      <p className="text-3xl font-black font-mono text-cyan-300 mb-6">
        {Math.round(progress)}%
      </p>

      {/* Hold button */}
      <button
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        disabled={done}
        onMouseEnter={() => sfx.hover()}
        className={`inline-flex items-center gap-3 px-8 py-4 border-2 transition-all select-none ${
          done
            ? "border-green-500/60 bg-green-500/15 text-green-300 cursor-default"
            : scanning
            ? "border-cyan-300 bg-cyan-500/20 text-cyan-100 cursor-grabbing"
            : "border-cyan-500/60 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 cursor-grab"
        }`}
      >
        <ScanLine className={`w-5 h-5 ${scanning ? "animate-pulse" : ""}`} />
        <span className="text-sm font-bold uppercase tracking-[0.3em]">
          {done ? "Scan Selesai" : scanning ? "Scanning..." : "Hold to Scan"}
        </span>
      </button>
    </div>
  )
}

// ============================================================
//  GAME 2 — COUNTER SHOCK (click to charge, lightning at 100%)
// ============================================================
function CounterShockGame({
  onComplete,
  done,
  onLightning,
}: {
  onComplete: () => void
  done: boolean
  onLightning: () => void
}) {
  const [progress, setProgress] = useState(0)
  const [clicks, setClicks] = useState(0)

  const handleClick = () => {
    if (done) return
    // Each click adds 5-9% — randomness adds variety
    const increment = 5 + Math.random() * 4
    const newProgress = Math.min(100, progress + increment)
    setProgress(newProgress)
    setClicks((c) => c + 1)
    sfx.tally()

    if (newProgress >= 100) {
      // Lightning strike!
      onLightning()
      sfx.judgement()
      setTimeout(() => sfx.win(), 600)
      onComplete()
    }
  }

  return (
    <div className="text-center">
      <p className="text-[10px] font-mono tracking-[0.4em] text-amber-400/80 uppercase mb-2">
        STAGE 02 · COUNTER SHOCK
      </p>
      <h2 className="text-2xl sm:text-3xl font-black uppercase mb-3">
        <ruby>
          電撃<rt>でんげき</rt>
        </ruby>{" "}
        · Charge to 100%
      </h2>
      <p className="text-sm text-white/60 max-w-md mx-auto mb-8">
        Klik berulang untuk charge energi. Tiap klik nambah 5-9%. Sampai 100% → petir menyambar.
      </p>

      {/* Circular meter */}
      <div className="relative w-64 h-64 mx-auto mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke="rgba(168,85,247,0.15)"
            strokeWidth="4"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            stroke={progress >= 100 ? "#fbbf24" : "#a855f7"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 44}
            animate={{
              strokeDashoffset: 2 * Math.PI * 44 * (1 - progress / 100),
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {progress >= 100 ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <Zap className="w-16 h-16 text-amber-300 fill-amber-400/30" />
            </motion.div>
          ) : (
            <>
              <motion.p
                key={Math.round(progress)}
                initial={{ scale: 1.2, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.1 }}
                className="text-4xl font-black font-mono text-purple-300"
              >
                {Math.round(progress)}%
              </motion.p>
              <p className="text-[10px] font-mono text-white/40 mt-1 uppercase tracking-widest">
                {clicks} clicks
              </p>
            </>
          )}
        </div>

        {/* Lightning sparks when high */}
        {progress > 60 && progress < 100 && (
          <motion.div
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 0.3, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-amber-400/40 pointer-events-none"
            style={{ boxShadow: "0 0 24px rgba(251,191,36,0.4)" }}
          />
        )}
      </div>

      {/* Click button */}
      <button
        onClick={handleClick}
        disabled={done}
        onMouseEnter={() => sfx.hover()}
        whileTap={{ scale: 0.95 }}
        className={`inline-flex items-center gap-3 px-10 py-5 border-2 transition-all ${
          done
            ? "border-green-500/60 bg-green-500/15 text-green-300 cursor-default"
            : "border-amber-400 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 active:scale-95 cursor-pointer"
        }`}
      >
        <Zap className="w-6 h-6 fill-amber-400/30" />
        <span className="text-base font-black uppercase tracking-[0.3em]">
          {done ? "Discharged" : "SHOCK"}
        </span>
      </button>
    </div>
  )
}

// ============================================================
//  GAME 3 — INJECTION SHOT (precision timing)
//
//  Mechanic:
//   - A targeting bar with a moving indicator (oscillates left-right)
//   - A "sweet spot" zone in the middle (green)
//   - Player must click when the indicator is inside the sweet spot
//   - 3 successful hits to win
//   - Miss = no progress (but no fail — keep trying)
//
//  Thematically: Law's "Injection Shot" technique — a precise strike
//  at the right moment. Different from Game 1 (hold) and Game 2 (rapid click).
// ============================================================
function InjectionShotGame({ onComplete, done }: { onComplete: () => void; done: boolean }) {
  const [indicatorPos, setIndicatorPos] = useState(0) // 0-100
  const [hits, setHits] = useState(0)
  const [feedback, setFeedback] = useState<"idle" | "hit" | "miss">("idle")
  const [lastClickPos, setLastClickPos] = useState<number | null>(null)
  const animRef = useRef<number | null>(null)
  const directionRef = useRef(1) // 1 = right, -1 = left
  const posRef = useRef(0)
  const completedRef = useRef(false)
  const REQUIRED = 3

  // Sweet spot: 45-55 (centered, 10% wide)
  const SWEET_MIN = 45
  const SWEET_MAX = 55
  const SPEED = 1.4 // % per frame (~60fps → ~85% per second)

  useEffect(() => {
    if (done) return
    const animate = () => {
      let p = posRef.current + directionRef.current * SPEED
      if (p >= 100) {
        p = 100
        directionRef.current = -1
      } else if (p <= 0) {
        p = 0
        directionRef.current = 1
      }
      posRef.current = p
      setIndicatorPos(p)
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [done])

  const handleClick = () => {
    if (done || completedRef.current) return
    const pos = posRef.current
    setLastClickPos(pos)
    if (pos >= SWEET_MIN && pos <= SWEET_MAX) {
      // Hit!
      const newHits = hits + 1
      setHits(newHits)
      setFeedback("hit")
      sfx.charge()
      if (newHits >= REQUIRED) {
        completedRef.current = true
        sfx.strike()
        setTimeout(() => sfx.win(), 400)
        setTimeout(() => onComplete(), 1000)
      }
    } else {
      setFeedback("miss")
      sfx.lose()
    }
    // Clear feedback after 300ms
    setTimeout(() => setFeedback("idle"), 300)
  }

  return (
    <div className="text-center">
      <p className="text-[10px] font-mono tracking-[0.4em] text-pink-400/80 uppercase mb-2">
        STAGE 03 · INJECTION SHOT
      </p>
      <h2 className="text-2xl sm:text-3xl font-black uppercase mb-3">
        <ruby>
          注射<rt>ちゅうしゃ</rt>
        </ruby>{" "}
        · Precision Strike
      </h2>
      <p className="text-sm text-white/60 max-w-md mx-auto mb-8">
        Klik saat indikator berada di zona hijau (tengah). Butuh {REQUIRED} hit presisi untuk menyelesaikan.
      </p>

      {/* Hits counter */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[...Array(REQUIRED)].map((_, i) => (
          <motion.div
            key={i}
            animate={i < hits ? { scale: [1, 1.3, 1] } : {}}
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
              i < hits
                ? "border-green-400 bg-green-500/20 text-green-400"
                : "border-white/15 text-white/30"
            }`}
          >
            {i < hits ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-mono">{i + 1}</span>}
          </motion.div>
        ))}
      </div>

      {/* Targeting bar */}
      <div className="relative max-w-2xl mx-auto mb-8">
        <div className="relative h-20 border-2 border-purple-500/40 bg-black/60 overflow-hidden">
          {/* Zones — danger (red) on sides, sweet (green) in middle */}
          <div className="absolute inset-y-0 left-0 w-[45%] bg-red-900/15" />
          <div
            className="absolute inset-y-0 bg-green-500/25 border-l-2 border-r-2 border-green-400/60"
            style={{ left: `${SWEET_MIN}%`, width: `${SWEET_MAX - SWEET_MIN}%` }}
          />
          <div className="absolute inset-y-0 right-0 w-[45%] bg-red-900/15" />

          {/* Center crosshair line */}
          <div
            className="absolute inset-y-0 w-px bg-green-400/80"
            style={{ left: "50%", boxShadow: "0 0 8px #4ade80" }}
          />

          {/* Moving indicator */}
          <motion.div
            className="absolute inset-y-0 w-1.5 bg-purple-300"
            style={{
              left: `${indicatorPos}%`,
              boxShadow: feedback === "hit"
                ? "0 0 16px #4ade80, 0 0 32px #4ade80"
                : feedback === "miss"
                ? "0 0 16px #f87171, 0 0 32px #f87171"
                : "0 0 12px #a855f7, 0 0 24px #a855f7",
              transform: "translateX(-50%)",
            }}
            animate={feedback === "hit" ? { scale: [1, 1.5, 1] } : feedback === "miss" ? { x: [-4, 4, 0] } : {}}
            transition={{ duration: 0.3 }}
          >
            {/* Arrow indicator at top */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-purple-300" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-purple-300" />
          </motion.div>

          {/* Feedback flash */}
          <AnimatePresence>
            {feedback === "hit" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <span className="text-3xl font-black text-green-400 tracking-widest">HIT!</span>
              </motion.div>
            )}
            {feedback === "miss" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <span className="text-3xl font-black text-red-400 tracking-widest">MISS</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tick marks below */}
        <div className="flex justify-between mt-2 px-1 text-[9px] font-mono text-white/30">
          <span>0</span>
          <span className="text-green-400/60">| Sweet Spot |</span>
          <span>100</span>
        </div>

        {/* Last click position indicator */}
        {lastClickPos !== null && (
          <div
            className="absolute -bottom-2 w-1 h-3 -translate-x-1/2"
            style={{
              left: `${lastClickPos}%`,
              background: feedback === "hit" ? "#4ade80" : "#f87171",
            }}
          />
        )}
      </div>

      {/* Inject button */}
      <motion.button
        onClick={handleClick}
        disabled={done}
        onMouseEnter={() => sfx.hover()}
        whileTap={{ scale: 0.95 }}
        className={`inline-flex items-center gap-3 px-10 py-5 border-2 transition-all ${
          done
            ? "border-green-500/60 bg-green-500/15 text-green-300 cursor-default"
            : "border-pink-400 bg-pink-500/15 text-pink-200 hover:bg-pink-500/25 active:scale-95 cursor-pointer"
        }`}
      >
        <Crosshair className="w-6 h-6" />
        <span className="text-base font-black uppercase tracking-[0.3em]">
          {done ? "Injected" : "INJECT"}
        </span>
      </motion.button>

      <p className="text-[10px] font-mono text-white/40 mt-4 uppercase tracking-widest">
        Tip: tunggu indikator di zona hijau. Timing itu kunci.
      </p>
    </div>
  )
}

// ============================================================
//  CLAIMED GIFT screen (matches dropped screenshots)
// ============================================================
function ClaimedGift({
  onReset,
  onProceedToVoucher,
}: {
  onReset: () => void
  onProceedToVoucher: () => void
}) {
  const [showHidden, setShowHidden] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="mt-10"
    >
      {/* Top label */}
      <div className="text-center mb-6">
        <p className="text-[10px] font-mono tracking-[0.5em] text-purple-400/70 uppercase mb-2">
          HADIAH · DARI KIRIE
        </p>
        <h1 className="text-3xl sm:text-5xl font-black uppercase leading-tight">
          Klaim <span className="text-purple-400">Voucher</span>
        </h1>
      </div>

      {/* Progress: all 5 stages completed */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {["Start", "Scan", "Counter", "Injection", "Claim"].map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 200 }}
                className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-400 flex items-center justify-center"
              >
                <CheckCircle2 className="w-4 h-4 text-purple-300" />
              </motion.div>
              <span className="text-[9px] font-mono text-purple-400/70 mt-1 uppercase tracking-wider">
                {label}
              </span>
            </div>
            {i < 4 && <div className="w-6 h-px bg-purple-500/50 mx-1 mb-4" />}
          </div>
        ))}
      </div>

      {/* Voucher card — matches screenshots design */}
      <div className="relative max-w-md mx-auto p-6 sm:p-8 border-2 border-purple-500/50 bg-gradient-to-b from-purple-950/40 to-black">
        {/* Glow */}
        <div className="absolute inset-0 bg-purple-500/5 blur-2xl pointer-events-none" />

        <div className="relative text-center">
          {/* Gift icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex w-14 h-14 rounded-full bg-purple-500/20 border-2 border-purple-400 items-center justify-center mb-3"
          >
            <GiftIcon className="w-6 h-6 text-purple-200" />
          </motion.div>

          <p className="text-[10px] font-mono tracking-[0.4em] text-purple-400/70 uppercase mb-2">
            VOUCHER · CLAIMED
          </p>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white mb-1">
            Hadiah Diklaim
          </h2>
          <p className="text-xs text-white/40 italic mb-6">
            <ruby>
              贈り物<rt>おくりもの</rt>
            </ruby>
          </p>

          {/* Description */}
          <p className="text-sm text-white/80 leading-relaxed mb-2">
            Voucher ini berlaku untuk <span className="text-purple-300 font-bold">1× Hadiah Spesial dari Kirie</span>.
          </p>
          <p className="text-xs text-white/50 leading-relaxed mb-6">
            Hadiahnya belum bisa kamu ambil sekarang — nanti akan diserahkan langsung oleh Kirie pada waktunya.
            Tapi voucher ini adalah bukti bahwa kamu sudah berhasil melewati semua rintangan untuk membukanya.
          </p>

          {/* Three-column table */}
          <div className="grid grid-cols-3 gap-3 mb-6 py-4 border-t border-b border-purple-500/30">
            <div>
              <p className="text-[9px] font-mono tracking-widest text-purple-400/70 uppercase mb-1">Penerima</p>
              <p className="text-sm font-bold text-white">Yava</p>
            </div>
            <div>
              <p className="text-[9px] font-mono tracking-widest text-purple-400/70 uppercase mb-1">Pemberi</p>
              <p className="text-sm font-bold text-white">Kirie</p>
            </div>
            <div>
              <p className="text-[9px] font-mono tracking-widest text-purple-400/70 uppercase mb-1">Tanggal</p>
              <p className="text-sm font-bold text-white">22·06</p>
            </div>
          </div>

          {/* Validity */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <Diamond className="w-3 h-3 text-purple-400 fill-purple-400/30" />
            <p className="text-xs font-mono tracking-[0.3em] text-purple-300 uppercase">
              Berlaku Selamanya · 1× Pakai
            </p>
            <Diamond className="w-3 h-3 text-purple-400 fill-purple-400/30" />
          </div>

          {/* Hidden message toggle */}
          <button
            onClick={() => {
              sfx.reveal()
              setShowHidden((v) => !v)
            }}
            onMouseEnter={() => sfx.hover()}
            className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.4em] text-purple-400/70 hover:text-purple-300 uppercase mb-3"
          >
            <Eye className="w-3 h-3" />
            Pesan Tersembunyi
            <Eye className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {showHidden && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p className="text-sm text-white/70 italic leading-relaxed mb-2">
                  &ldquo;Selamat, kamu berhasil melewati Scan, Counter Shock, dan Injection Shot. Hadiah aslinya nggak se-keren itu kok — ini cuma akunya aja yang bikin rame wwww. Tapi intinya: selamat ulang tahun, Yav. Nanti ketemu ya.&rdquo;
                </p>
                <p className="text-xs text-purple-400 text-right">— Kirie</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/home"
          onClick={() => sfx.click()}
          onMouseEnter={() => sfx.hover()}
          className="inline-flex items-center gap-2 px-5 py-3 border-2 border-purple-500/60 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25 text-xs uppercase tracking-widest transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Kembali ke Beranda
        </Link>
        <button
          onClick={onReset}
          onMouseEnter={() => sfx.hover()}
          className="inline-flex items-center gap-2 px-5 py-3 border border-white/20 text-white/70 hover:border-white/40 text-xs uppercase tracking-widest transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Segel Ulang (Main Lagi)
        </button>
      </div>

      {/* Footer note */}
      <div className="mt-8 text-center">
        <p className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.4em] uppercase text-purple-400/60">
          <Diamond className="w-2.5 h-2.5 fill-purple-400/30" />
          Voucher terdaftar di log ROOM
          <Diamond className="w-2.5 h-2.5 fill-purple-400/30" />
        </p>
      </div>

      {/* Secondary voucher CTA — for when physical gift is delivered */}
      <div className="mt-12 pt-8 border-t border-purple-500/15 text-center">
        <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-amber-400/70 mb-2">
          ◆ VOUCHER SEKUNDER · UNTUK KIRIE ◆
        </p>
        <p className="text-xs text-white/50 max-w-md mx-auto mb-4 leading-relaxed">
          Setelah hadiah aslinya diambil, ada satu voucher lagi yang harus Kirie robek
          untuk konfirmasi. Cuma Kirie yang bisa robek — perlu jawaban code rahasia.
        </p>
        <button
          onClick={onProceedToVoucher}
          onMouseEnter={() => sfx.hover()}
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-amber-500/50 text-amber-300 hover:bg-amber-500/10 text-xs uppercase tracking-widest transition-colors"
        >
          <Unlock className="w-3.5 h-3.5" />
          Buka Voucher Sekunder
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================
//  VOUCHER TEAR — only Kirie can tear (with secret code)
// ============================================================
function VoucherTear({ onBack }: { onBack: () => void }) {
  const [codeInput, setCodeInput] = useState("")
  const [codeUnlocked, setCodeUnlocked] = useState(false)
  const [wrongCode, setWrongCode] = useState(false)
  const [torn, setTorn] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Exact match required (case-sensitive, === comparison)
    if (codeInput === SECRET_ANSWER) {
      setCodeUnlocked(true)
      sfx.reveal()
      sfx.roomOpen()
    } else {
      setWrongCode(true)
      sfx.lose()
      setTimeout(() => setWrongCode(false), 600)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="mt-10"
    >
      <div className="text-center mb-6">
        <p className="text-[10px] font-mono tracking-[0.5em] text-amber-400/70 uppercase mb-2">
          ◆ VOUCHER SEKUNDER · TEAR PROTOCOL ◆
        </p>
        <h1 className="text-3xl sm:text-5xl font-black uppercase leading-tight">
          Tear the <span className="text-amber-400">Voucher</span>
        </h1>
        <p className="text-xs text-white/50 mt-3 max-w-md mx-auto leading-relaxed">
          Voucher ini cuma bisa dirobek oleh Kirie. Jawab pertanyaan di bawah dengan exact match (case-sensitive).
        </p>
      </div>

      {/* Code entry form (only if not unlocked) */}
      {!codeUnlocked ? (
        <motion.form
          onSubmit={handleSubmit}
          animate={wrongCode ? { x: [-8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="max-w-md mx-auto"
        >
          <div className="p-5 border border-amber-500/30 bg-amber-950/10 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-amber-400" />
              <p className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-400/80">
                Kirie Verification
              </p>
            </div>
            <p className="text-sm text-white/80 mb-4 leading-relaxed">
              {SECRET_QUESTION}
            </p>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="Type your answer..."
              autoComplete="off"
              spellCheck={false}
              className="w-full px-3 py-3 bg-black/60 border border-amber-500/40 outline-none text-white text-sm font-mono focus:border-amber-400 transition-colors"
            />
            {wrongCode && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-red-400 mt-2 font-mono tracking-widest uppercase"
              >
                ✗ Wrong answer. Bukan Kirie.
              </motion.p>
            )}
          </div>
          <div className="flex justify-center gap-3">
            <button
              type="submit"
              onMouseEnter={() => sfx.hover()}
              className="inline-flex items-center gap-2 px-5 py-3 border-2 border-amber-500/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 text-xs uppercase tracking-widest transition-colors"
            >
              <Unlock className="w-4 h-4" />
              Verify
            </button>
            <button
              type="button"
              onClick={onBack}
              onMouseEnter={() => sfx.hover()}
              className="inline-flex items-center gap-2 px-5 py-3 border border-white/20 text-white/60 hover:border-white/40 text-xs uppercase tracking-widest transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          </div>
          <p className="text-[10px] text-white/30 mt-4 text-center italic">
            Case-sensitive · exact match required
          </p>
        </motion.form>
      ) : (
        <>
          {/* Voucher stays visible — torn state shows it as a torn voucher (not removed) */}
          <TearableVoucher onTorn={() => setTorn(true)} />
          {/* Completion notice appears BELOW the voucher after tear — voucher itself never disappears */}
          {torn && <TornCompletionNotice onBack={onBack} />}
        </>
      )}
    </motion.div>
  )
}

// ============================================================
//  Tearable voucher — single card with horizontal dashed
//  perforation line. Slash across the dashed line to tear.
//  On tear: top half slides up + rotates, bottom half slides
//  down + rotates, jagged tear line glows in the middle.
// ============================================================
function TearableVoucher({ onTorn }: { onTorn: () => void }) {
  const [torn, setTorn] = useState(false)
  const [slashes, setSlashes] = useState<{ id: number; x1: number; y1: number; x2: number; y2: number }[]>([])
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null)
  const slashIdRef = useRef(0)
  const voucherRef = useRef<HTMLDivElement>(null)
  const tornRef = useRef(false)
  // Track all x positions and whether the drag crossed the middle band
  const allXsRef = useRef<number[]>([])
  const crossedMiddleRef = useRef(false)

  const getRelativePos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!voucherRef.current) return { x: 0, y: 0 }
    const rect = voucherRef.current.getBoundingClientRect()
    let clientX: number, clientY: number
    if ("touches" in e) {
      clientX = e.touches[0]?.clientX ?? 0
      clientY = e.touches[0]?.clientY ?? 0
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    }
  }

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (tornRef.current) return
    e.preventDefault()
    const pos = getRelativePos(e)
    setDragging(true)
    setDragStart(pos)
    setCurrentPos(pos)
    allXsRef.current = [pos.x]
    crossedMiddleRef.current = pos.y > 25 && pos.y < 75
  }

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragging || tornRef.current) return
    e.preventDefault()
    const pos = getRelativePos(e)
    setCurrentPos(pos)

    if (dragStart) {
      // Add a slash visual segment between last and current position
      const slashId = ++slashIdRef.current
      setSlashes((p) => [
        ...p,
        { id: slashId, x1: dragStart.x, y1: dragStart.y, x2: pos.x, y2: pos.y },
      ])
      sfx.slash()
      setTimeout(() => {
        setSlashes((p) => p.filter((s) => s.id !== slashId))
      }, 400)

      // Track x and middle-band crossing
      allXsRef.current.push(pos.x)
      if (pos.y > 25 && pos.y < 75) crossedMiddleRef.current = true

      setDragStart(pos)
    }
  }

  const handleEnd = () => {
    if (tornRef.current) {
      setDragging(false)
      setDragStart(null)
      setCurrentPos(null)
      return
    }
    // Easier tear condition: 40%+ horizontal travel AND crossed middle band
    const xs = allXsRef.current
    if (xs.length >= 2) {
      const minX = Math.min(...xs)
      const maxX = Math.max(...xs)
      const travel = maxX - minX
      if (travel >= 40 && crossedMiddleRef.current) {
        tornRef.current = true
        setTorn(true)
        sfx.tear()
        setTimeout(() => sfx.win(), 400)
        setTimeout(() => onTorn(), 1500)
      }
    }
    setDragging(false)
    setDragStart(null)
    setCurrentPos(null)
    allXsRef.current = []
    crossedMiddleRef.current = false
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-md mx-auto"
    >
      {!torn && (
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-3 py-1 border border-green-500/50 bg-green-500/10 mb-3"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-green-300">
              Verified · Kirie
            </span>
          </motion.div>
          <p className="text-sm text-white/70">
            Slash melalui garis putus-putus untuk merobek voucher.
          </p>
        </div>
      )}

      {/* Tearable voucher — single card with dashed perforation across the middle.
          When torn: voucher stays visible as a TORN voucher (halves slightly separated,
          jagged tear line persistent in middle, DIREMEH stamp angled across). */}
      <div
        ref={voucherRef}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        className={`relative border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/30 to-black ${
          torn ? "overflow-visible" : "overflow-hidden"
        } touch-none ${torn ? "" : "cursor-crosshair"}`}
      >
        {/* === TOP HALF (stays visible when torn, just shifted up + slightly tilted) === */}
        <motion.div
          animate={
            torn
              ? { y: -18, rotate: -2, opacity: 1 }
              : { y: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative p-6 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 items-center justify-center mb-3"
          >
            <GiftIcon className="w-5 h-5 text-amber-200" />
          </motion.div>

          <p className="text-[10px] font-mono tracking-[0.4em] text-amber-400/70 uppercase mb-2">
            VOUCHER · {torn ? "DIREMEH" : "TEAR ME"}
          </p>
          <h3 className="text-xl sm:text-2xl font-black uppercase text-white mb-1">
            Voucher Sekunder
          </h3>
          <p className="text-xs text-white/40 italic mb-4">
            <ruby>
              贈り物<rt>おくりもの</rt>
            </ruby>{" "}
            · Confirmation
          </p>

          <p className="text-xs text-white/70 leading-relaxed mb-2">
            Voucher ini sebagai bukti bahwa hadiah fisik sudah diserahkan ke Yava.
            Robek untuk konfirmasi. Hanya Kirie yang bisa merobeknya.
          </p>
        </motion.div>

        {/* === DASHED PERFORATION LINE (the tear line) — fades out when torn === */}
        <motion.div
          className="relative h-0"
          animate={torn ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Horizontal dashed line */}
          <div
            className="absolute left-3 right-3 top-0"
            style={{
              borderTop: "2px dashed #fbbf24",
              opacity: 0.8,
              filter: "drop-shadow(0 0 4px rgba(251,191,36,0.5))",
            }}
          />
          {/* Left notch (semicircle cutout) */}
          <div
            className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black"
            style={{ border: "2px solid rgba(251,191,36,0.5)", borderRight: "transparent" }}
          />
          {/* Right notch */}
          <div
            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-black"
            style={{ border: "2px solid rgba(251,191,36,0.5)", borderLeft: "transparent" }}
          />
          {/* Center scissors label */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-2 py-0.5">
            <span className="text-[9px] font-mono tracking-[0.3em] text-amber-400/90 uppercase whitespace-nowrap">
              ✂ TEAR HERE
            </span>
          </div>
        </motion.div>

        {/* === BOTTOM HALF (stays visible when torn, just shifted down + slightly tilted) === */}
        <motion.div
          animate={
            torn
              ? { y: 18, rotate: 2, opacity: 1 }
              : { y: 0, rotate: 0, opacity: 1 }
          }
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative p-6 text-center"
        >
          {/* Three-column table */}
          <div className="grid grid-cols-3 gap-2 mb-4 py-3 border-t border-b border-amber-500/30">
            <div>
              <p className="text-[9px] font-mono tracking-widest text-amber-400/70 uppercase mb-1">Penerima</p>
              <p className="text-xs font-bold text-white">Yava</p>
            </div>
            <div>
              <p className="text-[9px] font-mono tracking-widest text-amber-400/70 uppercase mb-1">Pemberi</p>
              <p className="text-xs font-bold text-white">Kirie</p>
            </div>
            <div>
              <p className="text-[9px] font-mono tracking-widest text-amber-400/70 uppercase mb-1">Tanggal</p>
              <p className="text-xs font-bold text-white">22·06</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Diamond className="w-2.5 h-2.5 text-amber-400 fill-amber-400/30" />
            <p className="text-[10px] font-mono tracking-[0.3em] text-amber-300 uppercase">
              Berlaku Selamanya · 1× Pakai
            </p>
            <Diamond className="w-2.5 h-2.5 text-amber-400 fill-amber-400/30" />
          </div>
        </motion.div>

        {/* Slash trail overlay (above content, below tear line) — only while actively tearing */}
        {!torn && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {slashes.map((s) => (
              <motion.line
                key={s.id}
                x1={`${s.x1}%`}
                y1={`${s.y1}%`}
                x2={`${s.x2}%`}
                y2={`${s.y2}%`}
                stroke="#fbbf24"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1, opacity: [1, 1, 0] }}
                transition={{ duration: 0.4 }}
                style={{ filter: "drop-shadow(0 0 8px #fbbf24)" }}
              />
            ))}
            {dragging && dragStart && currentPos && (
              <line
                x1={`${dragStart.x}%`}
                y1={`${dragStart.y}%`}
                x2={`${currentPos.x}%`}
                y2={`${currentPos.y}%`}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                opacity={0.6}
                style={{ filter: "drop-shadow(0 0 4px #fbbf24)" }}
              />
            )}
          </svg>
        )}

        {/* Jagged tear line — persistent when torn, glows across the middle */}
        {torn && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.4 }}
            className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ height: "14px" }}
          >
            <svg viewBox="0 0 400 14" className="w-full h-full" preserveAspectRatio="none">
              <motion.path
                d="M 0 7 L 25 2 L 50 11 L 75 3 L 100 10 L 125 2 L 150 12 L 175 4 L 200 10 L 225 2 L 250 11 L 275 3 L 300 10 L 325 2 L 350 11 L 375 4 L 400 8"
                stroke="#fbbf24"
                strokeWidth="2.5"
                fill="none"
                style={{ filter: "drop-shadow(0 0 8px #fbbf24) drop-shadow(0 0 16px #f59e0b)" }}
              />
            </svg>
          </motion.div>
        )}

        {/* "REDEEMED" stamp — angled red stamp across the voucher when torn */}
        {torn && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -25 }}
            animate={{ scale: 1, opacity: 1, rotate: -15 }}
            transition={{ type: "spring", stiffness: 180, delay: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
          >
            <div className="border-[3px] border-red-500/80 px-5 py-2 bg-red-950/10 backdrop-blur-[1px]">
              <p className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-red-500 uppercase italic"
                 style={{ textShadow: "0 0 12px rgba(239,68,68,0.6)" }}>
                Diremeh
              </p>
              <p className="text-[8px] font-mono tracking-[0.4em] text-red-400/80 uppercase text-center mt-1">
                ✓ Kirie · 22·06
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {!torn && (
        <p className="text-[10px] text-white/40 mt-3 text-center">
          Drag melalui garis putus-putus untuk merobek
        </p>
      )}
    </motion.div>
  )
}

// ============================================================
//  Torn completion notice — appears BELOW the (still-visible) torn voucher.
//  The voucher itself never disappears; this just shows the closing message
//  and a "back to home" button.
// ============================================================
function TornCompletionNotice({ onBack }: { onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="mt-10 text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
        className="inline-flex w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 items-center justify-center mb-6"
      >
        <Heart className="w-9 h-9 text-green-300 fill-green-400/30" />
      </motion.div>

      <p className="text-[10px] font-mono tracking-[0.5em] text-green-400/70 uppercase mb-2">
        ◆ VOUCHER REDEEMED ◆
      </p>
      <h2 className="text-3xl sm:text-5xl font-black uppercase mb-4">
        Selesai.
      </h2>
      <p className="text-sm text-white/70 max-w-md mx-auto mb-2 leading-relaxed">
        Voucher sekunder sudah tertebus oleh Kirie. Hadiah fisik resmi diterima oleh Yava.
      </p>
      <p className="text-xs text-white/50 max-w-md mx-auto mb-8 italic leading-relaxed">
        Terima kasih sudah mau main sampai sini, Yav. Selamat ulang tahun yang ke-21.
        Semoga tahun ini jadi tahun di mana kamu makin percaya sama kemampuan kamu sendiri.
      </p>

      <div className="flex items-center justify-center gap-2 mb-8">
        <Diamond className="w-2.5 h-2.5 fill-purple-400/30 text-purple-400" />
        <p className="text-[10px] font-mono tracking-[0.4em] uppercase text-purple-400/60">
          Transaksi tercatat di log ROOM
        </p>
        <Diamond className="w-2.5 h-2.5 fill-purple-400/30 text-purple-400" />
      </div>

      <Link
        href="/home"
        onClick={() => sfx.click()}
        onMouseEnter={() => sfx.hover()}
        className="inline-flex items-center gap-2 px-6 py-3 border-2 border-purple-500/60 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25 text-xs uppercase tracking-widest transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Kembali ke Beranda
      </Link>
    </motion.div>
  )
}
