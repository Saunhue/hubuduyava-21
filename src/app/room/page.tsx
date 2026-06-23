'use client'

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Spade,
  Heart,
  Diamond,
  Club,
  Sword,
  Skull,
  Crown,
  Star,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Shuffle,
  Compass,
  Activity,
  Crosshair,
  Layers,
  Zap,
  ScanLine,
  Eye,
  Lock,
  Unlock,
  Sparkles,
} from "lucide-react"
import { Navbar } from "@/components/birthday/navbar"
import { Particles } from "@/components/birthday/particles"
import { sfx } from "@/components/birthday/sound"

// ============================================================
//  LAW ROOM — Card Sequencer (face-up swap variant)
//
//  Mechanic (per user spec v3):
//   1. Two rows shown:
//      - TOP row = reference (correct order, numbered 1..N), face-up
//      - BOTTOM row = same cards, shuffled, face-up
//   2. After 4.4s, top row hides (cards become "?")
//   3. Player SWAPS pairs of cards in bottom row by clicking
//      two cards to swap them (Shambles-style)
//   4. Goal: arrange bottom row to match the original top row order
//   5. 1 SCAN chance per round: hold Scan to briefly peek at the
//      top row reference again
//   6. When bottom row matches reference order → win
//
//  Card kinds themed on Law's Ope Ope no Mi abilities:
//    Scan, Shambles, Mes, Takt, Counter Shock, Amputate,
//    Injection Shot, Radio Knife
//
//  Levels 1-5 scale: more cards, harder shuffle.
//  After level 5 wins, seal-break animation plays before Next
//  (unlocking Gift section).
// ============================================================

type CardKind =
  | "scan"
  | "shambles"
  | "mes"
  | "takt"
  | "counter"
  | "amputate"
  | "injection"
  | "radio"

interface Card {
  id: number
  kind: CardKind
  order: number // correct position in the sequence (0-indexed)
}

interface LevelConfig {
  level: number
  cards: number
  memorizeMs: number // = 4400ms always (per user spec)
  ability: string
  abilityJp: string
  abilityJpRt: string
  title: string
  flavor: string
  icon: typeof Compass
}

const LEVELS: LevelConfig[] = [
  {
    level: 1,
    cards: 3,
    memorizeMs: 4400,
    ability: "Scan",
    abilityJp: "診察",
    abilityJpRt: "しんさつ",
    title: "Chamber 01 · Scan",
    flavor: "Tiga kartu. Hafalkan urutan di baris atas. Setelah hilang, swap kartu di baris bawah sampai cocok.",
    icon: Crosshair,
  },
  {
    level: 2,
    cards: 4,
    memorizeMs: 4400,
    ability: "Shambles",
    abilityJp: "シャンブルズ",
    abilityJpRt: "しゃんぶるず",
    title: "Chamber 02 · Shambles",
    flavor: "Empat kartu. Shambles mengacak posisi baris bawah. Tukar dua kartu untuk menyamarkan urutan.",
    icon: Shuffle,
  },
  {
    level: 3,
    cards: 5,
    memorizeMs: 4400,
    ability: "Mes",
    abilityJp: "メス",
    abilityJpRt: "める",
    title: "Chamber 03 · Mes",
    flavor: "Lima kartu. Mes memotong konsentrasi — jaga urutan tetap ketat.",
    icon: Sword,
  },
  {
    level: 4,
    cards: 6,
    memorizeMs: 4400,
    ability: "Takt",
    abilityJp: "タクト",
    abilityJpRt: "たくと",
    title: "Chamber 04 · Takt",
    flavor: "Enam kartu. Takt mengangkat semuanya — fokusmu diuji.",
    icon: Layers,
  },
  {
    level: 5,
    cards: 7,
    memorizeMs: 4400,
    ability: "Counter Shock",
    abilityJp: "カウンターショック",
    abilityJpRt: "かうんたーしょっく",
    title: "Chamber 05 · Counter Shock",
    flavor: "Tujuh kartu. Chamber terakhir. Selesaikan untuk jadi pengendali kamar.",
    icon: Zap,
  },
]

