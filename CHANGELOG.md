# Changelog

All notable changes to Thrust & Drift are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.22.1] — 2026-06-20

### Added

- **Battle Log resizable** — when expanded, a drag handle appears at the top of the Battle Log panel; dragging upward increases height (80 px min, 600 px max). Height persists for the session; collapsing and re-expanding restores the last-set size.

### Fixed

- **Ion Cannon available in weapon picker** — `barbetteOnly: true` flag removed from Ion Cannon data; weapon picker no longer filters by mount type. Ion Cannon (barbette, 2D×10) and all Ion Cannon Bay variants (S/M/L) are selectable in any weapon slot per GM discretion. Mount type remains barbette/bay per HG p.30 RAW.
- **Ion weapon naming and Fleet Combat mechanics — RAW disambiguation** — HG contains two separate combat systems. *Standard space combat* (HG pp.28–86, CRB): tactical ship-vs-ship engagements tracked hex by hex — the system T&D implements. *Fleet Combat* (HG pp.104–124): large-scale fleet engagements using an abstracted ruleset where individual ships become simplified stat blocks and weapons are aggregated. The two systems use different Ion weapon names and completely different mechanics: standard combat calls them **Ion Cannon** (barbette, HG p.30) and **Ion Cannon Bay** (bay, HG p.32–33), with the Power-reduction system T&D implements; fleet combat (HG p.112) calls the same weapons *Ion Barbette* / *Small·Medium·Large Ion Bay* and uses a wholly different formula (effect-per-weapon × count ÷ Hull Points → Ion Damage table, no Power stat, no thrust formula). Fleet Combat mechanics are **out of scope** for T&D. The names "Ion Cannon" and "Ion Cannon Bay" are correct for standard space combat and will not change.
- **Weapon slot labels renamed Turret → Weapon** — all user-facing strings updated: ship profile form (`Weapon 1`, `max 3 weapons`, `Remove weapon slot`), ship detail sheet (`Weapon {n}:`), crew assignment modal (`Gunner (W{n})`), context menu (`All weapons fired`), HelpScreen and field manual (`W1`, `W2…`, per-slot firing limit). Game-mechanic terms (`Gunner (turret)` skill, `Reload Turret` action, `triple turret` CRB term) unchanged.
- **Ion Power thrust cap missing in basic mode** — `BasicManoeuvreModal.availableThrust()` was not calling `computeIonThrustEffect`, so an Ion-debuffed ship in basic combat could allocate more thrust than its reduced Power allowed. Aligned with `ThrustModal`, `MissileImpactModal`, and `battleStore`.
- **ESLint cleanup** — conditional hook calls (useMemo/useEffect after early return) in `ActionModal` and `DogfightNotificationModal`; unused imports/vars (`WEAPONS`, `getCrewSkill`, `SkillBadge`, `autoOk`, `weaponKey`, `s1`, `vi`/`afterEach`/`act`); stale eslint-disable directives; missing deps (`phase` in `useCanvasRenderer` render callback — real bug where canvas did not re-render on phase change; `pendingMissileImpacts` in `HUD.handleAdvancePhase`).

---

## [1.22.0] — 2026-06-20

### Added

- **Ion Weapons — Power stat (v1.22.0)** *(HG p.30–33, FAQ HG 2022 p.1)*
  - Ion Cannon available in weapon picker; classified as barbette mount per HG p.30 RAW.
  - Three new **Ion Cannon Bay** variants: Small (6D×10), Medium (8D×20), Large (10D×100); all selectable in weapon picker.
  - All Ion weapons: `ignoresArmour: true`; `damageMultiple` is now the actual × multiplier (barbette ×10, bay per-tabling).
  - New ship-profile fields: **MAX POWER** (`maxPower`), **COMPUTER BW** (`computerBandwidth`), **HARDENED** (`hardened: true/false`) — editable in ShipProfileForm Power Plant section.
  - Battle instance fields: `basePower`, `currentPower`, `ionPowerReduction`, `baseBandwidth`, `currentBandwidth`, `bandwidthReduction`, `hardened`.
  - Thrust effect: `effectiveThrust = floor(baseThrust × currentPower / maxPower)` — linear mapping via `computeIonThrustEffect()` in `combat.js`.
  - Stacking hits: `ionPowerReduction` is additive; `ionRoundsLeft = max(existing, new)`.
  - **Computer bandwidth** (FAQ): same Power reduction amount deducted from `currentBandwidth`; while `currentBandwidth ≤ 0` and `baseBandwidth > 0`, all attacks suffer DM-2 (shown as COMMS DOWN).
  - **Hardened guard**: ships with `hardened: true` are immune — `applyIonDamage` returns ship unchanged; IonDamageStep shows immune banner.
  - `IonDamageStep` in AttackModal generalised: reads `weapon.damageDice` and `weapon.damageMultiple` dynamically — works for all Ion mounts without hardcoded logic.
  - UI: ION NR badge + `⚡ ION NR — −X PWR · COMMS DOWN` status row in BasicBattleView; Power bar and bandwidth warning in ShipTooltip; ShipDetailModal shows Power/bandwidth rows.
  - 25 new tests: 12 battleStore (Power stacking, hardened, bandwidth, round restore), 6 combat (computeIonThrustEffect boundaries), 7 weapons (damageMultiple, ignoresArmour, bay variants).

### Fixed

- **BUG-001 regression** — `buildNextRoundState` was clearing `ionPowerReduction` when `ionNext = 0` instead of `ionCurrent = 0`, so Power restored one round too early. Guard now uses `ionCurrent > 0` (pre-decrement), matching the documented BUG-001 fix semantics.

---

## [1.21.0] — 2026-06-20

### Fixed

- **Ion Cannon penalty active for wrong duration** (BUG-001) — with `ionRoundsLeft = 1`, the penalty was checked against `ionNext` (post-decrement, already 0) instead of `ionCurrent`, so it cleared one round early. `buildNextRoundState` now checks `ionCurrent > 0` (pre-decrement) to decide whether to keep `ionPenalty` active this round.
- **Engineer Repair did not restore Armour stat** (BUG-002) — `repairCritical` recomputed M-Drive thrust penalty on repair but never restored `profile.armor` when an Armour critical was removed. `addShip` now stores `baseArmor: profile.armor ?? 0` on each ship instance; removing an Armour critical hit restores `profile.armor` to `baseArmor`.
- **Leadership bonus missing from initiative preview** (BUG-003) — `previewTotal` in `InitiativeModal` did not include `ship.initiativeBonusNextRound`, so the running total shown before confirming was always lower by the Leadership bonus amount. The confirm action itself was always correct.

### Added

