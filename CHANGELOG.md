# Changelog

All notable changes to Thrust & Drift are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.3.6] — 2026-05-29

### Added
- **Player manual dice entry** — ships with `faction === 'players'` always roll their own dice; NPC ships auto-roll as before
- **`DiceInput` component** (`src/components/forms/DiceInput.jsx`) — two die inputs (1–6) + running total + 🎲 auto-roll button; reusable across modals
- **InitiativeModal** — player ships show `DiceInput` with editable pre-rolled values; NPC ships shown as "auto" placeholders; initiative preview total (2D6 + Pilot + Thrust) updates live; REROLL resets player dice
- **AttackModal** — `AttackRollStep` shows `DiceInput` + "CONFIRM ROLL" for player attackers; NPC attackers keep auto-roll button
- **ActionModal** — `DiceInput` shown above EXECUTE for player ships (non-auto actions); dice reset on each action selection; button label changes to "CONFIRM ROLL"

### Changed
- `rollInitiative` / `rollAttack` in `combat.js` — accept optional `diceOverride` param (backwards-compatible)
- `rollAllInitiative` in `battleStore` — accepts `diceOverrides: { [shipId]: { results, total } }` map; `undefined` entries auto-roll as before

---

## [1.3.5] — 2026-05-29

### Changed
- **Crew data model** — `crew` field on ship profiles changed from flat object `{pilot:N, ...}` to named-member array `[{id, name, skills:{pilot:N, engineer:N, ...}}]`; each member can hold multiple skills (e.g. a pilot/gunner on a single-seat fighter)
- **ShipProfileForm** — Crew section rebuilt: Add/remove named crew members; each row has a name field and compact skill inputs (PLT/CPT/ENG/GNR/SEN 0–5); `initForm` auto-migrates legacy `{pilot:N}` format on load
- **ActionModal** — new crew-selection step: pick a crew member first → see only actions available for their skills; log entry now includes member name
- **ShipDetailModal** — Crew section shows name + skills per member instead of role → number pairs
- **battleStore / EvasiveModal / useAttackSetup** — all `crew.pilot` and `crew.gunner` accesses replaced with `getCrewSkill(crew, skill)` (backwards-compatible)

### Added
- `src/utils/crew.js` — `getCrewSkill(crew, skill)` (handles both formats), `migrateCrew(legacy)`, `blankCrewMember()`

### Tests
- 403 tests (up from 386) — new `crew.test.js` (15 tests): `CREW_SKILLS`, `blankCrewMember`, `getCrewSkill` array/legacy/edge cases, `migrateCrew` conversion/identity/null; `rollAllInitiative` crew array format + empty array

---

## [1.3.4] — 2026-05-29

### Changed
- **`wh()` wrapper** — `wh(fn)` / `wh(guard, fn)` defined inside `create()`; `pushHistory()` is automatic on all user-facing actions; guarded form prevents push on no-op calls (e.g. action on non-existent ship); `applyDamage` and `addCriticalHit` keep manual conditional push due to `_skipThreshold` / `_skipHistory` flags

### Added
- **Redo** — `redoStack[]` in state; `pushHistory()` clears it on every new action; `undoLastAction()` saves current state to `redoStack` before restoring; `redoLastAction()` pops from `redoStack`, pushes current state to `undoStack`, appends `↷ Redo` log entry; `⟲` `↷` buttons in HUD; `Ctrl+Y` / `Cmd+Shift+Z` keyboard shortcut; `resetBattle` and `importBattleState` clear both stacks

### Tests
- 386 tests (up from 373) — new: `wh` guard suppresses push, `redoLastAction` full suite (no-op, populates, restores, pushes undo, pops redo, log entry, new action clears, `resetBattle` clears, undo/redo cycle), HUD redo button disabled/enabled/click

---

## [1.3.3] — 2026-05-29

### Changed
- **`startNextRound` contract explicit** — extracted `buildNextRoundState()` pure function; `advancePhase` calls it directly instead of delegating to `startNextRound`, eliminating the implicit "never call standalone" invariant; `startNextRound` now pushes history and is safe to call independently
- **Log append-only on undo** — log excluded from undo snapshots; `undoLastAction` appends a `↩ Undo — restored to Round N, PHASE` entry instead of rolling back the log

### Tests
- 373 tests (up from 370) — new: log not rolled back on undo, `↩ Undo` entry appended, `startNextRound` direct call pushes history

---

## [1.3.2] — 2026-05-29

### Added
- **Snapshot-based undo** — `⟲` button in HUD + `Ctrl+Z` / `Cmd+Z` shortcut restore the previous game state; stack capped at 20 entries; button disabled (dimmed) when stack is empty
- `pushHistory()` / `undoLastAction()` in `battleStore` — all 19 user-facing actions push a snapshot before mutating; `_skipHistory` / `_skipThreshold` flags suppress push for internal recursive calls; `resetBattle` and `importBattleState` clear the stack

