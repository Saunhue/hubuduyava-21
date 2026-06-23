'use client'

// ============================================================
//  Sound utility — Web Audio API
//
//  BGM: festive multi-instrumental loop — plucky bass + chord
//  pads + arpeggio bells + tambourine, all synthesized. Sounds
//  like a small birthday parade, not ambient drone.
//
//  SFX: synthesized on the fly. candleBlow is a longer
//  celebration fanfare with gradual fade (no abrupt cut).
// ============================================================

let ctx: AudioContext | null = null
let muted = false
let bgmStarted = false
let bgmStopped = false
let bgmVolume = 0.32 // louder — was 0.18
let bgmNodes: { osc: OscillatorNode; gain: GainNode }[] = []
let bgmMasterGain: GainNode | null = null
let bgmInterval: ReturnType<typeof setInterval> | null = null
let bgmBeatCount = 0

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new Ctor()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function setMuted(m: boolean) {
  muted = m
  if (m) stopBgm()
  else if (bgmStarted && !bgmStopped) startBgm()
}

export function isMuted() {
  return muted
}

interface ToneOpts {
  freq: number
  duration: number
  type?: OscillatorType
  volume?: number
  delay?: number
  sweep?: number
  fadeOut?: boolean
  attack?: number
  destination?: AudioNode
}

// SFX master multiplier — boosts all one-shot SFX volumes (does NOT affect BGM master gain)
const SFX_BOOST = 1.9

function tone(opts: ToneOpts) {
  if (muted) return
  const c = getCtx()
  if (!c) return
  const start = c.currentTime + (opts.delay ?? 0)
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(opts.freq, start)
  if (opts.sweep) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweep), start + opts.duration)
  }
  const v = (opts.volume ?? 0.04) * SFX_BOOST
  const atk = opts.attack ?? 0.005
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(v, start + atk)
  if (opts.fadeOut === false) {
    gain.gain.setValueAtTime(v, start + opts.duration - 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, start + opts.duration)
  } else {
    gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration)
  }
  osc.connect(gain)
  gain.connect(opts.destination ?? c.destination)
  osc.start(start)
  osc.stop(start + opts.duration + 0.05)
}

// Noise burst helper (used for percussion / paper tear)
function noiseBurst(opts: {
  duration: number
  volume?: number
  delay?: number
  filterType?: BiquadFilterType
  filterFreq?: number
  filterQ?: number
  sweepTo?: number
  destination?: AudioNode
}) {
  if (muted) return
  const c = getCtx()
  if (!c) return
  const start = c.currentTime + (opts.delay ?? 0)
  const bufferSize = Math.max(1, Math.floor(c.sampleRate * opts.duration))
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const filter = c.createBiquadFilter()
  filter.type = opts.filterType ?? 'bandpass'
  filter.frequency.setValueAtTime(opts.filterFreq ?? 2000, start)
  if (opts.sweepTo) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, opts.sweepTo), start + opts.duration)
  }
  filter.Q.setValueAtTime(opts.filterQ ?? 1.5, start)
  const g = c.createGain()
  // Apply SFX boost unless caller routes to a custom destination (BGM routes to its own master)
  const boost = opts.destination ? 1 : SFX_BOOST
  g.gain.setValueAtTime((opts.volume ?? 0.06) * boost, start)
  g.gain.exponentialRampToValueAtTime(0.001, start + opts.duration)
  src.connect(filter)
  filter.connect(g)
  g.connect(opts.destination ?? c.destination)
  src.start(start)
  src.stop(start + opts.duration + 0.02)
}

// ============== BGM ==============
// Festive multi-instrumental loop, C major, ~120bpm, 4-beat cycle.
// Layers:
//  - Sub bass on roots (C2 / G2)
//  - Plucky mid (triangle) playing the I-vi-IV-V arpeggio
//  - Bell pad (sine + triangle) on chord stabs
//  - Tambourine (high-pass noise) on off-beats
//  - Optional sparkle (high sine melody on bar 4)
//
// Song structure: C  Am  F  G   |  C  Am  F  G  (8 bars, looped)
//   Bar 1-2: C       (root C,  arp C-E-G-C)
//   Bar 3-4: Am      (root A,  arp A-C-E-A)
//   Bar 5-6: F       (root F,  arp F-A-C-F)
//   Bar 7-8: G       (root G,  arp G-B-D-G)

