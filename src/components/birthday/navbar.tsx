'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Music, Menu, X, Sparkles, Volume2, VolumeX } from "lucide-react"
import { sfx, setMuted, startBgm, stopBgm, isBgmPlaying } from "./sound"

// Minimal navbar — brand + sound/BGM toggles only.
// Page navigation lives inside main page sections (candle gateway,
// footer explore links, subpage back buttons) so it doesn't feel
// like a formal corporate website.
export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [musicOn, setMusicOn] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setMuted(!next)
    if (next) sfx.click()
  }

  const toggleMusic = () => {
    const next = !musicOn
    setMusicOn(next)
    if (next) {
      startBgm()
      sfx.click()
    } else {
      stopBgm()
    }
  }

  const handleNavClick = () => {
    sfx.click()
    setMobileOpen(false)
  }

  return (
    <motion.nav
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/80 backdrop-blur-md border-b border-purple-500/10"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/home"
          onClick={handleNavClick}
          className="group flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300 transition-colors" />
          <span className="text-sm font-mono tracking-[0.3em] text-white/90 group-hover:text-white">
            YAVA · 21
          </span>
        </Link>

        {/* Right controls — BGM + SFX */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMusic}
            aria-label="Toggle background music"
            onMouseEnter={() => sfx.hover()}
            className={`p-1.5 rounded-full border transition-colors ${
              musicOn
                ? "border-purple-400 bg-purple-500/15 text-purple-200"
                : "border-white/15 text-white/40 hover:border-purple-400/60 hover:text-purple-300"
            }`}
          >
            <Music className={`w-3.5 h-3.5 ${musicOn ? "animate-pulse" : ""}`} />
          </button>
          <button
            onClick={toggleSound}
            aria-label="Toggle sound effects"
            onMouseEnter={() => sfx.hover()}
            className={`p-1.5 rounded-full border transition-colors ${
              soundOn
                ? "border-purple-400/60 text-purple-300 hover:border-purple-400"
                : "border-white/15 text-white/40 hover:border-purple-400/60 hover:text-purple-300"
            }`}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Mobile menu (no nav links — just a small hamburger that
              scrolls top, kept for layout consistency on small screens) */}
          <button
            className="md:hidden p-1.5 text-purple-300"
            onClick={() => {
              sfx.click()
              setMobileOpen((v) => !v)
            }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer — only toggles, no page links */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden bg-black/95 border-t border-purple-500/10"
          >
            <div className="px-6 py-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  toggleMusic()
                  setMobileOpen(false)
                }}
                className="py-2 flex items-center gap-2 text-sm font-mono tracking-[0.2em] uppercase text-white/70"
              >
                <Music className={`w-4 h-4 ${musicOn ? "text-purple-300" : ""}`} />
                {musicOn ? "Music On" : "Music Off"}
              </button>
              <button
                onClick={() => {
                  toggleSound()
                  setMobileOpen(false)
                }}
                className="py-2 flex items-center gap-2 text-sm font-mono tracking-[0.2em] uppercase text-white/70"
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {soundOn ? "SFX On" : "SFX Off"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
