# Thrust & Drift — Field Manual

**Version 1.7.1** · Mongoose Traveller 2e Space Combat Simulator

---

## Table of Contents

1. [Overview](#1-overview)
2. [Dashboard](#2-dashboard)
3. [Map Controls](#3-map-controls)
4. [Phase Flow](#4-phase-flow)
5. [Setup Phase](#5-setup-phase)
6. [Initiative Phase](#6-initiative-phase)
7. [Acceleration Phase](#7-acceleration-phase)
8. [Movement Phase](#8-movement-phase)
9. [Attack Phase](#9-attack-phase) — includes §9.5 per-turret limit, §9.6 missile launch
10. [Actions Phase — Crew](#10-actions-phase--crew)
11. [Crew System](#11-crew-system)
12. [Undo / Redo](#12-undo--redo)
13. [Save & Resume](#13-save--resume)
14. [Dogfight](#14-dogfight)
15. [Boarding](#15-boarding)

---

## 1. Overview

**Thrust & Drift** is a browser-based Virtual Tabletop (VTT) tool for running
Mongoose Traveller 2nd Edition space combat at the gaming table.
It is GM-operated and designed for shared-screen play — one person drives,
everyone watches.

Two combat modes are available:

| Mode | Description |
| --------- | ----------- |
| **VECTORIAL** | Full hex grid with velocity vectors. Ships move according to their accumulated velocity each round. Implements *Traveller Companion 2024* pp. 169–186. |
| **BASIC** | Simplified range-band system. No hex map, no vectors. Faster for small engagements. |

> **Note:** The mode is selected on the Dashboard before starting a session
> and cannot be changed mid-battle.

---

## 2. Dashboard

The Dashboard is the pre-battle lobby. It has two columns:
the **Operations Console** on the left and **Ship Profiles** on the right.

### 2.1 Ship Profiles

The right panel lists all saved ship profiles.

| Control | Action |
| ------- | ------ |
| **+ NEW PROFILE** | Create a new ship from scratch. |
| **✎ Edit** | Modify an existing profile. |
| **⧉ Duplicate** | Clone a profile as a starting point. |
| **⊗ Delete** | Remove a profile (confirmation required). |
| **↓ IMPORT** | Load profiles from a `.json` file. |
| **↑ EXPORT** | Save all current profiles to a `.json` file. |
| **📖 CATALOG** | Browse the built-in High Guard 2022 catalog and add ships to your profiles. |

### 2.2 Operations Console

| Control | Action |
| ------- | ------ |
| **COMBAT MODE** | Toggle between Vectorial and Basic before starting. |
| **↺ RESUME** | Appears when an autosaved session is found. Click to restore instantly. The right panel shows the full saved roster (round, phase, ships by faction with hull bars). |
| **✕** | Clears the autosave from IndexedDB. Appears next to ↺ RESUME. |
| **▶ NEW SESSION** | Clears any existing battle state and enters the combat map. |
| **↓ RESUME FROM FILE** | Load a previously saved `.json` session. A preview screen shows the full roster before you confirm. |
| **📖 FIELD MANUAL** | Opens this manual inside the app. |

### 2.3 Ship Profile Form

Each profile stores the ship's stats and named crew members.

| Field | Description |
| ----- | ----------- |
| **Name / Tonnage** | Display name and hull size (affects target size DM). |
| **Hull / Thrust** | Max hull points and base manoeuvre drive rating. |
| **Turrets** | Add weapon turrets: type, damage dice, range band, and special traits. |
| **Crew** | Named crew members, each with individual skill levels (see [§ 11](#11-crew-system)). |

---

## 3. Map Controls

The battle map is a **flat-top hex grid**. All interaction is mouse-driven.

| Input | Action |
| ----- | ------ |
| **Left-drag** | Pan the map. |
| **Scroll wheel** | Zoom in / out. |
| **Double-click** | Centre the map on that hex. |
| **Left-click token** | Select the ship (highlights it). |
| **Right-click hex** | Open context menu — actions depend on the hex content and the current phase. |

> **Note:** Context menu actions are phase-gated **and initiative-gated**.
> Only options valid for the current phase are shown — and in the Acceleration,
> Attack, and Actions phases, combat actions are shown only for the ship whose
> turn it currently is. Right-clicking another ship shows "Not this ship's turn".

### 3.1 Legend

Click **📖 Legend** (fixed button, top-right of the battle screen) to open the visual reference panel. Also accessible via right-click any **empty hex** → **Legend**.

| Category | Symbols |
| -------- | ------- |
| **Tokens** | Player ship (cyan), enemy ship (red), neutral (grey), missile salvo (yellow — count + thrust shown) |
| **Beam weapons** | Pulse Laser (sky blue), Beam Laser (blue), Particle Beam (purple), Railgun (orange) |
| **Hit effects** | Impact burst (expanding sparks on target), Critical flash (red ring + label) |
| **Movement effects** | Thrust plume (amber triangle opposite delta-v), Missile launch (ring + sparks), Missile trail (dashed orange line) |
| **Persistent indicators** | Sensor lock (dashed cyan line + ring on target), Evasive aura (pulsing blue ring), Dogfight (⚔ + red ring), Missile exhausted (×) |

---

## 4. Phase Flow

Each combat round follows this sequence. The HUD (top-left) shows the current
round and phase. Click **NEXT PHASE ⟶** to advance.

| Phase | What happens |
| ----- | ------------ |
| **SETUP** | Place ships on the map via right-click → *Add ship here*. |
| **INITIATIVE** | Roll initiative for all ships. Sets the acting order for the round. |
| **ACCELERATION** | Each ship applies thrust and optionally declares evasive action. |
| **MOVEMENT** | All ships move simultaneously according to their velocity vectors. *(Vectorial mode only — skipped in Basic mode.)* |
| **ATTACK** | Each ship in initiative order may attack or launch missiles. |
| **ACTIONS** | Each ship in initiative order may perform one crew action. |
| **END OF ROUND** | Round counter increments. Click NEXT PHASE to begin the next round. |

---

## 5. Setup Phase

Place ships on the hex grid before the battle begins.

### 5.1 Adding a Ship

Right-click any empty hex → **Add ship here**. A modal opens where you select:

- **Profile** — which saved ship profile to use.
- **Faction** — Players, Allies, Enemies, Neutral. Affects token colour and
  auto-roll behaviour.
- **Color** — token display colour.

### 5.2 Removing a Ship

Right-click a ship token → **Remove from battle**. Available in all phases.

> **Note:** Ships start with zero velocity. Their first Acceleration phase is
> used to build up speed.

---

## 6. Initiative Phase

Initiative determines the acting order for the Acceleration, Attack, and
Actions phases.

**Formula:** `2D6 + Pilot skill + current Thrust rating + Tactics effect`
*(MgT2e CRB p. 160)*

### 6.1 Rolling Initiative

Right-click any hex → **Roll Initiative**. The modal shows all ships.

| Ship type | Behaviour |
| --------- | --------- |
| **Player ships** (`faction = players`) | Dice inputs start **empty**. Enter the result of your physical 2D6 roll. The total updates live. CONFIRM is disabled until all player ships have entered dice. |
| **NPC ships** | Auto-rolled on confirm. Shown as *🎲 auto* in the modal. |
| **🎲 button** | Opt-in auto-roll — fills the dice fields for that ship if the player prefers the app to roll. |

### 6.2 Tactics Bonus

If the Captain performs a Tactics check in the Actions phase of the previous
round, the Effect is carried forward as a DM to the next round's initiative
roll. The modal has a field to enter this bonus before rolling.

> The Phase Tracker (right side of screen) shows the initiative order with the
> current actor highlighted.

---

## 7. Acceleration Phase

Each ship in initiative order adjusts its velocity vector and optionally
declares evasive action.

### 7.1 Applying Thrust

Right-click ship → **Apply Thrust**.

The Thrust Modal shows the current velocity vector and a hex direction pad.
Enter a delta-V (Δq / Δr) or click the direction buttons. The total magnitude
of the delta cannot exceed the ship's available thrust
(base thrust minus any M-Drive critical hit penalties).

A **ghost token** on the map previews where the ship will be next round if it
maintains its current velocity after this thrust.

### 7.2 Evasive Action

Right-click ship → **Declare Evasion**. Allocate thrust points to evasion.
These points are deducted from the available thrust for movement.

**Evasive DM:** `−(Pilot skill × evasive thrust points)` *(MgT2e CRB p. 166)*

A **pulsing yellow aura** on the token indicates active evasion.

---

## 8. Movement Phase

*Vectorial mode only.* All ships move simultaneously — no player input required.

Click **NEXT PHASE ⟶** to execute movement. Each ship's position advances by
its current velocity vector.

### 8.1 Ships That Pass in the Night

If two hostile ships cross within **Short range (≤ 2 hexes)** during the same
movement step — even if their final positions are far apart — the system detects
the closest approach and opens the **Passing Encounter** window.

For each encounter the GM sees:

- Both ship names and faction colours
- Closest approach distance and range band
- **[Ship A] FIRES** / **[Ship B] FIRES** — opens the standard Attack Modal
  pre-set to that attacker; the GM can adjust weapon and target freely
- **PASS — LET THEM GO** — skips the opportunity with no attack

Multiple encounters are resolved sequentially; the window closes automatically
when all are dismissed.

> **Note:** Ships that end in the same hex trigger the **Dogfight** system
> instead and are handled at the movement → attack phase transition.

In Basic mode this phase is skipped automatically.

---

## 9. Attack Phase

Each ship in initiative order may make one attack or launch a missile salvo.

### 9.1 Attack Modal — Step 1: Config

Select the weapon to fire and the target ship. The modal shows a full DM
breakdown:

- Range band DM
- Gunner skill DM
- Evasive action DM
- Sensor lock DM
- Weapon trait DM
- Target size DM
- Aid Gunners DM

### 9.2 Attack Modal — Step 2: Roll

Target number is always **8+** *(MgT2e CRB p. 164)*.

| Attacker | Behaviour |
| -------- | --------- |
| **Player ships** | Dice inputs start empty. Enter your physical 2D6 roll. CONFIRM ROLL disabled until both dice are entered. |
| **NPC ships** | Auto-roll button. Click to roll. |

**Effect** = Total − 8. Positive effect = hit. Effect ≥ 6 = critical hit.

### 9.3 Attack Modal — Step 3: Damage

On a hit, roll damage dice for the weapon. Enter or confirm the damage roll.
Damage is applied to the target's hull.

### 9.4 Attack Modal — Step 4: Critical Hit

Triggered automatically when **Effect ≥ 6 AND damage penetrates armour**
*(MgT2e CRB p.168: "it causes damage rather than just bouncing off armour")*, or
when damage crosses a 10% hull threshold (Sustained Damage rule, *MgT2e CRB p. 169*).

> If the weapon's damage is fully absorbed by armour (`damage − armour ≤ 0`),
> no critical step opens even if the attack Effect is 6 or higher.

Visual effects (beam ray, impact burst, critical flash) all appear together
when the critical step closes, so they are visible on the canvas.

| Field | Description |
| ----- | ----------- |
| **Location** | 2D6 roll on the location table (Hull, M-Drive, J-Drive, Power Plant, Weapons, Sensors, Bridge, Fuel, Cargo, Crew, Computer). |
| **Severity** | Effect − 5, clamped 1–6. Stacks with existing criticals on the same system. |
| **M-Drive** | Sev 1 = no penalty. Sev 2–4 = −1 thrust/round. Sev 5–6 = thrust reduced to 0. |

### 9.5 Per-Turret Firing Limit

Each turret may fire **once per round** *(CRB p.164)*.

The Attack modal weapon list shows only turrets that have not yet fired this
round, identified by their slot number (`T1`, `T2`…). Once all offensive turrets
have fired, the **Attack…** option disappears from the context menu until the
next Attack phase or the start of a new round.

### 9.6 Launching Missiles

Missile Racks are selected directly in the Attack modal alongside other weapons.
Select the `Missile Rack` entry in the weapon list, then:

1. Select the **target** ship.
2. Adjust the **missile count** (1–12) using the `−` / `+` stepper.
3. Click **🚀 LAUNCH SALVO →** — no dice roll required.

The salvo spawns as a missile token on the map, inheriting the launching ship's
current velocity. Each round in the Movement phase it advances toward the target
using its remaining thrust. A **LAUNCH** burst animation plays on the launching
ship's hex.

> The launching turret is marked as fired. Missile Rack entries disappear from
> the Attack weapon list after launch, consistent with the per-turret limit.

### 9.7 Sensor Lock

Acquired via the Sensors crew action. Grants a +DM to attacks against the
locked target. Shown as an **animated cyan ring** on the locked ship.

### 9.8 Weapon Range Limits

Each weapon has a **maximum range band** beyond which it cannot fire
*(MgT2e CRB p. 167: "cannot attack targets beyond listed Range Band")*.

| Weapon | Max Range |
| ------ | --------- |
| Railgun | Short |
| Beam Laser | Medium |
| Pulse Laser | Long |
| Particle Barbette | Very Long |
| Particle Beam | Very Long |
| Missile Rack | Special (no cap) |
| Sandcaster | Special (no cap) |

When a target is beyond a weapon's max range:

- An **OUT OF RANGE** label appears on the weapon button in the Config step.
- If that weapon is selected, the error is shown above the roll button.
- **ROLL ATTACK is disabled** — the shot cannot proceed until a valid weapon
  or a closer target is chosen.

"Special" weapons (missiles, sandcasters) have no hard range cap and are
never blocked by this rule.

---

## 10. Actions Phase — Crew

Each **crew member** may perform one action per round *(MgT2e CRB p.171)*.
A ship with multiple crew members can use each of them once — the modal stays
open after each roll so the GM can chain actions until all crew have acted.

Right-click ship → **Crew Action**. Steps:

1. **Crew member** — only members who have not yet acted this round are listed.
   Already-used members are hidden until the next round.
2. **Action** — the list shows only actions that match the member's skills.
3. **Target** *(Sensor Lock only)* — select the ship to lock.
4. **Roll** — enter 2D6 for player ships; NPC ships have a 🎲 auto-roll button.

After the roll the modal shows the result (SUCCESS / FAILED + Effect).
Click **ANOTHER ACTION** to act with a second crew member, or **CLOSE** to exit.

### 10.1 Skill DM Override

When an action is selected, the relevant skill level is pre-filled as the roll
DM. The GM can override this value for specialisations
(e.g. Engineer(M-Drive) 3 vs. generic Engineer 2).
The **↺** button resets to the base skill level.

### 10.2 Available Actions

All checks are **2D6 + skill DM vs. 8+** unless marked Automatic.

| Role | Action | Difficulty | Effect on success |
| ---- | ------ | ---------- | ----------------- |
| **Captain** | **Improve Initiative** | 8+ (Leadership) | +Effect added to this ship's initiative roll next round *(CRB p.166)* |
| **Engineer** | **Overload M-Drive** | 8+ (Engineer) | +Effect Thrust available this round *(CRB p.167)* |
| **Engineer** | **Repair System** | 8+ (Engineer) | Removes 1 critical hit from this ship *(CRB p.167)* |
| **Gunner** | **Reload Turret** | Automatic | Reloads 1 missile turret; no roll required *(CRB p.167)* |
| **Sensors** | **Sensor Lock** | 8+ (Electronics) | +Effect DM to all attacks against the selected target *(CRB p.167)* |
| **Sensors** | **Electronic Warfare** | 8+ (Electronics) | Removes an enemy sensor lock from this ship *(CRB p.167)* |

> A skill level of 0 in a role grants **no actions** for that role.
> Skills with level ≥ 1 unlock the role's full action list.

> **NPC ships** resolve all non-automatic rolls automatically when the GM
> clicks 🎲 EXECUTE ACTION.

---

## 11. Crew System

Ships have a list of **named crew members**, each with individual skill ratings.

### 11.1 Skills

| Abbrev | Skill | Used for |
| ------ | ----- | -------- |
| **PLT** | Pilot | Initiative roll, evasion DM, dogfight/pursuit checks |
| **CPT** | Captain | Improve Initiative action |
| **ENG** | Engineer | Overload M-Drive action, Repair System action |
| **GNR** | Gunner | Attack DM, Reload Turret action |
| **SEN** | Sensors | Sensor Lock action, Electronic Warfare action |

Skill levels range from **0 to 5**.

### 11.2 Multi-Skill Members

One crew member can hold **multiple skills**. A solo pilot/gunner on a fighter
has both Pilot 2 and Gunner 2 on the same crew entry. The app resolves the
highest relevant skill for each action automatically.

### 11.3 Editing Crew

In the ship profile form, use **+ ADD CREW** to add a member and **⊗** to
remove one. Each row has a name field and five compact skill inputs (PLT / CPT
/ ENG / GNR / SEN).

> Legacy profiles using the old flat object format (`{pilot: 2, gunner: 1}`)
> are automatically migrated to the named array format when loaded in the form.

---

## 12. Undo / Redo

Every user action that changes game state pushes a snapshot to the undo stack
(capped at **20 entries**).

| Control | Action |
| ------- | ------ |
| **⟲ Undo** | Restore the previous state. Appears in HUD when stack is non-empty. Shortcut: `Ctrl+Z` / `Cmd+Z`. |
| **↷ Redo** | Re-apply an undone action. Appears in HUD when redo stack is non-empty. Shortcut: `Ctrl+Y` / `Cmd+Shift+Z`. |

Both buttons are hidden when their respective stacks are empty — they appear
only when relevant.

> The battle log is **not** rolled back on undo. Instead, a `↩ Undo` entry is
> appended to the log so the action history remains readable.

---

## 13. Save & Resume

### 13.1 Autosave

The app autosaves to IndexedDB after every significant action (ships
added/removed, damage applied, phase advanced, etc.). No manual trigger needed.

On next visit, the **↺ RESUME AUTOSAVE** button appears on the Dashboard with
round, phase, and ship count.

### 13.2 Manual Save

Click **💾 SAVE** in the HUD at any time to download the full session as a
`.json` file.

### 13.3 Resume from File

On the Dashboard, click **↓ RESUME FROM FILE** and select your saved `.json`
file. A preview screen shows the full roster (name, faction, hull, position)
before you confirm loading.

### 13.4 Profile Export / Import

Ship profiles are separate from battle sessions. Use **↑ EXPORT** and
**↓ IMPORT** in the profile panel to share or back up profiles independently.

> Clicking **⌂** in the HUD returns to the Dashboard. A confirmation modal
> warns that unsaved battle data will be lost — save first if you need to
> resume.

---

---

## 14. Dogfight

> MgT2e CRB p.138 — Vehicle Combat / Dogfighting rules adapted for space combat.

### 14.1 What is a Dogfight?

A **dogfight** is a close-range sub-system that activates automatically when two
or more ships from different factions end the **Movement phase in the same hex**
(vectorial mode only).

Standard combat is suspended for the involved ships. Instead, the round
subdivides into **6 micro-rounds** of 6 seconds each — one full standard round
equals six micro-rounds of dogfight.

### 14.2 Engagement

When the app detects a potential dogfight at the end of Movement, the
**CONFIRM INTENTS** modal opens.

For each ship the GM declares:

| Intent | Outcome |
| ------ | ------- |
| **Both YES** | Dogfight activates immediately |
| **Both NO** | Ships treated as Short Range (distance 1) — no dogfight |
| **Mixed** | Pursuit check required (see §14.3) |

### 14.3 Pursuit Check

Formula: **2D6 + Pilot + Tonnage DM + free Thrust**

- **Free Thrust** = profile thrust − thrust used this round
- **Tonnage DM**: <50t → 0; 50–99t → −1; 100–199t → −2; +−1 per 100t above 100

If the pursuer's total exceeds the evader's total → dogfight activates.
Otherwise → Short Range, no dogfight.

Enter dice manually for each side. The app computes and compares totals live.

### 14.4 Micro-Round Flow

Open the round from the **HUD dogfight tracker** (⚔ DOGFIGHT panel, top-left).

#### Step 1 — Declare escape (optional)

At the start of each micro-round the GM may declare that a ship wants to flee.

- If its thrust exceeds all enemy thrusts → **auto-escape**, no check needed.
- If enemies choose not to pursue → **auto-escape** (toggle "NOT PURSUING").
- Otherwise → pursuit check (same formula as §14.3).

#### Step 2 — Pilot check

Each remaining ship rolls **2D6 + Pilot + Tonnage DM + Thrust + previous round bonus**.

| DM | Source |
| -- | ------ |
| Pilot skill | `getCrewSkill(crew, 'pilot')` |
| Tonnage DM | See §14.3 table |
| Thrust | Profile thrust − thrust used this round |
| Extra enemies | −(number of enemy ships − 1) when outnumbered |
| Round bonus | Previous round winner's margin carries forward as a +DM |

#### Step 3 — Result

| Outcome | Effect |
| ------- | ------ |
| Winner | **+2 DM** to all attacks this micro-round; chooses enemy fire arc |
| Loser | **−2 DM** to all attacks |
| Tie | Fixed weapons cannot fire; turrets OK; no positional DM |

Apply the attack DMs shown in the modal when opening the **Attack** panel.

#### Step 4 — Advance

Click **ADVANCE → MICRO-ROUND N+1/6**. After micro-round 6 the dogfight ends
automatically and all ships return to normal combat flow.

### 14.5 Token Visuals

Ships in a dogfight display:

- **Pulsing amber ring** around the token
- **⚔ badge** top-right of the token
- Ghost position and velocity arrow are hidden (no movement during dogfight)

### 14.6 Escape Mid-Dogfight

Escape can be declared at the start of any micro-round (Step 1 above).
Conditions:

```text
Auto-escape:  ship.thrust > max(enemy thrusts)
              OR enemies choose not to pursue
Check:        2D6 + Pilot + Tonnage DM + free Thrust  (same as §14.3)
              evader total > pursuer total → escaped
```

On successful escape `inDogfight` is cleared; the ship re-enters normal combat
from the next standard round.

---

## 15. Boarding

> HG 2022 pp.125–135 — full 4-phase boarding system.

Boarding is a sub-system that activates when an attacker moves adjacent to a target and meets the thrust requirement. Combat shifts from the hex map to the interior of the target ship.

### 15.1 Triggering a Boarding Action

Right-click the **attacker ship** and select **⚔ Board [target name]…**

The option is visible only when:

```text
distance(attacker, target) ≤ 1  (Adjacent or Close)
AND attacker.thrust ≥ target.thrust
    OR target M-Drive critical is disabled
AND different factions
```

The **Boarding Setup** modal opens. Select the target and confirm. The boarding moves immediately to Phase 2 — Contact.

### 15.2 Phase 1 — Approach

> Handled outside the app. The approach phase is the normal combat movement that brought the two ships together. The GM declares the boarding when conditions are met.

**Voluntary boarding** (target cooperates): skip to Contact immediately.

**Forced boarding**: if the target attempted to flee and failed (or is immobilised), proceed to Contact.

### 15.3 Phase 2 — Contact

The **⚔ CONTACT** modal opens. The GM selects the entry method:

| Method | Check | Difficulty | Time | DM |
| -------- | ------- | ------------ | ------ | ---- |
| Airlock (cooperative) | None | — | Instant | — |
| Airlock (forced) | Mechanic (STR) | 14+ | 2D rounds + 1D | — |
| Maintenance Hatch | Mechanic (STR) | 12+ | 2D rounds | — ⚠ |
| Breaching Tube | None | — | < 2 min | — |
| Forced Linkage Apparatus | Pilot (DEX) | 8+ | Immediate | +2 |
| Hull Cut | Mechanic (DEX) | 8+/round | Per round | — ⚠ |

⚠ = decompression risk if compartment not evacuated.

**Modifiers:**

- **↻ Tumbling** — defender rotating the ship: DM −1 to all Contact checks
- **🔗 Forced Linkage** — DM +2 to all Contact checks; defender cannot manoeuvre

**Hull Cut tracker:** select component (Hatch / Airlock / Hull) and cutting tool, roll each round. Damage reduces component Resilience; breach achieved when damage ≥ breach threshold.

When entry is secured, click **ADVANCE TO CONFLICT →**.

### 15.4 Phase 3 — Conflict

The **⚔ CONFLICT** modal tracks the boarding fight.

**Tactical objectives** — check each when captured:

| Objective | Effect when captured |
| ----------- | --------------------- |
| **Bridge** | Remote control of all ship systems disabled for enemy |
| **Engineering** | Propulsion, reactor, life support under attacker control |
| **Turrets** | Weapon systems under attacker control |

The ship is considered taken when all three objectives are captured.

**Combat tools:**

- **ROLL STACKING** — roll 2D ≥ 10 to target a combatant beyond the first in a corridor (HG p.131)
- **ROLL MISSED SHOT** — roll 2D on the missed-shot table for every attack that misses; optional **Armored bulkhead (DM −1)** toggle

**Weapon DM in tight spaces:** Rifles −2 · Heavy weapons −4 · Grenades → automatic 6D+

When the fight is resolved, click **END CONFLICT — ADVANCE TO SECURITY →**.

### 15.5 Phase 4 — Security

The **⚔ SECURITY — BOARDING OUTCOME** modal resolves the action.

| Outcome | Effect |
| --------- | -------- |
| **Attacker wins** | Boarding party controls the ship; optional faction transfer |
| **Defender repels** | Boarders eliminated, captured, or driven off |
| **Ship destroyed** | Target destroyed by internal damage during conflict |

If **Attacker wins** and faction transfer is enabled, the captured ship's faction changes to match the attacker. Enemy crew is removed from the roster.

Click **CONFIRM OUTCOME** to close the boarding.

### 15.6 HUD Indicator

While a boarding is active, the HUD shows a **⚔ BOARDING** badge below the standard tracker:

```text
⚔ BOARDING   [Attacker] → [Defender]   CONTACT →
```

Click the phase button to reopen the relevant modal at any time.

### 15.7 Boarding and Normal Combat

- Ships **inBoarding** do not participate in the standard Attack phase
- A ship with **Forced Linkage active** cannot use thrust to manoeuvre
- If the target is destroyed during Conflict, resolve with outcome **Ship destroyed**
- Normal rounds continue in parallel — the GM can advance phases and resolve the boarding on its own timeline, as with dogfights

---

*The Traveller game in all forms is owned by Mongoose Publishing.
Copyright 1977–2025 Mongoose Publishing. Non-commercial use only.*
