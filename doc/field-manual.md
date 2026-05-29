# Thrust & Drift — Field Manual

**Version 1.3.9** · Mongoose Traveller 2e Space Combat Simulator

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
9. [Attack Phase](#9-attack-phase)
10. [Actions Phase — Crew](#10-actions-phase--crew)
11. [Crew System](#11-crew-system)
12. [Undo / Redo](#12-undo--redo)
13. [Save & Resume](#13-save--resume)

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
| **↺ RESUME AUTOSAVE** | Appears when an autosaved session is found. Shows round, phase, ship count, and timestamp. Click to restore instantly. |
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

> **Note:** Context menu actions are phase-gated. Only options valid for the
> current phase are shown. You cannot apply thrust during the Attack phase,
> for example.

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

> In Basic mode this phase is skipped automatically.

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

Triggered automatically when Effect ≥ 6, or when damage crosses a 10% hull
threshold (Sustained Damage rule, *MgT2e CRB p. 169*).

| Field | Description |
| ----- | ----------- |
| **Location** | 2D6 roll on the location table (Hull, M-Drive, J-Drive, Power Plant, Weapons, Sensors, Bridge, Fuel, Cargo, Crew, Computer). |
| **Severity** | Effect − 5, clamped 1–6. Stacks with existing criticals on the same system. |
| **M-Drive** | Sev 1 = no penalty. Sev 2–4 = −1 thrust/round. Sev 5–6 = thrust reduced to 0. |

### 9.5 Launching Missiles

Right-click ship → **Launch Missiles** (Attack phase only). Select weapon and
target. The missile salvo spawns as a token inheriting the launcher's velocity.
Each round in the Movement phase it advances toward the target using its
remaining thrust.

### 9.6 Sensor Lock

Acquired via the Sensors crew action. Grants a +DM to attacks against the
locked target. Shown as an **animated cyan ring** on the locked ship.

---

## 10. Actions Phase — Crew

Each ship in initiative order may perform one crew action.

Right-click ship → **Crew Action**. The modal has three steps:

1. **Pick a crew member** — only members with relevant skills are shown.
2. **Pick an action** — filtered to the member's skill set.
3. **Roll** — if required (see below).

### 10.1 Skill DM Override

When an action is selected, the relevant skill level is pre-filled as the roll
DM. The GM can override this value for specialisations
(e.g. Engineer(M-Drive) 3 vs. generic Engineer 2).
The **↺** button resets to the base skill level.

### 10.2 Available Actions by Role

#### Captain

| Action | Effect |
| ------ | ------ |
| **TACTICS** | 2D6 + Leadership; Effect carried as initiative DM next round. |
| **INSPIRE** | Morale boost (descriptive, no roll). |
| **COORDINATE** | Aid another crew member's next action. |

#### Engineer

| Action | Effect |
| ------ | ------ |
| **OVERLOAD DRIVE** | Push thrust beyond rated maximum for one round (risk of damage). |
| **REPAIR SYSTEM** | Attempt to repair a critical hit on a specific system. |
| **DAMAGE CONTROL** | Reduce hull damage. |

#### Gunner

| Action | Effect |
| ------ | ------ |
| **RELOAD** | Reload a weapon that requires it. |
| **AID GUNNERS** | Provide a DM bonus to the next attack roll. |

#### Sensors Operator

| Action | Effect |
| ------ | ------ |
| **SENSOR LOCK** | Electronics(sensors) check; grants attack DM vs. locked target. |
| **ELECTRONIC WARFARE** | Attempt to break an enemy sensor lock. |

> **Note:** Auto actions (some Captain actions) resolve immediately without a
> dice roll. Others require a 2D6 check. Player ships show dice input fields;
> NPC ships auto-roll.

---

## 11. Crew System

Ships have a list of **named crew members**, each with individual skill ratings.

### 11.1 Skills

| Abbrev | Skill | Used for |
| ------ | ----- | -------- |
| **PLT** | Pilot | Initiative, evasion, thrust checks |
| **CPT** | Captain | Tactics, inspire, coordinate actions |
| **ENG** | Engineer | Drive overload, repair, damage control |
| **GNR** | Gunner | Attack DM, reload, aid gunners |
| **SEN** | Sensors | Sensor lock, electronic warfare |

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

*The Traveller game in all forms is owned by Mongoose Publishing.
Copyright 1977–2025 Mongoose Publishing. Non-commercial use only.*