const CHORDS = [
  // [bassFreq, chordTones[]]
  { bass: 65.41, tones: [261.63, 329.63, 392.0, 523.25] }, // C
  { bass: 55.0, tones: [220.0, 261.63, 329.63, 440.0] },   // Am
  { bass: 43.65, tones: [174.61, 220.0, 261.63, 349.23] }, // F
  { bass: 49.0, tones: [196.0, 246.94, 293.66, 392.0] },   // G
]

export function startBgm() {
  if (muted) return
  if (bgmStarted && !bgmStopped) return
  const c = getCtx()
  if (!c) return
  bgmStarted = true
  bgmStopped = false
  bgmBeatCount = 0

  // Master chain: master gain → soft compressor → destination
  bgmMasterGain = c.createGain()
  bgmMasterGain.gain.setValueAtTime(0, c.currentTime)
  bgmMasterGain.gain.linearRampToValueAtTime(bgmVolume, c.currentTime + 2.5)

  const comp = c.createDynamicsCompressor()
  comp.threshold.setValueAtTime(-18, c.currentTime)
  comp.knee.setValueAtTime(20, c.currentTime)
  comp.ratio.setValueAtTime(3, c.currentTime)
  comp.attack.setValueAtTime(0.005, c.currentTime)
  comp.release.setValueAtTime(0.1, c.currentTime)

  bgmMasterGain.connect(comp)
  comp.connect(c.destination)

  // Sustained pad layer — soft sine chord that holds through each bar
  // Plays the root + fifth of the current chord, very quiet, through lowpass
  const padFilter = c.createBiquadFilter()
  padFilter.type = 'lowpass'
  padFilter.frequency.setValueAtTime(1200, c.currentTime)
  padFilter.Q.setValueAtTime(0.5, c.currentTime)
  padFilter.connect(bgmMasterGain)

  // 4 pad oscillators (one per chord tone) — sustained
  // We'll change their frequencies per bar via the scheduler
  for (let i = 0; i < 4; i++) {
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = i === 0 ? 'sine' : 'triangle'
    osc.frequency.setValueAtTime(CHORDS[0].tones[i], c.currentTime)
    g.gain.setValueAtTime(i === 0 ? 0.10 : 0.035, c.currentTime)
    osc.connect(g)
    g.connect(padFilter)
    osc.start()
    bgmNodes.push({ osc, gain: g })
  }

  // Sub-bass oscillator — plays root of current chord
  const bassOsc = c.createOscillator()
  const bassG = c.createGain()
  bassOsc.type = 'sine'
  bassOsc.frequency.setValueAtTime(CHORDS[0].bass, c.currentTime)
  bassG.gain.setValueAtTime(0.16, c.currentTime)
  bassOsc.connect(bassG)
  bassG.connect(bgmMasterGain)
  bassOsc.start()
  bgmNodes.push({ osc: bassOsc, gain: bassG })

  // The beat scheduler — runs every 500ms (eighth notes at 120bpm)
  // Each bar = 4 beats = 2000ms. Chord changes every 2 bars (4000ms).
  const beatMs = 500
  bgmInterval = setInterval(() => {
    if (muted || bgmStopped || !bgmMasterGain || !ctx) return
    const cc = getCtx()
    if (!cc) return
    const beat = bgmBeatCount++
    const bar = Math.floor(beat / 4) % 8 // 8 bars in the loop
    const chordIdx = Math.floor(bar / 2) % 4 // chord changes every 2 bars
    const chord = CHORDS[chordIdx]
    const beatInBar = beat % 4

    // Update pad + bass frequencies at start of each bar
    if (beatInBar === 0) {
      // Smoothly glide pad oscillators to new chord tones
      bgmNodes.forEach((node, i) => {
        if (i < 4) {
          try {
            node.osc.frequency.exponentialRampToValueAtTime(
              chord.tones[i],
              cc.currentTime + 0.05
            )
          } catch {}
        }
      })
      // Bass glide to new root
      try {
        const bassNode = bgmNodes[4]
        if (bassNode) {
          bassNode.osc.frequency.exponentialRampToValueAtTime(
            chord.bass,
            cc.currentTime + 0.08
          )
        }
      } catch {}
    }

    // === Beat layers (per eighth note) ===
    const dest = bgmMasterGain!

    // 1. Bass pluck on beats 1 and 3 (boom - boom)
    if (beatInBar === 0 || beatInBar === 2) {
      tone({
        freq: chord.bass * 2,
        duration: 0.22,
        type: 'triangle',
        volume: 0.08,
        attack: 0.005,
        destination: dest,
      })
    }

    // 2. Arpeggio bell — one chord tone per eighth note (ascending then descending)
    const arpNote = chord.tones[beat % 4]
    tone({
      freq: arpNote * 2,
      duration: 0.32,
      type: 'sine',
      volume: 0.04,
      attack: 0.003,
      destination: dest,
    })

    // 3. Tambourine (high-pass noise) on off-beats (beats 2 and 4)
    if (beatInBar === 1 || beatInBar === 3) {
      noiseBurst({
        duration: 0.08,
        volume: 0.025,
        filterType: 'highpass',
        filterFreq: 6000,
        filterQ: 0.7,
        destination: dest,
      })
    }

    // 4. Sparkle melody on bar 4 and 8 (every 4 bars) — festive flourish
    if (bar === 3 || bar === 7) {
      const sparkleNotes = [783.99, 880.0, 1046.5, 1318.51]
      const sn = sparkleNotes[beatInBar % 4]
      tone({
        freq: sn,
        duration: 0.4,
        type: 'sine',
        volume: 0.03,
        attack: 0.005,
        destination: dest,
      })
    }

    // 5. Kick drum (low sine thump) on beat 1 of every bar
    if (beatInBar === 0) {
      tone({
        freq: 80,
        duration: 0.18,
        type: 'sine',
        volume: 0.10,
        sweep: 40,
        attack: 0.002,
        destination: dest,
      })
    }
  }, beatMs)
}