- **Point Defence — Active Intercept** (FEAT-001) — during the Attack phase, a ship with unfired laser turrets may now use Point Defence offensively to intercept enemy missile salvos currently in flight. In the Attack Config step, selecting a laser weapon and switching to an enemy salvo target reveals an INTERCEPT button; confirming opens a dedicated `MissilePdStep` that rolls 2D6 + Gunner + laser turret bonus (same formula as PD reaction). Effect ≥ 0 destroys Effect missiles from the salvo; the salvo is removed entirely if count reaches 0. The attacker's turret is marked fired; all results are logged.

---

## [1.20.9] — 2026-06-19

### Fixed

- **Ships placed mid-battle skipped in initiative order** — `addShip` appended the new ship instance to `ships` but never inserted it into `initiativeOrder`. Any ship placed after initiative had been rolled received no turns in Acceleration, Attack, or Actions phases until the next initiative roll. Fix: `addShip` now appends the new ship ID to the end of `initiativeOrder` when one already exists (initiative 0 — last in order, per CRB p.160).

### Added

- **Range band rings on vector map** — clicking a ship now draws four concentric dashed cyan hexagons centred on that ship, marking the outer boundaries of the SHORT (2 hex), MEDIUM (15 hex), LONG (38 hex), and VERY LONG (77 hex) range bands. Each ring is labelled with the band name on a dark pill. Rings are hidden while thrust targeting is active to avoid cluttering the delta-v overlay.

---

## [1.20.8] — 2026-06-19

### Fixed

- **Armour not reduced by Critical Damage (CRB p.170)** — all six Armour critical effects previously had `mechanic: 'descriptive'`, meaning the armour reduction was displayed as text but never applied to the ship. New mechanic codes introduced: `armour_reduce_fixed` (Sev 1: −1, no roll), `armour_reduce_d3` (Sev 2: roll 1D6, reduction = ⌈result/2⌉), `armour_reduce_xd` (Sev 3–4: roll 1D6; Sev 5–6: roll 2D6). New `reduceArmour(shipId, amount)` store action updates `profile.armor` (floor 0) and logs the reduction. `AttackCriticalStep` shows a contextual dice-roll input for mechanics that require a roll; Sev 1 applies immediately on confirm. Sev 5–6 "Hull +1 Severity" note remains descriptive — GM resolves manually, consistent with all other Hull-cascade effects in the table.
- **Only one turret could perform Point Defence per attack** — once `pdResult` was set after the first PD roll, the roll UI disappeared regardless of remaining unfired laser turrets. `handlePdRoll` now resets `pdTurretSlot` to `null` after each roll; `ReactionsPanel` shows both the last result and the turret selector + roll button simultaneously as long as `targetPdTurrets.length > 0`. `DiceInput` key is tied to `pdResult.turretSlot` to force a reset between consecutive rolls. Ships with two or three laser turrets can now use all of them for PD on the same incoming salvo.
- **EW — Counter Missile could not target in-flight salvos** — `ActionModal`'s salvo selector only listed `pendingMissileImpacts` (salvos already at the target hex, awaiting impact resolution), so missiles still in transit during the Actions phase appeared as "No in-flight salvos". `ewAppliedThisRound: false` is now set on missiles at launch (`launchMissile`) and reset each round in `buildNextRoundState` (both basic-mode advancement and vectorial round reset). `applyMissileEW` searches `pendingMissileImpacts` first, then `missiles`. The salvo selector now shows a unified list of all salvos from both arrays; salvos from `pendingMissileImpacts` carry a `⚡ impact` badge to distinguish them.
- **basicBandPool not persisted in autosave** — the per-pair thrust accumulation pool used by basic mode was included in undo/redo and manual JSON export/import, but omitted from the IndexedDB autosave snapshot. Added to `extractBattleSnapshot`, `hasSignificantChange`, and the restore `setState` call in `useAutosave.js`.

### Changed

- **Initiative roll breakdown shown post-confirm** — `rollAllInitiative` now saves `initiativeBreakdown: { roll, pilotSkill, thrust, tacticsEffect }` on each ship. The post-confirm initiative order in `InitiativeModal` displays a sub-line with the breakdown; Tactics Effect appears in green if non-zero, making it transparent whether and how much it contributed.
- **ThrustModal pre-populated with last applied delta** — `addShip` initialises `lastThrustDelta: { q: 0, r: 0 }` on each ship; `applyShipThrust` updates it. `ThrustModal` lazy-initialises its delta state from `ship.lastThrustDelta`, so re-opening the modal defaults to the same thrust allocation as the previous round. The user can confirm unchanged, adjust, or reset with the existing RESET button.

---

## [1.20.7] — 2026-06-19

### Fixed

- **Basic mode: missiles never reached their target** — `resolveMovement()` is a no-op in basic mode (no hex grid), so missile salvos sat in-flight forever. Missiles in basic mode now advance toward their target each round using the same Ship Movement cost table (CRB p.166): Thrust 10 guidance budget burns through bands (Short 2, Medium 5, Long 10, Very Long 25, Distant 50) with excess carrying to the next band. When a salvo reaches Adjacent range, it is consumed and `MissileImpactModal` opens at the start of the next round. `launchMissile` sets `basicRangeBand` and `basicThrustAccumulated` fields in basic mode; `buildNextRoundState` calls `advanceBasicMissileOneRound` on all basic-mode missiles.
- **Basic mode: manoeuvre cost reverted to RAW Ship Movement table (CRB p.166)** — v1.20.2 replaced the per-band cost table with a flat "1 thrust per band change" which was incorrect. The CRB p.166 Ship Movement table is clear: Adjacent 1, Short 2, Medium 5, Long 10, Very Long 25, Distant 50. Thrust now **accumulates across rounds** and across both ships: each `applyBasicMovement` call adds the contributed thrust to a signed per-pair pool (`basicBandPool`); the band advances when the pool meets the threshold; excess carries to the next band. Pool persists across round boundaries, is included in undo/redo snapshots, and resets on GM SET. Button label switches to **ALLOCATE THRUST** when the band will not change this action (partial contribution), **APPLY MANOEUVRE** when the threshold is met and the band will advance.

### Added

- **Basic mode: missile ETA display on bento cards** — inbound and launched missile rows in `ShipBentoCard` now show `~Xr` (estimated rounds to impact) next to the salvo count, computed by simulating the guidance thrust against the Ship Movement table.

---

## [1.20.6] — 2026-06-18

### Fixed

- **Missile damage Effect 0 — multiplier floors at ×1 on a successful hit** — Effect 0 is a hit in Traveller, not a miss; multiplying by 0 makes no mechanical sense. `computeMissileImpactDamage` now uses `max(1, min(Effect, count))` as the multiplier when the attack succeeds. Previous note claiming Effect×0 = 0 as RAW has been retracted — community feedback from CotI correctly identified the flaw in that reading.

---

## [1.20.5] — 2026-06-18

### Fixed