const ALL_KINDS: CardKind[] = [
  "scan",
  "shambles",
  "mes",
  "takt",
  "counter",
  "amputate",
  "injection",
  "radio",
]

// Display config for each card kind — Law ability icons
const KIND_META: Record<
  CardKind,
  { icon: typeof ScanLine; label: string; color: string }
> = {
  scan: { icon: ScanLine, label: "SCAN", color: "text-cyan-300" },
  shambles: { icon: Shuffle, label: "SHAMBLES", color: "text-purple-300" },
  mes: { icon: Sword, label: "MES", color: "text-amber-300" },
  takt: { icon: Layers, label: "TAKT", color: "text-blue-300" },
  counter: { icon: Zap, label: "COUNTER", color: "text-yellow-300" },
  amputate: { icon: Sword, label: "AMPUTATE", color: "text-red-300" },
  injection: { icon: Crosshair, label: "INJECTION", color: "text-pink-300" },
  radio: { icon: Activity, label: "RADIO", color: "text-green-300" },
}

function CardFace({ kind, showLabel = true }: { kind: CardKind; showLabel?: boolean }) {
  const meta = KIND_META[kind]
  const Icon = meta.icon
  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${meta.color}`} />
      {showLabel && (
        <span className={`text-[8px] sm:text-[9px] font-mono font-bold tracking-wider ${meta.color}`}>
          {meta.label}
        </span>
      )}
    </div>
  )
}

function fisherYates<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Generate a shuffled version of cards that is guaranteed NOT already in order
function shuffledNotInOrder<T>(arr: T[]): T[] {
  let attempts = 0
  while (attempts < 50) {
    const shuffled = fisherYates(arr)
    if (!shuffled.every((v, i) => v === arr[i])) return shuffled
    attempts++
  }
  return fisherYates(arr)
}

type Phase = "idle" | "memorize" | "choose" | "scan" | "won" | "lost"

export default function RoomPage() {
  const [levelIdx, setLevelIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>("idle")
  // Reference cards (top row, correct order) — kept for comparison + scan reveal
  const [reference, setReference] = useState<Card[]>([])
  // Player cards (bottom row, shuffled, swappable)
  const [playerCards, setPlayerCards] = useState<Card[]>([])
  // First card selected for swap (null = none selected)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [scansLeft, setScansLeft] = useState(1)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [timeLeft, setTimeLeft] = useState(0)
  const [scanProgress, setScanProgress] = useState(0)
  // Seal-break animation after level 5 wins
  const [sealBreaking, setSealBreaking] = useState(false)
  const [sealBroken, setSealBroken] = useState(false)

  const cfg = LEVELS[levelIdx]
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const idRef = useRef(0)
  const scanHoldRef = useRef(false)

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t))
    timeoutsRef.current = []
  }, [])

  useEffect(() => () => clearTimers(), [clearTimers])

  const dealNewRound = useCallback((lvl: number) => {
    clearTimers()
    const level = LEVELS[lvl]
    // Pick N unique kinds
    const chosenKinds = fisherYates(ALL_KINDS).slice(0, level.cards)
    // Build reference cards in correct order
    const refCards: Card[] = chosenKinds.map((kind, i) => ({
      id: ++idRef.current,
      kind,
      order: i,
    }))
    // Build player cards: same cards but shuffled (different order guaranteed)
    const shuffledKinds = shuffledNotInOrder(chosenKinds)
    const playCards: Card[] = shuffledKinds.map((kind, i) => ({
      id: ++idRef.current,
      kind,
      order: chosenKinds.indexOf(kind), // keep original order index for comparison
    }))

    setReference(refCards)
    setPlayerCards(playCards)
    setSelectedIdx(null)
    setScansLeft(1)
    setScanProgress(0)
    setPhase("memorize")
    setTimeLeft(Math.ceil(level.memorizeMs / 1000))
    sfx.reveal()

    // After memorize time: hide top row, start choose phase
    const flipTimer = setTimeout(() => {
      setPhase("choose")
      sfx.card()
    }, level.memorizeMs)
    timeoutsRef.current.push(flipTimer)

    // Countdown during memorize
    const startTs = Date.now()
    const tick = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((level.memorizeMs - (Date.now() - startTs)) / 1000))
      setTimeLeft(remaining)
      if (remaining <= 0) clearInterval(tick)
    }, 200)
    timeoutsRef.current.push(tick as unknown as ReturnType<typeof setTimeout>)
  }, [clearTimers])

  // Click on a player card to select/swap
  const onCardClick = (idx: number) => {
    if (phase !== "choose") return
    sfx.card()

    if (selectedIdx === null) {
      // First selection
      setSelectedIdx(idx)
      return
    }
    if (selectedIdx === idx) {
      // Deselect
      setSelectedIdx(null)
      return
    }
    // Swap cards at selectedIdx and idx
    const newCards = [...playerCards]
    ;[newCards[selectedIdx], newCards[idx]] = [newCards[idx], newCards[selectedIdx]]
    setPlayerCards(newCards)
    setSelectedIdx(null)
    sfx.swap()

    // Check if the new arrangement matches reference order
    setTimeout(() => {
      const matches = newCards.every((c, i) => c.order === i)
      if (matches) {
        setCompleted((prev) => new Set(prev).add(cfg.level))
        setPhase("won")
        sfx.win()

        // If level 5 (last) wins, trigger seal-break animation for Gift unlock
        if (cfg.level === 5 && levelIdx === LEVELS.length - 1) {
          setTimeout(() => {
            setSealBreaking(true)
            sfx.seal()
            try { sessionStorage.setItem("yava21_room_done", "1") } catch {} // cleared on tab close
            setTimeout(() => {
              setSealBreaking(false)
              setSealBroken(true)
              sfx.reveal()
            }, 2400)
          }, 800)
        }
      }
    }, 200)
  }

  // Scan hold — press & hold to peek at reference row
  const startScanHold = () => {
    if (phase !== "choose" || scansLeft <= 0 || scanHoldRef.current) return
    scanHoldRef.current = true
    setScanProgress(0)
    sfx.scan()

    const startTime = Date.now()
    const SCAN_DURATION = 600
    const PEEK_DURATION = 1800 // total reveal time
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(100, (elapsed / SCAN_DURATION) * 100)
      setScanProgress(pct)
      if (pct >= 100) clearInterval(progressInterval)
    }, 30)
    timeoutsRef.current.push(progressInterval as unknown as ReturnType<typeof setTimeout>)

    setPhase("scan")

    const endScan = setTimeout(() => {
      scanHoldRef.current = false
      setScanProgress(0)
      setScansLeft(0)
      setPhase("choose")
      sfx.card()
    }, PEEK_DURATION)
    timeoutsRef.current.push(endScan)
  }

  const endScanHold = () => {
    // Released early — keep scan in scan phase until timer ends (don't refund)
  }

  const nextLevel = () => {
    if (levelIdx < LEVELS.length - 1) {
      sfx.click()
      setLevelIdx((i) => i + 1)
      setPhase("idle")
    }
  }

  const restart = () => {
    sfx.click()
    setPhase("idle")
  }

  // Whether to show reference cards face-up
  const showReferenceFace = phase === "memorize" || phase === "scan" || phase === "won" || phase === "lost"

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-800/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px]" />
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
            <div className="inline-flex items-center gap-3 text-purple-400/80 mb-4">
              <span className="w-8 h-px bg-purple-500/40" />
              <span className="text-xs tracking-[0.5em] font-mono">
                OPE OPE NO MI ·{" "}
                <ruby>
                  手術<rt>しゅじゅつ</rt>
                </ruby>
              </span>
              <span className="w-8 h-px bg-purple-500/40" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-black uppercase mb-3">
              Room <span className="text-purple-400">Law</span>
            </h1>
            <p className="text-white/60 max-w-xl mx-auto">
              Lima chamber, lima kemampuan. Hafalkan urutan kartu di baris atas (4.4s),
              lalu swap kartu di baris bawah sampai urutannya cocok. 1× Scan chance per round.
            </p>
          </motion.div>

          {/* Level selector */}
          <div className="grid grid-cols-5 gap-2 mb-8">
            {LEVELS.map((lvl, i) => {
              const isDone = completed.has(lvl.level)
              const isActive = i === levelIdx
              const Icon = lvl.icon
              const inGame = ["memorize", "choose", "scan"].includes(phase)
              return (
                <button
                  key={lvl.level}
                  onClick={() => {
                    if (inGame) return
                    sfx.click()
                    setLevelIdx(i)
                    setPhase("idle")
                  }}
                  disabled={inGame}
                  onMouseEnter={() => sfx.hover()}
                  className={`relative p-2 sm:p-3 border text-center transition-all ${
                    isActive
                      ? "border-purple-500 bg-purple-500/5"
                      : isDone
                      ? "border-green-500/50 bg-green-500/5"
                      : "border-white/10 hover:border-white/30"
                  } ${inGame ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-purple-400/70" />
                  <span className="text-[10px] font-mono tracking-widest text-purple-400/70 block">
                    L{lvl.level}
                  </span>
                  <span className="text-[9px] font-bold uppercase text-white/60 block mt-0.5">
                    {lvl.ability}
                  </span>
                  {isDone && (
                    <CheckCircle2 className="absolute top-1 right-1 w-3 h-3 text-green-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Chamber panel */}
          <div className="border border-purple-500/20 bg-black/40 backdrop-blur-sm">
            <div className="p-5 border-b border-purple-500/15">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg sm:text-2xl font-black uppercase">{cfg.title}</h2>
                  <p className="text-xs text-white/50 mt-1">
                    {cfg.cards} kartu · {(cfg.memorizeMs / 1000).toFixed(1)}s memorize ·{" "}
                    <ruby>
                      {cfg.abilityJp}<rt>{cfg.abilityJpRt}</rt>
                    </ruby>
                  </p>
                </div>
                <div className="flex items-center gap-4 text-center">
                  <div>
                    <p className="text-2xl font-black font-mono text-purple-400">{timeLeft}s</p>
                    <p className="text-[10px] tracking-widest text-white/40 uppercase">Memorize</p>
                  </div>
                  <div>
                    <p className="text-2xl font-black font-mono text-amber-400">{scansLeft}</p>
                    <p className="text-[10px] tracking-widest text-white/40 uppercase">Scan</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Playfield */}
            <div className="relative min-h-[480px] sm:min-h-[540px] overflow-hidden bg-gradient-to-b from-[#0a0518] to-[#050108] p-4">
              {phase === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-6"
                  >
                    <Compass className="w-14 h-14 text-purple-400/80" />
                  </motion.div>
                  <p className="text-sm text-white/70 max-w-md mb-2 italic">
                    &ldquo;{cfg.flavor}&rdquo;
                  </p>
                  <p className="text-xs text-white/40 mb-8">
                    Baris atas = acuan (muncul {(cfg.memorizeMs / 1000).toFixed(1)}s).
                    Baris bawah = kartu acak yang harus kamu swap sampai urutannya cocok dengan acuan.
                  </p>
                  <button
                    onClick={() => dealNewRound(levelIdx)}
                    onMouseEnter={() => sfx.hover()}
                    className="group inline-flex items-center gap-3 px-6 py-3 border border-purple-500/50 hover:border-purple-400 hover:bg-purple-500/5 transition-colors"
                  >
                    <Shuffle className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold uppercase tracking-[0.2em]">
                      Shuffle & Start
                    </span>
                  </button>
                </div>
              )}

              {phase !== "idle" && reference.length > 0 && (
                <div className="space-y-6">
                  {/* TOP ROW — Reference (correct order) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-cyan-400/80">
                        ◆ Reference · Acuan
                      </span>
                      {phase === "memorize" && (
                        <span className="text-[10px] font-mono text-cyan-300 animate-pulse">
                          · Hafalkan!
                        </span>
                      )}
                      {phase === "scan" && (
                        <span className="text-[10px] font-mono text-cyan-300 animate-pulse">
                          · Scanning... {Math.round(scanProgress)}%
                        </span>
                      )}
                      {(phase === "choose") && (
                        <span className="text-[10px] font-mono text-white/40">
                          · Tersembunyi (pakai Scan untuk intip)
                        </span>
                      )}
                    </div>
                    <div
                      className={`grid gap-2 sm:gap-3 w-full ${
                        cfg.cards <= 4
                          ? "grid-cols-4"
                          : cfg.cards <= 6
                          ? "grid-cols-6"
                          : "grid-cols-7"
                      }`}
                    >
                      {reference.map((c, idx) => (
                        <motion.div
                          key={c.id}
                          layout
                          initial={false}
                          animate={{
                            opacity: showReferenceFace ? 1 : 0.3,
                            scale: showReferenceFace ? 1 : 0.95,
                          }}
                          transition={{ type: "spring", stiffness: 200, damping: 22 }}
                          className={`relative aspect-[3/4] flex items-center justify-center rounded-md border-2 ${
                            showReferenceFace
                              ? "border-cyan-400/60 bg-cyan-950/30"
                              : "border-white/10 bg-black/60"
                          }`}
                        >
                          {showReferenceFace ? (
                            <>
                              <CardFace kind={c.kind} />
                              <span className="absolute top-1 left-1 text-[10px] font-mono font-bold text-cyan-300/80">
                                {c.order + 1}
                              </span>
                              {(phase === "won") && (
                                <span className="absolute top-1 right-1 text-[10px] font-mono font-bold text-green-400">
                                  ✓
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-2xl font-mono text-white/30">?</span>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-purple-500/30" />
                    <Shuffle className="w-3 h-3 text-purple-400/60" />
                    <span className="text-[9px] font-mono tracking-[0.3em] uppercase text-purple-400/60">
                      Shambles
                    </span>
                    <Shuffle className="w-3 h-3 text-purple-400/60" />
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-purple-500/30" />
                  </div>

                  {/* BOTTOM ROW — Player cards (shuffled, swappable) */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-amber-400/80">
                        ◆ Your Cards · Swap to Match
                      </span>
                      {phase === "choose" && selectedIdx !== null && (
                        <span className="text-[10px] font-mono text-amber-300 animate-pulse">
                          · Pilih kartu kedua untuk swap
                        </span>
                      )}
                    </div>
                    <div
                      className={`grid gap-2 sm:gap-3 w-full ${
                        cfg.cards <= 4
                          ? "grid-cols-4"
                          : cfg.cards <= 6
                          ? "grid-cols-6"
                          : "grid-cols-7"
                      }`}
                    >
                      {playerCards.map((c, idx) => {
                        const isSelected = selectedIdx === idx
                        const isCorrect = c.order === idx
                        const showResult = phase === "won" || phase === "lost"
                        return (
                          <motion.button
                            key={c.id}
                            layout
                            layoutId={`player-${c.id}`}
                            onClick={() => onCardClick(idx)}
                            disabled={phase !== "choose"}
                            onMouseEnter={() => phase === "choose" && sfx.hover()}
                            initial={false}
                            animate={{
                              scale: isSelected ? 1.08 : 1,
                              y: isSelected ? -6 : 0,
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className={`relative aspect-[3/4] flex items-center justify-center rounded-md border-2 transition-colors ${
                              isSelected
                                ? "border-amber-400 bg-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.5)]"
                                : showResult && isCorrect
                                ? "border-green-400 bg-green-500/15"
                                : showResult && !isCorrect
                                ? "border-red-400 bg-red-500/15"
                                : "border-purple-500/40 bg-black/60 hover:border-purple-400 hover:bg-purple-500/10"
                            } ${phase === "choose" ? "cursor-pointer" : "cursor-default"}`}
                          >
                            <CardFace kind={c.kind} />
                            {/* Position number — shows where this card currently sits */}
                            <span className="absolute top-1 left-1 text-[9px] font-mono text-white/40">
                              {idx + 1}
                            </span>
                            {showResult && isCorrect && (
                              <span className="absolute top-1 right-1 text-[10px] font-mono font-bold text-green-400">
                                ✓
                              </span>
                            )}
                            {showResult && !isCorrect && (
                              <span className="absolute top-1 right-1 text-[10px] font-mono font-bold text-red-400">
                                ✗
                              </span>
                            )}
                            {isSelected && (
                              <motion.div
                                layoutId="swap-indicator"
                                className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-amber-300 tracking-widest uppercase"
                              >
                                swap
                              </motion.div>
                            )}
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Scan button + status */}
                  <div className="flex items-center justify-center gap-4 pt-4">
                    {(phase === "choose") && (
                      <button
                        onMouseDown={startScanHold}
                        onMouseUp={endScanHold}
                        onMouseLeave={endScanHold}
                        onTouchStart={startScanHold}
                        onTouchEnd={endScanHold}
                        disabled={scansLeft <= 0}
                        onMouseEnter={() => sfx.hover()}
                        className={`inline-flex items-center gap-2 px-4 py-2 border text-xs uppercase tracking-widest transition-colors ${
                          scansLeft > 0
                            ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 cursor-pointer"
                            : "border-white/10 text-white/30 cursor-not-allowed"
                        }`}
                      >
                        <ScanLine className="w-3.5 h-3.5" />
                        {scansLeft > 0 ? "Hold to Scan" : "Scan Used"}
                      </button>
                    )}
                    {phase === "scan" && (
                      <div className="text-center">
                        <p className="text-xs font-mono text-cyan-300 mb-1">Scanning reference...</p>
                        <div className="w-48 h-1.5 bg-white/10">
                          <div
                            className="h-full bg-cyan-400 transition-all"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status pill */}
              {(phase === "memorize" || phase === "choose" || phase === "scan") && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 border border-purple-500/40 bg-black/70 text-[10px] font-mono tracking-[0.3em] uppercase text-purple-300">
                  {phase === "memorize" && `Hafalkan urutan (1 → ${cfg.cards})`}
                  {phase === "choose" && "Klik 2 kartu untuk swap"
                  }
                  {phase === "scan" && `Scanning... ${Math.round(scanProgress)}%`}
                </div>
              )}

              {/* WON state */}
              {phase === "won" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/70">
                  {/* Seal-break animation overlay (only for level 5) */}
                  <AnimatePresence>
                    {(sealBreaking || sealBroken) && cfg.level === 5 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10"
                      >
                        {sealBreaking && (
                          <>
                            <motion.div
                              initial={{ scale: 1, opacity: 1 }}
                              animate={{ scale: [1, 1.1, 1, 1.15, 1.2], opacity: [1, 1, 1, 1, 0.8] }}
                              transition={{ duration: 0.8, times: [0, 0.3, 0.5, 0.7, 1] }}
                              className="relative"
                            >
                              <div className="relative w-24 h-24 rounded-full border-2 border-amber-500/60 bg-amber-950/40 flex items-center justify-center">
                                <Lock className="w-10 h-10 text-amber-300" />
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
                                  <motion.path d="M 20 50 Q 20 20 50 20" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8 }} />
                                  <motion.path d="M 80 50 Q 80 20 50 20" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, delay: 0.1 }} />
                                  <motion.path d="M 20 50 Q 20 80 50 80" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, delay: 0.15 }} />
                                  <motion.path d="M 80 50 Q 80 80 50 80" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0] }} transition={{ duration: 0.8, delay: 0.2 }} />
                                </svg>
                              </div>
                            </motion.div>
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: [0, 1.8, 3], opacity: [0, 1, 0] }}
                              transition={{ duration: 1, delay: 0.4, times: [0, 0.4, 1] }}
                              className="absolute"
                            >
                              <div className="w-32 h-32 rounded-full border-4 border-amber-300" />
                            </motion.div>
                            {[...Array(8)].map((_, i) => {
                              const angle = (i * 360) / 8
                              const rad = (angle * Math.PI) / 180
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                  animate={{ x: Math.cos(rad) * 100, y: Math.sin(rad) * 100, opacity: [0, 1, 0], scale: [0, 1, 0.5] }}
                                  transition={{ duration: 1, delay: 0.4 }}
                                  className="absolute"
                                >
                                  <Sparkles className="w-4 h-4 text-amber-300" />
                                </motion.div>
                              )
                            })}
                            <motion.p
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: [0, 1, 1], y: [10, 0, 0] }}
                              transition={{ duration: 0.8, delay: 0.6 }}
                              className="absolute bottom-16 text-xs font-mono tracking-[0.4em] uppercase text-amber-300"
                            >
                              SEAL · BREAKING...
                            </motion.p>
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="mb-4"
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-400" />
                  </motion.div>
                  <h3 className="text-2xl font-black uppercase text-green-400 mb-2">
                    {cfg.ability} · Berhasil
                  </h3>
                  <p className="text-sm text-white/70 mb-2">Urutan benar. Chamber cleared.</p>
                  {cfg.level === 5 && sealBroken && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-xs text-amber-300 mb-4 tracking-widest uppercase font-mono flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      Gift Section · Segel Pecah
                      <Unlock className="w-3.5 h-3.5" />
                    </motion.p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => dealNewRound(levelIdx)}
                      onMouseEnter={() => sfx.hover()}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-white/20 hover:border-white/40 text-xs uppercase tracking-widest"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Play Again
                    </button>
                    {levelIdx < LEVELS.length - 1 ? (
                      <button
                        onClick={nextLevel}
                        onMouseEnter={() => sfx.hover()}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs uppercase tracking-widest"
                      >
                        Next Chamber
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    ) : (
                      // Level 5 — Next button only shows AFTER seal is broken
                      sealBroken ? (
                        <Link
                          href="/gift"
                          onClick={() => sfx.click()}
                          onMouseEnter={() => sfx.hover()}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-amber-500/60 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs uppercase tracking-widest"
                        >
                          Open Gift
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-white/10 text-white/30 text-xs uppercase tracking-widest cursor-not-allowed">
                          <Lock className="w-3 h-3" />
                          Open Gift · Sealed
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {phase === "lost" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/70">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="mb-4"
                  >
                    <XCircle className="w-16 h-16 text-red-400" />
                  </motion.div>
                  <h3 className="text-2xl font-black uppercase text-red-400 mb-2">
                    Salah Urutan
                  </h3>
                  <p className="text-sm text-white/70 mb-4">
                    Bandingkan barismu dengan acuan. Tanda ✓ = posisi benar, ✗ = salah.
                  </p>
                  <button
                    onClick={() => dealNewRound(levelIdx)}
                    onMouseEnter={() => sfx.hover()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-purple-500/60 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs uppercase tracking-widest"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Reshuffle & Retry
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-purple-500/15 flex items-center justify-between flex-wrap gap-2">
              <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase">
                <Shuffle className="inline w-3 h-3 mr-1 text-purple-400/60" />
                Click 2 cards to swap
              </p>
              <p className="text-[10px] text-white/40 font-mono tracking-widest uppercase">
                Chamber {cfg.level} / {LEVELS.length}
              </p>
            </div>
          </div>

          {/* Tips — paragraph, no box */}
          <div className="mt-8">
            <p className="text-xs font-mono tracking-[0.2em] uppercase text-purple-400/80 mb-3">
              <Activity className="inline w-3.5 h-3.5 mr-1" />
              Catatan Surgeon
            </p>
            <p className="text-sm text-white/60 leading-relaxed">
              Setiap chamber punya urutan kartu yang unik. Saat memorize phase, baris atas
              menunjukkan urutan yang benar dengan nomor di pojok kiri atas. Hafalkan urutan
              kartu-per-kartu. Setelah 4.4 detik, baris atas tersembunyi. Swap kartu di baris
              bawah — klik 2 kartu untuk menukar posisinya. 1× Scan chance: hold tombol Scan
              untuk intip baris acuan lagi.
              <br /><br />
              <span className="text-purple-300 italic">
                Pesan dari Kirie: nggak usah terburu, Yav. 4.4 detik itu lumayan lama kalau kamu fokus. Hindari ngandelin Scan — simpen buat darurat. Tiap ability punya vibe sendiri: Scan itu preview cepat, Shambles itu jangan kecoh sama posisi, Mes itu harus presisi, Takt itu tetap tenang, Counter Shock itu fokus penuh.
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