export function stopBgm() {
  bgmStopped = true
  const c = ctx
  if (!c) return
  if (bgmMasterGain) {
    try {
      bgmMasterGain.gain.cancelScheduledValues(c.currentTime)
      bgmMasterGain.gain.setValueAtTime(bgmMasterGain.gain.value, c.currentTime)
      bgmMasterGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.6)
    } catch {}
  }
  setTimeout(() => {
    bgmNodes.forEach(({ osc }) => {
      try { osc.stop() } catch {}
    })
    bgmNodes = []
    bgmMasterGain = null
  }, 700)
  if (bgmInterval) {
    clearInterval(bgmInterval)
    bgmInterval = null
  }
}

export function isBgmPlaying() {
  return bgmStarted && !bgmStopped && !muted
}

// ============== SFX ==============
export const sfx = {
  hover: () => tone({ freq: 880, duration: 0.04, type: 'sine', volume: 0.012 }),

  click: () => tone({ freq: 660, duration: 0.06, type: 'triangle', volume: 0.022 }),

  // Candle blow — festive fanfare with gradual fade.
  // Ascending C major arpeggio → high bell sustain → soft chord release.
  // Total ~3.5s with smooth fade tail.
  candleBlow: () => {
    // Layer 1: Triumphant ascending arpeggio (C5, E5, G5, C6)
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({
        freq: f,
        duration: 1.6,
        type: 'sine',
        volume: 0.05,
        delay: i * 0.10,
        attack: 0.01,
      })
    )

    // Layer 2: Harmony third above (E5, G5, B5, E6) — richer chord
    ;[659.25, 783.99, 987.77, 1318.51].forEach((f, i) =>
      tone({
        freq: f,
        duration: 1.6,
        type: 'sine',
        volume: 0.03,
        delay: i * 0.10 + 0.04,
        attack: 0.01,
      })
    )

    // Layer 3: High bell sustain (long tail, fades gradually)
    tone({
      freq: 2093,
      duration: 3.2,
      type: 'sine',
      volume: 0.022,
      delay: 0.4,
      attack: 0.05,
    })
    tone({
      freq: 2637,
      duration: 2.8,
      type: 'sine',
      volume: 0.016,
      delay: 0.6,
      attack: 0.06,
    })

    // Layer 4: Soft low chord for warmth (C3 + G3) — sustains then fades
    tone({
      freq: 130.81,
      duration: 2.5,
      type: 'sine',
      volume: 0.06,
      delay: 0.05,
      attack: 0.02,
    })
    tone({
      freq: 196.0,
      duration: 2.5,
      type: 'sine',
      volume: 0.04,
      delay: 0.05,
      attack: 0.02,
    })

    // Layer 5: Tambourine shimmer at the peak
    noiseBurst({
      duration: 0.6,
      volume: 0.018,
      delay: 0.5,
      filterType: 'highpass',
      filterFreq: 7000,
      filterQ: 0.5,
    })

    // Layer 6: Final sparkle bells (cascading down)
    ;[1568, 1318.51, 1046.5, 880].forEach((f, i) =>
      tone({
        freq: f,
        duration: 1.0,
        type: 'sine',
        volume: 0.02,
        delay: 1.4 + i * 0.12,
        attack: 0.02,
      })
    )
  },

  // Eye of Anubis flash — sharp bright two-tone (cooler, electro feel)
  eyeFlash: () => {
    tone({ freq: 1600, duration: 0.05, type: 'square', volume: 0.028 })
    tone({ freq: 2400, duration: 0.07, type: 'square', volume: 0.022, delay: 0.05 })
    tone({ freq: 800, duration: 0.12, type: 'sawtooth', volume: 0.018, delay: 0.04, sweep: 1600 })
  },

  // Judgement lightning — sharp electric zap (Cyno's electro)
  judgement: () => {
    tone({ freq: 2200, duration: 0.05, type: 'sawtooth', volume: 0.04 })
    tone({ freq: 900, duration: 0.18, type: 'square', volume: 0.035, delay: 0.04, sweep: 200 })
    noiseBurst({
      duration: 0.15,
      volume: 0.025,
      delay: 0.03,
      filterType: 'highpass',
      filterFreq: 4000,
      filterQ: 0.6,
    })
  },

  // Room opening — deep bass hum rising (Law's spatial rift)
  roomOpen: () => {
    tone({ freq: 50, duration: 1.0, type: 'sine', volume: 0.08, sweep: 130 })
    tone({ freq: 130, duration: 0.6, type: 'sine', volume: 0.05, delay: 0.2 })
    noiseBurst({
      duration: 0.4,
      volume: 0.02,
      delay: 0.1,
      filterType: 'bandpass',
      filterFreq: 800,
      filterQ: 2,
      sweepTo: 2400,
    })
  },

  // Win fanfare — longer, more triumphant
  win: () => {
    ;[523, 659, 784, 1047, 1319].forEach((f, i) =>
      tone({ freq: f, duration: 0.22, type: 'sine', volume: 0.04, delay: i * 0.09 })
    )
    tone({ freq: 1568, duration: 0.6, type: 'sine', volume: 0.03, delay: 0.45 })
  },

  // Lose — descending sad tones
  lose: () => {
    ;[400, 350, 300, 250].forEach((f, i) =>
      tone({ freq: f, duration: 0.18, type: 'sawtooth', volume: 0.03, delay: i * 0.1 })
    )
  },

  // Seal break — metallic shatter + low thump
  seal: () => {
    // Metallic ring
    tone({ freq: 1800, duration: 0.08, type: 'square', volume: 0.03 })
    tone({ freq: 2400, duration: 0.12, type: 'square', volume: 0.025, delay: 0.02 })
    // Glass shatter noise
    noiseBurst({
      duration: 0.3,
      volume: 0.035,
      delay: 0.05,
      filterType: 'highpass',
      filterFreq: 3000,
      filterQ: 0.8,
    })
    // Low thump for impact
    tone({ freq: 100, duration: 0.4, type: 'sine', volume: 0.05, delay: 0.05 })
    // Chain clatter (mid noise burst)
    noiseBurst({
      duration: 0.4,
      volume: 0.025,
      delay: 0.1,
      filterType: 'bandpass',
      filterFreq: 1500,
      filterQ: 1.2,
    })
  },

  // Card flip / move — soft tap
  card: () => {
    tone({ freq: 500, duration: 0.04, type: 'triangle', volume: 0.018 })
    tone({ freq: 800, duration: 0.05, type: 'sine', volume: 0.012, delay: 0.02 })
  },

  // Tick — countdown blip
  tick: () => tone({ freq: 1200, duration: 0.03, type: 'square', volume: 0.018 }),

  // Reveal — shimmer
  reveal: () => {
    ;[1047, 1319, 1568, 2093].forEach((f, i) =>
      tone({ freq: f, duration: 0.14, type: 'sine', volume: 0.028, delay: i * 0.05 })
    )
    tone({ freq: 2637, duration: 0.4, type: 'sine', volume: 0.018, delay: 0.2 })
  },

  // Slash — sharp slicing sound (for voucher tear)
  slash: () => {
    tone({ freq: 2200, duration: 0.12, type: 'sawtooth', volume: 0.04, sweep: 600 })
    tone({ freq: 700, duration: 0.18, type: 'square', volume: 0.025, delay: 0.02, sweep: 200 })
    noiseBurst({
      duration: 0.15,
      volume: 0.02,
      filterType: 'highpass',
      filterFreq: 5000,
      filterQ: 0.5,
    })
  },

  // Tally / progress click
  tally: () => tone({ freq: 880, duration: 0.05, type: 'triangle', volume: 0.022, sweep: 1200 }),

  // Scan pulse — soft sweep for scan game
  scan: () => {
    tone({ freq: 600, duration: 0.4, type: 'sine', volume: 0.025, sweep: 1800 })
    tone({ freq: 1200, duration: 0.3, type: 'sine', volume: 0.018, delay: 0.1 })
  },

  // Charge blip — for counter shock game (each click)
  charge: () => tone({ freq: 440, duration: 0.08, type: 'square', volume: 0.025, sweep: 660 }),

  // Lightning strike — for counter shock 100%
  strike: () => {
    tone({ freq: 2400, duration: 0.06, type: 'sawtooth', volume: 0.045 })
    tone({ freq: 1200, duration: 0.2, type: 'square', volume: 0.035, delay: 0.04, sweep: 200 })
    noiseBurst({
      duration: 0.25,
      volume: 0.035,
      delay: 0.04,
      filterType: 'highpass',
      filterFreq: 4000,
      filterQ: 0.5,
    })
  },

  // Swap — for Shambles game (card swap)
  swap: () => {
    tone({ freq: 700, duration: 0.1, type: 'sine', volume: 0.025, sweep: 1100 })
    tone({ freq: 1100, duration: 0.1, type: 'sine', volume: 0.022, delay: 0.05, sweep: 700 })
  },

  // Voucher tear — paper rip (longer, more dramatic)
  tear: () => {
    const c = getCtx()
    if (!c || muted) return
    // Initial rip
    noiseBurst({
      duration: 0.6,
      volume: 0.09,
      filterType: 'bandpass',
      filterFreq: 2200,
      filterQ: 1.5,
      sweepTo: 400,
    })
    // Secondary tear fibers
    noiseBurst({
      duration: 0.4,
      volume: 0.05,
      delay: 0.15,
      filterType: 'bandpass',
      filterFreq: 1800,
      filterQ: 2,
      sweepTo: 600,
    })
    // Final rip completion
    noiseBurst({
      duration: 0.3,
      volume: 0.04,
      delay: 0.3,
      filterType: 'highpass',
      filterFreq: 3000,
      filterQ: 0.7,
    })
  },
}