- **Missiles lose Smart at Adjacent range (CRB p.162)** — missiles fired at a target in the same hex (Adjacent/Close) no longer receive the DM+2 Smart bonus. `hasSmartGuidance` is now computed at launch time (`launcherTL ≥ 9 && rangeBand !== 'Adjacent'`) and stored on the missile object, then carried through to `pendingMissileImpact`. `MissileImpactModal` reads from the stored flag (backward-compat: missing field defaults to `true`) and shows the reason for Smart loss: `TL< 9` or `Adjacent/Close range`.
- **Overload Drive — Difficult (10+), fixed +1 Thrust (CRB p.171)** — was incorrectly implemented as Average (8+) with +Effect Thrust. CRB p.171 is unambiguous: Difficult (10+) Engineer(m-drive) INT check, success grants +1 Thrust next round (fixed, not +Effect). Effect ≤ −6 triggers M-Drive critical Severity 1 — now surfaced as a GM warning in the result message. Verified absent from TC2024, HG2022, and FAQ.

### Docs

- **`Combattimento-Spaziale.md` corrected** — three errors fixed: EW Counter Missile skill changed from `Electronics(sensors)` to `Electronics(comms)` (CRB p.173); missile damage formula completed with `max(0, 4D − Armatura) × min(Effetto, missili rimasti)` and Effect 0 = 0 RAW note; §10 action list updated with EW Counter Missile and a scope note listing which CRB actions are not implemented in T&D.

---

## [1.20.4] — 2026-06-18

### Added

- **EW — Counter Missile crew action (CRB p.173)** — sensor operators can now use a Difficult (10+) Electronics(comms) check to destroy incoming missiles. Effect (min 1) removes that many missiles from a selected in-flight salvo; the salvo is eliminated entirely if count reaches 0. Effects are cumulative across rounds but a salvo may only be EW'd once per round (`ewAppliedThisRound` flag, reset at round boundary). `ActionModal` gains a salvo selector listing all in-flight salvos with launcher→target and count; salvos already EW'd this round are grayed-out.
- **Smart missile DM gated on launcher TL ≥ 9 (CRB p.79)** — ship profiles gain a `tl` field (default 12). `computeMissileAttackDM` accepts `hasSmart` boolean; the DM+2 bonus applies only when the launching ship's TL ≥ 9. Sub-TL9 launchers show `+0 (TL< 9)` in the impact modal. Profiles without `tl` fall back to 12 — no regression. `ShipProfileForm` exposes a **TECH LVL** field (range 7–16).

### Notes

- **Missile damage Effect×0 is RAW** — CRB p.173 states "any damage is multiplied by the Effect of the attack roll." An attack that succeeds with Effect 0 deals 0 damage. Confirmed against the CRB Update 2022 FAQ (Aug 2024): no errata on this formula. Working as intended.

---

## [1.20.3] — 2026-06-18

### Fixed

- **Sensor Lock now grants flat DM+2, not +Effect (CRB p.172)** — `applySensorLock` previously accepted a `dmBonus` parameter and stored the roll Effect directly. CRB p.172 states "Attacks made by the spacecraft against this target gain DM+2 until the sensor lock is broken." Fixed: `sensorLockDM` is now always 2. `dmBonus` parameter removed from store action, `ActionModal`, and `crewActions` description updated with correct citation (p.172).
- **Acceleration phase reverse initiative: vectorial mode only (TC p.174)** — reverse initiative order during Acceleration was applied to both basic and vectorial modes. TC p.174 applies this rule to vectorial combat only; basic mode uses normal initiative order per CRB p.164. Gated on `combatMode === 'vectorial'` in `HUD`, `PhaseTracker`, `ContextMenu`, and `battleStore.advanceActor`.
- **CRB p.161 citation corrected to TC p.174** — the reverse-initiative comment referenced the wrong page (p.161 = Ship Computers). All citations updated.

---

## [1.20.2] — 2026-06-17

### Fixed

- **Basic mode: Apply Manoeuvre always disabled** — `RANGE_BAND_MOVE_COST` stored hex distances (`Very Long = 25`, `Distant = 50`), making the button permanently greyed out for any ship with normal thrust (2–6). Replaced with flat cost of 1 thrust per band change per CRB p.161 non-vectorial mode. `RANGE_BAND_MOVE_COST` import removed from `battleStore.js`.

### Known / Pending investigation

- **Lowest initiative acting first** (reported by CotI user) — in Acceleration phase this is correct per RAW (CRB p.161); in Attack/Actions phases it would be a bug. Awaiting reproduction steps to confirm.
- **TL field for Smart trait gating** — currently all missiles carry Smart trait unconditionally; proper TL-based gating not yet implemented.

---

## [1.20.1] — 2026-06-17

### Fixed

- **Missile impact damage formula corrected per CRB p.173** — previous formula `max(0, count×4D6 − armour)` was wrong. RAW formula is `max(0, 4D6 − armour) × min(Effect, count)` (single missile roll, multiplied by Effect capped at salvo size).
- **Missile impact: attack roll now happens at impact** — CRB p.173 IMPACT specifies a 2D6 attack roll at the moment of impact, not at launch. Roll: 2D6 + DM+1/missile + DM+2 (Smart trait) ± Evasive Action. Effect < 0 → miss, no damage applied.
- **Missile impact: Evasive Action** — target may spend 1 reaction thrust before the impact attack roll to apply DM −Pilot (CRB p.171). Button disabled when no thrust available.
- **Two-step modal flow**: Step 1 (attack roll) → Step 2 (damage). State resets between queued salvos via `useEffect`.
- **`computeMissileAttackDM` and `computeMissileImpactDamage`** extracted to `combat.js` as pure functions for testability.

### Tests

- 830 (+15 from v1.20.0): `computeMissileAttackDM` (8 cases — salvo size, Smart DM, evasive pilot, high pilot reduces below base), `computeMissileImpactDamage` (8 cases — typical hit, effect > count cap, count > effect cap, roll < armour clamped to 0, effect=0, roll equals armour, torpedo, armour=0).

---

## [1.20.0] — 2026-06-17

### Added

- **Weapons expansion** (MgT2e HG pp.28–31):
  - 11 new weapons: Fusion Gun, Plasma Gun, Ion Cannon, Torpedo, Missile Barbette, Pulse Laser Barbette, Beam Laser Barbette, Particle Barbette, Fusion Barbette, Plasma Barbette, Railgun Barbette
  - **AP trait** mechanically active: `effectiveArmour = max(0, armour − apReduction)` before damage; values: Railgun 4, Fusion Barbette 3, Plasma Barbette 2, Railgun Barbette 5
  - **Barbette damage multiplier ×3**: `netDamage = max(0, roll + Effect − effectiveArmour) × 3` — applied after armour, not to the raw roll (HG p.29)
  - **Ion Cannon**: no hull damage on hit; applies `ionPenalty` (2D6 roll) for 1 round (D3 rounds if Effect ≥ 6); penalty decremented by `buildNextRoundState` each round; cleared when `ionRoundsLeft` reaches 0 (HG p.30)
  - **Torpedo**: 6D damage per torpedo, 3 per barbette, red token, guided (Smart trait); stacks as a separate salvo type vs 4D missiles (HG p.30–31)
  - **Missile Barbette**: fixed 5-missile salvo, 25 canisters total (5 salvos) (HG p.29)
  - **Sandcaster ammo tracking**: 20 canisters per sandcaster slot; decremented by Disperse Sand reaction; shown on bento cards, ship detail modal, and tooltip
