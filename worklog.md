---
Task ID: v3-revision-round-3
Agent: main (Super Z)
Task: Implement 11 revision points + 5 additional from screenshot (2357) for v3 birthday website

Work Log:
- Read user's 11 explicit revision points + extracted 5 more from screenshot 2357 right-panel notes
- Used VLM to analyze screenshot 2357 for gift claim design reference
- Updated `src/components/birthday/sound.ts`:
  * Replaced ambient pad BGM with festive multi-instrumental loop (C-Am-F-G chord progression, plucky bass, arpeggio bells, tambourine off-beats, sparkle flourishes on bar 4/8, kick on beat 1)
  * Replaced candleBlow SFX with longer celebration fanfare (ascending C major arpeggio + harmony third + high bell sustain + soft low chord + tambourine shimmer + cascading final sparkles, ~3.5s with gradual fade)
  * Added new SFX: scan (sweep), charge (click blip), strike (lightning), swap (dual tone)
  * Improved existing SFX: judgement (added noise burst), seal (metallic shatter + chain clatter), tear (3-stage paper rip)
- Updated `src/app/home/page.tsx`:
  * Added useEffect-based localStorage sync for ritualDone/roomDone state
  * Added Lock + Link2 icons for locked game buttons
  * Cyno ritual button: always unlocked (gate is candle blow)
  * Law room button: locked with chain icon until ritualDone=true
  * Gift button: locked with chain icon until roomDone=true
  * Added "Level/Age · 02 → 04" / "01 → 05" / "Final" labels under each game button
  * Changed stat row label from "Usia" → "Level/Age"
  * Bigger cake: 280x320 viewBox (was 200x240), container max-w 520px (was 420px)
  * Cake now has Cyno motifs (wolf ears silhouette + Anubis Eye of Horus symbol on bottom tier) + Law motifs (Heart Pirates smiley with crossbones + sword cross on middle tier, lightning bolt + heart on top tier, jellybean spots like Law's hat)
- Updated `src/app/ritual/page.tsx`:
  * Added Lock, Unlock, Sparkles icon imports
  * Added sealBreaking/sealBroken state
  * When Ritual 04 wins: triggers seal break animation after 800ms delay (2.4s animation)
  * Animation: sealed lock with chain arcs → shatter burst → 8 sparkles flying outward → "SEAL · BREAKING..." text → reveal "Room Law · Segel Pecah"
  * Marks ritual done in localStorage (yava21_ritual_done=1) when seal breaks
  * Next: Room Law button only enabled AFTER sealBroken=true (before that shows "Sealed" disabled state)
- Rewrote `src/app/room/page.tsx` completely:
  * New game mechanic: face-up card swap (was click-in-order)
  * Top row = Reference (correct order, numbered 1-N, visible 4.4s then hidden)
  * Bottom row = Your Cards (shuffled, swappable)
  * Click 2 cards in bottom row to swap them
  * Win when bottom row matches reference order
  * 1 Scan chance per round (hold Scan button to peek at reference again, 1.8s peek)
  * New card kinds themed on Law abilities: Scan, Shambles, Mes, Takt, Counter, Amputate, Injection, Radio
  * Each card has icon + label + color
  * Added seal break animation after level 5 wins (same pattern as ritual)
  * Marks room done in localStorage (yava21_room_done=1) when seal breaks
  * Next: Open Gift button only enabled AFTER sealBroken=true
- Updated `src/app/gift/page.tsx`:
  * IdentityBox: changed "WANTED · 死または生" + "DEAD OR ALIVE" → "WANTED · ONLY ALIVE" + "生存のみ · ALIVE"
  * Bounty: added ฿ (berry symbol) before ∞
  * Devil Fruit stat: changed "N/A" → "Ope Ope no Mi"
  * ScanGame: increased DURATION from 3500ms → 5500ms (feels like real scan)
  * Replaced AmputateGame (slash seals) with InjectionShotGame (precision timing):
    - Moving indicator oscillates left-right across targeting bar
    - Sweet spot zone (45-55%, green) in middle
    - Click when indicator is in sweet spot = hit
    - 3 hits required to win
    - Miss = no progress (but no fail)
    - Visual feedback: HIT!/MISS flash, last click position indicator
  * Updated all references: Amputate → Injection in intro text, progress labels, hidden message
  * Removed unused Swords import, added Crosshair import
  * Verified ClaimedGift component renders properly (gift claim card with HADIAH · DARI KIRIE, Klaim Voucher, gift icon, VOUCHER · CLAIMED, Hadiah Diklaim, 贈り物, three-column Penerima/Pemberi/Tanggal, Berlaku Selamanya · 1× Pakai)
  * Verified VoucherTear component (code-gated slash tear with SECRET_QUESTION and SECRET_ANSWER = "Keith Kirei and Keiz Kanne" exact case-sensitive match)
- Created /home/z/my-project/scripts/replace_amputate.py to safely replace AmputateGame section
- All routes return HTTP 200 with no compilation errors

Stage Summary:
- 11 user points + 5 screenshot points all implemented
- BGM: festive multi-instrumental loop (replaces ambient pad)
- Cake: bigger, with Cyno (wolf/Anubis eye) + Law (Heart Pirates/swords) motifs
- candleBlow: longer celebration fanfare with gradual fade
- Game progression: sequential lock with chain icons (Cyno → Law → Gift)
- "Usia" → "Level/Age" everywhere
- Ritual 04 win: seal-break animation → Next button unlocks
- Room game: face-up card swap (top reference + bottom shuffled, 1 scan)
- Room level 5 win: seal-break animation → Gift button unlocks
- Gift 3rd game: replaced Amputate (slash seals) with Injection Shot (precision timing)
- Gift identity box: "WANTED · ONLY ALIVE", berry symbol, Ope Ope no Mi
- Gift claim reveal: works (was working, just needed the 3rd game to fire onComplete reliably)
- Voucher tear: code-gated slash tear (case-sensitive "Keith Kirei and Keiz Kanne")
- localStorage persistence: ritual_done and room_done flags sync across pages via storage events + focus listener
- Dev server runs cleanly, all 5 routes return 200

---
Task ID: v3-revision-round-4
Agent: main (Super Z)
Task: Voucher tear revision — keep voucher visible after tear, show completion notice below (not replacing)

Work Log:
- Identified the issue: in VoucherTear, when torn=true, the parent switched to <TornVoucherComplete> which replaced the entire voucher with just the "Selesai." message
- Also: TearableVoucher animated the two halves with { y: ±140, opacity: 0 } — they faded out and slid off-screen
- User wants: voucher remains visible (as a torn voucher) after tearing, AND the "Selesai." text remains visible too (both at the same time)
- Modified `VoucherTear` component (src/app/gift/page.tsx ~L1067):
  * Removed `if (torn) return <TornVoucherComplete>` block
  * Replaced with: `<TearableVoucher onTorn={() => setTorn(true)} />` followed by `{torn && <TornCompletionNotice onBack={onBack} />}`
  * Now both the torn voucher AND the completion notice render together (notice below voucher)
- Modified `TearableVoucher` component (~L1183):
  * Top half torn animation: { y: -18, rotate: -2, opacity: 1 } (was: y: -140, rotate: -10, opacity: 0) — stays visible, just shifted up slightly + tilted
  * Bottom half torn animation: { y: 18, rotate: 2, opacity: 1 } (was: y: 140, rotate: 10, opacity: 0) — stays visible, just shifted down slightly + tilted
  * Container className: overflow-hidden → `torn ? "overflow-visible" : "overflow-hidden"` so halves can stick out slightly when torn
  * Dashed perforation line: wrapped in motion.div with `animate={torn ? { opacity: 0 } : { opacity: 1 }}` — fades out when torn (jagged line takes over)
  * Jagged tear line persistent: increased height 8px → 14px and stroke 2 → 2.5 for more prominent torn look, with more jagged path
  * Added "DIREMEH" stamp overlay when torn: red border, italic "Diremeh" text with glow, "✓ Kirie · 22·06" subtext, rotated -15° and centered on voucher
  * Slash trail SVG only renders when !torn (cleanup)
  * Top half label changes "VOUCHER · TEAR ME" → "VOUCHER · DIREMEH" when torn
  * Instruction text below voucher ("✂ Drag melalui...") only shows when !torn
  * "Verified · Kirie" badge only shows when !torn
- Replaced `TornVoucherComplete` with `TornCompletionNotice` (~L1518):
  * Same content (heart icon, "Selesai.", thank you message, back to home button)
  * Changed h1 → h2 to avoid duplicate H1 with the parent's "Tear the Voucher" header
  * Added y: 20 initial animation for smoother entrance below the voucher
- Verified: dev server returns 200 on /gift, no compilation errors

Stage Summary:
- After tear: voucher STAYS VISIBLE as a torn voucher (halves slightly separated + tilted, jagged tear line glowing in middle, red "DIREMEH" stamp angled across)
- Below the torn voucher: the "Selesai." / "VOUCHER DIREMEH" / thank you message / back-to-home button appears
- Both voucher and completion text remain visible together (not replacing each other)
- Slash trail and instruction text cleanup when torn (no longer relevant)
