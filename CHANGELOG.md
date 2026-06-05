# Changelog

All notable changes to Thrust & Drift are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.9.3] — 2026-06-05

### Fixed

- **`io.js` error strings** — remaining Italian error messages in `parseJSONFile`, `importProfiles`, and `importBattle` translated to English (`"Impossibile leggere il file"` → `"Cannot read file"`, etc.)

### Tests

- 644 tests (+18) — new `io.test.js` suite covering `importProfiles` and `importBattle`: valid file, empty profiles array, malformed JSON, unexpected JSON structure (null / array root), wrong type tag, missing `type` field, missing/non-array `profiles`, missing/non-object `battle`, and `file.text()` rejection

---

## [1.9.2] — 2026-06-04

### Fixed

- **Triple turret cap** — turret weapon list in the profile form now caps at 3 weapons (triple turret, CRB p.163); `+ weapon` dropdown disappears at 3 and is replaced by a `triple turret` label
- **Turret remove button** — `⊗ turret` (dark, no tooltip) replaced with `✕` (`text-slate-400`) + `Tooltip` component, consistent with the crew manifest remove button

---

## [1.9.1] — 2026-06-04

### Changed

- **Ship token visual** — replaced filled circle + initial letter with a swept-wing silhouette polygon (14-point path: pointed nose, visible fuselage, delta wings, twin engine pods with V-notch tail); token rotates to face the velocity vector direction; stationary ships point up by default
- **Token details** — cockpit highlight (teardrop) and fuselage center stripe added as overlay shapes; faction indicator dot removed
- **Ghost token** — same swept-wing polygon and rotation as the main token (previously a plain semi-transparent circle)
- **Default profiles** — crew member names replaced with proper Traveller-flavored character names (e.g. Mira Vasquez, Cmdr. Vikram Solari, Ren Takahata) instead of role labels ("Pilot", "Gunner")
- **Scout/Courier crew** — `sensors: 1` added to Dex Rallahan (pilot/sensor dual-skill)
- **Patrol Cruiser crew** — Asha Reyes gains `sensors: 1`; now has 2 gunners (Brenn Okoro + Asha Reyes) for both turret slots

### Fixed

- **"Assign Crew…" context menu** — voce sempre visibile su qualsiasi nave (rimossa condizione `crew.length > 0`); il modal gestisce il caso crew vuota con messaggio esplicativo
- **Crew manifest remove button** — `⊗` (quasi invisibile, `text-slate-600`) sostituito con `✕` (`text-slate-400`) + `Tooltip` component su hover

---

## [1.9.0] — 2026-06-01

### Added

- **Crew role assignments** — before battle the GM assigns each named crew member to a specific role slot (Pilot, Leadership, Tactics, Engineer, Sensors, Gunner T1…Tn). Only the assigned member's skill applies; unassigned roles contribute 0.
  - Right-click any ship token → **Assign Crew…** opens `CrewAssignmentModal`
  - Ships auto-populate assignments on placement (best-skilled member per role)
  - Assignments are stored in battle state (`crewAssignments` field on each ship instance) and persist across save/resume
- **Turret gating** — turrets without an assigned gunner are excluded from `availableWeapons` and cannot fire; shown as blocked in AttackModal
- **Per-turret gunner skill** — attack DM, Point Defence, and Disperse Sand rolls use the gunner assigned to the specific turret slot, not the global max
- **`getEffectiveSkill` utility** — routes through assignment when set, falls back to max-scan (`getCrewSkill`) for ships without explicit assignments (NPC fallback / backward-compat)
- **`buildDefaultAssignments` / `getAssignedSkill`** — crew.js helpers for building and reading assignment objects

### Tests

- 626 tests (+14: buildDefaultAssignments, getAssignedSkill, getEffectiveSkill)

### Docs

- field-manual §11.3: Crew Role Assignments; §11.4 renumbers from 11.3
- field-manual §5.1: note on post-placement Assign Crew workflow

---

## [1.8.1] — 2026-06-01

### Changed