- **Canvas effects**: Ion burst (one-shot blue ring on hit), Ion aura (persistent pulsing ring while `ionRoundsLeft > 0`), Torpedo token (red/amber silhouette)
- **Basic mode bento card UI**: ION NR header badge, ion disruption status row (penalty + rounds), sandcaster ammo row (🪨 N/max, yellow < 25%, red at 0)
- **ShipDetailModal**: new Ammunition section showing missile ammo and sand canisters (shown only when the ship has launchers/sandcasters)
- **ShipTooltip**: ion disruption stat row, separated missile/torpedo inbound counts

### Fixed

- `isMissileBarbette` in `AttackConfigStep` was a dangling closure variable — now passed as an explicit prop (caused 3 pre-existing test failures in isolation)
- `BasicBattleView` missile ammo display: `countMissileRacks` aliased to return total capacity but code was multiplying by 12 again — removed the double-multiply

### Tests

- 815 (+106 from v1.19.0): AP parsing (8 cases), ammo capacity (8 cases — Rack/Barbette/Torpedo), sandcaster count (6 cases), `applyIonDamage` (4 cases), ion round decrement (3 cases), `spendSandAmmo` (4 cases), weapon catalogue completeness (4 groups), barbette multiplier (6 per-weapon cases), Ion Cannon/Torpedo/Missile Barbette invariants, `BasicBattleView` ION badge, ion status rows, sandcaster row, correct ammo max for all launcher types

---

## [1.19.0] — 2026-06-17

### Fixed

- **WCAG AA contrast — definitive floor** — three-pass fix for all interface text:
  1. Replaced `disabled:opacity-60/50` on coloured buttons with explicit `disabled:text-slate-400 disabled:border-slate-600/50 disabled:bg-transparent`; opacity on buttons collapses text, border, and background together, failing even the 3:1 large-text threshold.
  2. Promoted all `text-slate-500` and `text-slate-600` to `text-slate-400` (≥ 6.2:1 on `slate-950` — passes AA normal text). Affected 28 JSX files.
  3. Promoted all remaining `text-slate-700` text labels to `text-slate-400`. Affected CatalogPanel, Dashboard, AttackModal, InitiativeModal, ContextMenu, ChangelogScreen.
  - `text-slate-400` is now the minimum for any visible text. `text-slate-300/200/100` used for emphasis; no text below `text-slate-400` in any component.

### Changed

- **Sci-fi emoji icon system** — replaced all non-emoji Unicode glyphs with thematic emojis across 26 JSX files and all documentation:
  - `⚠` → `🚨` (alarm klaxon — warnings, errors, critical hits, NO AMMO)
  - `⚔` → `⚔️` (crossed swords emoji form — boarding/dogfight titles and icons)
  - `✓` → `✅` (check marks — success states, EVADING, BREACH, SAVE CHANGES)
  - `↺` / `↻` → `🔄` / `🌀` (reroll/resume / tumbling rotation)
  - `⟲` / `↷` → `↩️` / `↪️` (HUD undo/redo buttons)
  - `⌂` → `🏠` (HUD home/dashboard button, enlarged to `text-base`)
  - `✦` → `✨` (placement banner sparkle)
  - `◦` → `▸` (dogfight result bullets: ESCAPED, SHORT RANGE, TIE)
  - `▼ Approach` / `▲ Flee` → `⬇ Approach` / `⬆ Flee` (manoeuvre direction buttons)
  - `← BACK` → `⬅️ BACK` (back buttons in HelpScreen and ChangelogScreen)
  - Undo/redo glyph buttons bumped from `text-xs` to `text-sm` for legibility.
  - field-manual.md and HelpScreen.jsx updated to match all icon changes.

### Tests

- 709 (no change)

---

## [1.18.1] — 2026-06-16

### Fixed

- **Acceleration phase actor order** — `advanceActor` was iterating `initiativeOrder` forward while HUD and ContextMenu used `[...initiativeOrder].reverse()` for the acceleration phase display. Mismatched indices caused destroyed ships to appear as current actor while alive ships were silently skipped, leaving only NEXT PHASE available. Fix: `advanceActor` now mirrors the same reversal when `phase === 'acceleration'`.

---

## [1.18.0] — 2026-06-16

### Added

- **ShipBentoCard in BasicBattleView** — replaced the flat `ShipCard` with a three-zone bento layout: Header (name + faction colour dot + status badges), Hull (bar + hull/max + initiative), Status (conditional zone with sensor lock, locked-by, inbound missiles per launcher, launched missiles per target, reloading turrets, critical hits, missile ammo). Badges: `☠ WRECK`, `DOGFIGHT`, `BOARDING`, `EVA N`, `LOCKED`. Grid: `1 col → 2 cols (sm) → 3 cols (lg)`.
- **ShipTooltip — sensor locked-by and inbound missiles** — the vectorial mode hover tooltip now shows: "Sensor Lock → [target name]" (with DM) when the ship holds a lock; "Locked by [attacker name]" when targeted by a lock; "⚡ N× missile inbound" when missiles are in flight toward this ship.
- **`countMissileRacks` exported from `utils/combat.js`** — extracted from a private function in `battleStore.js` to a named export; now shared between the store and `BasicBattleView` without circular dependency.

### Fixed

- **WCAG AA contrast** — all secondary text that used `text-slate-500` or `text-slate-600` on dark backgrounds was below the 4.5:1 AA threshold. Bumped to `text-slate-400` (label/secondary text) across 32 component files. `text-slate-600` retained only for disabled/placeholder states where intentional low-contrast applies.
- **Autosave gap in basic mode** — `rangeBands` changes (via `setRangeBand` or `applyBasicMovement`) were not triggering an IndexedDB write because `hasSignificantChange` did not compare `rangeBands` references. Added `prev.rangeBands !== next.rangeBands` to the check.

### Changed

- **BasicManoeuvreModal — per-ship independent manoeuvre** — removed the "target also contributes thrust" optional slider. Each ship now commits only its own thrust when it acts in the manoeuvre phase. If both ships want to approach, each opens the modal on its own initiative turn; the band closes by 2 steps in a single round. The bidirectional thrust summing was confusing in a turn-based system and did not match the sequential initiative order. `applyBasicMovement` signature simplified: `targetThrust` parameter removed.

### Tests

- 709 tests (+9 from 700 — 10 new `BasicBattleView` bento card tests; −1 removed bidirectional `applyBasicMovement` test)

---

## [1.17.2] — 2026-06-16

### Fixed

