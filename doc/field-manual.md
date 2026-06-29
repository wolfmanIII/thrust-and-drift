# Thrust & Drift — Field Manual

**Version 2.2.0** · Mongoose Traveller 2e Space Combat Simulator

---

## Table of Contents

1. [Overview](#1-overview)
2. [Dashboard](#2-dashboard)
3. [Map Controls](#3-map-controls)
4. [Phase Flow](#4-phase-flow)
5. [Setup Phase](#5-setup-phase)
6. [Initiative Phase](#6-initiative-phase)
7. [Acceleration Phase](#7-acceleration-phase)
8. [Movement Phase](#8-movement-phase) — includes §8.1 missile impact, §8.2 ships that pass in the night
9. [Attack Phase](#9-attack-phase) — includes §9.5 per-slot firing limit, §9.6 missile launch, §9.9 reactions, §9.10 special weapon mechanics, §9.11 point defence active intercept
10. [Actions Phase — Crew](#10-actions-phase--crew)
11. [Crew System](#11-crew-system)
12. [Undo / Redo](#12-undo--redo)
13. [Save & Resume](#13-save--resume)
14. [Dogfight](#14-dogfight)
15. [Boarding](#15-boarding)
16. [Obstacles *(optional)*](#16-obstacles-optional) — includes §16.1 enable, §16.2 placing, §16.3 asteroid/debris field, §16.4 gravity well, §16.5 nebula

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
| **🔄 RESUME** | Appears when an autosaved session is found. Click to restore instantly. The right panel shows the full saved roster (round, phase, ships by faction with hull bars). |
| **✕** | Clears the autosave from IndexedDB. Appears next to 🔄 RESUME. |
| **▶ NEW SESSION** | Clears any existing battle state and enters the combat map. |
| **↓ RESUME FROM FILE** | Load a previously saved `.json` session. A preview screen shows the full roster before you confirm. |
| **📖 FIELD MANUAL** | Opens this manual inside the app. |
| **📋 CHANGELOG** | Opens the in-app version history (all releases with change categories). |

### 2.3 Ship Profile Form

Each profile stores the ship's stats and named crew members.

| Field | Description |
| ----- | ----------- |
| **Name / Tonnage** | Display name and hull size (affects target size DM). |
| **Hull / Thrust** | Max hull points and base manoeuvre drive rating. |
| **Tech Level (TL)** | Ship's technology level (default **12**). Gates Smart guidance on all missile and torpedo weapons — the DM+2 Smart bonus applies only when the *launching* ship's TL ≥ 9 *(CRB p.79)*. Set to 8 or below for pre-stellar opponents or salvaged/primitive vessels. Most standard Traveller-era ships are TL 12–15. |
| **Weapons** | Add weapon slots: type, damage dice, range band, and special traits. Maximum 3 weapons per slot (triple turret, CRB p.163). |
| **Crew** | Named crew members, each with individual skill levels (see [§ 11](#11-crew-system)). |

> **Design note — why TL on the ship, not the weapon:** CRB p.79 states that Smart munitions require a *fire control system* at TL9+ to guide them. All missile and torpedo weapons already carry the `Smart` trait in the weapon table — this correctly represents the *munition*'s capability. The TL field on the ship represents whether the vessel's targeting computer can actually exploit that capability. Separating the two avoids silent incorrect DMs when early-TL or pirate vessels appear alongside standard Imperial fleet ships.

---

## 3. Map Controls

The battle map is a **flat-top hex grid**. All interaction is mouse-driven.

| Input | Action |
| ----- | ------ |
| **Left-drag** | Pan the map. |
| **Scroll wheel** | Zoom in / out. |
| **Double-click** | Centre the map on that hex. |
| **Left-click token** | Select the ship (highlights it). Range band rings appear centred on the selected ship (see below). |
| **Right-click hex** | Open context menu — actions depend on the hex content and the current phase. |
| **🔊/🔇 (HUD)** | Audio toggle — enables or mutes procedural sound effects (laser fire, impacts, thrust plume, missile launch). No audio files required. |

> **Note:** Context menu actions are phase-gated **and initiative-gated**.
> Only options valid for the current phase are shown — and in the Acceleration,
> Attack, and Actions phases, combat actions are shown only for the ship whose
> turn it currently is. Right-clicking another ship shows "Not this ship's turn".

### 3.1 Legend

Click **📖 Legend** (fixed button, top-right of the battle screen) to open the visual reference panel. Also accessible via right-click any **empty hex** → **Legend**. The adjacent **?** button opens this Field Manual as an in-app overlay.

| Category | Symbols |
| -------- | ------- |
| **Tokens** | Ship silhouette (6 shapes: delta, needle, freighter, gunship, cruiser, capital — each rotates to face velocity direction); HP arc (green/yellow/red); missile salvo (three staggered yellow silhouettes — rotates to face velocity direction; count + thrust arc shown; hover for launcher/target/thrust tooltip); torpedo (red/amber silhouette — separate salvo type) |
| **Turret beams** | Pulse Laser (sky blue), Beam Laser (blue), Particle Beam (purple), Railgun (orange), Fusion Gun (amber-white), Plasma Gun (magenta) |
| **Barbette beams** | Pulse Laser Barbette (sky blue, thicker), Beam Laser Barbette (blue, thicker), Particle Barbette (purple, thicker), Fusion Barbette (amber-white, thicker), Plasma Barbette (magenta, thicker), Railgun Barbette (orange, thicker) — all barbettes deal ×3 damage after armour |
| **Hit effects** | Impact burst (expanding sparks on target), Critical flash (red ring + label), Ion burst (blue ring — Ion weapon hit) |
| **Movement effects** | Thrust plume (amber triangle opposite delta-v), Missile launch (ring + sparks), Missile trail (dashed orange line) |
| **Persistent indicators** | Sensor lock (dashed cyan line + ring on target), Evasive aura (pulsing blue ring), Dogfight (⚔️ + red ring), Missile exhausted (×), Ion aura (pulsing blue ring, while ionRoundsLeft > 0), **Range band rings** (dashed cyan hexagons — SHORT / MEDIUM / LONG / VERY LONG boundaries — shown when a ship is selected; hidden during thrust targeting), **Current actor ring** (pulsing cyan ring — shown on the token of the ship whose turn it is during Acceleration, Attack, and Actions phases) |
| **Obstacle zones** | Asteroid Field (dashed amber border; `AST` light / `AST-D` dense at centre hex); Debris Field (dashed gray-blue border; `DEB`); Gravity Well (solid purple zone, filled purple circle at centre — dashed orange warning ring at radius + 1); Nebula (dashed cyan border; `NEB`). Type label coloured like the zone border; custom label appended if set. *(vectorial mode — obstacles enabled only)* |

### 3.2 Hex Scale

One hex represents **648 km** *(Traveller Companion 2024, p.171)*.

Range band thresholds on the vectorial map:

| Band | Threshold | Approx. distance |
| ---- | --------- | ---------------- |
| Short | ≤ 2 hex | ≤ 1,296 km |
| Medium | ≤ 15 hex | ≤ 9,720 km |
| Long | ≤ 38 hex | ≤ 24,624 km |
| Very Long | ≤ 77 hex | ≤ 49,896 km |
| Distant | > 77 hex | > 49,896 km |

### 3.3 Basic Mode View

In **Basic** mode there is no hex map. The screen shows **ship bento cards** grouped
by faction.

Each card has three zones:

| Zone | Content |
| ---- | ------- |
| **Header** | Ship name · faction colour dot · status badges: `☠ WRECK`, `DOGFIGHT`, `BOARDING`, `EVA N` (evasive thrust), `LOCKED` (sensor locked), `ION NR` (ion disruption active — blue) |
| **Hull** | Hull bar (green → yellow → red) · "Hull N/M" · "Ini N" |
| **Status** *(conditional)* | Sensor lock → target name (with DM if set); Locked by [attacker]; inbound missiles per launcher (⚡ N× type, ~Xr ETA in basic mode); inbound torpedoes; launched missiles per target (🚀 N× type, ~Xr ETA in basic mode); reloading turrets; critical hits list; missile ammo (🚀 N/max, yellow < 25%, red at 0); sand canisters (🪨 N/max, yellow < 25%, red at 0); ion disruption (`−N PWR · Xr remaining`; `OFFLINE` label when `currentPower` reaches 0) |

The Status zone is hidden when none of these conditions are active.

| Element | Description |
| ------- | ----------- |
| **DISTANCES panel** | Appears above the ship list. Lists every cross-faction pair with its current range band. Use **⬇** (closer) / **⬆** (further) to adjust a band directly — GM override, no thrust spent. |

Right-click anywhere in the background (not on a card) to open the global
context menu (Roll Initiative, Add ship here).

Ships are placed at **Very Long** range by default when added to a basic mode
session.

---

## 4. Phase Flow

Each combat round follows this sequence. The HUD (top-left) shows the current
round and phase. Click **NEXT PHASE ⟶** to advance.

| Phase | What happens |
| ----- | ------------ |
| **SETUP** | Place ships on the map via right-click → *Add ship here*. |
| **INITIATIVE** | Roll initiative for all ships. Sets the acting order for the round. |
| **ACCELERATION** | Each ship applies thrust to its velocity vector. |
| **MOVEMENT** | All ships move simultaneously according to their velocity vectors. *(Vectorial mode only — skipped in Basic mode.)* |
| **ATTACK** | Each ship in initiative order may attack or launch missiles. |
| **ACTIONS** | Each ship in initiative order; each crew member may perform one action. |
| **END OF ROUND** | Round counter increments. Click NEXT PHASE to begin the next round. |

### 4.1 Phase Advance Guards

**NEXT PHASE ⟶** enforces preconditions before allowing advancement:

| Phase | Guard | Blocked message |
| ----- | ----- | --------------- |
| **All phases** | No unresolved missile impacts (`pendingMissileImpacts` empty) | *Resolve all pending missile impacts first. Use the ↩ button in the Battle Log to re-open a dismissed impact.* |
| **Setup** | At least 1 ship must be placed | *Place at least one ship first.* |
| **Initiative** | Initiative must have been rolled (`initiativeOrder` non-empty) | *Roll initiative before advancing.* |
| **Acceleration / Attack / Actions** | All ships in initiative order must have acted (`currentActorIndex ≥ initiativeOrder.length`) | *N actor(s) still to act.* |
| **Movement / End** | Always allowed (unless missile impacts pending — see above) | — |

When blocked, the button turns dim (`cursor-not-allowed`) and clicking it shows an amber warning below the button. The warning clears automatically once the condition is satisfied.

---

## 5. Setup Phase

Place ships on the hex grid before the battle begins.

### 5.1 Adding a Ship

Right-click any empty hex → **Add ship here**. A modal opens where you select:

- **Profile** — which saved ship profile to use.
- **Faction** — Players, Allies, Enemies, Neutral. Affects token colour and
  auto-roll behaviour.
- **Color** — token display colour.
- **Shape** — token silhouette: Delta, Needle, Freighter, Gunship, Cruiser, or Capital. Each shape has a distinct hull outline and bridge/cockpit detail overlay. The choice is per-placement and does not affect game mechanics.
- **Initial vector (Δq / Δr)** *(vectorial mode only)* — Pre-set the ship's starting velocity vector. Default is 0 / 0 (stationary). Use this for ships arriving at cruise speed, fleeing, or intercepting at the start of an engagement.

After placing, right-click the ship token → **Assign Crew…** to review or
adjust which crew member covers each role and turret (see [§ 11.3](#113-crew-role-assignments)).

### 5.2 Removing a Ship

Right-click a ship token → **Remove from battle**. Available in all phases.

### 5.3 Enabling Obstacles *(vectorial mode only)*

The HUD shows an **OBSTACLES** toggle during the Setup phase when vectorial combat
mode is active. Off by default. Once the battle advances past Setup, the toggle is
locked for the rest of the battle.

See [§ 16](#16-obstacles-optional) for full obstacle mechanics.

> **Note:** Ships start with zero velocity. Their first Acceleration phase is
> used to build up speed.

---

## 6. Initiative Phase

Initiative determines the acting order for the Acceleration, Attack, and
Actions phases.

**Formula:** `2D6 + Pilot skill + current Thrust rating + Tactics effect`
*(MgT2e CRB p. 160)*

**Initiative is rolled once** at the start of combat *(CRB p.160)*. From round 2 onward the initiative order is carried over and the phase advances directly to Acceleration — no re-roll.

> **RAW gap — new ship joining mid-battle:** the CRB has no explicit rule for this case. Thrust & Drift applies a house rule: adding a ship mid-battle flags the next round to open the Initiative phase, so all ships re-roll together and the new ship is included. GM may bypass this by using ↺ (see below) or by simply noting the new ship acts last until the next re-roll.

> **GM override:** a **↺** button appears next to the phase label in the HUD during the Acceleration phase of round 2+. Click it to force an initiative re-roll for the current round — useful to include a new ship, or any time the GM decides a re-roll is appropriate.

### 6.1 Rolling Initiative

Right-click any hex → **Roll Initiative**. The modal shows all ships.

| Ship type | Behaviour |
| --------- | --------- |
| **Player ships** (`faction = players`) | Dice inputs start **empty**. Enter the result of your physical 2D6 roll. The total updates live. CONFIRM is disabled until all player ships have entered dice. |
| **NPC ships** | Auto-rolled on confirm. Shown as *🎲 auto* in the modal. |
| **🎲 button** | Opt-in auto-roll — fills the dice fields for that ship if the player prefers the app to roll. |

### 6.1.1 Tactics(Naval) Check (optional)

If the captain has **Tactics ≥ 1**, an optional secondary dice row appears under the initiative row. The captain may roll 2D6 + Tactics — the Effect (total − 8, can be negative) is added to the initiative total. This check is optional; leaving it blank applies no bonus.

NPC ships with Tactics > 0 auto-roll their Tactics check on confirm.

### 6.2 Initiative Bonus

If the Captain uses **Improve Initiative** in the Actions phase of round N,
the bonus takes effect at the **start of round N+1**: `buildNextRoundState`
adds it to the ship's initiative value and re-sorts the acting order before
anyone acts. The bonus lasts exactly one round and is removed automatically at
the start of round N+2. No manual input required. *(CRB p.166)*

> The Phase Tracker shows an **↑ini** amber badge on ships whose bonus is
> active in the current round.

> **Click a ship name** in the Phase Tracker to pan the map and center on that token. Useful when tracking multiple ships across a large hex grid.

---

## 7. Acceleration Phase

Each ship adjusts its velocity vector and optionally declares evasive action.

**Initiative order depends on combat mode:**

- **Vectorial:** ships act in *reverse* initiative order — lowest first — so higher-initiative ships can react to slower ships' declared vectors *(TC p.174)*.
- **Basic:** ships act in normal initiative order — highest first — same as the Attack and Actions steps *(CRB p.164)*.

### 7.1 Applying Thrust

Right-click ship → **Apply Thrust**. The map enters **targeting mode**:

1. **Move the cursor** toward the hex you want the thrust to point at.
   A dashed line stretches from the ship to the clamped thrust endpoint.
2. **Read the overlay**:
   - Dashed line colour: **cyan** when within budget, **orange** when at cap.
   - Circle marks the thrust endpoint (ship position + delta).
   - Ghost token shows next-round position (`ship.pos + ship.vector + delta`).
   - Faint line from the inertial ghost (no thrust) to the new ghost.
   - Badge `cost / max` below the ghost.
3. **Click** to confirm. The thrust delta is applied and targeting mode exits.
4. **ESC** (or right-click) to cancel without applying thrust.

The available thrust (`thrustAvailable`) equals base thrust + any engineer
bonus − thrust already used this round − M-Drive critical penalty.

### 7.2 Note

Full thrust is available for movement. Evasive Action is a **Reaction** declared
during the Attack phase — not pre-allocated here *(CRB p.171)*.
See §9.9 Reactions below.

### 7.3 Manoeuvre (Basic Mode)

In Basic mode, **Apply Thrust** is replaced by **Manoeuvre…** in the context menu.
Right-click a ship → **Manoeuvre…** during the Acceleration phase.

The modal contributes thrust toward a range band change between the moving ship and a
selected enemy. Each ship acts independently on its own initiative turn.

| Control | Description |
| ------- | ----------- |
| **Target** | Select which enemy ship this manoeuvre targets. Pool status shown per target. |
| **⬇ Approach / ⬆ Flee** | Direction of movement (positive or negative contribution to the pool). |
| **Thrust slider** | Thrust this ship commits this action (0 → available thrust). Any amount ≥ 1 is valid. |
| **APPLY MANOEUVRE** | Threshold met — band shifts and thrust is spent. |
| **ALLOCATE THRUST** | Threshold not yet met — thrust is spent and added to the pool; band stays. |
| **GM SET** | Override: sets the band directly without spending any thrust; resets the pool. Use this for initial setup and narrative jumps. |

**Thrust accumulates** across rounds and across both ships *(CRB p.166)*: each
contribution is added to a shared pool for the pair. When the pool reaches the threshold
the band advances and excess carries to the next step.

> If both ships approach on the same round (each using the modal on their own turn),
> their contributions are summed in the pool — the band may advance in a single round
> or over two combined contributions.

The cost per band step *(MgT2e CRB p.166 — Ship Movement table)*:

| Current band | Thrust required | Example |
| ------------ | --------------- | ------- |
| Adjacent | 1 | Docked ships |
| Short | 2 | Ships in same orbital path |
| Medium | 5 | Surface to orbit |
| Long | 10 | Near to a planet |
| Very Long | 25 | Within jump limit |
| Distant | 50 | Distant ships |

> Ships at Very Long (25) or Distant (50) cannot close the band in a single round
> unless they have very high thrust. Contributions accumulate across multiple rounds.
> Use **GM SET** for initial placement to avoid stranding small ships at extreme ranges.

---

## 8. Movement Phase

*Vectorial mode only.* **Fully automatic — no player input required.**

Click **NEXT PHASE ⟶** to execute movement. The app:

1. **Animates** every token sliding from its current position to its new position (~2 s, easeInOut). Input is blocked during the animation to prevent mis-clicks.
2. Advances every ship's position by its current velocity vector.
3. Detects hostile ships whose trajectories crossed within **Short range (≤ 2 hexes)** — opens the **Passing Encounter** window for each.
4. Detects ships that end in the same hex — opens the **Dogfight** engagement intent modal.

The GM watches the tokens move on the map. If no encounters or dogfights are
triggered, the phase advances to **Attack** automatically.

> **Wrecks drift.** A destroyed ship (☠ WRECK) has no pilot and no reactor — it cannot spend thrust — but it retains its last velocity vector. Each Movement phase it continues to drift on that vector indefinitely, following Newtonian inertia. Remove it manually via right-click → *Remove from battle* when no longer relevant to the scenario.

### 8.1 Missile Impact

When a missile salvo reaches its target, the token is consumed and a **⚡ MISSILE IMPACT** modal opens. Resolution follows CRB p.173 (IMPACT) in two steps.

**Vectorial mode:** impact is detected during the Movement phase when the salvo reaches the target hex.

**Basic mode:** the Movement phase is skipped, but missiles still advance. Each round transition, every in-flight salvo spends up to **Thrust 10** guidance budget against the Ship Movement cost table *(CRB p.166)*. Excess carries to the next band. When the salvo reaches **Adjacent** range the modal opens at the start of the following round. Bento cards show **~Xr** (estimated rounds to impact) next to each salvo row.

#### Point Defence (optional, resolved before Step 1)

If the target has at least one **unfired laser turret** (Pulse Laser or Beam Laser), the GM may roll Point Defence *(CRB p.173)* before the attack roll.

| DM | Source |
| -- | ------ |
| +Gunner skill | Assigned gunner for that turret slot |
| +1 per laser beyond the first | DM+1 for 2 lasers on one slot; DM+2 for 3 lasers |

Roll 2D6 + total DM against **8+**. Effect = total − 8. `max(0, Effect)` missiles are destroyed. The turret slot is marked fired immediately.

- **Multiple turrets:** if more than one eligible slot is available, a selector appears. Select a slot, roll; repeat with remaining slots.
- **Player targets:** enter dice manually. NPC targets auto-roll.
- If all missiles are destroyed (count reaches 0), the impact is dismissed immediately — no attack roll.
- The salvo size DM in Step 1 reflects the **remaining count** after PD.

#### Step 1 — Attack Roll

The attack roll happens at impact, not at launch *(CRB p.173)*.

| DM | Source |
| -- | ------ |
| +1 per missile | Salvo size (e.g. 3 missiles → DM+3) |
| +2 | Smart trait — all missile/torpedo weapons carry this; active only when **launcher TL ≥ 9** *(CRB p.79)*. If the launcher is sub-TL9, the +2 is not applied and the modal shows the reason. |
| −Pilot skill | Evasive Action *(optional, see below)* |

Roll 2D6 + total DM against **8+**. Effect = total − 8.

- **Effect < 0** — MISS: modal closes, no damage applied.
- **Effect ≥ 0** — HIT: proceed to Step 2.

**Evasive Action** (CRB p.171): if the target has unspent thrust, the GM may click **🛡 EVASIVE ACTION** before entering the dice. This spends 1 thrust from the target's pool and applies DM −Pilot to this attack roll only. If no thrust is available, the button is disabled.

#### Step 2 — Damage

Roll **4D6** (Missile) or **6D6** (Torpedo) for a **single** missile/torpedo — not for the whole salvo.

Formula *(CRB p.173)*:

```text
net damage = max(0, roll − armour) × min(Effect, count)
```

The modal shows a full breakdown: roll / −armour / per-missile net / ×multiplier / total.

- **APPLY DAMAGE** — deducts net damage from target hull, triggers threshold criticals if applicable, logs the hit.
- **MISS / INTERCEPTED — DISMISS** — closes without applying damage (e.g. all missiles were destroyed by Point Defence before movement).

Multiple salvos impacting in the same round are resolved sequentially; the pending count is shown in the modal header. An impact sound plays when the modal opens.

#### Recovery

If the impact modal is accidentally dismissed before resolving, it can be re-opened at any time from the **Battle Log**: find the `⚡ MISSILE IMPACT` entry and click the amber **↩** button at the right of the row. The impact is re-queued and the modal re-opens.

While any impact is pending, the HUD shows a pulsing `⚡ N impacts unresolved` badge above the **NEXT PHASE ⟶** button, and phase advance is blocked until all impacts are resolved (see §4.1).

### 8.2 Ships That Pass in the Night

If two hostile ships cross within **Short range (≤ 2 hexes)** during the same
movement step — even if their final positions are far apart — the system detects
the closest approach and opens the **Passing Encounter** window.

For each encounter the GM sees:

- Both ship names and faction colours
- Closest approach distance and range band
- **[Ship A] FIRES** — opens the Attack Modal pre-set to Ship A; button shows **✅ FIRED** after resolving
- **[Ship B] FIRES** — opens the Attack Modal pre-set to Ship B; button shows **✅ FIRED** after resolving
- **PASS — LET THEM GO** — dismisses the encounter immediately with no attack for either ship

**Initiative order applies** (TC p.177): attacks resolve at the initiative of the ship that fires first. The GM decides which ship acts first by clicking the corresponding **FIRES** button — the second ship's button remains locked until the first attack is resolved. The second ship fires only if it survives the first ship's attack; if destroyed, the Passing Encounter window closes automatically.

Both ships may fire independently. The encounter window closes automatically once both have either fired or the GM passes. Multiple encounters are resolved sequentially.

> **Note:** Ships that end in the same hex trigger the **Dogfight** system
> instead and are handled at the movement → attack phase transition.

In Basic mode this phase is skipped automatically — range band changes are
declared during the **Acceleration phase** via the Manoeuvre modal (§7.3).

---

## 9. Attack Phase

Each ship in initiative order may make one attack or launch a missile salvo.

### 9.1 Attack Modal — Step 1: Config

Select the weapon to fire and the target ship. The modal shows a full DM
breakdown:

- Gunner skill DM
- Weapon trait DM
- Range band DM
- Target size DM
- Evasion DM *(shown only when active)*
- Sensor Lock DM *(shown only when active)*

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
| **Armour** | Automated reduction applied immediately. Sev 1: −1 (no roll). Sev 2: roll 1D6, reduction = ⌈result/2⌉ (D3). Sev 3–4: roll 1D6. Sev 5–6: roll 2D6 + GM applies Hull +1 Severity manually. The app prompts for the dice roll where required and updates `profile.armor` in the store. |

**Manual effects:** criticals to Sensors, Fuel Tank, Weapons, Bridge, and Power Plant produce a narrative description that the GM must apply at the table. The modal displays a `⚠ MANUAL — Apply this effect before closing` amber banner to remind the GM that no automated change has occurred in the store.

### 9.5 Per-Slot Firing Limit

Each weapon slot may fire **once per round** *(CRB p.164)*.

The Attack modal weapon list shows only slots that have not yet fired this
round, identified by their slot number (`W1`, `W2`…). Once all offensive slots
have fired, the **Attack…** option disappears from the context menu until the
next Attack phase or the start of a new round.

The Ship Detail modal labels each slot's mount type based on how many weapons it contains: **Single Turret** (1 weapon), **Double Turret** (2 weapons), **Triple Turret** (3 weapons). This is cosmetic — it does not affect attack mechanics.

### 9.6 Launching Missiles

Three launcher types are available. All are selected in the Attack modal weapon list.
No dice roll is required at launch — the weapon slot is immediately marked as fired.

#### Missile Rack *(CRB p.162)*

Select `Missile Rack`, choose a target, adjust the salvo count using the `−` / `+`
stepper (maximum capped at remaining magazine — **12 missiles per Rack**), then
click **🚀 LAUNCH SALVO →**. The button shows **🚨 NO AMMO** and is disabled when the
magazine is empty.

Missiles have **Thrust 10** and **10 rounds of guided flight**. Each round in the
Movement phase they apply up to Thrust 10 toward the target's predicted position.
After fuel is exhausted the salvo drifts on its last vector.

Damage: **4D6 per missile** *(HG p.28)*.

#### Missile Barbette *(HG p.29)*

Launches a **fixed 5-missile salvo** — the count is not adjustable. Total magazine:
**25 missiles** (5 salvos). Uses the same guided-flight system as the Missile Rack.

Damage: **4D6 per missile** (same as Rack — barbette ×3 multiplier does **not** apply
to missile weapons; the Smart trait drives the fixed salvo size instead).

#### Torpedo *(HG p.30–31)*

Torpedoes are larger, slower-burning guided munitions. Each barbette holds **3
torpedoes**. Select `Torpedo` and fire — salvos may contain 1–3 torpedoes.

Torpedoes use the same guided-flight system as missiles. A torpedo token is
rendered in red/amber on the map, separate from missile salvos.

Damage: **6D6 per torpedo** (vs 4D6 per missile) *(HG p.31)*.

> The launching weapon slot is marked as fired after any launch. Launcher entries
> disappear from the Attack weapon list once ammo is empty, consistent with the
> per-slot firing limit.

### 9.7 Sensor Lock

Acquired via the Sensors crew action. Grants a +DM to attacks against the
locked target. Shown as an **animated cyan ring** on the locked ship.

### 9.8 Weapon Range Limits

Each weapon has a **maximum range band** beyond which it cannot fire
*(MgT2e CRB p. 167: "cannot attack targets beyond listed Range Band")*.

| Weapon | Type | Max Range |
| ------ | ---- | --------- |
| Railgun | Turret | Short |
| Railgun Barbette | Barbette | Medium |
| Beam Laser | Turret | Medium |
| Beam Laser Barbette | Barbette | Medium |
| Fusion Gun | Turret | Medium |
| Fusion Barbette | Barbette | Medium |
| Plasma Gun | Turret | Medium |
| Plasma Barbette | Barbette | Medium |
| Ion Cannon | Barbette | Medium |
| Ion Cannon Bay (Small) | Bay | Medium |
| Ion Cannon Bay (Medium) | Bay | Medium |
| Ion Cannon Bay (Large) | Bay | Long |
| Pulse Laser | Turret | Long |
| Pulse Laser Barbette | Barbette | Long |
| Particle Beam | Turret | Very Long |
| Particle Barbette | Barbette | Very Long |
| Missile Rack | Launcher | Special (no cap) |
| Missile Barbette | Launcher | Special (no cap) |
| Torpedo | Launcher | Special (no cap) |
| Sandcaster | Defensive | Special (no cap) |

When a target is beyond a weapon's max range:

- An **OUT OF RANGE** label appears on the weapon button in the Config step.
- If that weapon is selected, the error is shown above the roll button.
- **ROLL ATTACK is disabled** — the shot cannot proceed until a valid weapon
  or a closer target is chosen.

"Special" weapons (missiles, sandcasters) have no hard range cap and are
never blocked by this rule.

### 9.9 Reactions

Reactions are declared by the **defender** during the Attack phase, just before
the attack roll *(MgT2e CRB p.171)*. The app shows a **🛡 Reactions** panel
in the Attack Config step as soon as a weapon and target are selected.

Each point of unspent Thrust (after movement) can be used once as a reaction.
Reactions accumulate across attacks in the same round — a pulsing amber aura
on the token shows when a ship has used reactions this round.

| Reaction | Availability | Mechanic |
| -------- | ------------ | -------- |
| **Evasive Action** | All attacks | Toggle button: spend **1 thrust** to dodge this attack. The attack suffers **DM −Pilot skill** (fixed — not multiplied). *(CRB p.171)* |
| **Disperse Sand** | Laser (Pulse/Beam) attacks only; target must have an unfired sandcaster slot | Gunner (turret) check 2D6 + Gunner. On success: +1D+Effect added to armour for this attack only. Slot marked fired immediately. |

> **Point Defence** for missile salvos is resolved in the **Missile Impact modal** (§8.1), not here. The Reactions panel is not shown for missile attacks.

### 9.10 Special Weapon Mechanics

#### AP (Armour Piercing) Trait

Some weapons carry an `AP N` trait that reduces effective armour before damage.

Formula: `effectiveArmour = max(0, profile.armour − apReduction)`

| Weapon | AP Value |
| ------ | -------- |
| Railgun | 4 |
| Fusion Barbette | 3 |
| Plasma Barbette | 2 |
| Railgun Barbette | 5 |

#### Barbette Damage Multiplier *(HG p.29)*

All barbette weapons apply a **×3 damage multiplier** after armour is subtracted.

Formula: `netDamage = max(0, roll + Effect − effectiveArmour) × 3`

> The multiplier applies to the net hull damage — a roll fully absorbed by armour
> deals zero damage regardless of the ×3. Missile and torpedo barbettes are
> excluded: their damage is per-projectile and uses the Smart trait salvo mechanic.

#### Ion Weapons *(HG p.30–33, FAQ HG 2022 p.1)*

Ion weapons do **not** deal hull damage. A successful hit temporarily reduces the
target's **Power** — disrupting thrust, computers, and critical systems.

**Mounts and damage:**

| Weapon | Mount | Damage formula | Max Range |
| ------ | ----- | -------------- | --------- |
| Ion Cannon | Barbette | 2D × 10 | Medium |
| Ion Cannon Bay (Small) | Bay | 6D × 10 | Medium |
| Ion Cannon Bay (Medium) | Bay | 8D × 20 | Medium |
| Ion Cannon Bay (Large) | Bay | 10D × 100 | Long |

> **Naming and scope note:** HG contains two separate combat systems. *Standard space combat* (HG pp.28–86, CRB) covers tactical ship-vs-ship engagements tracked hex by hex — the system T&D implements. *Fleet Combat* (HG pp.104–124) is an abstracted ruleset for large-scale fleet engagements where ships become simplified stat blocks and weapons are aggregated. Ion weapons appear in both with different names and entirely different mechanics:
>
> | | Standard space combat (T&D scope) | Fleet Combat (out of scope) |
> | - | --------------------------------- | --------------------------- |
> | Barbette name | **Ion Cannon** (HG p.30) | *Ion Barbette* (HG p.112) |
> | Bay names | **Ion Cannon Bay** S/M/L (HG p.32–33) | *Small/Medium/Large Ion Bay* (HG p.112) |
> | Damage system | Power reduction (this section) | effect-per-weapon × count ÷ Hull Points → Ion Damage table |
> | Power stat | Yes — `currentPower`, `basePower` | No |
> | Thrust formula | `floor(baseThrust × currentPower / maxPower)` | Reduce Thrust by fixed value from table |
>
> Fleet Combat mechanics are out of scope for T&D. "Ion Cannon" and "Ion Cannon Bay" are the correct canonical names for standard space combat.

**Mechanics:**

| Outcome | Effect |
| ------- | ------ |
| Hit (any Effect) | Roll NbD, multiply by damageMultiple → deduct from target Power for 1 round |
| Hit, Effect ≥ 6 | Duration extends to D3 rounds |

Ion weapons **ignore armour**. Multiple Ion hits on the same target stack additively
(`ionPowerReduction += newDamage`); duration takes the longer of the two.

**Power → Thrust mapping** (T&D design decision — RAW does not specify the formula):

```text
effectiveThrust = floor(baseThrust × currentPower / maxPower)
thrustAvailable = max(0, effectiveThrust + bonusThisRound − thrustUsed − mDrivePenalty − reactionThrust)
```

Example: Thrust 4, maxPower 100, Ion hit for 70 Power → currentPower 30 → effectiveThrust 1.

**Computer bandwidth** *(FAQ HG 2022 p.1)*: the same Power reduction amount is also
deducted from the target's computer bandwidth. While `currentBandwidth ≤ 0` and
`baseBandwidth > 0`, all attack rolls suffer **DM-2** (displayed as COMMS DOWN).

**Hardened computers** (`/fib` designation): ships with `hardened: true` in their
profile are **immune** to Ion weapons — the attack roll is made normally but no
Power or bandwidth is deducted.

**Duration:** reduction persists until `ionRoundsLeft` ticks down to 0 *and* one
additional round boundary passes. Power and bandwidth restore to base values at
that point.

While active, the target's token shows a **pulsing blue aura**; the bento card shows
an **ION NR** badge and a status row (`⚡ ION NR — −X PWR · COMMS DOWN` when depleted).

### 9.11 Point Defence — Active Intercept

In addition to the defensive Point Defence **reaction** (§9.9), a ship with
unfired laser turrets may use its Attack phase turn to actively intercept an
enemy missile salvo currently in flight — without waiting for the salvo to
arrive at its target.

**Procedure:**

1. Right-click the active ship → **Attack**.
2. In the Attack Config step, select a **Pulse Laser** or **Beam Laser** turret.
3. Under *TARGET*, switch from a ship to an **enemy in-flight salvo** — the
   dropdown lists all hostile salvos currently in the `missiles` array.
4. Click **INTERCEPT** (replaces the PROCEED button when a missile salvo is
   targeted).
5. The **Point Defence — Active Intercept** step opens:
   - Roll 2D6 + Gunner skill + laser turret bonus
     (DM+1 for 2-laser turret, DM+2 for 3-laser turret).
   - Effect (min 0) = number of missiles destroyed from the salvo.
   - If `count − Effect ≤ 0`, the salvo is removed entirely.
6. The firing turret is marked used; the result is logged in the Battle Log.

> This action costs the attacker's full Attack turn for that turret. The
> turret cannot be used again in the same round (for attack or PD reaction).
> There is no restriction on which faction the salvo belongs to — a ship may
> intercept salvos targeting allies.

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
   **Target Salvo** *(EW — Counter Missile only)* — select the in-flight salvo to jam.
4. **Roll** — enter 2D6 for player ships; NPC ships have a 🎲 auto-roll button.

After the roll the modal shows the result (SUCCESS / FAILED + Effect).
Click **ANOTHER ACTION** to act with a second crew member, or **CLOSE** to exit.

### 10.1 Skill DM Override

When an action is selected, the relevant skill level is pre-filled as the roll
DM. The GM can override this value for specialisations
(e.g. Engineer(M-Drive) 3 vs. generic Engineer 2).
The **🔄** button resets to the base skill level.

### 10.2 Available Actions

All checks are **2D6 + skill DM vs. 8+** unless marked Automatic.

| Role | Action | Difficulty | Effect on success |
| ---- | ------ | ---------- | ----------------- |
| **Pilot** | **Aid Gunners** | 8+ (Pilot) | Starts a task chain with gunners *(CRB p.63, p.166)*. The Pilot check Effect maps to a DM applied to **all** gunner attack rolls this round: Effect 0 → DM+1, Effect 1–5 → DM+2, Effect 6+ → DM+3. Failure applies a negative DM: Effect −1 → DM−1, Effect −2/−5 → DM−2, Effect −6 or less → DM−3. Resets each round. |
| **Captain** | **Improve Initiative** | 8+ (Leadership) | +Effect added to this ship's initiative at the start of next round (lasts 1 round) *(CRB p.166)* |
| **Engineer** | **Overload M-Drive** | 8+ (Engineer) | +Effect Thrust available this round *(CRB p.167)* |
| **Engineer** | **Repair System** | Average 8+ (Sev 1–2) / Difficult 10+ (Sev 3–4) / Very Difficult 12+ (Sev 5–6) (Engineer) | Removes 1 critical hit from this ship. The GM selects which critical to repair when multiple are present *(CRB p.167)* |
| **Gunner** | **Reload Turret** | Automatic | Reloads 1 missile turret; no roll required *(CRB p.167)* |
| **Sensors** | **Sensor Lock** | 8+ (Electronics) | DM+2 flat to all attacks against the selected target *(CRB p.172)* |
| **Sensors** | **Electronic Warfare** | 8+ (Electronics) | Removes an enemy sensor lock from this ship *(CRB p.167)* |
| **Sensors** | **EW — Counter Missile** | 10+ (Electronics) | Removes **Effect** missiles (min 1) from one in-flight salvo. Targets **both** salvos still in transit (`missiles` array) and those awaiting impact resolution (`⚡ impact` badge). Cumulative across rounds; a salvo may only be EW'd once per round *(CRB p.173)* |

> A skill level of 0 in a role grants **no actions** for that role.
> Skills with level ≥ 1 unlock the role's full action list.
>
> **Ion Power = 0:** when a ship's `currentPower` reaches 0, sensor actions
> (Sensor Lock, Electronic Warfare, EW — Counter Missile) are disabled in the
> Actions modal with a `⚡ power offline` label. All offensive weapons are
> simultaneously removed from the Attack modal weapon list. *(HG p.30)*
>
> **NPC ships** resolve all non-automatic rolls automatically when the GM
> clicks 🎲 EXECUTE ACTION.

---

## 11. Crew System

Ships have a list of **named crew members**, each with individual skill ratings.

### 11.1 Skills

| Abbrev | Skill | Used for |
| ------ | ----- | -------- |
| **PLT** | Pilot | Initiative roll, evasion DM, dogfight/pursuit checks, Aid Gunners action |
| **LDR** | Leadership | Improve Initiative action (Actions phase) |
| **TAC** | Tactics | Initiative DM at start of battle (Initiative phase) |
| **ENG** | Engineer | Overload M-Drive action, Repair System action |
| **GNR** | Gunner | Attack DM, Reload Turret action |
| **SEN** | Sensors | Sensor Lock action, Electronic Warfare action, EW — Counter Missile action |

Skill levels range from **0 to 5**.

### 11.2 Multi-Skill Members

One crew member can hold **multiple skills**. A solo pilot/gunner on a fighter
has both Pilot 2 and Gunner 2 on the same crew entry.

### 11.3 Crew Role Assignments

Before battle, each role slot must be filled by an assigned crew member.
Roles are **optional** — an unassigned role contributes **0 skill** (no bonus).

Right-click any ship token → **Assign Crew…** to open the assignment modal.

#### Using the Assign Crew modal

The modal is divided into two sections:

**Roles** — one dropdown per non-gunner role:

| Slot | Dropdown label |
| ---- | -------------- |
| Pilot | `Pilot` |
| Leadership | `Leadership (LDR)` |
| Tactics | `Tactics (TAC)` |
| Engineer | `Engineer` |
| Sensors | `Sensors` |

**Gunners** — one dropdown per turret slot (T1, T2…), with the weapon names
listed next to the slot label.

Each dropdown lists all named crew members. The relevant skill level is shown
in brackets — e.g. `Mira Vasquez [pilot 1]` or `Joko Hendrik [no skill]`.
Select `— unassigned —` to leave the slot empty.

Buttons:

- **AUTO-ASSIGN** — assigns the crew member with the highest relevant skill to each role and turret slot automatically. A single crew member can cover multiple roles (e.g., solo-pilot light fighter). Use as a starting point, then adjust manually if needed.
- **CLEAR ALL** — resets every slot to unassigned.
- **SAVE ASSIGNMENTS** — commits the selection to the ship and closes the modal.

> If the ship profile has no named crew, the modal shows
> *"No named crew on this ship. Add crew members in the profile editor."*

#### Effect of unassigned roles

| Role slot | Effect if unassigned |
| --------- | -------------------- |
| Pilot | Initiative roll, evasion DM, dogfight use skill 0 |
| Leadership | Improve Initiative action not available |
| Tactics | No Tactics(naval) check at initiative |
| Engineer | Engineer actions use skill 0 |
| Gunner (T1, T2…) | That turret **cannot fire** this session |
| Sensors | Sensors actions use skill 0 |

A crew member can be assigned to multiple slots (e.g., the same person as both
Pilot and Gunner T1 on a light fighter).

When a ship is placed on the map the app auto-assigns the best-skilled member
per role as a starting point. The GM can adjust at any time before or during
combat.

> **NPC ships** without explicit crew assignments fall back to the highest skill
> across all crew members (backward-compatible behaviour preserved).

### 11.4 Editing Crew

In the ship profile form, use **+ ADD CREW** to add a member and **✕** to
remove one. Each row has a name field and compact skill inputs.

Default profiles (Free Trader, Scout, Patrol Cruiser…) and catalog ships
(High Guard 2022 catalog) come with pre-generated crew — names and skill levels
chosen as a reasonable starting point. **These are fully editable**: open the
profile in the Dashboard → **✎ Edit** → **Crew Manifest** to rename members,
adjust skill levels, add specialists, or remove crew that doesn't fit the
scenario. Changes take effect the next time the ship is placed in battle.

> **Example:** Replace *Cass Oduya (Gunner 1)* on the Free Trader with your
> player character's name and actual Gunner skill before the session starts.
>
> Legacy profiles using the old flat object format (`{pilot: 2, gunner: 1}`)
> are automatically migrated to the named array format when loaded in the form.

---

## 12. Undo / Redo

Every user action that changes game state pushes a snapshot to the undo stack
(capped at **20 entries**).

| Control | Action |
| ------- | ------ |
| **↩️ Undo** | Restore the previous state. Appears in HUD when stack is non-empty. Shortcut: `Ctrl+Z` / `Cmd+Z`. |
| **↪️ Redo** | Re-apply an undone action. Appears in HUD when redo stack is non-empty. Shortcut: `Ctrl+Y` / `Cmd+Shift+Z`. |

Both buttons are hidden when their respective stacks are empty — they appear
only when relevant.

> The battle log is **not** rolled back on undo. Instead, a `↩️ Undo` entry is
> appended to the log so the action history remains readable.

The Battle Log panel sits at the bottom-left of the screen. Click **▲ BATTLE LOG** to expand it; click **▼** to collapse. When expanded, a drag handle (thin bar at the top of the panel) lets you resize it by dragging upward. Height ranges from 80 px to 600 px and is remembered for the session.

---

## 13. Save & Resume

### 13.1 Autosave

The app autosaves to IndexedDB after every significant action (ships
added/removed, damage applied, phase advanced, etc.). No manual trigger needed.
Persisted fields include ships, missiles, initiative order, range bands, the
basic-mode thrust accumulation pool (`basicBandPool`), and the full battle log.

On next visit, the **🔄 RESUME AUTOSAVE** button appears on the Dashboard with
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

> Clicking **🏠** in the HUD returns to the Dashboard. A confirmation modal
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

Open the round from the **HUD dogfight tracker** (⚔️ DOGFIGHT panel, top-left).

#### Step 1 — Declare escape (optional)

At the start of each micro-round the GM may declare that a ship wants to flee.

- If its thrust exceeds all enemy thrusts → **auto-escape**, no check needed.
- If enemies choose not to pursue → **auto-escape** (toggle "NOT PURSUING").
- Otherwise → pursuit check (same formula as §14.3).

#### Step 2 — Pilot check

Each remaining ship rolls **2D6 + Pilot + Tonnage DM + Thrust + DEX DM + previous round bonus**.

| DM | Source |
| -- | ------ |
| Pilot skill | `getCrewSkill(crew, 'pilot')` |
| Tonnage DM | See §14.3 table |
| Thrust | Profile thrust − thrust used this round |
| DEX DM | Pilot's DEX characteristic modifier (set in ship profile, −3 to +3) |
| Extra enemies | −(number of enemy ships − 1) when outnumbered |
| Round bonus | Previous round winner's margin carries forward as a +DM |

#### Step 3 — Result

| Outcome | Effect |
| ------- | ------ |
| Winner | **+2 DM** to all attacks this micro-round; chooses enemy fire arc |
| Loser | **−2 DM** to all attacks |
| Tie | Fixed weapons cannot fire; turrets OK; no positional DM |

> **App automation:** the dogfight result DM (+2/−2/0) is **pre-filled automatically** in the Attack modal when the attacker is in a dogfight. On a tied round, barbettes and bay-mounted weapons are removed from the weapon list and a warning banner appears — the app enforces the fixed-weapon restriction.

#### Step 4 — Advance

Click **ADVANCE → MICRO-ROUND N+1/6**. After micro-round 6 the dogfight ends
automatically and all ships return to normal combat flow.

### 14.5 Token Visuals

Ships in a dogfight display:

- **Pulsing amber ring** around the token
- **⚔️ badge** top-right of the token
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

> **Technical reference:** [dogfight-system-design.md](dogfight-system-design.md)

---

## 15. Boarding

> HG 2022 pp.125–135 — full 4-phase boarding system.

Boarding is a sub-system that activates when an attacker moves adjacent to a target and meets the thrust requirement. Combat shifts from the hex map to the interior of the target ship.

### 15.1 Triggering a Boarding Action

Right-click the **attacker ship** and select **⚔️ Board [target name]…**

The option is visible only when:

```text
distance(attacker, target) ≤ 1  (Adjacent or Close)
AND target.inDogfight === null  (target not in an active dogfight)
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

The **⚔️ CONTACT** modal opens. The GM selects the entry method:

| Method | Check | Difficulty | Time | DM |
| -------- | ------- | ------------ | ------ | ---- |
| Airlock (cooperative) | None | — | Instant | — |
| Airlock (forced) | Mechanic (STR) | 14+ | 2D rounds + 1D | — |
| Maintenance Hatch | Mechanic (STR) | 12+ | 2D rounds | — 🚨 |
| Breaching Tube | None | — | < 2 min | — |
| Forced Linkage Apparatus | Pilot (DEX) | 8+ | Immediate | +2 |
| Hull Cut | Mechanic (DEX) | 8+/round | Per round | — 🚨 |

🚨 = decompression risk if compartment not evacuated.

**Modifiers:**

- **🌀 Tumbling** — defender rotating the ship: DM −1 to all Contact checks. Click **🌀 TUMBLING** in the Contact modal to initiate: roll Pilot (DEX) Routine (6+); if successful, select the D3 result (1–3 rounds) — the app tracks the countdown and clears tumbling automatically. *(HG p.127)*
- **🔗 Forced Linkage** — DM +2 to all Contact checks; defender cannot manoeuvre

**Hull Cut tracker:** select component (Hatch / Airlock / Hull) and cutting tool, roll each round. Damage reduces component Resilience; breach achieved when damage ≥ breach threshold.

When entry is secured, click **ADVANCE TO CONFLICT →**.

### 15.4 Phase 3 — Conflict

The **⚔️ CONFLICT** modal tracks the boarding fight.

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

The **⚔️ SECURITY — BOARDING OUTCOME** modal resolves the action.

| Outcome | Effect |
| --------- | -------- |
| **Attacker wins** | Boarding party controls the ship; optional faction transfer |
| **Defender repels** | Boarders eliminated, captured, or driven off |
| **Ship destroyed** | Target destroyed by internal damage during conflict |

If **Attacker wins** and faction transfer is enabled, the captured ship's faction changes to match the attacker. Enemy crew is removed from the roster.

Click **CONFIRM OUTCOME** to close the boarding.

### 15.6 HUD Indicator

While a boarding is active, the HUD shows a **⚔️ BOARDING** badge below the standard tracker:

```text
⚔️ BOARDING   [Attacker] → [Defender]   CONTACT →
```

Click the phase button to reopen the relevant modal at any time.

### 15.7 Boarding and Normal Combat

- Ships **inBoarding** do not participate in the standard Attack phase
- A ship in an active **dogfight** cannot be targeted for boarding — it must exit the dogfight first
- A ship with **Forced Linkage active** cannot use thrust to manoeuvre
- If the target is destroyed during Conflict, resolve with outcome **Ship destroyed**
- Normal rounds continue in parallel — the GM can advance phases and resolve the boarding on its own timeline, as with dogfights

---

> **Technical reference:** [boarding-system-design.md](boarding-system-design.md)

---

## 16. Obstacles *(optional)*

> **This system is entirely optional and is not part of the official MgT2e rules.**
> It is a house-rule extension designed to add environmental variety to vectorial
> combat. It is disabled by default and must be explicitly enabled before the battle
> begins. All standard combat works normally without it. Obstacles are only available
> in **vectorial combat mode**.

Environmental obstacles are fixed zones on the hex map that affect movement and
combat. They have no initiative and take no actions — they simply modify the
behaviour of ships that move through or near them.

### 16.1 Enabling and Placing

Enable obstacles from the HUD toggle during the **Setup phase** (see [§ 5.3](#53-enabling-obstacles-vectorial-mode-only)).
Once enabled, right-click any empty hex → **Place obstacle here**.

A two-step modal opens:

1. **Type** — select one of the four obstacle types.
2. **Config** — set radius (in hexes), density (Asteroid Field only), and an
   optional label.

To edit or remove a placed obstacle, right-click its hex → **Edit obstacle** or
**Remove obstacle**.

### 16.2 Obstacle Types at a Glance

| Type | Movement cost | Attack DM vs ships inside | Damage on collision |
| ---- | ------------- | ------------------------- | ------------------- |
| Asteroid Field (light) | 2 pts/hex | −1 | 1D6 − Armor |
| Asteroid Field (dense) | 2 pts/hex | −2 | 2D6 − Armor |
| Debris Field | 2 pts/hex | −2 | 2D6 − Armor |
| Gravity Well | impassable | — | 4D6 − Armor |
| Nebula | none | −2 (from outside) | none |

### 16.3 Asteroid Field and Debris Field

**Movement budget.** Each ship moves a number of hexes equal to its velocity
vector magnitude (`|v|`). Normal hexes cost 1 point; field hexes cost 2 points.
A ship with `|v| = 3` traversing one field hex can move 2 hexes total (2 pts for
field + 1 pt for the next hex = 3).

**Cover.** A ship inside a field receives a DM penalty to all attacks made
against it from outside. The penalty does not apply to attacks made *from* inside
the field.

**Collision.** If a ship's movement budget runs out while it is still inside a
field, it stops in that field hex and a collision is triggered. A
**ObstacleCollisionModal** opens:

- The GM declares whether the Pilot check succeeds (Average 8+ for light,
  Difficult 10+ for dense/debris).
- On failure, roll the damage dice. Damage is reduced by the ship's Armor
  normally.

**Debris Field origin.** When a ship is destroyed (hull → 0), a Debris Field
token with radius 0 automatically appears on its last hex. The GM can remove it
manually.

### 16.4 Gravity Well

Represents a minor celestial body — moon, planetoid, or massive orbital station.
**Not intended for full-sized planets** (which would be tens of hexes wide and
outside the combat area entirely).

**Exclusion zone.** All hexes within the gravity well radius are impassable.
ThrustModal prevents setting a vector that would enter the zone. If a ship's
current vector would carry it inside (no thrust available to correct), it is
blocked at the nearest border hex and takes **4D6 − Armor damage** (atmospheric
entry). If the ship was in an active dogfight, the dogfight ends automatically
before damage is applied.

**Warning ring.** The hex ring at radius + 1 is highlighted in orange — a visual
caution border visible on the map at all times.

### 16.5 Nebula

A large zone of gas and interstellar dust. No movement cost, no collision risk.

**Effects:**

- Sensor lock cannot be acquired or maintained while either ship is inside the nebula.
  Any existing lock is cleared when a ship enters.
- DM −2 to all attacks made *from outside* against a ship *inside* the nebula.
  Ships fighting within the nebula are unaffected.
- DM −2 to all Electronics(sensors) rolls for ships inside the nebula.

---

## 17. Map Tools

### 17.1 Zoom Levels

Three named zoom levels are available in the toolbar at the bottom-right of the battle map:

| Level | Key | Zoom | Best for |
| ----- | --- | ---- | -------- |
| **C — Close** | `1` | 2.5× | Token detail in tight engagements |
| **T — Tactical** | `2` | 1.0× | Default balanced view |
| **S — Strategic** | `3` | 0.45× | Wide-area overview |

Click a button or press the corresponding key to animate a 250 ms ease-in-out transition to that zoom level. The canvas centre is anchored during the animation so you don't lose your place.

The scroll-wheel still provides free-zoom at any point; doing so deselects the active named level. Keyboard shortcuts `1`/`2`/`3` are blocked while any modal is open.

### 17.2 Battle Report

Click **⎙ Report** (top-right controls, next to `?` and `📖 Legend`) to open the Battle Report modal.

The report summarises the current battle state in three sections:

| Section | Contents |
| ------- | -------- |
| **Header** | Session title, current round number, combat mode (Vectorial Combat / Basic Combat) |
| **Ship Roster** | Vessel name · Faction · Hull (current/max) · Critical hits (system + severity) · Status (Active / WRECK) |
| **Battle Log** | All log entries grouped by round; each entry shows Phase and message |

Click **⎙ Print / Save PDF** to open the browser print dialog. Choose a printer or select *Save as PDF* to export the report. The printout uses a white background with monospace text — no additional software required.

---

## 18. Further Reading

| Document | Contents |
| -------- | -------- |
| [thrust-and-drift-space-combat-simulator-spec.md](thrust-and-drift-space-combat-simulator-spec.md) | Full technical spec — data models, store actions, component structure, roadmap |
| [dogfight-system-design.md](dogfight-system-design.md) | Dogfight sub-system design — micro-round flow, pursuit checks, escape mechanics |
| [boarding-system-design.md](boarding-system-design.md) | Boarding sub-system design — entry methods, hull-cut, conflict objectives |
| [obstacles-system-design.md](obstacles-system-design.md) | Environmental obstacles design — asteroid field, gravity well, debris, nebula |
| [weapons-expansion-design.md](weapons-expansion-design.md) | Weapons expansion design — barbette ×3 multiplier, AP trait, Ion Cannon penalty, Torpedo/Missile Barbette ammo, sandcaster canister tracking |

---

*The Traveller game in all forms is owned by Mongoose Publishing.
Copyright 1977–2025 Mongoose Publishing. Non-commercial use only.*