- **Crew skill model** — `captain` skill key split into `leadership` (Actions phase: Improve Initiative) and `tactics` (Initiative phase: Tactics(naval) check). Both are first-class skill fields in the profile form alongside Pilot, Engineer, Gunner, Sensors.
- **Initiative modal** — ships with Tactics ≥ 1 show an optional secondary dice row (2D6 + Tactics − 8 = Effect, can be negative). NPC ships with Tactics > 0 auto-roll their Tactics check on confirm.
- **Backward compatibility** — saved sessions with `captain` skill key are read transparently as `leadership` (both array and legacy object formats). `migrateCrew` remaps pre-split legacy crew objects.

### Tests

- 612 tests (+3: CREW_SKILLS shape, backward-compat `captain → leadership` in array and legacy formats, `migrateCrew` remaps captain key)

### Docs

- field-manual §11.1: Leadership (LDR) and Tactics (TAC) replace Captain (CPT)
- field-manual §6.1.1: Tactics(naval) check documented
- HelpScreen: skill list and crew form updated
- Combattimento-Spaziale §1 Captain description updated

---

## [1.8.0] — 2026-05-31

### Added

- **Reactions system** (CRB p.171) — defender can react before each incoming attack roll; panel shown in Attack Modal Step 1 (Config) once weapon + target are selected:
  - **Evasive Action (Pilot)** — toggle button: spend 1 thrust to dodge the current attack; the attack suffers DM −Pilot skill (fixed, per CRB p.171 — "attack suffers a negative DM equal to the pilot's skill"); disabled when no thrust remains or Pilot skill = 0; thrust spent via `spendReactionThrust` store action on advancing to Roll step; accumulates across multiple attacks in the same round
  - **Point Defence (Gunner)** — missile attacks only; target must have an unfired laser turret; Gunner (turret) check 2D6 + Gunner; multi-laser bonus DM+1 (2 lasers) / DM+2 (3 lasers); Effect removes that many missiles from the salvo; turret marked fired immediately; if all missiles intercepted, "MARK FIRED & CLOSE" path skips attack resolution
  - **Disperse Sand (Gunner)** — Pulse/Beam Laser attacks only; target must have an unfired sandcaster turret; Gunner (turret) check 2D6 + Gunner; on success: rolls 1D+Effect and adds it to armour for this attack only (`sandBonusArmor` passed to damage step)
- **Manual dice entry for player ship defenders** — player-controlled ships enter physical 2D6 for Point Defence and Disperse Sand rolls (DiceInput component); NPC defenders auto-roll unchanged
- **Manual dice entry for all player ship roll steps** — extended across all attack resolution steps: damage roll (raw ND6 numeric input), critical location (DiceInput 2D6), extra crit damage (ND6 numeric input); NPC ships auto-roll unchanged in all steps
- **`spendReactionThrust` store action** — replaces removed `declareEvasiveThrust`; accumulates `evasiveThrust` per round; clamped to remaining available thrust; logs evasion with effect DM

### Fixed

- **Evasive Action formula** (CRB p.171) — previous implementation used `-(pilotSkill × thrustPoints)` (a stepper 0–N); correct RAW is 1 thrust spent per attack dodged with a fixed DM of −pilotSkill; replaced stepper with toggle button
- **Evasive Action phase** — moved from Acceleration phase (pre-declared) to Attack phase (Reaction); removed `EvasiveModal.jsx` and "Declare Evasion" context menu item from Acceleration; `firedTurrets` and `evasiveThrust` both reset at round start via `buildNextRoundState`

### Changed

- **`augmentedDmBreakdown`** — `evasiveDM` computed dynamically in `AttackModal` from live `reactionEvasion` state (not from stored ship state); `useAttackSetup` sets `evasiveDM: 0` in static breakdown
- **DM breakdown display** — evasion row shown only when active (`evasiveDM !== 0`)

### Removed

- `EvasiveModal.jsx` — deleted; Evasive Action is now handled in the Reactions panel within `AttackModal`
- "Declare Evasion" context menu item (Acceleration phase)

### Tests

- 609 tests (unchanged count — existing tests updated: `spendReactionThrust` suite replaces `declareEvasiveThrust`; ContextMenu test asserts "Declare Evasion" is NOT in document)

### Docs