- **Sensor lock ring persists after ship destruction** — `useCanvasEffects` rAF loop was reading `shipsRef.current`, which was stale in the window between Zustand's synchronous `set()` and React's async commit + `useLayoutEffect`. Fix: read `useBattleStore.getState()` directly inside each frame — Zustand updates its internal store synchronously, so `getState()` always returns the latest state regardless of React's render cycle. Same pattern already used in `useCanvasRenderer`.
- **Canvas TypeError crash on effects without hex position** — `renderOneshotEffect` threw `Cannot read properties of undefined (reading 'q')` when an effect (e.g. `impact_burst`) was emitted for a ship not yet placed on the map. Added null guards on all hex-dependent cases (`laser_ray`, `impact_burst`, `thrust_plume`, `critical_flash`, `missile_trail`, `missile_launch`, `chaff`).

---

## [1.17.1] — 2026-06-14

### Added

- **`netlify.toml`** — `ignore = "exit 0"` disables automatic deploys on push; builds triggered manually from Netlify dashboard or CLI.

### Fixed

- **Panel modals — map always visible** — all modals now use `variant="panel"` (anchored bottom-right, no backdrop); map remains visible and pannable during attack resolution, missile impacts, and passing encounters. `ABANDON SESSION` confirmation keeps `variant="dialog"` (centred backdrop) as a destructive action requiring full attention.
- **PAM action buttons locked while AttackModal is open** — prevents double-firing when panels stack at the same screen position; buttons re-enable once AttackModal closes.
- **PAM effects-window delay removed** — 1.5 s hide logic was a workaround for the old dialog backdrop; no longer needed with panel variant.
- **BattleLog ↩ disabled while any modal or impact is active** — prevents opening a second MissileImpactModal while one is already resolving.
- **`MissileImpactModal` `min-w-[340px]` → `min-w-85`** — canonical Tailwind v4 syntax.

### Docs

- Field manual and HelpScreen updated: Ships That Pass in the Night now documents initiative order (TC p.177) — GM decides which ship fires first; second button locked until first attack resolves; destroyed ships cannot fire back.

### Tests

- 700 tests (−2: removed obsolete PAM effects-window tests)

---

## [1.17.0] — 2026-06-14

### Added

- **In-app Changelog page** — new `ChangelogScreen` accessible from the Dashboard ("📋 CHANGELOG" button) and from the Field Manual sidebar. Parses `CHANGELOG.md` at build time via Vite `?raw` import; renders all 45+ versions with colour-coded category badges (Added/Fixed/Changed/Removed/Style/Tests/Docs), inline bold/code formatting, and a jump-nav sidebar.

### Fixed

- **Missile token animation — stale closure** — `useCanvasRenderer` `render` callback closed over `ships`/`missiles` from subscription time. When `startMovementAnimation` (uiStore) fired before `battleStore.set()`, the rAF loop started with pre-movement positions → `lerpHex(pre, pre, t) = pre` → tokens stationary. Fix: read `liveShips`/`liveMissiles` from `useBattleStore.getState()` inside `render`, same pattern already used for `movementAnimation`.
- **Passing encounter + missile impact simultaneous modals** — `resolveMovement` set both `pendingMissileImpacts` and `passingEncounters` in the same `setTimeout` callback, causing both modals to appear at the same time. Fix: `PassingAttackModal` suppresses itself while `pendingMissileImpacts.length > 0`.
- **Ghost token (destroyed wreck) triggering passing encounters** — `resolveMovement` passing-encounter detection loop had no `isDestroyed` guard; a destroyed ship drifting on its vector would collide with live ships and open the encounter modal. Fix: added `if (a.isDestroyed || b.isDestroyed) continue` to the loop.
- **Wreck ghost/vector overlays visible after destruction** — canvas Layer 3 (ghost preview) and Layer 4 (vector arrows) rendered destroyed ships. Fix: `if (ship.isDestroyed) continue` in both layers of `useCanvasRenderer`.
- **Audio intermittent silence** — three root causes: (1) synth scheduling lookahead `ctx.currentTime + 0.01` (10ms) too tight after `AudioContext.resume()` → raised to 50ms; (2) `AudioContext` in `'closed'` state was reused → added closed-state guard + context recreation; (3) scheduling errors silently swallowed → added `console.warn` in DEV mode.
- **Passing encounters deferred until after movement animation** — passing encounters were queued before the 2s movement animation completed, obscuring ship movement with an immediate modal. Fix: encounter queue now emits in the same `setTimeout(animDuration + 100ms)` window as missile impacts.
- **AttackModal TDZ crash on missile attack** — `ammoLeft` was computed before `useAttackSetup` returned, causing a Temporal Dead Zone crash when opening the attack modal on a ship with missile racks. Fix: moved `ammoLeft` derivation after the hook call.

### Tests

- 702 tests (+4: missile rack `ammoLeft` threading, `AttackConfigStep` ammo prop, disabled launch at 0 ammo, ammo display colour)

---

## [1.16.0] — 2026-06-13

### Added

- **Missile magazine tracking** — each ship instance now tracks `missileAmmoTotal = N_rack × 12` (MgT2e CRB p.162 — standard rack holds 12). The Attack modal stepper is capped at the remaining ammo; remaining count displayed in cyan (red at 0); launch button shows `⚠ NO AMMO` and is disabled when magazine is empty. Ammo persists across rounds and degrades correctly across multiple salvos.

### Tests

- 698 tests (+4: magazine initialisation, depletion, clamp at 0, 2-rack ship)

---

## [1.15.6] — 2026-06-13

### Fixed

- **Ship token detail contrast** — bridge, cockpit, and porthole overlays raised from 10–35% to 40–65% opacity (white elements) and 90% (cyan portholes); tokens now legible on all faction colours, including for users with colour-vision deficiency.

### Style

- **`PassingAttackModal` — `min-w-85`** — replaced non-canonical `min-w-[340px]` with Tailwind v4 `min-w-85`.

---

## [1.15.5] — 2026-06-13

### Fixed

- **`PassingAttackModal` — visual effects now visible after attack resolution** — the modal now hides for 1.5 s when the `AttackModal` closes (transition `activeModal: 'attack' → null`), giving beam/impact/critical effects time to animate on the canvas before the backdrop reappears. Store state (`firedA`/`firedB`) is preserved during the window so the modal resumes correctly for subsequent actions (Ship B still fires, multi-encounter queue unaffected).

### Tests

- 694 tests (+2 for effects-window hide/reappear behaviour)

---

## [1.15.4] — 2026-06-12

### Added

- **Missile impact recovery from battle log** — log entries for missile impacts now store `details.recoverable + impact` data. A ↩ button appears on each recoverable entry in the battle log; clicking it re-queues the impact in `pendingMissileImpacts` via the new `reopenMissileImpact` store action. Works even after page reload (log is persisted; `pendingMissileImpacts` is transient).
- **Phase advance blocked by unresolved impacts** — `canAdvancePhase` returns false when `pendingMissileImpacts.length > 0`; clicking NEXT PHASE shows `"Resolve N pending missile impact(s) first."`. An amber `⚡ N impacts unresolved` badge pulses in the HUD whenever impacts are pending.

