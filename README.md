# THRUST & DRIFT — Space Combat Simulator

> Virtual tabletop tool for **Mongoose Traveller 2e** space combat.  
> GM-operated · browser-only · no installation required.

→ [Read the Manifesto](MANIFESTO.md)  
→ [Live app](https://tad.nav-fi-3.space)

Implements the core space combat rules (MgT2e CRB pp.160–168) and the
optional **vectorial combat system** (Traveller Companion 2024, pp.169–186).

---

## Features

| Feature | Description |
| --------- | ------------- |
| **Hex grid map** | Flat-top axial hex grid with pan & zoom |
| **Vectorial movement** | Ships have velocity vectors; thrust modifies them |
| **Thrust targeting** | Rubber-band canvas interaction during Acceleration: right-click → *Apply Thrust* → move cursor to aim; dashed line + ghost preview + `cost/max` badge; line turns orange at thrust cap; click to confirm, ESC to cancel |
| **Ship profiles** | Full CRUD — create, edit, duplicate, delete (with confirmation); weapon slots capped at 3 (triple turret, CRB p.163) |
| **Ship catalog** | Built-in read-only catalog from High Guard 2022 — browse, filter, add to session |
| **Attack resolution** | 4-step flow: weapon/target config → 2D6 roll → damage → critical; per-slot firing limit (CRB p.164) — each slot fires once per round, slot badge (W1, W2…) shown in weapon list |
| **Reactions (CRB p.171)** | Defender reacts before each attack roll: Evasive Action (1 thrust → DM −Pilot skill), Disperse Sand (sandcaster turret → Gunner check, +1D+Effect armour vs laser); player ships enter physical dice manually. **Point Defence for missiles** is resolved at impact, not at launch — see Missile impact row |
| **Missile launch** | Three launcher types in the Attack modal: **Missile Rack** (count stepper, 12/rack, 4D per missile), **Missile Barbette** (fixed 5-missile salvo, 25 total, 4D per missile), **Torpedo** (1–3 per launch, 3 total, 6D per torpedo, red token) — no DM roll at launch; salvo token inherits launcher vector |
| **Missile guidance** | Each round in the movement phase, all guided salvos home toward their target's predicted next position; up to 10 hex/round delta-v correction (MgT2e CRB p.162 — Thrust 10); drifts when 10-round fuel exhausted |
| **Missile impact** | When a salvo reaches its target's hex, token consumed and **⚡ MISSILE IMPACT** modal opens per CRB p.173: (0) **Point Defence** — if the target has unfired laser turrets, Gunner check 2D6 + Gunner + laser bonus; Effect removes that many missiles; if all destroyed, impact dismissed; (1) **Attack roll** — 2D6 + DM+1/missile (remaining after PD) + DM+2 Smart (launcher TL ≥ 9) ± Evasive Action; Effect < 0 → miss; (2) **Damage** — roll 4D6/6D6 for one missile; formula `max(0, roll − armour) × min(Effect, count)`; APPLY DAMAGE or MISS/INTERCEPTED; multiple impacts queue sequentially |
| **Weapons expansion** | 11 new weapons (HG pp.28–31): Fusion Gun, Plasma Gun, Ion Cannon, Torpedo, Missile Barbette + 6 barbettes (Pulse/Beam/Particle/Fusion/Plasma/Railgun Barbette) |
| **Barbette ×3 multiplier** | All barbette weapons apply `×3` to net hull damage after armour subtraction (HG p.29): `netDamage = max(0, roll + Effect − effectiveArmour) × 3` |
| **AP trait** | `AP N` trait reduces effective armour before damage: `effectiveArmour = max(0, armour − apReduction)` — active on Railgun (4), Fusion Barbette (3), Plasma Barbette (2), Railgun Barbette (5) |
| **Ion Weapons** | Barbette (2D×10) and Bay (Small 6D×10 / Medium 8D×20 / Large 10D×100) — no hull damage; ignores armour; reduces target Power and computer bandwidth; thrust cap = `floor(baseThrust × currentPower / maxPower)`; stacking hits; hardened (/fib) computers immune; blue burst/aura canvas effects; ION NR badge + COMMS DOWN warning (HG p.30–33, FAQ HG 2022 p.1) |
| **Sandcaster ammo** | 20 canisters per sandcaster slot; depleted by Disperse Sand reaction; shown as 🪨 N/max on bento cards, ship detail modal, and tooltip |
| **Sound effects** | Procedural synthesis via Web Audio API — laser, impact, critical, missile launch, thrust plume; 🔊/🔇 mute toggle in HUD; no audio files required |
| **Player dice rolls** | Player ships enter their own 2D6 (physical dice); inputs start empty; 🎲 auto-roll opt-in on all roll steps (attack, damage, critical location, extra damage, reactions, crew actions, initiative); NPC ships auto-roll |
| **Destroyed ships** | Hull = 0 → `isDestroyed` flag; token rendered at 35% opacity with ☠ badge; all combat actions blocked ("WRECK — no actions available"); ship skipped in initiative cycling; excluded from the attack target list; GM removes wreck manually |
| **Crew assignments** | Right-click any ship → Assign Crew: assign each named member to a role (Pilot, Leadership, Tactics, Engineer, Sensors, Gunner W1…Wn); unassigned roles contribute 0; weapon slots without a gunner cannot fire. A single crew member can cover all roles (monoposto / solo pilot). |
| **Crew actions** | Named crew members with multi-skill support; pick member → available actions; skill DM override per action. A crew member assigned to a role can perform its actions even at skill 0 (no DM bonus). Sensor operators have three actions: Sensor Lock (8+, DM+2 flat), Electronic Warfare (8+, breaks sensor lock), **EW — Counter Missile** (10+, Effect removes missiles from a salvo — CRB p.173) |
| **Initiative** | 2D6 + Pilot + Thrust [+ Tactics Effect]; optional Tactics(naval) check (CRB p.160); rolled once at the start of combat — from round 2+ the order is carried over and the phase skips directly to Acceleration; GM **↺** override button forces a re-roll when needed; if a ship is added mid-battle, initiative is re-rolled next round |
| **Phase tracker** | Setup → Initiative → Acceleration → Movement → Attack → Actions → End. Ship names are clickable — click to pan the map to that token |
| **Phase-gated menu** | Right-click actions shown only when valid for the current phase AND when it is that ship's turn (initiative order enforced in Acceleration, Attack, Actions phases) |
| **Actor highlight ring** | The current initiative actor's token shows a pulsing cyan ring on the canvas — instantly visible which ship should act next, even with multiple identical tokens |
| **Mount type labels** | Weapon slots in the Ship Detail modal show their turret mount type: Single Turret (1 weapon), Double Turret (2 weapons), Triple Turret (3 weapons) |
| **Crew AUTO-ASSIGN** | One-click to assign the best-skilled crew member to every role and gunner slot simultaneously. One person can cover multiple roles (e.g., solo-pilot light fighter). Available in the Assign Crew modal (right-click ship → Assign Crew…) |
| **Ship hover tooltip** | Hover a token to see hull bar, vector, thrust, evasion, criticals, sensor lock → target, locked-by attacker, inbound missiles (200ms delay) |
| **Battle log** | Timestamped event log with colour-coded entry types |
| **Undo/Redo (Ctrl+Z / Ctrl+Y)** | Snapshot-based undo/redo — 20-step stacks; `↩️` `↪️` buttons in HUD; new action clears redo |
| **Session save / resume** | Export session to JSON; resume flow shows a full preview before loading |
| **Autosave** | IndexedDB autosave after every significant action — persists ships, missiles, dogfights, boardings, range bands, and log; Dashboard shows full roster preview; one-click restore or clear |
| **Error boundary** | Global React error boundary — catches crashes, shows recovery UI |
| **Profile I/O** | Import/export ship profiles via JSON files |
| **Safety modals** | Confirm before deleting profiles; confirm before leaving battle without saving |
| **Legal footer** | Fixed Mongoose Publishing disclaimer on all screens; "About" modal with full Fair Use text |
| **Ship tokens** | 6 silhouette shapes (delta, needle, freighter, gunship, cruiser, capital) — chosen per-placement; each rotates to face velocity direction; per-shape bridge/cockpit detail overlay; HP arc (green→yellow→red); selection ring; dogfight pulsing amber ring + ⚔️ badge |
| **Missile hover tooltip** | Hover a missile salvo token (150 ms) to see type, launcher → target with faction colour dots, and a thrust-remaining bar (cyan → yellow → red); portal overlay, clears on pan/click |
| **Dogfight system** | Close-range sub-system: 6 micro-rounds per standard round; Pilot opposed checks; tonnage/thrust/multi-enemy DMs; escape via thrust advantage or pursuit check; pulsing token visuals |
| **Boarding system** | 4-phase boarding action (HG 2022): Contact → Conflict → Security; 6 entry methods incl. hull-cut tracker; stacking rolls; missed-shot table; Bridge/Engineering/Turrets objectives; optional faction transfer on capture; HUD badge per active boarding |
| **Weapon range enforcement** | Each weapon has a maximum range band (CRB p.167); Attack Modal shows OUT OF RANGE badge and blocks firing beyond a weapon's listed range |
| **Movement animation** | Ship and missile tokens slide smoothly from start to end position during the Movement phase (~2 s easeInOut); canvas input blocked for the duration to prevent mis-clicks |
| **Basic combat mode** | Non-vectorial mode: no hex map; ships shown as bento cards (Header / Hull bar / conditional Status zone) grouped by faction; range bands tracked per ship pair (`Adjacent`→`Distant`); each ship manoeuvres independently, contributing thrust to a per-pair pool that accumulates across rounds (CRB p.166 cost table — Short 2, Medium 5, Long 10, Very Long 25, Distant 50); missiles advance at Thrust 10/round against the same table and impact at Adjacent range, with bento cards showing `~Xr` ETA; Attack Modal reads stored range band automatically |
| **Range band rings** | Selecting a ship on the vector map draws four concentric dashed cyan hexagons marking the outer boundaries of SHORT (2 hex), MEDIUM (15 hex), LONG (38 hex), and VERY LONG (77 hex) range bands, each labelled on a dark pill. Hidden during thrust targeting to avoid cluttering the delta-v overlay. |
| **Legend modal** | Always-visible `📖 Legend` button fixed top-right; also in right-click empty hex menu; 2-column visual reference for all tokens (incl. torpedo), 7 turret beam colours, 6 barbette beam colours, hit/movement effects, persistent indicators (incl. ion aura); Obstacles section with per-type SVG tokens when active |
| **Field Manual overlay** | `?` button (top-right, next to Legend) opens the full in-app Field Manual as a dialog over the battle map — rules reference accessible mid-session without leaving the battle |
| **Discrete zoom levels** | Three named zoom levels — **C Close** (2.5×) / **T Tactical** (1.0×) / **S Strategic** (0.45×) — with 250 ms animated transitions; buttons bottom-right of canvas; keyboard shortcuts `1`/`2`/`3`; scroll-wheel free-zoom still available |
| **PDF battle report** | `⎙ Report` button opens a formatted session summary (ship roster + battle log by round); `⎙ Print / Save PDF` sends it to the browser print dialog; zero dependencies — native `window.print()` + `@media print` CSS |

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

For a production build:

```bash
npm run build
npm run preview
```

---

## How to Use

### 1 — Prepare ship profiles

On the **Dashboard**, use the left panel to manage ship profiles:

- **+ NEW PROFILE** — create a new ship (name, stats, crew skills, turrets)
- **✎** — edit an existing profile
- **⧉** — duplicate a profile
- **⊗** — delete a profile (confirmation required)
- **↓ IMPORT / ↑ EXPORT** — exchange profiles as JSON files
- **📖 OFFICIAL CATALOG** — browse the built-in High Guard 2022 catalog and add ships directly

A set of default profiles (Far Trader, Type S Scout, etc.) is pre-loaded.

### 2 — Start or resume a session

- **🔄 RESUME / ✕** — if an autosaved session exists, a compact row appears. `🔄 RESUME` restores instantly; `✕` clears the IndexedDB record. The right panel shows the full saved roster (round, phase, ships by faction with hull bars).
- **▶ NEW SESSION** — resets battle state and enters the combat map
- **↓ RESUME FROM FILE** — load a `.json` file; a preview screen shows round, phase, and ship roster before confirming

### 3 — In battle

**Right-click any hex** to open the context menu:

- Empty hex → **Add ship here**
- Ship hex → actions valid for the **current phase** AND **current actor** only:
  - *Acceleration*: Apply Thrust (current actor only)
  - *Attack*: Attack (current actor only; disappears when all weapon slots fired)
  - *Actions*: Crew Action (current actor only)
  - *Always*: Ship Sheet, Remove from battle

**Left-click a ship** to select it.

**Double-click** to centre the map on a hex.

**Scroll** to zoom. **Drag** to pan.

#### Phase flow

The HUD (top-left) shows the current round and phase.

| Phase | What to do |
| ------- | ------------ |
| **Setup** | Place ships on the map |
| **Initiative** | Open right-click menu → roll initiative via modal |
| **Acceleration** | Each ship in turn: right-click → Thrust |
| **Movement** | Click **NEXT PHASE** — all ships move by their vector |
| **Attack** | Each ship in turn: right-click → Attack (select weapon/slot; Missile Rack shows count stepper + LAUNCH SALVO) |
| **Actions** | Each ship in turn: right-click → Crew Action |
| **End of Round** | Click **NEXT PHASE** to start the next round |

#### Saving a session

In the HUD (top-left), click **💾 SAVE** at any time to download the current
session as a `.json` file. Use **↓ RESUME FROM FILE** on the Dashboard to
restore it.

Click **🏠** in the HUD to return to the Dashboard — a confirmation modal warns
that unsaved data will be lost.

---

## Tech Stack

| Layer | Technology |
| ------- | ------------ |
| Framework | React 19 + Vite 8 |
| State | Zustand 5 |
| Styling | Tailwind CSS v4 |
| Map rendering | Browser Canvas API |
| Persistence | IndexedDB (autosave) + Browser File API (JSON export/import) |
| Testing | Vitest 4 + Testing Library + jsdom + fake-indexeddb |
| E2E Testing | Playwright 1.61 (Chromium) |

---

## Running Tests

```bash
npm test                  # run all unit/component tests (utils, stores, components)
npm run test:watch        # watch mode
npx vitest --coverage     # coverage report (v8 provider)
```

1294 unit/component tests across utils, Zustand stores, hooks, and UI components.

End-to-end tests run in Chromium via Playwright (dev server auto-started):

```bash
npm run e2e               # headless
npm run e2e:headed        # visible browser
```

26 e2e tests in `e2e/` covering discrete zoom levels, the PDF battle report flow, and crew skill input constraints.

---

## Project Structure

```text
src/
├── components/
│   ├── dashboard/
│   │   ├── Dashboard.jsx       ← Pre-battle lobby (profiles + session controls)
│   │   ├── CatalogPanel.jsx    ← Read-only HG 2022 ship catalog
│   │   └── useProfileImport.js ← Hook: import profiles from file
│   ├── forms/
│   │   ├── ShipProfileForm.jsx ← Full ship profile form
│   │   └── DiceInput.jsx       ← Manual 2D6 entry for player dice rolls
│   ├── map/
│   │   ├── BattleMap.jsx       ← Canvas hex map
│   │   ├── BasicBattleView.jsx ← Simplified view (basic combat mode)
│   │   ├── useCanvasRenderer.js← Hex + token rendering hook (rAF loop for dogfight pulse)
│   │   ├── useMapInteraction.js← Pan, zoom, click, right-click hook
│   │   ├── useShipHover.js     ← Hover detection + 200ms tooltip timer
│   │   ├── useDogfightDetection.js ← Detects same-hex hostile ships post-movement
│   │   ├── ShipTooltip.jsx     ← Ship hover tooltip panel (portal)
│   │   └── tokenRenderers.js   ← Draw functions for ships and missiles
│   ├── modals/
│   │   ├── Modal.jsx           ← Generic modal wrapper
│   │   ├── ShipProfileModal.jsx
│   │   ├── AddShipModal.jsx
│   │   ├── ThrustModal.jsx     ← ⚠ UNUSED — replaced by canvas rubber-band targeting (useMapInteraction + useCanvasRenderer Layer 3b)
│   │   ├── AttackModal.jsx     ← Attack resolution + Reactions panel (CRB p.171)
│   │   ├── MissileLaunchModal.jsx
│   │   ├── ShipDetailModal.jsx
│   │   ├── ActionModal.jsx
│   │   ├── InitiativeModal.jsx
│   │   ├── BasicManoeuvreModal.jsx       ← Basic mode: approach/flee + thrust cost
│   │   ├── DogfightNotificationModal.jsx ← Engagement intent + pursuit check
│   │   ├── DogfightRoundModal.jsx        ← Micro-round resolution (escape + Pilot check)
│   │   ├── PassingAttackModal.jsx        ← Passing encounter fire window
│   │   ├── MissileImpactModal.jsx        ← Missile salvo impact damage resolution
│   │   ├── BoardingSetupModal.jsx        ← Target selection + boarding initiation
│   │   ├── BoardingContactModal.jsx      ← Phase 2: entry method, hull-cut, modifiers
│   │   ├── BoardingConflictModal.jsx     ← Phase 3: objectives, stacking, missed shot
│   │   ├── BoardingOutcomeModal.jsx      ← Phase 4: outcome + faction transfer
│   │   └── useAttackSetup.js   ← Hook: attack DM derivation
│   └── ui/
│       ├── ContextMenu.jsx     ← Right-click context menu
│       ├── HUD.jsx             ← Round/phase overlay + exit confirmation
│       ├── BattleLog.jsx       ← Collapsible event log
│       ├── PhaseTracker.jsx    ← Initiative order display
│       ├── Tooltip.jsx         ← Portal-based tooltip
│       ├── ErrorBoundary.jsx   ← Global React error boundary
│       └── LegalFooter.jsx     ← Fixed Mongoose Publishing disclaimer + About modal
├── help/
│   └── HelpScreen.jsx          ← Full-screen field manual (sidebar TOC + PDF download)
├── data/
│   ├── weapons.js              ← Weapon tables, traits, damage
│   ├── rangeBands.js           ← Distance band thresholds (hex)
│   ├── crewActions.js          ← Crew action definitions (Actions phase)
│   ├── factions.js             ← Available factions
│   ├── shipCatalog.js          ← HG 2022 read-only catalog
│   └── defaultProfiles.js      ← Preset ship profiles
├── store/
│   ├── profilesStore.js        ← Ship profiles (CRUD + import/export)
│   ├── battleStore.js          ← Active battle state
│   └── uiStore.js              ← Modal state, selected ship, context menu
├── hooks/
│   └── useAutosave.js          ← IndexedDB autosave + restore on mount
└── utils/
    ├── hex.js                  ← Hex math (flat-top, cube coords)
    ├── combat.js               ← DM calc, damage, range bands
    ├── crew.js                 ← Crew array helpers (getCrewSkill, migrateCrew)
    ├── io.js                   ← JSON import/export via File API
    ├── dice.js                 ← Dice rolling + result formatting
    ├── dogfight.js             ← Dogfight logic (tonnageDM, Pilot checks, escape)
    ├── boarding.js             ← Boarding logic (entry methods, resilience, stacking, missed shot)
    └── db.js                   ← IndexedDB wrapper (openDB, get, put, delete)
```

---

## Game Rules Reference

All mechanical calculations implement:

- **MgT2e CRB** — Mongoose Traveller 2nd Edition Core Rulebook  
  Space combat pp.160–168
- **Traveller Companion 2024** — Vectorial Combat System pp.169–186

---

## License

For personal/group use at the gaming table.  
Mongoose Traveller is © Mongoose Publishing.