- `doc/field-manual.md` — §9.9 Reactions table updated (Evasive Action: toggle mechanic, 1 thrust, DM −Pilot skill)
- `doc/Combattimento-Spaziale.md` — Evasive Action moved from §5.2.3 (Manoeuvre phase) to new §7.1 (Reactions); §7 renumbered; PD → §7.3, Sand → §7.4
- `doc/thrust-and-drift-space-combat-simulator-spec.md` — `EvasiveModal.jsx` removed from structure; context menu updated; `evasiveDM` comment fixed; §14.3 rewritten
- `src/components/help/HelpScreen.jsx` — Acceleration note added; Reactions sub-section in Attack; Actions list corrected (removed INSPIRE/COORDINATE/AID GUNNERS/DAMAGE CONTROL)

---

## [1.7.1] — 2026-05-31

### Added

- **Legend modal** — always-visible `📖 Legend` button fixed top-right of the battle screen (also accessible via right-click empty hex → *Legend*); 2-column reference panel (`max-w-2xl`) with 40px SVG icons covering: tokens (player/enemy/neutral ship, missile salvo), beam weapons (Pulse Laser, Beam Laser, Particle Beam, Railgun with weapon-specific colours), hit effects (impact burst, critical flash), movement effects (thrust plume, missile launch, missile trail), persistent indicators (sensor lock, evasive aura, dogfight alert, missile exhausted)

### Fixed

- **Critical hit gate** — critical step now only triggers when `damageResult.total > 0`; per CRB p.168 *"it causes damage rather than just bouncing off armour"* — attacks fully blocked by armour no longer incorrectly open the critical resolution step
- **Beam effects on miss** — `laser_ray` now emitted in `handleMissClose` so the beam fires visually even when the attack roll fails; no `impact_burst` on miss (no hit registered)
- **Effects visibility on critical hit** — `laser_ray`, `impact_burst`, and `critical_flash` are all emitted together in `handleApplyCritical` (after full critical resolution), so they are visible on the canvas when the modal closes; previously `laser_ray`/`impact_burst` fired mid-modal during the damage step and were obscured by the critical resolution step that followed

---

## [1.7.0] — 2026-05-30

### Added

- **Per-turret firing limit** (CRB p.164) — each turret fires once per round
  - `firedTurrets: number[]` on every ship instance; `markTurretFired(shipId, turretSlot)` store action
  - Attack modal weapon list shows turret slot badge (`T1`, `T2`…) and filters out already-fired turrets
  - "Attack…" in context menu gated behind `hasUnfiredOffensiveTurret(ship)` — disappears when all offensive turrets have fired
  - `firedTurrets` reset on every entry into the Attack phase and at round start via `buildNextRoundState`
- **Missile launch unified into Attack modal** — Missile Rack now appears in the Attack weapon list with a count stepper (1–12) and `🚀 LAUNCH SALVO →` button; no 2D6 roll or DM sheet required; "Launch Missiles…" context menu item and `MissileLaunchModal` removed from modal dispatch
- **`missile_launch` canvas effect** — expanding orange ring + 6 radial sparks + "LAUNCH" label; 1400ms; emitted on every salvo launch
- **Initiative order enforcement** — context menu shows combat actions (Apply Thrust, Attack, Crew Action, Boarding) only to the ship whose turn it is; all other ships show "Not this ship's turn" subtitle in header. Gated phases: `acceleration`, `attack`, `actions`. Reverse order in Acceleration is correctly applied
- **Dashboard — Clear autosave** — `✕` button deletes `battle/current` key from IndexedDB; appears in a compact row alongside `↺ RESUME`
- **Dashboard — Tactical Display autosave view** — when an autosave exists (and no file is being previewed), the right panel shows the full saved session: round, phase, mode, ship/missile count, and a ship roster by faction with name + hull bar

### Fixed

