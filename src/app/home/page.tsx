'use client'

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Zap,
  Scale,
  Compass,
  Swords,
  Sparkle,
  ArrowRight,
  Eye,
  Gift as GiftIcon,
  Edit3,
  Check,
  Lock,
  Link2,
} from "lucide-react"
import { Particles } from "@/components/birthday/particles"
import { ConfettiBurst } from "@/components/birthday/confetti-burst"
import { Lightning } from "@/components/birthday/lightning"
import { RoomEffect } from "@/components/birthday/room-effect"
import { Navbar } from "@/components/birthday/navbar"
import { sfx, startBgm } from "@/components/birthday/sound"

// ============================================================
//  HOME · Main Birthday Page
//
//  Sections:
//   1. Hero — "21" with lightning, name (default Yava), subtitle
//   2. Candle Ritual (Ritual 01) → Eye → Lightning → Room
//      After candle blown → gateway links to subpages revealed
//   3. Wishes — 6 messages for Yava (DKV student, art-relatable,
//      encouragement + casual/joke mix)
//   4. Closing — sign-off from Kirie
// ============================================================

// 6 wishes — mix of formal + casual + DKV-art references.
// Sender = Kirie. Tone = rarely fully serious, sometimes semi-serious.
// Yava is a DKV student who's still insecure about their art talent.
const WISHES = [
  {
    num: "01",
    title: "Trust Your Stroke",
    message:
      "Yav, setiap stroke yang kamu buat — meskipun menurutmu masih 'jelek' — itu tanda tanganmu sendiri. Nggak ada yang punya line yang sama. Aku tahu kadang kamu ngerasa kayaknya belum cukup, atau bandinginnya sama orang lain sampai lupa liat kemajuan sendiri. Tapi coba deh buka sketchbook kamu setahun lalu, lalu buka yang sekarang. Beda banget kan? Itu nyata. Trust the process, trust your hand, trust your eye. Style kamu nggak akan datang dari nge-copy orang lain — itu muncul dari konsisten ngelukis yang kamu suka.",
    icon: Zap,
  },
  {
    num: "02",
    title: "Teguh Sama Pilihan",
    message:
      "Kayak Cyno yang berdiri tegak di padang pasir Sumeru, semoga kamu juga tetap tegas sama prinsip yang kamu pegang. Nggak goyah sama arus, nggak tergesa sama waktu, nggak tergiur jalan pintas. Pendirianmu itu pedangmu — rawat baik-baik. Dan kalau ada yang nyoba suruh kamu 'kompromi' sama hal yang melanggar prinsip, anggap aja mereka lagi request revisi ke-99 tanpa bayar. Tolak sopan, tetap di garis kamu.",
    icon: Scale,
  },
  {
    num: "03",
    title: "Open New Room",
    message:
      "Kayak Trafalgar Law yang buka ROOM dan define ulang medan pertempurannya, di umur 21 ini kamu punya kekuatan yang sama. Kamu bisa batasin ulang siapa yang masuk ke hidupmu, kamu bisa pindahin hal-hal yang nggak lagi melayani kamu, kamu bisa tentuin aturan mainmu sendiri. Anggap aja tahun ini kamu dapat fresh canvas baru — kosong, tapi penuh possibility. Tinggal kamu mau canvas-nya diisi apa. Jangan takut mulai dari nol; bagian terbaiknya justru di situ.",
    icon: Compass,
  },
  {
    num: "04",
    title: "Brave Without Limit",
    message:
      "Tahun ini medan pertempuranmu. Bawa pedang keyakinan, kenakan jati diri sebagai baju zirah, taklukkan setiap ombak yang menghadang. Law pernah bilang, orang yang nggak siap mati nggak bisa jadi pengendali kematian. Maka bersiap — bukan buat mati, tapi buat benar-benar hidup. Kadang hidup penuh itu berarti ikut kemana hati bawa, meskipun nyali. Kontras itu penting di desain, dan penting juga di hidup. Jangan takut sama dark mode — di situ warna kamu paling keliatan.",
    icon: Swords,
  },
  {
    num: "05",
    title: "Contrast & Whitespace",
    message:
      "Sebagai anak DKV, kamu pasti paham: kontras itu yang bikin elemen menonjol, whitespace itu yang kasih ruang buat napas. Tahun ini, semoga hidupmu punya keduanya. Cukup kerja, cukup main. Cukup serius, cukup joke. Kalau ketemu dosen toxic atau client jail, jangan ragu reject — itu juga bagian dari design decision, dan kamu mah udah expert. Negative space di jadwal kamu, jaga baik-baik; kadang yang nggak diisi justru yang paling strong.",
    icon: Sparkle,
  },
  {
    num: "06",
    title: "Always Same Room",
    message:
      "Sebagai orang yang kenal kamu, kita nggak harus selalu satu kapal — kadang kamu di Room-mu, aku di Room-ku. Tapi kalau kamu butuh anchor, atau butuh orang yang bisa diajak ribut soal kerning, komposisi, atau hal-hal kecil yang ternyata penting banget, kamu tahu di mana nemuin aku. Selamat ulang tahun, Yav. Trim sebelumnya udah jadi orang yang bisa diajak ngobrolin hal random sampai jam berapa pun. Spill kapan aja, aku siap dengerin (atau minimal react +1 dulu). Eh, ngomong-ngomong, jangan insecure lagi ya sama artwork kamu. Aku yang nggak ngerti desain aja bisa liat kamu punya taste.",
    icon: Eye,
  },
]

