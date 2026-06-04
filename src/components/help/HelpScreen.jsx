/**
 * HelpScreen — full-screen field manual.
 * Sidebar TOC + scrollable content sections.
 */

import { useState } from 'react'
import { useUiStore } from '../../store/uiStore.js'

const SECTIONS = [
  { id: 'overview',      label: 'Overview' },
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'map-controls',  label: 'Map Controls' },
  { id: 'phase-flow',    label: 'Phase Flow' },
  { id: 'setup',         label: '— Setup' },
  { id: 'initiative',    label: '— Initiative' },
  { id: 'acceleration',  label: '— Acceleration' },
  { id: 'movement',      label: '— Movement' },
  { id: 'attack',        label: '— Attack' },
  { id: 'actions',       label: '— Crew Actions' },
  { id: 'crew',          label: 'Crew System' },
  { id: 'undo-redo',     label: 'Undo / Redo' },
  { id: 'save-resume',   label: 'Save & Resume' },
  { id: 'dogfight',      label: 'Dogfight' },
  { id: 'boarding',      label: 'Boarding' },
]

function Section({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-4 space-y-3">
      <h2 className="font-display text-(--neon-cyan) tracking-widest text-sm border-b border-slate-800 pb-1">
        {title}
      </h2>
      <div className="space-y-3 font-mono text-xs text-slate-300 leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function Sub({ title, children }) {
  return (
    <div className="space-y-1.5">
      <h3 className="font-display text-slate-200 tracking-widest text-xs">{title}</h3>
      <div className="text-slate-400 space-y-1.5 pl-3 border-l border-slate-800">
        {children}
      </div>
    </div>
  )
}

function KV({ k, v }) {
  return (
    <div className="flex gap-2">
      <span className="text-(--neon-cyan) shrink-0 w-28">{k}</span>
      <span className="text-slate-400">{v}</span>
    </div>
  )
}

function Note({ children }) {
  return (
    <p className="bg-slate-900/60 border border-slate-700 rounded px-3 py-2 text-slate-400 italic">
      {children}
    </p>
  )
}

export function HelpScreen() {
  const gotoScreen = useUiStore((s) => s.gotoScreen)
  const [active, setActive] = useState('overview')

  const scrollTo = (id) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="w-full h-full flex bg-slate-950 overflow-hidden">

      {/* ── Sidebar TOC ───────────────────────────────────────────────── */}
      <aside className="help-sidebar w-52 shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 shrink-0">
          <p className="font-display text-xs text-(--neon-cyan) tracking-widest">// FIELD MANUAL</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`w-full text-left px-4 py-1.5 font-mono text-xs transition-colors ${
                active === id
                  ? 'text-(--neon-cyan) bg-(--neon-cyan)/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="help-actions shrink-0 px-4 py-3 border-t border-slate-800 space-y-2">
          <a
            href="/field-manual.pdf"
            download="thrust-and-drift-field-manual.pdf"
            className="block w-full py-2 border border-slate-700 text-slate-400 font-display text-xs tracking-widest rounded hover:border-slate-500 hover:text-slate-200 transition-colors text-center"
          >
            ⬇ DOWNLOAD PDF
          </a>
          <button
            onClick={() => gotoScreen('dashboard')}
            className="w-full py-2 border border-slate-700 text-slate-400 font-display text-xs tracking-widest rounded hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            ← BACK
          </button>
        </div>
      </aside>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <main className="help-content flex-1 overflow-y-auto px-8 py-6 space-y-10">

        {/* OVERVIEW */}
        <Section id="overview" title="Overview">
          <p>
            <span className="text-(--neon-cyan) font-bold">Thrust &amp; Drift</span> is a browser-based
            Virtual Tabletop tool for running Mongoose Traveller 2nd Edition space combat at the table.
            It is GM-operated and designed for shared-screen play — one person drives, everyone watches.
          </p>
          <p>
            Two combat modes are available:
          </p>
          <div className="space-y-1.5">
            <KV k="VECTORIAL" v="Full hex grid with velocity vectors. Ships move according to their accumulated velocity each round. Implements Traveller Companion 2024 pp.169–186." />
            <KV k="BASIC" v="Simplified range-band system. No hex map, no vectors. Faster for small engagements." />
          </div>
          <Note>The mode is selected on the Dashboard before starting a session and cannot be changed mid-battle.</Note>
        </Section>

        {/* DASHBOARD */}
        <Section id="dashboard" title="Dashboard">
          <p>The Dashboard is the pre-battle lobby. It has two columns: ship profiles on the right, operations console on the left.</p>

          <Sub title="SHIP PROFILES">
            <p>The right panel lists all your saved ship profiles.</p>
            <KV k="+ NEW PROFILE" v="Create a new ship from scratch." />
            <KV k="✎ Edit" v="Modify an existing profile." />
            <KV k="⧉ Duplicate" v="Clone a profile as a starting point." />
            <KV k="⊗ Delete" v="Remove a profile (confirmation required)." />
            <KV k="↓ IMPORT" v="Load profiles from a .json file." />
            <KV k="↑ EXPORT" v="Save all current profiles to a .json file." />
            <KV k="📖 CATALOG" v="Browse the built-in High Guard 2022 catalog and add ships directly to your profiles." />
          </Sub>

          <Sub title="OPERATIONS CONSOLE">
            <KV k="COMBAT MODE" v="Toggle between Vectorial and Basic before starting." />
            <KV k="↺ RESUME AUTOSAVE" v="Appears when an autosaved session is found. Shows round, phase, ship count, and timestamp. Click to restore instantly." />
            <KV k="▶ NEW SESSION" v="Clears any existing battle state and enters the combat map." />
            <KV k="↓ RESUME FROM FILE" v="Load a previously saved .json session file. A preview screen shows the full roster before you confirm." />
            <KV k="📖 FIELD MANUAL" v="This screen." />
          </Sub>

          <Sub title="SHIP PROFILE FORM">
            <p>Each profile stores the ship's stats and named crew members.</p>
            <KV k="Name / Tonnage" v="Display name and hull size (affects target size DM)." />
            <KV k="Hull / Thrust" v="Max hull points and base manoeuvre drive rating." />
            <KV k="Turrets" v="Add weapon turrets — type, damage dice, range band, special traits." />
            <KV k="Crew" v="Add named crew members, each with individual skill levels (Pilot, Leadership, Tactics, Engineer, Gunner, Sensors 0–5). One crew member can hold multiple skills — useful for single-seat fighters." />
          </Sub>
        </Section>

        {/* MAP CONTROLS */}
        <Section id="map-controls" title="Map Controls">
          <p>The battle map is a flat-top hex grid. All interaction is mouse-driven.</p>
          <KV k="Left-drag" v="Pan the map." />
          <KV k="Scroll wheel" v="Zoom in / out." />
          <KV k="Double-click" v="Centre the map on that hex." />
          <KV k="Left-click token" v="Select the ship (highlights it)." />
          <KV k="Right-click hex" v="Open context menu — actions depend on what is in the hex and the current phase." />
          <Note>Context menu actions are phase-gated and initiative-gated. Only options valid for the current phase are shown — and in the Acceleration, Attack, and Actions phases, combat actions are shown only for the ship whose turn it currently is. Right-clicking another ship shows "Not this ship's turn".</Note>
          <Sub title="LEGEND">
            <p>Click <span className="text-slate-200">📖 Legend</span> (fixed button, top-right of the battle screen) to open the visual reference panel. Also accessible via right-click any empty hex → Legend.</p>
            <KV k="Tokens" v="Ship silhouette (swept-wing polygon, rotates to face velocity); HP arc (green/yellow/red); missile salvo (yellow — count + thrust shown)." />
            <KV k="Beam weapons" v="Pulse Laser (sky blue), Beam Laser (blue), Particle Beam (purple), Railgun (orange)." />
            <KV k="Hit effects" v="Impact burst (expanding sparks on target), Critical flash (red ring + label)." />
            <KV k="Movement effects" v="Thrust plume (amber triangle opposite delta-v), Missile launch (ring + sparks), Missile trail (dashed orange line)." />
            <KV k="Persistent indicators" v="Sensor lock (dashed cyan line + ring on target), Evasive aura (pulsing blue ring), Dogfight (⚔ + amber ring), Missile exhausted (×)." />
          </Sub>
        </Section>

        {/* PHASE FLOW */}
        <Section id="phase-flow" title="Phase Flow">
          <p>
            Each combat round follows this sequence. The HUD (top-left) shows the current round and phase.
            Click <span className="text-slate-200">NEXT PHASE ⟶</span> to advance.
          </p>
          <div className="space-y-1.5">
            {[
              ['SETUP',        'Place ships on the map via right-click → Add ship here.'],
              ['INITIATIVE',   'Roll initiative for all ships. Sets the acting order for the round.'],
              ['ACCELERATION', 'Each ship applies thrust to its velocity vector.'],
              ['MOVEMENT',     'All ships move simultaneously according to their velocity vectors. (Vectorial mode only — this phase is skipped in Basic mode.)'],
              ['ATTACK',       'Each ship in initiative order may attack or launch missiles.'],
              ['ACTIONS',      'Each ship in initiative order may perform one crew action.'],
              ['END OF ROUND', 'Round counter increments. Click NEXT PHASE to begin the next round.'],
            ].map(([phase, desc]) => (
              <KV key={phase} k={phase} v={desc} />
            ))}
          </div>
        </Section>

        {/* SETUP */}
        <Section id="setup" title="Setup Phase">
          <p>Place ships on the hex grid before the battle begins.</p>
          <Sub title="ADDING A SHIP">
            <p>Right-click any empty hex → <span className="text-slate-200">Add ship here</span>. A modal opens where you select:</p>
            <KV k="Profile" v="Which saved ship profile to use." />
            <KV k="Faction" v="Players, Allies, Enemies, Neutral — affects token colour and auto-roll behaviour." />
            <KV k="Color" v="Token display colour." />
            <p>After placing, right-click the ship token → <span className="text-slate-200">Assign Crew…</span> to review or adjust which crew member covers each role and turret (see Crew System below).</p>
          </Sub>
          <Sub title="REMOVING A SHIP">
            <p>Right-click a ship token → <span className="text-slate-200">Remove from battle</span>. This is available in all phases.</p>
          </Sub>
          <Note>Ships start with zero velocity. Their first Acceleration phase is used to build up speed.</Note>
        </Section>

        {/* INITIATIVE */}
        <Section id="initiative" title="Initiative Phase">
          <p>Initiative determines the acting order for Acceleration, Attack, and Actions phases.</p>
          <p>Formula: <span className="text-slate-200">2D6 + Pilot skill + current Thrust rating + Tactics effect</span> (MgT2e CRB p.160).</p>

          <Sub title="ROLLING INITIATIVE">
            <p>Right-click any hex → <span className="text-slate-200">Roll Initiative</span>. The modal shows all ships.</p>
            <KV k="Player ships" v="Dice inputs start empty. Enter the result of your physical 2D6 roll in the two fields. The total updates live. CONFIRM is disabled until all player ships have entered dice." />
            <KV k="NPC ships" v="Auto-rolled on confirm. Shown as '🎲 auto' in the modal." />
            <KV k="🎲 button" v="Opt-in auto-roll — fills the dice fields for that ship if the player prefers the computer to roll." />
          </Sub>
          <Sub title="TACTICS(NAVAL) CHECK (optional)">
            <p>If the assigned Tactics crew member has <span className="text-slate-200">Tactics ≥ 1</span>, an optional secondary dice row appears. Roll 2D6 + Tactics — the Effect (total − 8, can be negative) is added to the initiative total. Leaving it blank applies no bonus.</p>
            <p>NPC ships with Tactics &gt; 0 auto-roll their Tactics check on confirm.</p>
          </Sub>
          <Sub title="INITIATIVE BONUS (previous round)">
            <p>If the Captain uses <span className="text-slate-200">Improve Initiative</span> in the previous Actions phase, the Effect is stored on the ship and added automatically to its next initiative roll — no manual input required.</p>
          </Sub>
          <Note>The Phase Tracker (right side of screen) shows the initiative order with the current actor highlighted.</Note>
        </Section>

        {/* ACCELERATION */}
        <Section id="acceleration" title="Acceleration Phase">
          <p>Each ship in reverse initiative order adjusts its velocity vector.</p>

          <Sub title="APPLYING THRUST">
            <p>Right-click ship → <span className="text-slate-200">Apply Thrust</span>.</p>
            <p>The Thrust Modal shows the current velocity vector and a hex direction pad. Enter a delta-V (Δq / Δr) or click the direction buttons. The total magnitude cannot exceed the ship's available thrust (base thrust minus any M-Drive critical penalties).</p>
            <p>A ghost token on the map previews where the ship will be next round if it keeps its current velocity after this thrust.</p>
          </Sub>
          <Note>Full thrust is available for movement. Evasive Action is a Reaction declared during the Attack phase — not pre-allocated here (CRB p.171). See the Attack Phase section below.</Note>
        </Section>

        {/* MOVEMENT */}
        <Section id="movement" title="Movement Phase">
          <p>Vectorial mode only. All ships move simultaneously — no player input required.</p>
          <p>Click <span className="text-slate-200">NEXT PHASE ⟶</span> to execute movement. Each ship's position advances by its current velocity vector.</p>
          <Sub title="SHIPS THAT PASS IN THE NIGHT">
            <p>If two hostile ships cross within <span className="text-slate-200">Short range (≤ 2 hexes)</span> during movement — even if their final positions are far apart — the system detects the closest approach and opens the <span className="text-slate-200">Passing Encounter</span> window.</p>
            <KV k="[Ship A] FIRES" v="Opens the Attack Modal pre-configured for that attacker." />
            <KV k="[Ship B] FIRES" v="Opens the Attack Modal pre-configured for that attacker." />
            <KV k="PASS" v="Skip the opportunity with no attack." />
            <p>Multiple encounters resolve sequentially. Ships ending in the same hex trigger the Dogfight system instead.</p>
          </Sub>
          <Note>In Basic mode this phase is skipped automatically.</Note>
        </Section>

        {/* ATTACK */}
        <Section id="attack" title="Attack Phase">
          <p>Each ship in initiative order may make one attack or launch a missile salvo.</p>

          <Sub title="ATTACK MODAL — STEP 1: CONFIG">
            <KV k="Weapon" v="Select which turret/weapon to fire." />
            <KV k="Target" v="Select the target ship." />
            <KV k="DM Breakdown" v="The modal shows all applicable DMs: gunner skill, weapon trait, range band, target size, evasion DM (when active), sensor lock DM (when active)." />
          </Sub>

          <Sub title="REACTIONS (CRB p.171)">
            <p>The defender can declare Reactions in Step 1 before the attack roll.</p>
            <KV k="Evasive Action" v="Toggle: spend 1 thrust to dodge this attack. The attack suffers DM −Pilot skill (fixed). Button disabled if no thrust remains or Pilot skill is 0." />
            <KV k="Point Defence" v="Missile attacks only. Gunner (turret) check — Effect removes that many missiles from the salvo. Turret marked fired." />
            <KV k="Disperse Sand" v="Laser attacks only. Gunner (turret) check — on success adds 1D+Effect to armour for this attack only. Turret marked fired." />
            <p className="text-slate-600 italic text-xs">Player-controlled defending ships enter physical dice manually for PD and Sand rolls.</p>
          </Sub>

          <Sub title="ATTACK MODAL — STEP 2: ROLL">
            <p>Target number is always <span className="text-slate-200">8+</span> (MgT2e CRB p.164).</p>
            <KV k="Player attackers" v="Dice inputs start empty. Enter your 2D6 physical roll. CONFIRM ROLL disabled until complete." />
            <KV k="NPC attackers" v="Auto-roll button. Click to roll." />
            <KV k="Effect" v="Total − 8. Positive effect = hit. Effect ≥ 6 = critical hit." />
          </Sub>

          <Sub title="ATTACK MODAL — STEP 3: DAMAGE">
            <p>On a hit, roll damage dice for the weapon. Player ships enter the raw dice total manually; NPC ships auto-roll. Damage is applied to the target's hull.</p>
          </Sub>

          <Sub title="ATTACK MODAL — STEP 4: CRITICAL HIT">
            <p>Triggered when effect ≥ 6 and damage penetrates armour, or when damage crosses a 10% hull threshold (Sustained Damage, MgT2e CRB p.169).</p>
            <KV k="Location" v="2D6 roll on the location table (Hull, M-Drive, J-Drive, Power Plant, Weapons, Sensors, Bridge, Fuel, Cargo, Crew, Computer)." />
            <KV k="Severity" v="Effect − 5, clamped 1–6. Stacks with existing criticals on the same system." />
            <KV k="M-Drive" v="Sev 1 = no penalty. Sev 2–4 = −1 thrust/round. Sev 5–6 = thrust reduced to 0." />
          </Sub>

          <Sub title="LAUNCHING MISSILES">
            <p>In the Attack modal, select <span className="text-slate-200">Missile Rack</span> from the weapon list, choose a target, adjust salvo count (1–12), then click Launch. The salvo spawns as a token inheriting the launcher's velocity. No dice roll required at launch.</p>
          </Sub>

          <Sub title="PER-TURRET FIRING LIMIT">
            <p>Each turret may fire <span className="text-slate-200">once per round</span> (CRB p.164). The weapon list shows only unfired turrets, identified by slot badge (T1, T2…). Once all offensive turrets have fired, the Attack… option disappears from the context menu.</p>
          </Sub>

          <Sub title="WEAPON RANGE LIMITS">
            <p>Each weapon has a maximum range band beyond which it cannot fire (CRB p.167). An <span className="text-red-400">OUT OF RANGE</span> badge appears on blocked weapons; the ROLL ATTACK button is disabled.</p>
            <KV k="Railgun" v="Short" />
            <KV k="Beam Laser" v="Medium" />
            <KV k="Pulse Laser" v="Long" />
            <KV k="Particle Beam / Barbette" v="Very Long" />
            <KV k="Missile Rack / Sandcaster" v="Special (no cap)" />
          </Sub>

          <Sub title="SENSOR LOCK">
            <p>Acquired via the Sensors crew action. Grants a +DM to attacks against the locked target. Shown as an animated cyan ring on the locked ship.</p>
          </Sub>
        </Section>

        {/* ACTIONS */}
        <Section id="actions" title="Actions Phase (Crew)">
          <p>Each ship in initiative order may perform one crew action.</p>
          <p>Right-click ship → <span className="text-slate-200">Crew Action</span>. The modal shows three steps: pick a crew member → pick an action → roll (if required).</p>

          <Sub title="CREW SELECTION">
            <p>Only crew members with skills relevant to available actions are shown. Actions are filtered per member based on their skill set.</p>
          </Sub>

          <Sub title="SKILL DM OVERRIDE">
            <p>When an action is selected, the relevant skill level is pre-filled as the roll DM. The GM can override this value for specialisations (e.g. Engineer(M-Drive) 3 vs generic Engineer 2). The <span className="text-slate-200">↺</span> button resets to the base skill.</p>
          </Sub>

          <Sub title="AVAILABLE ACTIONS">
            <KV k="Captain (Leadership)" v="IMPROVE INITIATIVE — 2D6 + Leadership (8+). Effect added to this ship's initiative roll next round (CRB p.166)." />
            <KV k="Engineer" v="OVERLOAD M-DRIVE — 2D6 + Engineer (8+). +Effect Thrust available this round (CRB p.167). REPAIR SYSTEM — 2D6 + Engineer (8+). Removes 1 critical hit (CRB p.167)." />
            <KV k="Gunner" v="RELOAD TURRET — Automatic, no roll. Reloads 1 missile turret (CRB p.167)." />
            <KV k="Sensors" v="SENSOR LOCK — 2D6 + Electronics (8+). +Effect DM to attacks vs locked target (CRB p.167). ELECTRONIC WARFARE — 2D6 + Electronics (8+). Removes an enemy sensor lock (CRB p.167)." />
          </Sub>

          <Note>Player ships show empty dice inputs for all non-automatic rolls. NPC ships have a 🎲 auto-roll button. After each action, click ANOTHER ACTION to act with a second crew member or CLOSE to exit.</Note>
        </Section>

        {/* CREW SYSTEM */}
        <Section id="crew" title="Crew System">
          <p>Ships have a list of named crew members, each with individual skill ratings.</p>

          <Sub title="SKILLS">
            <KV k="PLT — Pilot" v="Initiative roll, evasion DM, dogfight/pursuit checks." />
            <KV k="LDR — Leadership" v="Improve Initiative action (Actions phase)." />
            <KV k="TAC — Tactics" v="Initiative DM at start of battle (Initiative phase)." />
            <KV k="ENG — Engineer" v="Overload M-Drive action, Repair System action." />
            <KV k="GNR — Gunner" v="Attack DM, Reload Turret action." />
            <KV k="SEN — Sensors" v="Sensor Lock action, Electronic Warfare action." />
            <p>Skill levels range from 0 to 5. One crew member can hold multiple skills — e.g. a solo pilot/gunner on a fighter.</p>
          </Sub>

          <Sub title="ROLE ASSIGNMENTS">
            <p>Right-click ship → <span className="text-slate-200">Assign Crew…</span> to assign each member to a role slot. An unassigned role contributes 0 skill.</p>
            <KV k="Pilot" v="Initiative roll, evasion DM, dogfight — uses skill 0 if unassigned." />
            <KV k="Leadership" v="Improve Initiative action not available if unassigned." />
            <KV k="Tactics" v="No Tactics(naval) check at initiative if unassigned." />
            <KV k="Engineer" v="Engineer actions use skill 0 if unassigned." />
            <KV k="Gunner (T1, T2…)" v="That turret cannot fire if unassigned." />
            <KV k="Sensors" v="Sensors actions use skill 0 if unassigned." />
            <p>A crew member can be assigned to multiple slots (e.g. same person as Pilot and Gunner T1). When placed on the map the app auto-assigns the best-skilled member per role — adjust at any time.</p>
          </Sub>

          <Sub title="EDITING CREW">
            <p>Crew is defined in the ship profile form. Add members with <span className="text-slate-200">+ ADD CREW</span>, remove with <span className="text-slate-200">✕</span>. Each row has a name field and skill inputs.</p>
            <p>Default profiles and catalog ships come with pre-generated crew. These are fully editable — Dashboard → <span className="text-slate-200">✎ Edit</span> → <span className="text-slate-200">Crew Manifest</span> to rename members, adjust skill levels, or replace them with your player characters before the session starts.</p>
          </Sub>

          <Note>NPC ships without explicit assignments fall back to the highest skill across all crew members (backward-compatible). Legacy profiles (flat crew object format) are automatically migrated to the named array format when loaded in the form.</Note>
        </Section>

        {/* UNDO / REDO */}
        <Section id="undo-redo" title="Undo / Redo">
          <p>Every user action that changes game state pushes a snapshot to the undo stack (capped at 20 entries).</p>
          <KV k="⟲ Undo" v="Restore the previous state. Appears in HUD when stack is non-empty. Shortcut: Ctrl+Z / Cmd+Z." />
          <KV k="↷ Redo" v="Re-apply an undone action. Appears in HUD when redo stack is non-empty. Shortcut: Ctrl+Y / Cmd+Shift+Z." />
          <p>Both buttons are hidden when their respective stacks are empty — they appear only when relevant.</p>
          <Note>The battle log is not rolled back on undo. Instead, an ↩ Undo entry is appended to the log so the history remains readable.</Note>
        </Section>

        {/* SAVE & RESUME */}
        <Section id="save-resume" title="Save & Resume">
          <Sub title="AUTOSAVE">
            <p>The app autosaves to IndexedDB after every significant action (ships added/removed, damage applied, phase advanced, etc.). No manual trigger needed.</p>
            <p>On next visit, the <span className="text-slate-200">↺ RESUME AUTOSAVE</span> button appears on the Dashboard with round, phase, and ship count.</p>
          </Sub>
          <Sub title="MANUAL SAVE">
            <p>Click <span className="text-slate-200">💾 SAVE</span> in the HUD at any time to download the full session as a <code className="text-(--neon-cyan)">.json</code> file.</p>
          </Sub>
          <Sub title="RESUME FROM FILE">
            <p>On the Dashboard, click <span className="text-slate-200">↓ RESUME FROM FILE</span> and select your saved <code className="text-(--neon-cyan)">.json</code> file. A preview screen shows the full roster (name, faction, hull, position) before you confirm loading.</p>
          </Sub>
          <Sub title="PROFILE EXPORT / IMPORT">
            <p>Ship profiles are separate from battle sessions. Use <span className="text-slate-200">↑ EXPORT</span> and <span className="text-slate-200">↓ IMPORT</span> in the profile panel to share or back up profiles independently.</p>
          </Sub>
          <Note>Clicking ⌂ in the HUD returns to the Dashboard. A confirmation modal warns that unsaved battle data will be lost — save first if you need to resume.</Note>
        </Section>

        {/* DOGFIGHT */}
        <Section id="dogfight" title="Dogfight">
          <p>
            A dogfight is a close-range sub-system that activates when hostile ships occupy the same hex at the
            end of the Movement phase. Combat shifts to 6-second micro-rounds. (MgT2e CRB p.138)
          </p>

          <Sub title="ENGAGEMENT">
            <p>The <span className="text-slate-200">CONFIRM INTENTS</span> modal opens for each detected group. For each ship the GM declares YES (engage) or NO (avoid):</p>
            <KV k="Both YES" v="Dogfight activates immediately." />
            <KV k="Both NO" v="Ships treated as Short Range (distance 1) — no dogfight." />
            <KV k="Mixed" v="Pursuit check required — see below." />
          </Sub>

          <Sub title="PURSUIT CHECK">
            <p>Formula: <span className="text-slate-200">2D6 + Pilot + Tonnage DM + free Thrust</span></p>
            <KV k="Free Thrust" v="Profile thrust − thrust used this round." />
            <KV k="Tonnage DM" v="&lt;50t → 0; 50–99t → −1; 100–199t → −2; −1 per 100t above 100." />
            <p>Pursuer total {'>'} evader total → dogfight. Otherwise → Short Range, no dogfight.</p>
          </Sub>

          <Sub title="MICRO-ROUND FLOW">
            <p>Open the round from the <span className="text-slate-200">⚔ DOGFIGHT</span> badge in the HUD.</p>
            <KV k="Step 1 — Escape" v="Declare which ships attempt to flee. Auto-escape if thrust advantage or enemies not pursuing. Otherwise, pursuit check." />
            <KV k="Step 2 — Pilot check" v="2D6 + Pilot + Tonnage DM + Thrust + previous round bonus DM." />
            <KV k="Step 3 — Result" v="Winner: +2 DM to attacks. Loser: −2 DM. Tie: fixed weapons cannot fire, turrets OK." />
            <KV k="Step 4 — Advance" v="ADVANCE → MICRO-ROUND N+1/6. After round 6 the dogfight ends automatically." />
          </Sub>

          <Sub title="TOKEN VISUALS">
            <p>Ships in a dogfight show a <span className="text-amber-400">pulsing amber ring</span> and ⚔ badge. Ghost position is hidden during dogfight.</p>
          </Sub>

          <Note>Ships that pass within Short range (≤ 2 hexes) along their trajectories without ending in the same hex trigger the Passing Encounter window instead — a quick fire opportunity before they separate.</Note>
        </Section>

        {/* BOARDING */}
        <Section id="boarding" title="Boarding">
          <p>
            A boarding action initiates close-quarters combat inside the target ship. Resolves in 4 phases:
            Approach → Contact → Conflict → Security. (HG 2022 pp.125–135)
          </p>

          <Sub title="TRIGGERING">
            <p>Right-click the attacker ship → <span className="text-slate-200">⚔ Board [target]…</span></p>
            <p>Visible only when: distance ≤ 1, attacker thrust ≥ target thrust (or target M-Drive disabled), different factions.</p>
          </Sub>

          <Sub title="PHASE 2 — CONTACT">
            <p>Select the entry method in the <span className="text-slate-200">⚔ CONTACT</span> modal:</p>
            <KV k="Airlock (cooperative)" v="No check — instant." />
            <KV k="Airlock (forced)" v="Mechanic (STR) 14+ — 2D rounds + 1D to open." />
            <KV k="Maintenance Hatch" v="Mechanic (STR) 12+ — 2D rounds. ⚠ Decompression risk." />
            <KV k="Breaching Tube" v="No check — &lt; 2 min. No decompression." />
            <KV k="Forced Linkage" v="Pilot (DEX) 8+ — DM +2 to all Contact checks. Locks defender movement." />
            <KV k="Hull Cut" v="Mechanic (DEX) 8+/round — reduces component Resilience until breach. ⚠ Decompression risk." />
            <p>Modifiers: <span className="text-red-400">↻ Tumbling</span> (DM −1) · <span className="text-emerald-400">🔗 Forced Linkage</span> (DM +2)</p>
          </Sub>

          <Sub title="PHASE 3 — CONFLICT">
            <p>Track objectives in the <span className="text-slate-200">⚔ CONFLICT</span> modal:</p>
            <KV k="Bridge" v="Remote control of all systems." />
            <KV k="Engineering" v="Propulsion, reactor, life support." />
            <KV k="Turrets" v="Weapon systems." />
            <p>Tools: <span className="text-slate-200">ROLL STACKING</span> (2D ≥ 10 to target non-first combatant) · <span className="text-slate-200">ROLL MISSED SHOT</span> (2D table per missed attack).</p>
            <p>Weapon DM in tight spaces: Rifles −2 · Heavy weapons −4 · Grenades → 6D+.</p>
          </Sub>

          <Sub title="PHASE 4 — SECURITY">
            <p>Choose outcome in the <span className="text-slate-200">⚔ SECURITY</span> modal:</p>
            <KV k="Attacker wins" v="Optional faction transfer — captured ship joins attacker's faction." />
            <KV k="Defender repels" v="Boarders eliminated, captured, or driven off." />
            <KV k="Ship destroyed" v="Target destroyed by internal damage during Conflict." />
          </Sub>

          <Note>Active boardings show a ⚔ BOARDING badge in the HUD. Click it to reopen the current phase modal. Ships in a boarding do not participate in the standard Attack phase.</Note>
        </Section>

      </main>
    </div>
  )
}