- **Movement phase resolution** — `resolveMovement()` was fully implemented in `battleStore` but never called from `advancePhase`; ships were never moving during the Movement phase
- **Ghost tokens phase scope** — ghost tokens (next-position preview) were rendered in all phases; now only visible during Acceleration where the preview is meaningful
- **Reverse initiative order in Acceleration** — HUD actor tracking and PhaseTracker display now both use `[...initiativeOrder].reverse()` during Acceleration phase (CRB p.161: lowest initiative acts first)
- **InitiativeModal unreachable** — modal was registered in `App.jsx` MODAL_MAP but `openModal('initiative')` was never called from anywhere; `EmptyContextMenu` now correctly opens it
- **HUD actor counter** — ambiguous "N left" label replaced with "N/M" positional format (e.g. "2/4")
- **HUD initiative CTA** — `🎲 ROLL INITIATIVE →` call-to-action button added for Initiative phase when `initiativeOrder` is empty
- **Evasive thrust double-spending** — `ThrustModal` now subtracts `evasiveThrust` from the available thrust pool alongside `thrustUsedThisRound`; was possible to declare evasion then apply more thrust than available
- **AddShipModal selection invisible** — selected profile row now shows `bg-sky-950` highlight + `▶` prefix; was visually indistinguishable from hover state
- **HUD brand logo** — was rendering with `opacity-60`; restored to full opacity; moved to first position in round/phase badge

### Changed

- **`laser_ray` effect** — duration 300ms → 1500ms; three-layer rendering pass: outer glow halo (28px blur, 35% alpha) + sharp core beam (3.5px) + white-hot center line (visible first 40%); holds full brightness for the first 30% of duration before fading
- **Dashboard autosave controls** — RESUME AUTOSAVE + CLEAR compacted into a single horizontal row (`↺ RESUME` flex-1 + `✕` icon button); details shown in the Tactical Display panel instead

### Tests

- 605 tests (−1 from 606) — removed "shows Launch Missiles when ship has Missile Rack" (feature removed); replaced with "hides Attack when all turrets are Sandcasters"; updated phase-gating tests to include `initiativeOrder`/`currentActorIndex` state

---

## [1.6.0] — 2026-05-30

### Added

- **Weapon max range enforcement** — each weapon now has a `maxRange` field; the Attack Modal shows an `OUT OF RANGE` badge on weapons that cannot reach the target and disables the ROLL ATTACK button (CRB p.167: "cannot attack targets beyond listed Range Band")
  - `weapons.js` — `maxRange` field on all weapons: Pulse Laser `Long`, Beam Laser `Medium`, Particle Beam `Very Long`, Railgun `Short`, Missile Rack / Sandcaster `Special` (no hard cap)
  - `combat.js` — `RANGE_ORDER` array, `isOutOfRange(maxRange, currentRangeBand)` pure util
  - `useAttackSetup.js` — exposes `outOfRange: boolean` for selected weapon
  - `AttackModal` — per-weapon `OUT OF RANGE` badge in weapon list; range explanation line; ROLL ATTACK disabled when out of range

### Fixed

- **Weapon data corrections** (HG p.28, CRB p.168):
  - Missile Rack `damageDice` 2 → 4
  - Railgun `damageDice` 4 → 2
  - Railgun `traits` `['AP']` → `['AP 4']`
  - Particle Beam `traits` removed erroneous `'AP'` (turret version has no AP; only Particle Barbette does)

### Tests

- 606 tests (up from 596) — +10 `isOutOfRange` / `RANGE_ORDER` in `combat.test.js`

---

## [1.5.0] — 2026-05-30

### Added

- **Boarding system** — full 4-phase boarding action: Contact → Conflict → Security (HG 2022 pp.125–135)
  - `utils/boarding.js` — `ENTRY_METHODS` (6 methods with check/difficulty/time/DM), `CUT_TOOLS` (4 cutters), `getHullResilience(component, armor, armored)`, `cuttingDamage`, `rollStackingCheck`, `rollMissedShot(armoredBulkhead)`, `getContactDM`, `getWeaponSpaceDM`
  - `battleStore` — `boardings[]` in state and undo/redo snapshots; `inBoarding: null` on ShipInstance; `startBoarding`, `advanceBoardingPhase`, `setContactMethod`, `toggleDefenderRotation`, `toggleForcedLinkage`, `setObjective`, `resolveBoarding`, `updateShipFaction`
  - `BoardingSetupModal` — target selection with thrust/distance guards; opens contact modal on confirm
  - `BoardingContactModal` — entry method picker (6 options), tumbling/forced-linkage toggles, dice check section, hull-cut tracker with per-component resilience + armor scaling
  - `BoardingConflictModal` — Bridge / Engineering / Turrets objective checkboxes, stacking roll (2D ≥ 10), missed-shot table (2D, armored bulkhead toggle), weapon DM reminder
  - `BoardingOutcomeModal` — attacker wins / defender repels / ship destroyed; optional faction transfer on capture
  - `ContextMenu` — `⚔ Board [target]…` visible when adjacent + thrust ≥ defender (or M-Drive disabled)
  - `HUD` — `⚔ BOARDING` badge per active boarding with phase label and direct modal link
  - `App.jsx` — boarding modal layer wired