### Tests
- 370 tests (up from 355) — new suites: `pushHistory`/`undoLastAction` core behavior, 20-entry cap, `resetBattle` clears stack, `_skipThreshold`/`_skipHistory` flag suppression, `advancePhase→startNextRound` single-push invariant; HUD undo button disabled/enabled/click behavior

---

## [1.3.1] — 2026-05-29

### Changed
- **Full English UI** — all visible strings translated across 22 files; `doc/` documentation unchanged
- **Battle screen brand watermark** — logo + "THRUST & DRIFT" title bottom-right on combat canvas
- **Battle Log collapsed by default** — log starts closed to avoid obscuring the map on load
- **README** updated to reflect new English UI labels

---

## [1.3.0] — 2026-05-28

### Added
- **Canvas visual effects system** — non-blocking animations on a separate overlay canvas (`pointer-events: none`, `requestAnimationFrame`); purely decorative, zero game state changes — Spec §13.4

**One-shot effects (event-triggered, auto-fade):**
- `laser_ray` — animated ray Attacker→Target for Pulse/Beam Laser, Particle Beam, Railgun; weapon-specific color + glow; 300ms
- `impact_burst` — 8 radial sparks on the hit token (confirmed hit); 500ms
- `thrust_plume` — amber triangle in the direction opposite to the applied delta-v; 400ms
- `critical_flash` — expanding red ring + `[CRIT: system]` label on critical hit; 600ms
- `missile_trail` — dashed orange trail auto-detected from missile position diff; 380ms
- `chaff` — 24 scatter fragments when a sandcaster intervenes; 200ms

**Persistent effects (from store state, every frame):**
- `sensor_lock_ring` — animated dashed cyan line + pulsing ring on locked target
- `evasive_aura` — pulsing yellow halo around token with `evasiveThrust > 0`
- `missile_exhausted` — grey overlay + dashed ring on missile with `thrustRemaining === 0`
- `dogfight_alert` — pulsing orange "DOGFIGHT" text when 2+ ships share the same hex

**Architecture:**
- `src/utils/effectQueue.js` — module-level queue with no React dependencies; `emitEffect` / `drainEffects`
- `src/components/map/effectRenderers.js` — pure Canvas 2D functions (pixel coords + progress `t`); save/restore on every draw
- `src/components/map/useCanvasEffects.js` — hook with rAF loop; reads store via refs to avoid loop restarts; detects missile movement from array diff
- `BattleMap.jsx` — effects overlay canvas above main canvas

### Tests
- 355 tests (up from 346) — new suite `effectQueue.test.js` (9 tests): `emitEffect`, `drainEffects`, insertion order, multiple drains

---

## [1.2.5] — 2026-05-28

### Added
- **Full critical hits system** — implements MgT2e CRB pp.169–170 in full:
  - `src/data/criticalHits.js` — location table (2D6 → system) + effect table for all 11 systems × 6 severities, with mechanic codes (`thrust_reduce`, `thrust_zero`, `hull_extra_damage`, `descriptive`)
  - `getCriticalSeverity(effect)` in `combat.js` — Effect − 5, clamp 1–6
  - `getThresholdCriticalCount(prev, new, max)` in `combat.js` — counts 10% Hull thresholds crossed (CRB p.169 Sustained Damage)
- **`thrustPenalty`** — persistent field on each ship; updated by `addCriticalHit` when M-Drive is hit (Sev 1 → 0, Sev 2–4 → −1, Sev 5–6 → thrust = 0); **not** reset between rounds
- **Per-system critical stacking** — `addCriticalHit` uses upsert: hit on the same system updates severity (`max(new, existing + 1)`) instead of adding a duplicate entry; at Sev 6 cap applies 6D extra damage instead
- **Automatic threshold criticals** — `applyDamage` auto-detects every 10% Hull threshold crossed, rolls 2D6 for location, applies stacking and hull extra damage; `_skipThreshold` flag prevents cascades
- **Critical step in AttackModal** — 4th step `'critical'` after damage: 2D6 location roll, effective severity display (with stacking indicator), effect description, ND extra damage roll for Hull criticals or max severity overflow
- **`repairCritical`** updated — recalculates `thrustPenalty` from remaining M-Drive criticals after repair

### Changed
- `ThrustModal` and `ShipTooltip` — available thrust subtracts `thrustPenalty`
- `declareEvasiveThrust` — max evasive thrust reduced by `thrustPenalty`
- `AttackModal` — removed hardcoded `{ system: 'Hull', severity: 1 }` for all criticals

### Tests
- 346 tests (up from 287) — new `criticalHits.test.js` (29 tests); added suites for `getCriticalSeverity`, `getThresholdCriticalCount`, threshold criticals in `applyDamage`, M-Drive thrustPenalty, stacking, `startNextRound` invariant

---

## [1.2.0] — 2026-05-28

