#!/usr/bin/env python3
"""Replace the AmputateGame section in gift/page.tsx with a new InjectionShotGame."""

FILE = "/home/z/my-project/src/app/gift/page.tsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

start_marker = "// ============================================================\n//  GAME 3 — AMPUTATE"
end_marker = "// ============================================================\n//  CLAIMED GIFT screen"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print(f"ERROR: markers not found. start={start_idx}, end={end_idx}")
    raise SystemExit(1)

print(f"Replacing chars {start_idx}..{end_idx} ({end_idx - start_idx} bytes)")

NEW_GAME = '''// ============================================================
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

'''

new_content = content[:start_idx] + NEW_GAME + content[end_idx:]

with open(FILE, "w", encoding="utf-8") as f:
    f.write(new_content)

print("DONE: AmputateGame replaced with InjectionShotGame")