### Tests

- 692 tests (invariato)

---

## [1.15.3] — 2026-06-12

### Added

- **`MissileImpactModal` — in-app dice roll** — pulsante 🎲 affianco al campo danno; chiama `rollDice(count × 4, 6)` e popola il totale automaticamente. L'input manuale rimane per override con dadi fisici.

### Tests

- 692 tests (invariato)

---

## [1.15.2] — 2026-06-12

### Fixed

- **Missile impact: token animation + sound** — impacted missiles were removed from the store synchronously (disappearing before the movement animation showed them reaching the target), and no sound was played. Fix: impacted missiles are now kept in the store alongside surviving missiles during the animation; the `setTimeout` callback removes them, opens the impact modal, and emits `impact_burst` once per salvo. `emitEffect` import added to `battleStore.js`.

### Tests

- 692 tests (unchanged — impact test updated: missile now present in store immediately after `resolveMovement`, absent after `vi.runAllTimers()`)

---

## [1.15.1] — 2026-06-12

### Fixed

- **`MissileImpactModal` covering movement animation** — the modal was appearing during the 2-second movement animation, hiding ship and missile movement. Root cause: Zustand v5 uses `useSyncExternalStore` per store; with `pendingMissileImpacts` in `battleStore` and `movementAnimation` in `uiStore`, React could render `MissileImpactModal` between the two synchronous store updates (cross-store tearing), bypassing the `if (movementAnimation) return null` guard. Fix: `resolveMovement` no longer adds impacts synchronously; they are deferred via `setTimeout(animDuration + 100 ms)`. `MissileImpactModal` drops the `movementAnimation` guard and `useUiStore` import (no longer needed).

### Tests

- 692 tests (unchanged — missile impact test updated to use `vi.useFakeTimers()` / `vi.runAllTimers()` to flush the deferred `setTimeout`)

---

## [1.15.0] — 2026-06-12

### Added

- **Missile impact resolution** — when a missile salvo reaches its target's hex during the Movement phase, the salvo is consumed and a **⚡ MISSILE IMPACT** modal opens automatically. The GM enters the total damage rolled (count × 4D6 per missile, reminder shown); armour is read from the target's ship profile; net damage (`max(0, rolled − armour)`) is displayed live. **APPLY DAMAGE** calls `applyDamage` and closes the entry; **MISS / INTERCEPTED — DISMISS** closes without applying damage. Multiple salvos that impact in the same round are resolved sequentially (pending count shown). Stale impacts (target removed via undo) are auto-dismissed. Implemented across:
  - `src/store/battleStore.js` — `pendingMissileImpacts: []` added to initial state and `resetBattle`; impact detection in `resolveMovement` (post-movement hex comparison of missile position vs target position); `dismissMissileImpact(id)` action; log entry (`⚡ … impacts … Resolve damage.`) per impact.
  - `src/components/modals/MissileImpactModal.jsx` — new self-contained modal (pattern: `PassingAttackModal`).
  - `src/App.jsx` — `<MissileImpactModal />` mounted in the always-present overlay layer alongside `<PassingAttackModal />`.

### Changed

- **Movement animation duration** — increased from 600 ms to 2 s (`MOVEMENT_ANIM_DURATION_MS` in `uiStore.js`). Gives the GM more time to track ship and missile positions during the simultaneous movement step.

### Tests

- 692 tests (unchanged count — guidance test refactored: missile-on-target-hex now verifies `pendingMissileImpacts` queue instead of surviving missile state).

---

## [1.14.0] — 2026-06-12

### Added

- **Rubber-band canvas thrust targeting** — `ThrustModal` replaced by a direct canvas interaction in the Acceleration phase. Right-click ship → *Apply Thrust* enters targeting mode; moving the mouse draws a dashed rubber-band line from the ship toward the cursor with the thrust endpoint clamped to `thrustAvailable`. The line turns orange when at cap. A ghost token shows the next-round position (`ship.pos + ship.vector + delta`); a faint line connects the inertial ghost to the new ghost; a `cost/max` badge appears below. Click confirms; ESC cancels. Implemented across:
  - `src/utils/hex.js` — new `computeClampedDelta(targetHex, shipPos, thrustAvailable)` pure function
  - `src/store/uiStore.js` — `thrustTargeting: { shipId } | null`; `startThrustTargeting` / `cancelThrustTargeting` actions; `'thrust'` removed from `ModalId` typedef
  - `src/components/map/useMapInteraction.js` — accepts `mouseHexRef`; `onMouseMove` tracks cursor hex during targeting; `onClick` confirms delta → `applyShipThrust` + `emitEffect('thrust_plume')`
  - `src/components/map/BattleMap.jsx` — creates `mouseHexRef`; wires ESC keydown → `cancelThrustTargeting`; passes `mouseHexRef` to both hooks
  - `src/components/map/useCanvasRenderer.js` — Layer 3b `drawThrustTargeting`; default ghost suppressed for the targeting ship
  - `src/components/ui/ContextMenu.jsx` — *Apply Thrust* calls `startThrustTargeting` instead of `openModal('thrust')`
  - `src/App.jsx` — `ThrustModal` import and `MODAL_MAP` entry removed (`ThrustModal.jsx` kept on disk, marked ⚠ UNUSED in README)

### Tests

- 692 tests (+6 from 686 — `computeClampedDelta` ×4, `thrustTargeting` store ×2)

---

## [1.13.1] — 2026-06-12

### Docs

- **`doc/thrust-targeting-ux-design.md`** — fixed markdown code block language tags (bare ` ``` ` → ` ```text `), table column alignment, and added missing blank line before list.

---

## [1.13.0] — 2026-06-12

### Added

- **Ship token silhouettes** — 6 shape variants selectable per-placement: `delta` (swept-wing fighter), `needle` (lance-hull scout), `freighter` (bulky cargo hull), `gunship` (wide broadside body), `cruiser` (elongated mid hull), `capital` (massive rectangular hull). Implemented as pure Canvas path tracers in `shipTokenShapes.js` (`SHIP_SHAPES` map + `getShapeTracer`). Shape chosen in `AddShipModal` via a 6-column mini-canvas grid with live previews (colored when selected, slate otherwise). Stored as `tokenShape` per ship instance; persists through save/autosave/export.
- **Per-shape bridge/cockpit detail overlays** — each silhouette has a dedicated detail draw function called after fill+stroke: delta (fuselage stripe + cockpit dot), needle (spine line + nose sensor dot), freighter (bridge tower + 3 portholes), gunship (armored CIC dome + targeting sensor), cruiser (elongated bridge oval + twin portholes), capital (command tower blister + bridge windows). Dispatched via `getDetailDrawer(key)` map.
- **Missile hover tooltip** — hovering a missile salvo token for 150 ms shows a portal panel with: salvo type, launcher → target ship names with faction colour dots, and a thrust-remaining bar (cyan → yellow → red based on `thrustRemaining / 10`). Clears on mouse leave, pan, or click. Implemented via `useMissileHover` hook + `MissileTooltip` component; `hoveredMissile: null` state + setters added to `uiStore`.
- **Mongoose Publishing link in legal footer** — "Mongoose Publishing" text is now a clickable `<a>` linking to `mongoosepublishing.com` (opens in new tab).