### Fixed

- **UI language** — all user-facing strings in DogfightRoundModal, DogfightNotificationModal, boarding modals, and Modal.jsx translated to English; zero Italian strings in the interface

### Tests

- 596 tests (up from 510) — +28 `boarding.js` utils, +17 `battleStore` boarding actions, +9 `BoardingSetupModal`, +10 `BoardingContactModal`, +12 `BoardingConflictModal`, +10 `BoardingOutcomeModal`

---

## [1.4.2] — 2026-05-29

### Added

- **Ships That Pass in the Night** — during the Movement phase, hostile ships that cross within Short range (≤ 2 hexes) along their simultaneous trajectories now trigger a `PassingAttackModal` before play continues (Traveller Companion p.172)
  - `utils/hex.js` — `segmentMinDistance(a0, a1, b0, b1)`: analytic O(1) minimum hex distance between two simultaneous linear paths; breakpoint search on cube-coordinate components (dq, dr, ds)
  - `battleStore` — `resolveMovement` detects hostile pairs crossing within Short range before committing new positions; stores results as transient `passingEncounters[]` (excluded: same-faction ships, ships already in a dogfight, ships ending in the same hex — those are handled by dogfight detection)
  - `battleStore` — `dismissPassingEncounter(id)` removes a single encounter after GM resolution
  - `PassingAttackModal` — sequential encounter window: shows ship pair, closest approach (hex count + range band); GM chooses which ship fires (opens `AttackModal` pre-configured) or passes the opportunity
- **Spec §13.6** — `doc/thrust-and-drift-space-combat-simulator-spec.md` updated with v1.4.2 section (mechanic, scope, data shape)

### Tests

- 510 tests (up from 488) — +7 `segmentMinDistance` (head-on cross, parallel lanes, stationary, converging, diverging, same speed, symmetry), +4 `resolveMovement` passing detection (hostile cross, same-faction, same-hex landing, in-dogfight exclusion), +2 `dismissPassingEncounter` (removes by id, no-op on unknown), +11 `PassingAttackModal` (null guard, stale auto-dismiss, ship names, range band, adjacent label, pending count, PASS, ship A fires with attacker payload, ship B fires with attacker payload)

---

## [1.4.1] — 2026-05-29

### Fixed
- **DogfightNotificationModal** — crash when `groups` prop shrinks (e.g. mid-undo) while `groupIdx` is stale; added `safeIdx` clamp and `if (!group) return null` guard
- **useDogfightDetection** — undo + redo of the movement→attack phase transition re-opened an already-processed dogfight notification modal; detection is now gated per-round via `lastDetectedRound` ref; ships read via ref to remove `ships` as a trigger dependency
- **battleStore `advanceDogfightMicroRound`** — `get().ships.find()` was called inside `set()` updater; winner name now extracted before `set()`, consistent with surrounding patterns
- **DogfightRoundModal escape check** — live preview (`EscapeCheckRow`) and commit handler (`handleEscapeCheckConfirm`) used separate inline DM formulas; extracted shared `escapeCheckTotals` pure function as single source of truth

### Tests
- 488 tests (up from 479) — +1 DogfightNotificationModal (empty groups guard), +5 useDogfightDetection hook (round guard, clearDetected, non-vectorial mode), +3 DogfightRoundModal escape check phase (reachable, button state, live preview)

---

## [1.4.0] — 2026-05-29