export default function HomePage() {
  const [name, setName] = useState("Yava")
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState("")
  const [candleBlown, setCandleBlown] = useState(false)
  const [confettiTrigger, setConfettiTrigger] = useState(0)
  const [lightningTrigger, setLightningTrigger] = useState(0)
  const [roomActive, setRoomActive] = useState(false)
  const [eyeFlash, setEyeFlash] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Sequential unlock state — games must be completed in order:
  //   Cyno ritual (ritual 02-04) → unlocks Law room
  //   Law room (chamber 01-05)   → unlocks Gift claim
  //   Gift claim (3 sub-games)   → completes the whole flow
  // Uses sessionStorage so progress survives page navigation AND refresh
  // within the same tab, but is cleared when the TAB is closed.
  // → If Yava closes the tab and reopens the site, all seals come back.
  // → Clearing browser history does NOT reset (sessionStorage is per-tab,
  //    not tied to browsing history).
  const [ritualDone, setRitualDone] = useState(false)
  const [roomDone, setRoomDone] = useState(false)
  const [giftDone, setGiftDone] = useState(false)

  useEffect(() => {
    try {
      const r = sessionStorage.getItem("yava21_ritual_done") === "1"
      const rm = sessionStorage.getItem("yava21_room_done") === "1"
      const g = sessionStorage.getItem("yava21_gift_done") === "1"
      if (r) setRitualDone(true)
      if (rm) setRoomDone(true)
      if (g) setGiftDone(true)
    } catch {}
  }, [])

  const markRitualDone = () => {
    setRitualDone(true)
    try { sessionStorage.setItem("yava21_ritual_done", "1") } catch {}
  }
  const markRoomDone = () => {
    setRoomDone(true)
    try { sessionStorage.setItem("yava21_room_done", "1") } catch {}
  }

  // Poll sessionStorage when window refocuses or page is shown again
  // (catches same-tab back navigation from /ritual, /room, /gift → /home).
  // sessionStorage is per-tab, so no cross-tab storage events needed.
  useEffect(() => {
    const onFocus = () => {
      try {
        if (sessionStorage.getItem("yava21_ritual_done") === "1") setRitualDone(true)
        if (sessionStorage.getItem("yava21_room_done") === "1") setRoomDone(true)
        if (sessionStorage.getItem("yava21_gift_done") === "1") setGiftDone(true)
      } catch {}
    }
    window.addEventListener("focus", onFocus)
    window.addEventListener("pageshow", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("pageshow", onFocus)
    }
  }, [])

  // ============================================================
  //  Ritual 01 — Candle → Eye → Lightning → Room → Confetti
  //  Reframed causal chain:
  //   1. Blow candle → smoke carries wish up
  //   2. Eye of Anubis flashes (Cyno sees the wish, judges intent)
  //   3. Judgement lightning (verdict delivered — Cyno's element)
  //   4. Room dome materializes in the lightning's residual energy
  //      (Law's spatial rift — gateway to deliver the message)
  //   5. Confetti + hidden message (wish has arrived on the other side)
  // ============================================================
  const handleBlowCandle = () => {
    sfx.candleBlow()

    if (!candleBlown) {
      setCandleBlown(true)
      runRitualSequence()
    } else {
      // Reset and re-trigger
      setRoomActive(false)
      setCandleBlown(false)
      setEyeFlash(false)
      const t = setTimeout(() => {
        sfx.candleBlow()
        setCandleBlown(true)
        runRitualSequence()
      }, 400)
      timersRef.current.push(t)
    }
  }

  const runRitualSequence = () => {
    // Step 2 — Eye of Anubis flash
    const t1 = setTimeout(() => {
      setEyeFlash(true)
      sfx.eyeFlash()
    }, 300)
    timersRef.current.push(t1)

    // Step 3 — Judgement lightning
    const t2 = setTimeout(() => {
      setEyeFlash(false)
      setLightningTrigger((t) => t + 1)
      sfx.judgement()
    }, 700)
    timersRef.current.push(t2)

    // Step 4 — Room opens
    const t3 = setTimeout(() => {
      setRoomActive(true)
      sfx.roomOpen()
    }, 1000)
    timersRef.current.push(t3)

    // Step 5 — Confetti
    const t4 = setTimeout(() => {
      setConfettiTrigger((t) => t + 1)
    }, 1400)
    timersRef.current.push(t4)
  }

  const startEdit = () => {
    setTempName(name)
    setEditingName(true)
    sfx.click()
  }

  const saveName = () => {
    if (tempName.trim()) {
      setName(tempName.trim())
    }
    setEditingName(false)
    sfx.click()
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white relative overflow-hidden">
      {/* Ambient background — keep subtle, no harsh boxes */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-700/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-900/20 rounded-full blur-[120px]" />
      </div>

      <Navbar />
      <Particles />
      <ConfettiBurst trigger={confettiTrigger} />
      <Lightning trigger={lightningTrigger} />

      <main className="flex-1 relative z-10">
        {/* ============ HERO ============ */}
        <section className="min-h-[90vh] flex flex-col items-center justify-center px-4 py-20 text-center relative">
          {/* Date label — 22.06 · 21 */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10"
          >
            <div className="inline-flex items-center gap-3 text-purple-400">
              <span className="w-8 h-px bg-purple-500/50" />
              <span className="text-xs tracking-[0.5em] font-mono">22.06 · GENAP 21</span>
              <span className="w-8 h-px bg-purple-500/50" />
            </div>
          </motion.div>

          {/* Main greeting */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight leading-[1.1] mb-3"
          >
            Happy
            <br />
            <span className="bg-gradient-to-r from-purple-300 via-purple-400 to-violet-500 bg-clip-text text-transparent">
              Birthday
            </span>
          </motion.h1>

          {/* Name (editable) — default Yava */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            {editingName ? (
              <div className="inline-flex items-center gap-2 flex-wrap justify-center">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  autoFocus
                  placeholder="Enter name"
                  className="px-3 py-1 text-2xl sm:text-3xl font-bold text-center bg-transparent border-b-2 border-purple-500 outline-none text-white min-w-[180px]"
                />
                <button
                  onClick={saveName}
                  className="p-1.5 rounded-full bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  aria-label="Save name"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEdit}
                onMouseEnter={() => sfx.hover()}
                className="group inline-flex items-center gap-2 hover:text-purple-300 transition-colors"
              >
                <span className="text-2xl sm:text-3xl font-bold tracking-wide">{name}</span>
                <Edit3 className="w-3.5 h-3.5 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </motion.div>

          {/* Big 21 — lightning bolts around it UNTOUCHED (revision #1) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7, type: "spring", stiffness: 100 }}
            className="relative mb-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-purple-600/40 blur-3xl scale-150" />
              <motion.div
                animate={{
                  textShadow: [
                    "0 0 20px rgba(168,85,247,0.5)",
                    "0 0 40px rgba(168,85,247,0.8)",
                    "0 0 20px rgba(168,85,247,0.5)",
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="relative text-[10rem] sm:text-[14rem] md:text-[18rem] font-black leading-none tracking-tighter bg-gradient-to-b from-white via-purple-200 to-purple-600 bg-clip-text text-transparent"
              >
                21
              </motion.div>

              {/* Lightning bolts AROUND the number — keep as-is per user request */}
              <motion.div
                className="absolute -left-6 top-1/4 text-purple-400"
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-5 h-5 sm:w-7 sm:h-7 fill-purple-400" />
              </motion.div>
              <motion.div
                className="absolute -right-6 bottom-1/4 text-purple-400"
                animate={{ opacity: [0.2, 1, 0.2], scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                <Zap className="w-5 h-5 sm:w-7 sm:h-7 fill-purple-400" />
              </motion.div>
              <motion.div
                className="absolute -left-2 bottom-0 text-violet-500"
                animate={{ opacity: [0.1, 0.8, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
              >
                <Zap className="w-3 h-3 fill-violet-500" />
              </motion.div>
              <motion.div
                className="absolute -right-2 top-0 text-violet-500"
                animate={{ opacity: [0.1, 0.8, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }}
              >
                <Zap className="w-3 h-3 fill-violet-500" />
              </motion.div>
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-base sm:text-lg text-white/60 max-w-md leading-relaxed"
          >
            New year. New adventure. New power.
            <br />
            Welcome to the bigger field.
          </motion.p>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-px h-12 bg-gradient-to-b from-purple-500 to-transparent"
            />
          </motion.div>
        </section>

        {/* ============ CANDLE RITUAL (Ritual 01) ============ */}
        <section className="py-24 px-4 relative">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-4"
            >
              <span className="text-xs tracking-[0.4em] font-mono text-purple-500">
                RITUAL · 01 ·{" "}
                <ruby>
                  儀式<rt>ぎしき</rt>
                </ruby>
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-5xl font-black uppercase mb-4"
            >
              {candleBlown ? (
                <span className="bg-gradient-to-r from-purple-300 to-violet-500 bg-clip-text text-transparent">
                  Room Aktif
                </span>
              ) : (
                <>Kirim Permohonan</>
              )}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-white/60 mb-12 max-w-md mx-auto"
            >
              {candleBlown
                ? "Mata Anubis melihat. Petir pengadilan menyambar. Room terbuka. Pesanmu kini berada di sisi lain."
                : "Tiup lilin. Asap permohonanmu naik. Mata Anubis menilai niatmu. Petir pengadilan menyambar. Room terbuka — pesanmu sampai ke dimensi paralel."}
            </motion.p>

            {/* Cake + ROOM container — single visual, no extra boxes */}
            <div className="relative w-full max-w-[520px] aspect-square mx-auto mb-10 flex items-center justify-center">
              <RoomEffect active={roomActive} />

              <AnimatePresence>
                {eyeFlash && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, rotate: -90 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 1.4, opacity: 0, rotate: 90 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className="absolute top-[18%] left-1/2 -translate-x-1/2 z-20 pointer-events-none"
                  >
                    <Eye
                      className="w-12 h-12 text-amber-300"
                      style={{
                        filter:
                          "drop-shadow(0 0 12px rgba(251,191,36,0.9)) drop-shadow(0 0 24px rgba(251,191,36,0.6))",
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                className="relative z-10"
                animate={candleBlown ? { y: [0, -3, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <CakeSVG blown={candleBlown} />
              </motion.div>

              <AnimatePresence>
                {roomActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.3, letterSpacing: "0.5em" }}
                    animate={{
                      opacity: [0, 1, 1, 0.7, 0],
                      scale: [0.3, 1.1, 1, 1.05, 1.2],
                      letterSpacing: ["0.5em", "0.3em", "0.3em", "0.4em", "0.6em"],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 2, times: [0, 0.2, 0.5, 0.8, 1] }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    <span className="text-5xl sm:text-7xl font-black tracking-[0.3em] text-purple-300 bg-gradient-to-b from-white to-purple-400 bg-clip-text text-transparent">
                      ROOM
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Action button — also the gateway: clicking reveals subpage links */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleBlowCandle}
              onMouseEnter={() => sfx.hover()}
              className="group relative inline-flex items-center gap-3 px-8 py-4 overflow-hidden border border-purple-500/50 hover:border-purple-400 transition-colors"
            >
              <span className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/20 transition-colors" />
              <span className="absolute left-0 top-0 h-full w-px bg-purple-500/0 group-hover:bg-purple-500/100 transition-all duration-500 group-hover:w-full" />
              <Zap className="relative w-4 h-4 text-purple-400 group-hover:text-white transition-colors" />
              <span className="relative text-sm font-bold uppercase tracking-[0.2em] text-white group-hover:text-white transition-colors">
                {candleBlown ? "Ulangi Ritual" : "Tiup Lilin"}
              </span>
            </motion.button>

            {/* Hidden message + gateway links — only after candle blown */}
            <AnimatePresence>
              {candleBlown && (
                <motion.div
                  initial={{ opacity: 0, y: 30, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -20, height: 0 }}
                  transition={{ delay: 1.4, duration: 0.8 }}
                  className="mt-16 overflow-hidden"
                >
                  {/* Divider with sigil — replaces "box" framing */}
                  <div className="flex items-center gap-4 mb-10">
                    <span className="flex-1 h-px bg-gradient-to-r from-transparent to-purple-500/50" />
                    <Sparkle className="w-4 h-4 text-purple-400" />
                    <span className="flex-1 h-px bg-gradient-to-l from-transparent to-purple-500/50" />
                  </div>

                  <p className="text-xs tracking-[0.4em] font-mono text-purple-500 mb-4">
                    PESAN MASUK
                  </p>

                  <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed text-white/90 mb-4 italic">
                    &ldquo;Setiap orang punya Room-nya sendiri. Di dalamnya, kamu adalah
                    pengendali. Tahun ini, buka Room-mu — dan ambil kendali penuh atas
                    medan yang kamu pijak.&rdquo;
                  </blockquote>

                  <p className="text-sm text-purple-400 tracking-wide mb-10">
                    — Kirie, dari sisi lain ROOM
                  </p>

                  {/* Gateway links — text + arrow, locked state shows chain icon */}
                  <div className="space-y-4 max-w-md mx-auto mb-6 text-left">
                    {/* Cyno ritual — always unlocked (gate is the candle blow) */}
                    <Link
                      href="/ritual"
                      onClick={() => sfx.click()}
                      onMouseEnter={() => sfx.hover()}
                      className="group flex items-center justify-between gap-4 py-3 border-b border-purple-500/20 hover:border-amber-400/60 transition-colors"
                    >
                      <span className="flex-1">
                        <span className="block text-[10px] font-mono tracking-[0.3em] text-amber-400/80 mb-1 flex items-center gap-2">
                          RITUAL · 02-04
                          {ritualDone && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-green-500/40 bg-green-500/10 text-green-300/80 text-[8px] tracking-[0.2em]">
                              <Check className="w-2.5 h-2.5" /> DONE
                            </span>
                          )}
                        </span>
                        <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-white group-hover:text-amber-200 transition-colors">
                          Pengadilan Cyno
                        </span>
                        <span className="block text-[10px] font-mono tracking-[0.2em] text-white/40 mt-1 uppercase">
                          Level/Age · 02 → 04
                        </span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-2 transition-transform" />
                    </Link>

                    {/* Law room — locked until Cyno ritual complete */}
                    {ritualDone ? (
                      <Link
                        href="/room"
                        onClick={() => sfx.click()}
                        onMouseEnter={() => sfx.hover()}
                        className="group flex items-center justify-between gap-4 py-3 border-b border-purple-500/20 hover:border-purple-400 transition-colors"
                      >
                        <span className="flex-1">
                          <span className="block text-[10px] font-mono tracking-[0.3em] text-purple-400/80 mb-1 flex items-center gap-2">
                            CHAMBER · 01-05
                            {roomDone && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-green-500/40 bg-green-500/10 text-green-300/80 text-[8px] tracking-[0.2em]">
                                <Check className="w-2.5 h-2.5" /> DONE
                              </span>
                            )}
                          </span>
                          <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-white group-hover:text-purple-200 transition-colors">
                            Room Law
                          </span>
                          <span className="block text-[10px] font-mono tracking-[0.2em] text-white/40 mt-1 uppercase">
                            Level/Age · 01 → 05
                          </span>
                        </span>
                        <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-2 transition-transform" />
                      </Link>
                    ) : (
                      <div className="group flex items-center justify-between gap-4 py-3 border-b border-purple-500/10 opacity-50 cursor-not-allowed">
                        <span className="flex-1">
                          <span className="block text-[10px] font-mono tracking-[0.3em] text-purple-400/60 mb-1">
                            CHAMBER · 01-05 · LOCKED
                          </span>
                          <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-purple-500" />
                            Room Law
                          </span>
                          <span className="block text-[10px] font-mono tracking-[0.2em] text-white/30 mt-1 uppercase">
                            Level/Age · 01 → 05 · Selesaikan Cyno dulu
                          </span>
                        </span>
                        <Link2 className="w-4 h-4 text-purple-500/60" />
                      </div>
                    )}

                    {/* Gift claim — locked until Law room complete */}
                    {roomDone ? (
                      <Link
                        href="/gift"
                        onClick={() => sfx.click()}
                        onMouseEnter={() => sfx.hover()}
                        className="group flex items-center justify-between gap-4 py-3 border-b border-purple-500/20 hover:border-pink-400/60 transition-colors"
                      >
                        <span className="flex-1">
                          <span className="block text-[10px] font-mono tracking-[0.3em] text-pink-400/80 mb-1 flex items-center gap-2">
                            HADIAH · KLAIM
                            {giftDone && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-green-500/40 bg-green-500/10 text-green-300/80 text-[8px] tracking-[0.2em]">
                                <Check className="w-2.5 h-2.5" /> DONE
                              </span>
                            )}
                          </span>
                          <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-white group-hover:text-pink-200 transition-colors">
                            Bounty Voucher
                          </span>
                          <span className="block text-[10px] font-mono tracking-[0.2em] text-white/40 mt-1 uppercase">
                            Level/Age · Final
                          </span>
                        </span>
                        <GiftIcon className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                      </Link>
                    ) : (
                      <div className="group flex items-center justify-between gap-4 py-3 border-b border-purple-500/10 opacity-50 cursor-not-allowed">
                        <span className="flex-1">
                          <span className="block text-[10px] font-mono tracking-[0.3em] text-pink-400/60 mb-1">
                            HADIAH · KLAIM · LOCKED
                          </span>
                          <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-pink-500" />
                            Bounty Voucher
                          </span>
                          <span className="block text-[10px] font-mono tracking-[0.2em] text-white/30 mt-1 uppercase">
                            Level/Age · Final · Selesaikan Law dulu
                          </span>
                        </span>
                        <Link2 className="w-4 h-4 text-pink-500/60" />
                      </div>
                    )}
                  </div>

                  {/* Stat row — single line, no boxes */}
                  <div className="mt-10 flex items-center justify-center gap-8 sm:gap-12 text-center">
                    <div>
                      <p className="text-3xl font-black text-purple-400 font-mono">21</p>
                      <p className="text-xs text-white/40 tracking-widest uppercase mt-1">Level/Age</p>
                    </div>
                    <span className="w-px h-10 bg-purple-500/30" />
                    <div>
                      <p className="text-3xl font-black text-purple-400 font-mono">∞</p>
                      <p className="text-xs text-white/40 tracking-widest uppercase mt-1">Possibility</p>
                    </div>
                    <span className="w-px h-10 bg-purple-500/30" />
                    <div>
                      <p className="text-3xl font-black text-purple-400 font-mono">01</p>
                      <p className="text-xs text-white/40 tracking-widest uppercase mt-1">Room Aktif</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ============ WISHES ============ */}
        <section id="wishes" className="py-24 px-4 relative scroll-mt-20">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mb-20 text-center"
            >
              <span className="text-xs tracking-[0.4em] font-mono text-purple-500">
                DOA · 01 — 06
              </span>
              <h2 className="mt-4 text-3xl sm:text-5xl font-black uppercase">
                Enam <span className="text-purple-400">Pesan</span>
                <br />
                Untuk Tahun Baru
              </h2>
              <p className="mt-4 text-sm text-white/40 italic">
                dari Kirie · untuk {name}
              </p>
            </motion.div>

            <div className="space-y-0">
              {WISHES.map((wish, i) => {
                const Icon = wish.icon
                return (
                  <motion.div
                    key={wish.num}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6 }}
                    className="group relative"
                  >
                    <div className="grid grid-cols-[auto_1fr] gap-6 sm:gap-10 py-10">
                      <div className="text-5xl sm:text-7xl font-black font-mono text-purple-500/30 group-hover:text-purple-400/60 transition-colors leading-none">
                        {wish.num}
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-3 mb-4">
                          <Icon className="w-4 h-4 text-purple-400" />
                          <span className="w-6 h-px bg-purple-500/40" />
                          <h3 className="text-lg sm:text-2xl font-bold uppercase tracking-wide">
                            {wish.title}
                          </h3>
                        </div>
                        <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-2xl">
                          {wish.message}
                        </p>
                      </div>
                    </div>
                    {i < WISHES.length - 1 && (
                      <div className="h-px bg-gradient-to-r from-purple-500/30 via-purple-500/10 to-transparent" />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ============ CLOSING ============ */}
        <section id="closing" className="py-32 px-4 text-center relative scroll-mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto relative"
          >
            <div className="absolute inset-0 bg-purple-600/10 blur-3xl scale-110" />
            <div className="relative">
              <Zap className="w-6 h-6 text-purple-400 mx-auto mb-6 fill-purple-400/30" />
              <p className="text-xl sm:text-2xl leading-relaxed text-white/90 font-light mb-6">
                Di tahun ke-21 ini, semoga kamu menemukan kekuatan seperti
                <span className="text-purple-300 font-medium"> Cyno </span>
                yang menegakkan keadilan dengan ketegasan, dan keberanian seperti
                <span className="text-purple-300 font-medium"> Law </span>
                yang menaklukkan lautan dengan strategi.
              </p>
              <p className="text-base text-white/60 mb-10">
                Kamu akan menaklukkan tahun ini. Aku yakin. Atau minimal — kamu akan desain tahun ini jadi keren. Same thing, basically. Eh, jangan insecure lagi ya sama bakat seni kamu. Aku yang nggak ngerti desain aja bisa liat kamu punya taste.
              </p>
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="w-6 h-px bg-purple-500/50" />
                <span className="text-xs tracking-[0.4em] font-mono text-purple-400">
                  DARI KIRIE
                </span>
                <span className="w-6 h-px bg-purple-500/50" />
              </div>
              <p className="text-sm text-purple-400/70">
                untuk {name}
              </p>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-purple-500/10 mt-auto">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/30 font-mono tracking-widest">
            22 · 06 · BIRTHDAY
          </p>
          <p className="text-xs text-white/30 font-mono tracking-widest">
            ROOM · ACTIVE
          </p>
        </div>
      </footer>
    </div>
  )
}

// ============ CAKE SVG ============
// Simpler, cleaner cake (3 tiers) — kept at the larger size.
//  - Bottom tier: vertical purple stripe accents (rhythm of color)
//  - Middle tier: Heart Pirates smiley (Law's flag)
//  - Top tier: lightning bolt (Cyno's electro)
//  - Candle: purple flame + stripes
function CakeSVG({ blown }: { blown: boolean }) {
  return (
    <svg
      width="280"
      height="320"
      viewBox="0 0 200 240"
      className="drop-shadow-[0_0_24px_rgba(168,85,247,0.4)]"
    >
      {/* Plate */}
      <ellipse cx="100" cy="225" rx="85" ry="6" fill="#27272a" />
      <ellipse cx="100" cy="222" rx="85" ry="4" fill="#3f3f46" />

      {/* Bottom tier */}
      <rect x="25" y="155" width="150" height="65" fill="#0a0a0a" />
      <rect x="25" y="153" width="150" height="4" fill="#a855f7" />
      <rect x="25" y="218" width="150" height="2" fill="#7c3aed" opacity="0.5" />

      {/* Decorative purple accents — vertical bars on bottom tier */}
      <rect x="35" y="180" width="6" height="20" fill="#a855f7" opacity="0.4" />
      <rect x="55" y="175" width="3" height="30" fill="#c084fc" opacity="0.5" />
      <rect x="75" y="180" width="6" height="20" fill="#a855f7" opacity="0.4" />
      <rect x="95" y="175" width="3" height="30" fill="#c084fc" opacity="0.5" />
      <rect x="115" y="180" width="6" height="20" fill="#a855f7" opacity="0.4" />
      <rect x="135" y="175" width="3" height="30" fill="#c084fc" opacity="0.5" />
      <rect x="155" y="180" width="6" height="20" fill="#a855f7" opacity="0.4" />

      {/* Middle tier */}
      <rect x="50" y="105" width="100" height="48" fill="#18181b" />
      <rect x="50" y="103" width="100" height="3" fill="#a855f7" />

      {/* Heart pirates smiley */}
      <g transform="translate(100, 130)">
        <circle cx="0" cy="0" r="10" fill="none" stroke="#d8b4fe" strokeWidth="1.2" />
        <path d="M -5 2 Q 0 5 5 2" fill="none" stroke="#d8b4fe" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="-3" cy="-2" r="0.8" fill="#d8b4fe" />
        <circle cx="3" cy="-2" r="0.8" fill="#d8b4fe" />
      </g>

      {/* Top tier */}
      <rect x="70" y="60" width="60" height="42" fill="#0a0a0a" />
      <rect x="70" y="58" width="60" height="3" fill="#a855f7" />

      {/* Lightning bolt decoration on top tier */}
      <path
        d="M 100 75 L 95 85 L 100 85 L 95 95 L 105 82 L 100 82 Z"
        fill="#c084fc"
        opacity="0.7"
      />

      {/* Candle */}
      <rect x="95" y="30" width="10" height="28" fill="#18181b" />
      <rect x="95" y="36" width="10" height="1.5" fill="#a855f7" />
      <rect x="95" y="44" width="10" height="1.5" fill="#a855f7" />
      <rect x="95" y="52" width="10" height="1.5" fill="#a855f7" />
      <rect x="99" y="25" width="2" height="6" fill="#525252" />

      {/* Flame */}
      {!blown && (
        <motion.g
          animate={{
            scaleY: [1, 1.18, 0.92, 1.1, 1],
            scaleX: [1, 0.93, 1.07, 0.95, 1],
            opacity: [0.9, 1, 0.95, 1, 0.9],
          }}
          transition={{ duration: 0.5, repeat: Infinity }}
          style={{ transformOrigin: "100px 30px" }}
        >
          <path
            d="M 100 25 Q 92 15 100 0 Q 108 15 100 25 Z"
            fill="#a855f7"
            style={{ filter: "drop-shadow(0 0 6px #a855f7) drop-shadow(0 0 12px #7c3aed)" }}
          />
          <path
            d="M 100 22 Q 96 14 100 5 Q 104 14 100 22 Z"
            fill="#e9d5ff"
            style={{ filter: "drop-shadow(0 0 4px #c084fc)" }}
          />
          <ellipse cx="100" cy="20" rx="1.5" ry="3" fill="#ffffff" opacity="0.9" />
        </motion.g>
      )}

      {/* Smoke when blown */}
      {blown && (
        <motion.g
          initial={{ opacity: 0.7, y: 0 }}
          animate={{ opacity: [0.7, 0.4, 0.1, 0], y: [0, -25, -45, -65] }}
          transition={{ duration: 2.5 }}
        >
          <circle cx="100" cy="20" r="2.5" fill="#71717a" />
          <circle cx="103" cy="10" r="2" fill="#71717a" />
          <circle cx="97" cy="2" r="1.5" fill="#71717a" />
          <circle cx="101" cy="-8" r="1" fill="#71717a" />
        </motion.g>
      )}
    </svg>
  )
}