### Fixed

- **Effects canvas z-index** — `effectsCanvasRef` now has explicit `zIndex: 1`; previously both canvases used `z-index: auto` (DOM order), which some browser compositing paths resolve incorrectly when sibling elements carry integer z-index (HUD: z-10, ContextMenu: z-50). Effects `impact_burst`, `critical_flash`, `missile_launch`, and `evasive_aura` now reliably paint above ship tokens while remaining below all HUD/overlay elements (z-10+).
- **`rangeBands` excluded from undo snapshots** — `pushHistory` was missing `rangeBands`; undo in a basic mode session restored ship thrust but left range bands unchanged. All three snapshot sites (`pushHistory`, `undoLastAction` redo-snapshot, `redoLastAction` undo-snapshot) now include `rangeBands`.
- **Missile token radius** — `MISSILE_RADIUS` corrected from `8` to `11` in `tokenRenderers.js`; tokens were visually undersized relative to the thrust arc and count label.

### Changed

- **Battle log layout** — width changed from full-viewport to `w-1/3` (responsive, 33%); panel anchored bottom-left. Legal footer `border-t border-slate-800` restored.
- **Phase advance guards** — `NEXT PHASE ⟶` button in `HUD.jsx` is now conditional: Setup requires ≥ 1 ship placed; Initiative requires at least one `initiativeOrder` entry (i.e. initiative has been rolled); Acceleration, Attack, and Actions require `currentActorIndex >= initiativeOrder.length` (all actors have acted). Clicking the button while blocked shows an amber warning (`⚠ Place at least one ship first.` / `Roll initiative before advancing.` / `N actors still to act.`); button styled `cursor-not-allowed` when blocked. Warning auto-clears when the condition is satisfied.

### Tests

- 686 tests (+5 from 681 — `rangeBands` undo snapshot +1; phase advance guards +4)

---

## [1.12.2] — 2026-06-10

### Fixed

- **`PassingAttackModal` single-fire bug** — encounters now track `firedA`/`firedB` flags per side; `markPassingEncounterFired(id, side)` store action updates the flag and auto-dismisses only when both sides have resolved; buttons show `✓ FIRED` state and are disabled after use. Previously `handleOpenFire` dismissed the entire encounter before opening `AttackModal`, making it impossible for the second ship to fire.
- **Intermittent audio not playing** — `useAudioEngine` subscriber made `async`; `ctx.resume()` is now `await`ed before scheduling audio nodes. Browser auto-suspends `AudioContext` after ~30 s of inactivity; without `await`, sounds were scheduled on a still-suspended context and silently dropped.
- **`MISSILE_GUIDANCE_THRUST` incorrect value** — corrected from `3` to `10` (MgT2e CRB p.162: standard missiles have Thrust 10). At `3`, missiles were trivially evadable; correction aligns with RAW.

### Tests

- 681 tests (+2) — `PassingAttackModal`: `firedA`/`firedB` flag assertions, auto-dismiss on both-fired, disabled button label; `battleStore`: missile guidance partial correction test target moved to q:20 to produce delta > 10.

---

## [1.12.1] — 2026-06-10

### Fixed

- **`inBoarding` guard in dogfight detection** — `detectDogfightGroups` now excludes ships with `inBoarding !== null` (physically anchored, cannot maneuver into close engagement); `resolveMovement` `passingEncounters` loop now skips pairs where either ship is in boarding (anchored ship produces false positives in trajectory intersection); `startDogfight` predicate now rejects any participant with `inBoarding !== null` as an explicit double guard.
- **`inDogfight` guard in `BoardingSetupModal.canBoard`** — targets with `inDogfight !== null` are excluded from valid boarding targets; a ship actively maneuvering in a dogfight cannot be boarded.
- **`resolveMovement` no-op in basic mode** — explicit early return when `combatMode === 'basic'`; movement is managed via range bands in `advancePhase`. Previously unreachable through normal flow but lacked an explicit contract, making the function unsafe to call directly in tests or future refactors.

### Docs

- **`doc/obstacles-system-design.md` §14** — new section: obstacle × dogfight interaction rules. Obstacle damage applied once per macroscopic round regardless of micro-rounds completed; gravity well impact auto-terminates active dogfight before applying atmospheric damage; obstacle placement during active dogfight applies at next `resolveMovement`.

### Tests

- 679 tests (+5) — `useDogfightDetection`: 2 new tests for `inBoarding` exclusion in `detectDogfightGroups`; `battleStore`: `startDogfight` blocked when ship in boarding, `passingEncounters` excludes boarding ships, `resolveMovement` no-op in basic mode.

---

## [1.12.0] — 2026-06-09

### Added

- **Missile guidance** — in `resolveMovement`, each missile with `thrustRemaining > 0` now applies `computeMissileGuidance`: aims for the target's predicted next position (`target.position + target.vector`) and applies up to `MISSILE_GUIDANCE_THRUST = 3` hex-distance of delta-v per round (TC p.176 — Smart guidance). Missiles with no remaining thrust drift without correction. Previously missiles inherited the launcher's vector at launch and never updated it.
- **Procedural sound effects** — `src/utils/audioSynth.js`: Web Audio API synthesis for all combat events (no audio files). `src/hooks/useAudioEngine.js`: singleton `AudioContext`, subscribes to `effectQueue` on mount, no-ops when muted. `effectQueue.js` extended with `subscribeEffects` (listener pattern, parallel to `drainEffects` for canvas). `uiStore`: `audioEnabled` flag + `toggleAudio()`. HUD: 🔊/🔇 toggle in the utility toolbar.
  - `laser_ray` — descending sawtooth sweep 900→180 Hz
  - `impact_burst` — white-noise burst with lowpass sweep
  - `critical_flash` — sub-bass thud 80→25 Hz + noise crack at 1200 Hz
  - `missile_launch` — ascending sawtooth whoosh 80→500 Hz
  - `thrust_plume` — bandpass noise burst at 350 Hz

### Fixed

- **ContextMenu Attack visibility** — `Attack…` option now always shown during the attack phase on the current actor's turn (not hidden when all turrets have fired). If all turrets are exhausted, the entry is rendered as a `MenuItemDisabled` with `All turrets fired` reason. This aligns with the existing behaviour for turrets used for PD/Sand reactions (which correctly mark the defender's turret slot as fired per RAW — the slot can't be used for offence in the same round).
- **ActionModal ANOTHER ACTION** — clicking ANOTHER ACTION now resets `selectedMemberId`, `selectedAction`, `manualDice`, and `skillOverride` in addition to `rollResult` and `targetShipId`. Previously the just-used crew member remained selected (resolved from `crewArray`, not the filtered `availableCrew`), leaving their action list active and executable a second time.