### Added
- **Dogfight system** — full sub-system for close-range ship combat (MgT2e CRB p.138)
  - `utils/dogfight.js` — pure logic: `getTonnageDM`, `rollDogfightPilot`, `resolveDogfightChecks`, `dogfightAttackDM`, `canEscape`; 28 unit tests
  - `battleStore` dogfight slice — `dogfights[]` state, `inDogfight` on ship instances, `startDogfight`, `advanceDogfightMicroRound`, `escapeDogfight`, `endDogfight`; undo/redo snapshots include dogfight state; 9 store tests
  - `useDogfightDetection` — detects same-hex hostile ships at movement→attack transition; `detectDogfightGroups` pure function; 9 tests
  - `DogfightNotificationModal` — GM declares each ship's intent (engage/evade); resolves pursuit check (§3.1) when intents differ; handles multiple groups sequentially
  - `DogfightRoundModal` — full micro-round flow: escape declarations (thrust-advantage auto-escape + pursuit check §6.4), Pilot check dice per ship with all DMs (tonnage, thrust, nemici extra, bonus round precedente), winner resolution, attack DM display (+2/−2), advance counter up to micro-round 6
  - **HUD dogfight tracker** — per-group panel showing micro-round progress, previous winner bonus, "MICRO-ROUND N →" button to open `DogfightRoundModal`
  - **Canvas token visuals** — pulsing amber ring (rAF loop, ~0.67 Hz) + ⚔ badge on in-dogfight tokens; ghost position and velocity vector hidden for dogfight ships

### Tests
- 479 tests (up from 452) — 28 dogfight utils + 9 battleStore dogfight slice + 9 useDogfightDetection + 10 DogfightNotificationModal + 13 DogfightRoundModal + 4 HUD dogfight tracker

---

## [1.3.9] — 2026-05-29

### Added
- **Field Manual screen** — new `help` screen accessible from Dashboard → 📖 FIELD MANUAL; sidebar TOC + scrollable content covering all phases, crew system, undo/redo, save/resume; `⬇ DOWNLOAD PDF` button links to `/field-manual.pdf`
- **Field Manual PDF** — `doc/field-manual.md` (markdownlint-clean) + `public/field-manual.pdf` for in-app download
- **Legal footer** — fixed `h-7` bar on all screens (Dashboard + Battle); abbreviated Mongoose Publishing disclaimer; "About" link opens modal with full Fair Use disclaimer text per Mongoose Publishing policy (May 2025)

### Fixed
- **HUD tooltips** — `position="bottom"` on all HUD buttons; horizontal clamp via `useLayoutEffect` prevents tooltip cutoff near left/right viewport edges
- **Undo/redo buttons** — conditionally rendered (not just dimmed); no layout space occupied when stacks are empty
- **Brand watermark** — moved from bottom-right to top-right; no longer conflicts with BattleLog overlay
- **HUD container** — `items-start` prevents children from stretching to container width

---

## [1.3.7] — 2026-05-29

### Added
- **Skill DM override in ActionModal** — when a non-auto action is selected, a numeric input shows the crew member's base skill; GM can override for specialization checks (e.g. Engineer(M-Drive) 3 instead of generic Engineer 2); `↺` button resets to base; roll uses override value as DM

### Tests
- 406 tests (up from 403) — `rollInitiative` diceOverride bypasses random; `rollAttack` diceOverride bypasses random; `rollAllInitiative` diceOverrides map — specified ship uses manual dice, others auto-roll

---

## [1.3.6] — 2026-05-29

### Added
- **Player manual dice entry** — ships with `faction === 'players'` roll their own dice; NPC ships auto-roll on confirm
- **`DiceInput` component** (`src/components/forms/DiceInput.jsx`) — two die inputs (1–6) that start **empty**; emits `null` until both dice are valid; running total shows `?` until complete; 🎲 auto-roll button as opt-in fallback; reusable across modals
- **InitiativeModal** — player ships show `DiceInput` (empty on open); initiative preview total updates live as player types; CONFIRM disabled until all player ships have entered dice; NPC ships auto-rolled on confirm; REROLL clears all player inputs
- **AttackModal** — `AttackRollStep` shows `DiceInput` + "CONFIRM ROLL" for player attackers (disabled until dice complete); NPC attackers keep auto-roll button
- **ActionModal** — `DiceInput` shown for player ships on non-auto actions; dice cleared on each action selection; button label changes to "CONFIRM ROLL"

### Changed
- `rollInitiative` / `rollAttack` in `combat.js` — accept optional `diceOverride` param (backwards-compatible)
- `rollAllInitiative` in `battleStore` — accepts `diceOverrides: { [shipId]: { results, total } }` map; missing entries auto-roll as before

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
