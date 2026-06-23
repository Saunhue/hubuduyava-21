'use client'

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, Sparkles, ArrowRight, Shuffle } from "lucide-react"
import { Particles } from "@/components/birthday/particles"
import { sfx, startBgm } from "@/components/birthday/sound"

// ============================================================
//  EASTER EGG LANDING — Secret Answer → Shambles → Home
//
//  Before reaching the main birthday page, Yava must answer a
//  question only they would know. When the answer is correct,
//  the "SHAMBLES" button unlocks. Clicking it triggers Law's
//  spatial-swap animation:
//    1. The screen scrambles (cards/particles swap positions)
//    2. Purple lightning arcs (Ope Ope no Mi signature)
//    3. The interface "swaps" away — replaced by the home page
//
//  Question: "Apa figure yang dibeli Kirie saat kamu dapat
//             figure Usopp dari gacha?"
//  Answer:   "psyduck" (case-insensitive)
// ============================================================

const ANSWER = "psyduck"

const isAnswerCorrect = (input: string) =>
  input.trim().toLowerCase() === ANSWER.toLowerCase()

export default function EggPage() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [correct, setCorrect] = useState(false)
  const [shake, setShake] = useState(false)
  const [shambling, setShambling] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 600)
    return () => clearTimeout(t)
  }, [])

  const checkCode = (value: string) => {
    setCode(value)
    if (isAnswerCorrect(value)) {
      setCorrect(true)
      sfx.reveal()
    } else {
      if (correct) sfx.lose()
      setCorrect(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAnswerCorrect(code)) {
      setShake(true)
      sfx.lose()
      setTimeout(() => setShake(false), 500)
      return
    }
    triggerShambles()
  }

  const triggerShambles = () => {
    if (shambling) return
    setShambling(true)
    // Start BGM right when the user enters — they implicitly opted in
    startBgm()
    // Sequence of shambles SFX
    sfx.judgement()
    setTimeout(() => sfx.roomOpen(), 200)
    setTimeout(() => sfx.judgement(), 600)
    setTimeout(() => sfx.reveal(), 1000)
    // After animation, navigate
    setTimeout(() => {
      router.push("/home")
    }, 2200)
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-700/15 rounded-full blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <Particles />

      {/* Shambles overlay — scrambling cards + lightning arcs */}
      <AnimatePresence>
        {shambling && <ShamblesOverlay />}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={
          shambling
            ? { opacity: 0, scale: 1.3, filter: "blur(8px)" }
            : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
        }
        transition={{ duration: shambling ? 0.4 : 0.8 }}
        className="relative z-10 w-full max-w-md text-center"
      >
        {/* Sigil eye */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 120, delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative inline-flex">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 -m-4 rounded-full border border-dashed border-purple-500/30"
            />
            <Eye
              className="w-12 h-12 text-purple-300"
              style={{ filter: "drop-shadow(0 0 12px rgba(168,85,247,0.6))" }}
            />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-xs tracking-[0.5em] font-mono text-purple-400 mb-3"
        >
          ROOM · LOCKED
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-3xl sm:text-5xl font-black uppercase mb-3 leading-tight"
        >
          Secret
          <br />
          <span className="bg-gradient-to-r from-purple-300 via-purple-400 to-violet-500 bg-clip-text text-transparent">
            Question
          </span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-8 max-w-sm mx-auto"
        >
          <p className="text-sm text-white/70 leading-relaxed mb-2">
            Apa figure yang dibeli Kirie saat kamu dapat figure Usopp dari gacha?
          </p>
          <p className="text-purple-400/70 italic text-xs">
            Only Yava would know. Type the answer below.
          </p>
        </motion.div>

        {/* Answer form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={shake ? { x: [-8, 8, -6, 6, 0] } : { opacity: 1, y: 0, x: 0 }}
          transition={{ delay: 0.9, duration: shake ? 0.4 : 0.5 }}
          className="space-y-6"
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => checkCode(e.target.value)}
              placeholder="your answer..."
              autoComplete="off"
              spellCheck={false}
              className="w-full px-4 py-4 text-center text-xl font-mono tracking-[0.15em] bg-black/60 border-2 outline-none transition-colors rounded-none"
              style={{
                borderColor: correct ? "#a855f7" : "rgba(168,85,247,0.3)",
                boxShadow: correct
                  ? "0 0 24px rgba(168,85,247,0.4), inset 0 0 12px rgba(168,85,247,0.1)"
                  : "none",
              }}
            />
            <AnimatePresence>
              {correct && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute -right-3 -top-3"
                >
                  <Sparkles className="w-5 h-5 text-purple-300" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Shambles button — locked until code correct */}
          <motion.button
            type="submit"
            disabled={!correct}
            whileHover={correct ? { scale: 1.03 } : {}}
            whileTap={correct ? { scale: 0.97 } : {}}
            onMouseEnter={() => correct && sfx.hover()}
            className={`group relative w-full inline-flex items-center justify-center gap-3 px-8 py-4 overflow-hidden transition-all ${
              correct
                ? "border-2 border-purple-400 bg-purple-500/10 cursor-pointer"
                : "border border-white/10 bg-transparent cursor-not-allowed opacity-40"
            }`}
          >
            {correct && (
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/30 to-purple-500/0"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            <Shuffle className={`relative w-4 h-4 ${correct ? "text-purple-300" : "text-white/40"}`} />
            <span
              className={`relative text-sm font-black uppercase tracking-[0.3em] ${
                correct ? "text-white" : "text-white/40"
              }`}
            >
              {correct ? "Shambles" : "Locked"}
            </span>
            {correct && (
              <ArrowRight className="relative w-4 h-4 text-purple-300 group-hover:translate-x-1 transition-transform" />
            )}
          </motion.button>
        </motion.form>

        {/* Hint text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 text-[10px] tracking-[0.4em] font-mono text-purple-500/40 uppercase"
        >
          Ope Ope no Mi · 手術の手術
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-2 text-[10px] text-white/30"
        >
          Tip: a Pokémon. Yellow duck.
        </motion.p>
      </motion.div>
    </div>
  )
}

// ============================================================
//  Shambles transition overlay
//  Scrambling cards + purple lightning arcs that "swap" the page
// ============================================================
function ShamblesOverlay() {
  // Random positions for scrambling cards
  const cards = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    r: Math.random() * 360,
  }))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 pointer-events-none"
    >
      {/* Purple flash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.6, 0.3, 0.8, 0] }}
        transition={{ duration: 1.5, times: [0, 0.1, 0.3, 0.5, 1] }}
        className="absolute inset-0 bg-purple-500"
      />

      {/* Scrambling cards */}
      {cards.map((c) => (
        <motion.div
          key={c.id}
          initial={{
            x: `${c.x}vw`,
            y: `${c.y}vh`,
            rotate: c.r,
            scale: 0,
            opacity: 0,
          }}
          animate={{
            x: [`${c.x}vw`, `${100 - c.x}vw`, `${50}vw`],
            y: [`${c.y}vh`, `${100 - c.y}vh`, `${50}vh`],
            rotate: [c.r, c.r + 180, c.r + 360],
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute w-16 h-24 border-2 border-purple-300 bg-black/80"
          style={{
            boxShadow: "0 0 16px rgba(168,85,247,0.7)",
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-300" />
          </div>
        </motion.div>
      ))}

      {/* Lightning arcs */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <motion.path
          d="M 0 50% L 30% 30% L 50% 60% L 70% 40% L 100% 50%"
          stroke="#a855f7"
          strokeWidth="2"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, times: [0, 0.3, 0.7, 1] }}
          style={{ filter: "drop-shadow(0 0 8px #a855f7)" }}
        />
        <motion.path
          d="M 0 30% L 40% 70% L 60% 20% L 100% 60%"
          stroke="#c084fc"
          strokeWidth="1.5"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.5, times: [0.1, 0.4, 0.7, 1], delay: 0.1 }}
          style={{ filter: "drop-shadow(0 0 6px #c084fc)" }}
        />
      </svg>

      {/* Final ROOM burst */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 4], opacity: [0, 1, 0] }}
        transition={{ duration: 1, delay: 0.7, times: [0, 0.4, 1] }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl font-black text-purple-200"
        style={{
          textShadow: "0 0 20px #a855f7, 0 0 40px #a855f7, 0 0 80px #a855f7",
          letterSpacing: "0.3em",
        }}
      >
        ROOM
      </motion.div>
    </motion.div>
  )
}