### Tests

- 674 tests (+2) — `battleStore`: missile guidance partial correction (target too far for single-round intercept), out-of-fuel drift.

---

## [1.11.0] — 2026-06-08

### Added

- **Destroyed ships** — when a ship's hull reaches 0, `isDestroyed: true` is set on the ship instance and a `DESTROYED` entry is appended to the battle log. Token is rendered at 35% opacity with a full-opacity ☠ badge. All combat actions (thrust, attack, crew action, boarding) are blocked in the context menu, replaced by a "WRECK — no actions available" notice. The ship is skipped in `advanceActor()` initiative cycling. GM removes the wreck manually via "Remove Wreck" (renamed from "Remove from battle").
- **Inline 🎲 auto-roll for player damage dice** — `AttackDamageStep` and `AttackCriticalStep` (extra damage roll): an inline 🎲 button next to the numeric input pre-fills it with an auto-rolled result and enables CONFIRM immediately. Consistent with the built-in 🎲 already present in `DiceInput` for all 2D6 player roll steps (attack roll, critical location, reactions, crew actions, initiative).

### Fixed

- **Ship profiles (defaultProfiles.js)** — hull formula corrected to `tonnage / 2.5` (MgT2e RAW); all 5 default profiles were using ~tonnage/9. Armor, jump, sensors, and cargo aligned to CRB/HG: Free Trader hull 22→80 armor 0→2 jump 2→1, Scout hull 11→40 armor 0→4 sensors Civilian→Military, Light Fighter hull 2→4 sensors Civilian→Improved, Patrol Cruiser hull 44→160, Far Trader hull 22→80 armor 0→2.
- **Ship catalog (shipCatalog.js)** — sourcePage corrected for all 7 small craft entries to match actual HG 2022 PDF page numbers (pp.139–144). Cargo/fuel corrected per stat blocks: Empress Marava cargo 70→57 fuel 40→41, A2 Hero cargo 73→65 fuel 40→41, Free Trader A cargo 82→81 fuel 20→21, SDB TL15 cargo 15→22, description "240-missile magazine" → "144-missile magazine".

### Fixed (continued)

- **BasicBattleView destroyed ship card** — `ShipCard` now renders at 40% opacity with a red border and ☠ WRECK badge when `isDestroyed`; critical hits hidden on wreck. Combat actions were already blocked via the shared `ContextMenu.jsx`.

### Tests

- 672 tests (unchanged)

---

## [1.10.0] — 2026-06-07

### Added

- **Movement animation** — ship and missile tokens slide smoothly from their start position to their destination during the Movement phase (~600 ms, easeInOut). Canvas pointer events are disabled during the animation to prevent mis-clicks. Animation state lives in `uiStore.movementAnimation` (transient, never autosaved). `undo`/`redo` clear the animation immediately to avoid stale start positions.

### Tests

- 672 tests (+4) — `uiStore`: `startMovementAnimation` (sets positions, startTime, duration), custom duration, `clearMovementAnimation`, overwrite behaviour.

---

## [1.9.5] — 2026-06-05

### Added

- **Missile token rotation** — `drawMissileToken` now applies `computeShipRotation(missile.vector)` via `ctx.save/translate/rotate/restore`; the three missile silhouettes face the velocity direction, consistent with ship token behaviour. Count label and thrust arc remain in canvas-space (unrotated).

### Fixed

- **Autosave** — `extractBattleSnapshot` and the IndexedDB restore block were missing `dogfights`, `boardings`, and `rangeBands`; a basic mode session reloaded from autosave would reset all range bands to Very Long and lose active dogfight/boarding state. JSON file export (`exportBattleState`) was already complete.
- **Field manual version** — bumped header from 1.9.3 to 1.9.4 to match `package.json`.

### Docs

- `doc/field-manual.md` §3.2: BasicBattleView — ship cards by faction, DISTANCES panel, ▼/▲ quick controls, right-click background, Very Long default placement
- `doc/field-manual.md` §7.3: BasicManoeuvreModal — Approach/Flee, thrust sliders, bidirectional approach, APPLY MANOEUVRE vs GM SET, thrust cost table (CRB p.161)
- `doc/field-manual.md` §8: note that manoeuvre declarations happen in the Acceleration phase (not Movement)
- `HelpScreen.jsx`: BASIC MODE VIEW sub-section under Map Controls; MANOEUVRE (BASIC MODE) sub-section under Acceleration

### Tests

- 668 tests (+2) — autosave: `dogfights`, `boardings`, `rangeBands` included in snapshot; restore from IndexedDB restores all three fields

---

## [1.9.4] — 2026-06-05

### Added

- **Basic combat mode — range band tracking** — `rangeBands: Record<string, string>` in `battleStore`; cross-faction pairs initialised at `'Very Long'` on `addShip`; cleaned up on `removeShip`; key = `[id1, id2].sort().join('_')` (order-independent)
- **`setRangeBand(id1, id2, band)`** — GM direct override, no thrust cost
- **`applyBasicMovement(movingId, targetId, direction, movingThrust, targetThrust)`** — spends thrust, shifts band by 1; `approach` sums both ships' thrust; `flee` uses moving ship only
- **`BasicManoeuvreModal`** — new modal for acceleration phase in basic mode: approach/flee direction, thrust sliders, cost bar showing band change, GM SET override button
- **DISTANCES section in `BasicBattleView`** — `RangeBandRow` per tracked pair with ▼/▲ GM controls
- **`RANGE_BAND_ORDER`** and **`RANGE_BAND_MOVE_COST`** exported from `data/rangeBands.js` (CRB p.161)
- **Context menu** — `🧭 Manovra…` entry visible in `acceleration` phase + `combatMode === 'basic'`

### Fixed

- **`getEvasiveDM`** — formula corrected to `−pilotSkill` (fixed, CRB p.171); was incorrectly `−pilotSkill × evasiveThrust`
- **`advancePhase`** — basic mode now skips only `movement`; `acceleration` is preserved for range band changes

### Changed

- **`AttackModal`** — in basic mode with a tracked range band, the manual band selector is hidden; stored band shown read-only; CONFIRM disabled if no band tracked
- **`useAttackSetup`** — exposes `storedBand`; range band falls back chain: storedBand → manualRangeBand → 'Medium'

### Tests

- 666 tests (+22 from 644) — `getEvasiveDM` tests corrected; 18 new basic mode tests in `battleStore.test.js`: `addShip` range init, `removeShip` cleanup, `setRangeBand` (including commutativity), `applyBasicMovement` (approach, flee, clamp, thrust deduction, bidirectional, flee ignores target), `advancePhase` skips movement

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