### Added
- **Ship hover tooltip** — hovering a ship token on the battle map shows a panel (200ms delay, no flickering during pan) with: name, faction badge, hull bar (green/yellow/red), vector + magnitude, available thrust, evasion, initiative, sensor lock, critical hits list. Hides when context menu opens.
  - `src/components/map/useShipHover.js` — SRP hook: pixelToHex detection, 200ms timer, clears on pan/leave/empty hex
  - `src/components/map/ShipTooltip.jsx` — React portal panel; flips near viewport edges
  - `src/store/uiStore.js` — `hoveredShip` state + `setHoveredShip` / `clearHoveredShip`

### Fixed
- **Phase-gated context menu** — ship right-click actions now shown only when valid for current phase: Thrust + Evasion in *acceleration*; Attack + Launch Missiles in *attack*; Crew Action in *actions*. "Roll initiative" in empty-cell menu gated to *initiative* phase.
- **ESLint config** — added separate block for `*.test.{js,jsx}` files with `globals.vitest`; `varsIgnorePattern: '^_'` for destructuring patterns. Reduced false-positive errors from 119 to 0.
- **`io.js`** — re-thrown errors now attach `{ cause: e }` to preserve the original stack (`preserve-caught-error` rule).
- **`useAutosave.js`** — removed unused `set` destructure; added missing comment to second IndexedDB catch block.
- **Unused imports in tests** — removed `vi` from `ContextMenu.test.jsx`, `useUiStore` from `HUD.test.jsx`, `dbGet` from `useAutosave.test.js`.

### Tests
- 287 tests (up from 285) — added phase-gating assertions in `ContextMenu.test.jsx`

---

## [1.1.0] — 2026-05-27

### Added
- **IndexedDB autosave** — `utils/db.js` wrapper (openDB, dbGet, dbPut, dbDelete) with two object stores: `battle` and `profiles`. Tested with `fake-indexeddb`.
- **`useAutosave` hook** — subscribes to battleStore and profilesStore via Zustand; persists after every significant change (ships, missiles, round, phase, log, initiativeOrder); restores on mount if saved state has ships and store is empty.
- **Dashboard autosave restore button** — `↺ RESUME AUTOSAVE` visible only when IndexedDB has a saved session with ships; shows round, phase, ship count, timestamp.
- **Global ErrorBoundary** — `components/ui/ErrorBoundary.jsx` wraps `<App />` in `main.jsx`; catches render crashes and shows a recovery UI with a reload button.
- **`savedAt` field** — ISO timestamp added to battle state export payload.

### Tests
- 285 tests — added suites for `db.js`, `useAutosave`, and `ErrorBoundary`

---

## [1.0.0] — 2026-05-26

### Added
- **Hex grid battle map** — flat-top axial grid with pan (left-drag), zoom (scroll), reset (double-click)
- **Vectorial movement system** — ships carry persistent velocity vectors; thrust modifies the vector each round; all ships move simultaneously in the Movement phase
- **Ship tokens** — colored circle with faction color, name initial, hull bar (semicircle), vector arrow, ghost position (next movement preview)
- **Missile tokens** — separate tokens with their own vector and thrust countdown
- **Full round flow** — Setup → Initiative → Acceleration → Movement → Attack → Actions → End; HUD shows current round and phase
- **Context menu** — right-click on empty hex or ship/missile token; dispatches to typed submenus via `MENU_MAP` lookup (OCP)
- **Ship profile CRUD** — create, edit, duplicate, delete (with confirmation modal); filter by name
- **Ship catalog** — 34 official ships from High Guard 2022 (read-only); filter by category, search by name; one-click add to session profiles
- **Dashboard** — 2-column layout; left: profiles; right: session controls or catalog or profile form; session preview before loading a saved file
- **Attack resolution** — 3-step modal: weapon/target config → 2D6 roll → damage; full DM breakdown (range, size, gunner, evasion, sensor lock)
- **Crew actions** — ActionModal for all roles: Captain (initiative bonus), Engineer (overload/repair), Sensors (sensor lock / EW), Gunner (reload)
- **Initiative** — 2D6 + Pilot + Thrust; sorted automatically; PhaseTracker shows order with current actor highlighted
- **Evasive action** — EvasiveModal; declared during Acceleration; applies DM to incoming attacks
- **Sensor lock** — acquired via Electronics(sensors) check; grants attack DM bonus
- **Missile launch** — MissileLaunchModal; salvo inherits launching ship's vector; thrust moves it toward target each round
- **Battle log** — timestamped, colour-coded entries (move / attack / damage / action / system); collapsible overlay, collapsed by default
- **Session save / resume** — export battle state to JSON via File API; resume shows full roster preview before loading
- **Profile I/O** — import/export ship profiles as JSON files
- **Safety modals** — confirm before deleting profiles; confirm before leaving battle via HUD home button
- **Default profiles** — Far Trader, Type S Scout, Fighter, Patrol Cruiser, Far Trader (defensive)
- **Test suite** — Vitest + Testing Library + jsdom; 285 tests covering utils, stores, hooks, and UI components
