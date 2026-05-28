# Changelog

All notable changes to Thrust & Drift are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.3.0] — 2026-05-28

### Added
- **Sistema effetti visivi Canvas** — animazioni non bloccanti su canvas overlay separato (`pointer-events: none`, `requestAnimationFrame`); puramente decorativi, zero modifiche allo stato di gioco — Spec §13.4

**Effetti one-shot (trigger da evento, fade automatico):**
- `laser_ray` — raggio animato Attaccante→Bersaglio per Pulse/Beam Laser, Particle Beam, Railgun; colore differenziato per arma + glow; 300ms
- `impact_burst` — 8 scintille radiali sul token colpito (hit confermato); 500ms
- `thrust_plume` — triangolo ambra nella direzione opposta al delta-v applicato; 400ms
- `critical_flash` — anello rosso espandente + etichetta `[CRIT: sistema]` su colpo critico; 600ms
- `missile_trail` — scia tratteggiata arancione rilevata automaticamente da diff posizione missile; 380ms
- `chaff` — 24 frammenti scatter quando un sandcaster interviene; 200ms

**Effetti persistenti (da stato store, ogni frame):**
- `sensor_lock_ring` — linea ciano tratteggiata animata + anello pulsante sul bersaglio bloccato
- `evasive_aura` — alone giallo pulsante attorno al token con `evasiveThrust > 0`
- `missile_exhausted` — overlay grigio + anello tratteggiato su missile con `thrustRemaining === 0`
- `dogfight_alert` — testo "DOGFIGHT" arancione pulsante quando 2+ navi condividono lo stesso esagono

**Architettura:**
- `src/utils/effectQueue.js` — coda module-level senza dipendenze React; `emitEffect` / `drainEffects`
- `src/components/map/effectRenderers.js` — funzioni Canvas 2D pure (pixel coords + progress `t`); save/restore su ogni draw
- `src/components/map/useCanvasEffects.js` — hook con loop rAF; legge store via refs per evitare restart del loop; rileva spostamento missile da diff array
- `BattleMap.jsx` — canvas overlay effetti sopra il canvas principale

### Tests
- 355 test (da 346) — nuova suite `effectQueue.test.js` (9 test): `emitEffect`, `drainEffects`, ordine di inserimento, drain multipli

---

## [1.2.5] — 2026-05-28

### Added
- **Sistema colpi critici completo** — implementa MgT2e CRB pp.169–170 integralmente:
  - `src/data/criticalHits.js` — tabella posizioni (2D6 → sistema) + tabella effetti per tutti gli 11 sistemi × 6 severità, con mechanic codes (`thrust_reduce`, `thrust_zero`, `hull_extra_damage`, `descriptive`)
  - `getCriticalSeverity(effect)` in `combat.js` — Effect − 5, clamp 1–6
  - `getThresholdCriticalCount(prev, new, max)` in `combat.js` — conta soglie 10% Hull attraversate (CRB p.169 Sustained Damage)
- **`thrustPenalty`** — campo persistente su ogni nave; aggiornato da `addCriticalHit` quando M-Drive viene colpito (Sev 1 → 0, Sev 2–4 → −1, Sev 5–6 → thrust = 0); **non** resettato tra i round
- **Stacking critici per sistema** — `addCriticalHit` usa upsert: colpo sullo stesso sistema aggiorna la severità (`max(nuova, esistente + 1)`) invece di aggiungere una entry duplicata; al cap Sev 6 si applica invece 6D danno extra
- **Threshold criticals automatici** — `applyDamage` rileva automaticamente ogni soglia 10% Hull attraversata, lancia 2D6 posizione, applica stacking e hull extra damage; flag `_skipThreshold` previene cascate
- **Step critico in AttackModal** — 4° step `'critical'` dopo il danno: tiro 2D6 per posizione, display severità effettiva (con indicatore stacking), descrizione effetto, tiro ND danno extra per critici Hull o overflow severità massima
- **`repairCritical`** aggiornato — ricalcola `thrustPenalty` dai critici M-Drive residui dopo la riparazione

### Changed
- `ThrustModal` e `ShipTooltip` — thrust disponibile sottrae `thrustPenalty`
- `declareEvasiveThrust` — thrust massimo evasivo ridotto da `thrustPenalty`
- `AttackModal` — rimosso hardcode `{ system: 'Hull', severity: 1 }` per tutti i critici

### Tests
- 346 test (da 287) — nuovo `criticalHits.test.js` (29 test); aggiunte suite `getCriticalSeverity`, `getThresholdCriticalCount`, threshold criticals in `applyDamage`, M-Drive thrustPenalty, stacking, invariante `startNextRound`

---

## [1.2.0] — 2026-05-28

### Added
- **Ship hover tooltip** — hovering a ship token on the battle map shows a panel (200ms delay, no flickering during pan) with: name, faction badge, hull bar (green/yellow/red), vector + magnitude, available thrust, evasion, initiative, sensor lock, critical hits list. Hides when context menu opens.
  - `src/components/map/useShipHover.js` — SRP hook: pixelToHex detection, 200ms timer, clears on pan/leave/empty hex
  - `src/components/map/ShipTooltip.jsx` — React portal panel; flips near viewport edges
  - `src/store/uiStore.js` — `hoveredShip` state + `setHoveredShip` / `clearHoveredShip`

### Fixed
- **Phase-gated context menu** — ship right-click actions are now shown only when valid for the current phase: Thrust + Evasione in *acceleration*; Attacca + Lancia Missili in *attack*; Azione equipaggio in *actions*. "Tira iniziativa" in empty-cell menu gated to *initiative* phase.
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
- **Dashboard autosave restore button** — `↺ RIPRENDI AUTOSALVATAGGIO` visible only when IndexedDB has a saved session with ships; shows round, phase, ship count, timestamp.
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
- **Battle log** — timestamped, colour-coded entries (move / attack / damage / action / system); collapsible overlay
- **Session save / resume** — export battle state to JSON via File API; resume shows full roster preview before loading
- **Profile I/O** — import/export ship profiles as JSON files
- **Safety modals** — confirm before deleting profiles; confirm before leaving battle via HUD home button
- **Default profiles** — Far Trader, Type S Scout, Fighter, Patrol Cruiser, Far Trader (defensive)
- **Test suite** — Vitest + Testing Library + jsdom; 285 tests covering utils, stores, hooks, and UI components
