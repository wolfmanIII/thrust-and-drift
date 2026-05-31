# THRUST & DRIFT — Space Combat Simulator

> Virtual tabletop tool for **Mongoose Traveller 2e** space combat.  
> GM-operated · browser-only · no installation required.

Implements the core space combat rules (MgT2e CRB pp.160–168) and the
optional **vectorial combat system** (Traveller Companion 2024, pp.169–186).

---

## Features

| Feature | Description |
| --------- | ------------- |
| **Hex grid map** | Flat-top axial hex grid with pan & zoom |
| **Vectorial movement** | Ships have velocity vectors; thrust modifies them |
| **Ship profiles** | Full CRUD — create, edit, duplicate, delete (with confirmation) |
| **Ship catalog** | Built-in read-only catalog from High Guard 2022 — browse, filter, add to session |
| **Attack resolution** | 4-step flow: weapon/target config → 2D6 roll → damage → critical; per-turret firing limit (CRB p.164) — each turret fires once per round, slot badge (T1, T2…) shown in weapon list |
| **Reactions (CRB p.171)** | Defender reacts before each attack roll: Evasive Action (1 thrust → DM −Pilot skill), Point Defence (laser turret → Gunner check, removes missiles), Disperse Sand (sandcaster turret → Gunner check, +1D+Effect armour vs laser); player ships enter physical dice manually |
| **Missile launch** | Missile Rack selectable directly in Attack modal — count stepper + 🚀 LAUNCH SALVO (no DM roll); salvo token inherits launcher vector |
| **Player dice rolls** | Player ships enter their own 2D6 (physical dice); inputs start empty; 🎲 auto-roll opt-in; NPC ships auto-roll |
| **Crew actions** | Named crew members with multi-skill support; pick member → available actions; skill DM override per action |
| **Initiative** | 2D6 + Pilot + Thrust; player ships manual entry, NPC auto-rolled |
| **Phase tracker** | Setup → Initiative → Acceleration → Movement → Attack → Actions → End |
| **Phase-gated menu** | Right-click actions shown only when valid for the current phase AND when it is that ship's turn (initiative order enforced in Acceleration, Attack, Actions phases) |
| **Ship hover tooltip** | Hover a token to see hull bar, vector, thrust, evasion, criticals (200ms delay) |
| **Battle log** | Timestamped event log with colour-coded entry types |
| **Undo/Redo (Ctrl+Z / Ctrl+Y)** | Snapshot-based undo/redo — 20-step stacks; `⟲` `↷` buttons in HUD; new action clears redo |
| **Session save / resume** | Export session to JSON; resume flow shows a full preview before loading |
| **Autosave** | IndexedDB autosave after every significant action; Dashboard shows full roster preview from autosave; one-click restore or clear |
| **Error boundary** | Global React error boundary — catches crashes, shows recovery UI |
| **Profile I/O** | Import/export ship profiles via JSON files |
| **Safety modals** | Confirm before deleting profiles; confirm before leaving battle without saving |
| **Legal footer** | Fixed Mongoose Publishing disclaimer on all screens; "About" modal with full Fair Use text |
| **Dogfight system** | Close-range sub-system: 6 micro-rounds per standard round; Pilot opposed checks; tonnage/thrust/multi-enemy DMs; escape via thrust advantage or pursuit check; pulsing token visuals |
| **Boarding system** | 4-phase boarding action (HG 2022): Contact → Conflict → Security; 6 entry methods incl. hull-cut tracker; stacking rolls; missed-shot table; Bridge/Engineering/Turrets objectives; optional faction transfer on capture; HUD badge per active boarding |
| **Weapon range enforcement** | Each weapon has a maximum range band (CRB p.167); Attack Modal shows OUT OF RANGE badge and blocks firing beyond a weapon's listed range |
| **Legend modal** | Always-visible `📖 Legend` button fixed top-right; also in right-click empty hex menu; 2-column visual reference for all tokens, beam weapon colours, hit/movement effects, and persistent indicators |

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

- **↺ RESUME / ✕** — if an autosaved session exists, a compact row appears. `↺ RESUME` restores instantly; `✕` clears the IndexedDB record. The right panel shows the full saved roster (round, phase, ships by faction with hull bars).
- **▶ NEW SESSION** — resets battle state and enters the combat map
- **↓ RESUME FROM FILE** — load a `.json` file; a preview screen shows round, phase, and ship roster before confirming

### 3 — In battle

**Right-click any hex** to open the context menu:

- Empty hex → **Add ship here**
- Ship hex → actions valid for the **current phase** AND **current actor** only:
  - *Acceleration*: Apply Thrust (current actor only)
  - *Attack*: Attack (current actor only; disappears when all turrets fired)
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
| **Attack** | Each ship in turn: right-click → Attack (select weapon/turret; Missile Rack shows count stepper + LAUNCH SALVO) |
| **Actions** | Each ship in turn: right-click → Crew Action |
| **End of Round** | Click **NEXT PHASE** to start the next round |

#### Saving a session

In the HUD (top-left), click **💾 SAVE** at any time to download the current
session as a `.json` file. Use **↓ RESUME FROM FILE** on the Dashboard to
restore it.

Click **⌂** in the HUD to return to the Dashboard — a confirmation modal warns
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

---

## Running Tests

```bash
npm test                  # run all tests (utils, stores, components)
npm run test:watch        # watch mode
npx vitest --coverage     # coverage report (v8 provider)
```

609 tests across utils, Zustand stores, hooks, and UI components.

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
│   │   ├── ThrustModal.jsx
│   │   ├── AttackModal.jsx     ← Attack resolution + Reactions panel (CRB p.171)
│   │   ├── MissileLaunchModal.jsx
│   │   ├── ShipDetailModal.jsx
│   │   ├── ActionModal.jsx
│   │   ├── InitiativeModal.jsx
│   │   ├── DogfightNotificationModal.jsx ← Engagement intent + pursuit check
│   │   ├── DogfightRoundModal.jsx        ← Micro-round resolution (escape + Pilot check)
│   │   ├── PassingAttackModal.jsx        ← Passing encounter fire window
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
