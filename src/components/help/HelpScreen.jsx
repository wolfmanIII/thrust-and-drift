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
  { id: 'obstacles',     label: 'Obstacles ✦' },
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
                  : 'text-slate-400 hover:text-slate-300'
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
            onClick={() => gotoScreen('changelog')}
            className="w-full py-2 border border-slate-700 text-slate-400 font-display text-xs tracking-widest rounded hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            📋 CHANGELOG
          </button>
          <button
            onClick={() => gotoScreen('dashboard')}
            className="w-full py-2 border border-slate-700 text-slate-400 font-display text-xs tracking-widest rounded hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            ⬅️ BACK
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
            <KV k="🔄 RESUME AUTOSAVE" v="Appears when an autosaved session is found. Shows round, phase, ship count, and timestamp. Click to restore instantly." />
            <KV k="▶ NEW SESSION" v="Clears any existing battle state and enters the combat map." />
            <KV k="↓ RESUME FROM FILE" v="Load a previously saved .json session file. A preview screen shows the full roster before you confirm." />
            <KV k="📖 FIELD MANUAL" v="This screen." />
          </Sub>

          <Sub title="SHIP PROFILE FORM">
            <p>Each profile stores the ship's stats and named crew members.</p>
            <KV k="Name / Tonnage" v="Display name and hull size (affects target size DM)." />
            <KV k="Hull / Thrust" v="Max hull points and base manoeuvre drive rating." />
            <KV k="Tech Level (TL)" v="Ship's technology level (default 12). Gates Smart guidance on missiles and torpedoes — DM+2 applies only when TL ≥ 9 (CRB p.79). Most Traveller-era vessels are TL 12–15; set lower for pre-stellar or primitive opponents." />
            <KV k="Weapons" v="Add weapon slots — type, damage dice, range band, special traits. Maximum 3 weapons per slot (triple turret, CRB p.163)." />
            <KV k="Crew" v="Add named crew members, each with individual skill levels (Pilot, Leadership, Tactics, Engineer, Gunner, Sensors 0–5). One crew member can hold multiple skills — useful for single-seat fighters." />
          </Sub>
        </Section>

        {/* MAP CONTROLS */}
        <Section id="map-controls" title="Map Controls">
          <p>The battle map is a flat-top hex grid. All interaction is mouse-driven.</p>
          <KV k="Left-drag" v="Pan the map." />
          <KV k="Scroll wheel" v="Zoom in / out." />
          <KV k="Double-click" v="Centre the map on that hex." />
          <KV k="Left-click token" v="Select the ship (highlights it). Four dashed cyan range band rings appear centred on the ship — SHORT (2 hex), MEDIUM (15 hex), LONG (38 hex), VERY LONG (77 hex) — each labelled on a dark pill. Hidden while thrust targeting is active." />
          <KV k="Right-click hex" v="Open context menu — actions depend on what is in the hex and the current phase." />
          <KV k="🔊/🔇 button" v="Audio toggle (HUD, top-left) — enables or mutes procedural sound effects (laser, impact, thrust plume, missile launch)." />
          <KV k="Hover ship token" v="After 200 ms, a tooltip panel appears showing: name, hull bar, vector, available thrust, evasion DM, initiative, sensor lock → target (if active, with DM), Locked by [attacker] (if targeted), ⚡ N× missile inbound (if applicable), critical hits. Clears on pan or mouse-leave." />
          <Note>Context menu actions are phase-gated and initiative-gated. Only options valid for the current phase are shown — and in the Acceleration, Attack, and Actions phases, combat actions are shown only for the ship whose turn it currently is. Right-clicking another ship shows "Not this ship's turn".</Note>

          <Sub title="BASIC MODE VIEW">
            <p>In Basic mode there is no hex map. Ships appear as bento cards grouped by faction. Each card has three zones:</p>
            <KV k="Header" v="Ship name · faction dot · status badges: ☠ WRECK, DOGFIGHT, BOARDING, EVA N (evasive thrust), LOCKED (sensor locked by enemy), ION NR (ion disruption active — blue)." />
            <KV k="Hull" v="Hull bar (green → yellow → red) · Hull N/M · Initiative." />
            <KV k="Status" v="Conditional zone — shown only when active: sensor lock target (with DM), locked-by attacker, inbound missiles per launcher, inbound torpedoes (separate row), launched missiles per target, reloading turrets, critical hits, missile ammo (🚀 N/max, yellow < 25%, red at 0), sand canisters (🪨 N/max, yellow < 25%, red at 0), ion disruption (−N PWR · Xr remaining; OFFLINE when currentPower = 0). Hidden when none apply." />
            <KV k="DISTANCES panel" v="Lists every cross-faction pair with its current range band. ⬇ / ⬆ buttons adjust the band directly (GM override — no thrust spent)." />
            <p>Right-click a card to open the context menu. Right-click anywhere in the background for the global menu (Roll Initiative, Add ship here).</p>
            <Note>Ships are placed at Very Long range by default when added to a basic mode session.</Note>
          </Sub>

          <Sub title="LEGEND">
            <p>Click <span className="text-slate-200">📖 Legend</span> (fixed button, top-right of the battle screen) to open the visual reference panel. Also accessible via right-click any empty hex → Legend.</p>
            <KV k="Tokens" v="Ship silhouette (6 shapes: delta, needle, freighter, gunship, cruiser, capital — each rotates to face velocity direction; shape chosen at placement); HP arc (green/yellow/red); missile salvo (three staggered yellow silhouettes — count + thrust arc; hover for launcher/target/thrust tooltip); torpedo (red/amber silhouette — separate salvo type)." />
            <KV k="Turret beams" v="Pulse Laser (sky blue), Beam Laser (blue), Particle Beam (purple), Railgun (orange), Fusion Gun (amber-white), Plasma Gun (magenta)." />
            <KV k="Barbette beams" v="Pulse Laser Barbette (sky blue, thicker), Beam Laser Barbette (blue, thicker), Particle Barbette (purple, thicker), Fusion Barbette (amber-white, thicker), Plasma Barbette (magenta, thicker), Railgun Barbette (orange, thicker) — all barbettes deal ×3 damage after armour." />
            <KV k="Hit effects" v="Impact burst (expanding sparks on target), Critical flash (red ring + label), Ion burst (blue ring — Ion weapon hit)." />
            <KV k="Movement effects" v="Thrust plume (amber triangle opposite delta-v), Missile launch (ring + sparks), Missile trail (dashed orange line)." />
            <KV k="Persistent indicators" v="Sensor lock (dashed cyan line + ring on target), Evasive aura (pulsing blue ring), Dogfight (⚔️ + amber ring), Missile exhausted (×), Ion aura (pulsing blue ring — while ionRoundsLeft {'>'} 0), Range band rings (dashed cyan hexagons — SHORT / MEDIUM / LONG / VERY LONG — shown on selected ship; hidden during thrust targeting)." />
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
          <Sub title="PHASE ADVANCE GUARDS">
            <p>
              <span className="text-slate-200">NEXT PHASE ⟶</span> enforces preconditions before advancing.
              When blocked, the button dims and clicking shows an amber warning below it.
              The warning clears automatically once the condition is met.
            </p>
            <KV k="⚡ Any phase" v="Missile impacts must all be resolved before advancing. The button dims and shows 🚨 Resolve all pending missile impacts. Use the ↩ button in the Battle Log to re-open a dismissed impact modal." />
            <KV k="Setup" v="At least 1 ship must be placed on the map. 🚨 Place at least one ship first." />
            <KV k="Initiative" v="Initiative must be rolled (Roll Initiative modal). 🚨 Roll initiative before advancing." />
            <KV k="Accel / Attack / Actions" v="All actors in initiative order must have taken their turn. 🚨 N actor(s) still to act." />
            <KV k="Movement / End" v="Always allowed unless missile impacts are pending (see above)." />
          </Sub>
        </Section>

        {/* SETUP */}
        <Section id="setup" title="Setup Phase">
          <p>Place ships on the hex grid before the battle begins.</p>
          <Sub title="ADDING A SHIP">
            <p>Right-click any empty hex → <span className="text-slate-200">Add ship here</span>. A modal opens where you select:</p>
            <KV k="Profile" v="Which saved ship profile to use." />
            <KV k="Faction" v="Players, Allies, Enemies, Neutral — affects token colour and auto-roll behaviour." />
            <KV k="Color" v="Token display colour." />
            <KV k="Shape" v="Token silhouette — Delta, Needle, Freighter, Gunship, Cruiser, or Capital. Each has a distinct hull outline and bridge/cockpit overlay (increased contrast for colour-vision accessibility). Per-placement only; does not affect game mechanics." />
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
          <Sub title="INITIATIVE BONUS">
            <p>If the Captain uses <span className="text-slate-200">Improve Initiative</span> in the Actions phase of round N, the bonus takes effect at the <span className="text-slate-200">start of round N+1</span> — the acting order is re-sorted before anyone acts. The bonus lasts exactly 1 round and is removed automatically at the start of round N+2. The Phase Tracker shows an <span className="text-amber-400">↑ini</span> badge on ships whose bonus is active.</p>
          </Sub>
        </Section>

        {/* ACCELERATION */}
        <Section id="acceleration" title="Acceleration Phase">
          <p>Each ship adjusts its velocity vector. In <span className="text-slate-200">vectorial mode</span>, ships act in <span className="text-slate-200">reverse initiative order</span> — lowest first — so higher-initiative ships can react to slower ships' declared vectors <span className="text-slate-400">(TC p.174)</span>. In <span className="text-slate-200">basic mode</span>, the Manoeuvre Step uses normal initiative order, highest first <span className="text-slate-400">(CRB p.164)</span>.</p>

          <Sub title="APPLYING THRUST">
            <p>Right-click ship → <span className="text-slate-200">Apply Thrust</span>. The map enters targeting mode.</p>
            <KV k="Move cursor" v="Aim toward the target hex. A dashed line stretches from the ship to the clamped thrust endpoint — cyan within budget, orange at cap." />
            <KV k="Overlay" v="Circle = thrust endpoint. Ghost = next-round position (pos + vector + delta). Faint line = inertial ghost → new ghost. Badge = cost/max thrust." />
            <KV k="Click" v="Confirm thrust delta and exit targeting mode." />
            <KV k="ESC" v="Cancel without applying thrust." />
            <p className="text-slate-400 italic text-xs">thrustAvailable = base thrust + engineer bonus − used this round − M-Drive penalty.</p>
          </Sub>
          <Note>Full thrust is available for movement. Evasive Action is a Reaction declared during the Attack phase — not pre-allocated here (CRB p.171). See the Attack Phase section below.</Note>

          <Sub title="MANOEUVRE (BASIC MODE)">
            <p>In Basic mode, <span className="text-slate-200">Apply Thrust</span> is replaced by <span className="text-slate-200">Manoeuvre…</span> in the context menu.</p>
            <p>Each ship acts on its own initiative turn. Thrust <span className="text-slate-200">accumulates across rounds</span> — a ship that cannot afford the full band cost in one round contributes a partial amount; the band advances when the pool meets the threshold <span className="text-slate-400">(CRB p.166)</span>.</p>
            <KV k="⬇ Approach / ⬆ Flee" v="Direction of contribution. Both ships approaching sum their thrust in the same pool." />
            <KV k="APPLY MANOEUVRE" v="Pool ≥ threshold — band shifts and thrust is spent." />
            <KV k="ALLOCATE THRUST" v="Pool below threshold — thrust is spent and added to the pool; band stays. Progress bar shows % toward next band change." />
            <KV k="GM SET" v="Override — sets the band directly without spending any thrust; resets the accumulated pool. Use for initial placement and narrative jumps." />
            <p className="text-slate-400">Band costs (CRB p.166 Ship Movement table): Adjacent 1 · Short 2 · Medium 5 · Long 10 · Very Long 25 · Distant 50.</p>
            <Note>Ships at Very Long (25) or Distant (50) cannot close the band in a single round at normal thrust — contributions accumulate across multiple rounds. Use GM SET for initial placement.</Note>
          </Sub>
        </Section>

        {/* MOVEMENT */}
        <Section id="movement" title="Movement Phase">
          <p>Vectorial mode only. <span className="text-slate-200">Fully automatic — no player input required.</span></p>
          <p>Click <span className="text-slate-200">NEXT PHASE ⟶</span> to execute. The app:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-2">
            <li><span className="text-slate-200">Animates</span> every token sliding from its current position to its new position (~2 s, easeInOut). Canvas input is blocked during the animation.</li>
            <li>Advances every ship's position by its current velocity vector.</li>
            <li>Detects hostile ships whose trajectories crossed within Short range (≤ 2 hexes) — opens the <span className="text-slate-200">Passing Encounter</span> window for each.</li>
            <li>Detects ships that end in the same hex — opens the <span className="text-slate-200">Dogfight</span> engagement intent modal.</li>
          </ol>
          <p>If no encounters or dogfights are triggered, the phase advances to Attack automatically.</p>
          <Note>Wrecks drift. A destroyed ship (☠ WRECK) retains its last velocity vector and continues to drift each Movement phase — it has no pilot or reactor and cannot spend thrust. Remove it manually via right-click → Remove from battle when no longer relevant.</Note>
          <Sub title="MISSILE IMPACT">
            <p>When a missile salvo reaches its target, the token is consumed and a <span className="text-slate-200">⚡ MISSILE IMPACT</span> modal opens. Resolution follows CRB p.173 in two steps.</p>
            <p className="text-slate-400 text-xs italic">In vectorial mode this happens during the Movement phase when the salvo reaches the target hex. In basic mode, each missile advances up to 10 thrust/round against the Ship Movement cost table (CRB p.166) — the modal opens at the start of the round when the salvo reaches Adjacent range. Bento cards show <span className="text-slate-300">~Xr</span> (estimated rounds to impact).</p>
            <p className="font-mono text-xs text-slate-300 mt-1">STEP 1 — ATTACK ROLL</p>
            <KV k="Salvo DM" v="+1 per missile in the salvo (e.g. 3 missiles → DM+3)." />
            <KV k="Smart DM" v="+2 — all missile and torpedo weapons carry the Smart trait (CRB p.79). Active only when the launcher ship's Tech Level is 9 or higher. Sub-TL9 launchers do not receive this bonus." />
            <KV k="🛡 EVASIVE ACTION" v="If the target has unspent thrust, click to spend 1 thrust and apply DM −Pilot to this attack roll. Button disabled when no thrust available." />
            <p>Roll 2D6 + total DM vs 8+. Effect = total − 8. Effect &lt; 0 → MISS, modal closes. Effect ≥ 0 → proceed to damage.</p>
            <p className="font-mono text-xs text-slate-300 mt-1">STEP 2 — DAMAGE</p>
            <KV k="Damage roll" v="Roll 4D6 (Missile) or 6D6 (Torpedo) for a single missile — not the whole salvo." />
            <KV k="Formula" v="max(0, roll − armour) × min(Effect, count). Breakdown shown live." />
            <KV k="APPLY DAMAGE" v="Deducts net damage, triggers criticals if applicable, logs the hit." />
            <KV k="MISS / INTERCEPTED" v="Close without applying damage (e.g. all missiles destroyed by Point Defence)." />
            <p>Multiple salvos queue sequentially; the pending count is shown in the modal header.</p>
            <p className="text-amber-400 font-mono text-xs">⚡ If dismissed accidentally: find the impact entry in the Battle Log and click ↩ to re-queue it. Phase advance is blocked until all impacts are resolved — the HUD shows a pulsing ⚡ N impacts unresolved badge.</p>
          </Sub>
          <Sub title="SHIPS THAT PASS IN THE NIGHT">
            <p>If two hostile ships cross within <span className="text-slate-200">Short range (≤ 2 hexes)</span> during movement — even if their final positions are far apart — the system detects the closest approach and opens the <span className="text-slate-200">Passing Encounter</span> window.</p>
            <KV k="[Ship A] FIRES" v="Opens the Attack Modal for Ship A. Button shows ✅ FIRED after resolving — the encounter stays open so Ship B can still fire." />
            <KV k="[Ship B] FIRES" v="Opens the Attack Modal for Ship B. Button shows ✅ FIRED after resolving." />
            <KV k="PASS" v="Dismiss the encounter immediately — no attacks for either ship." />
            <p>Both ships can fire independently. The encounter closes once both have resolved. Multiple encounters resolve sequentially. Ships ending in the same hex trigger the Dogfight system instead.</p>
            <Note>Initiative order applies (TC p.177): the GM decides which ship fires first by clicking the corresponding FIRES button. The other ship's button is locked until the first attack resolves. If the first attack destroys the target, the encounter closes automatically — the destroyed ship does not fire back.</Note>
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
            <KV k="Point Defence" v="Missile attacks only. Gunner (turret) check 2D6 + Gunner + laser bonus (DM+1 for 2-laser turret, DM+2 for 3-laser). Effect removes that many missiles from the salvo. Weapon slot marked fired." />
            <KV k="Disperse Sand" v="Laser attacks only. Gunner (turret) check — on success adds 1D+Effect to armour for this attack only. Slot marked fired." />
            <p className="text-slate-400 italic text-xs">Player-controlled defending ships enter physical dice manually for PD and Sand rolls.</p>
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
            <p>Three launcher types are available — all selected in the Attack modal weapon list. No dice roll required at launch. The weapon slot is marked as fired immediately.</p>
            <p><span className="text-slate-200">Missile Rack</span> (CRB p.162) — adjust salvo count using the stepper (capped at remaining magazine, 12 per rack). Damage: 4D6 per missile.</p>
            <p><span className="text-slate-200">Missile Barbette</span> (HG p.29) — fixed 5-missile salvo, 25 total canisters (5 salvos). Damage: 4D6 per missile. Barbette ×3 multiplier does <em>not</em> apply to missile weapons.</p>
            <p><span className="text-slate-200">Torpedo</span> (HG p.30–31) — 1–3 torpedoes per launch, 3 per barbette. Rendered as a red/amber token. Damage: 6D6 per torpedo.</p>
            <p>All salvos show <span className="text-red-400">🚨 NO AMMO</span> and disable the launch button when the magazine is empty. Missiles and torpedoes have <span className="text-slate-200">Thrust 10</span> and <span className="text-slate-200">10 rounds of guided flight</span> — homing toward the target's predicted position each Movement phase until fuel is exhausted.</p>
          </Sub>

          <Sub title="PER-SLOT FIRING LIMIT">
            <p>Each weapon slot may fire <span className="text-slate-200">once per round</span> (CRB p.164). The weapon list shows only unfired slots, identified by slot badge (W1, W2…). Once all offensive slots have fired, the Attack… option disappears from the context menu.</p>
          </Sub>

          <Sub title="WEAPON RANGE LIMITS">
            <p>Each weapon has a maximum range band beyond which it cannot fire (CRB p.167). An <span className="text-red-400">OUT OF RANGE</span> badge appears on blocked weapons; the ROLL ATTACK button is disabled.</p>
            <KV k="Railgun" v="Short" />
            <KV k="Railgun Barbette" v="Medium (AP 5)" />
            <KV k="Beam Laser" v="Medium" />
            <KV k="Beam Laser Barbette" v="Medium" />
            <KV k="Fusion Gun" v="Medium (AP —, Radiation)" />
            <KV k="Fusion Barbette" v="Medium (AP 3, Radiation)" />
            <KV k="Plasma Gun" v="Medium" />
            <KV k="Plasma Barbette" v="Medium (AP 2)" />
            <KV k="Ion Cannon" v="Medium (barbette — 2D×10 Power damage, ignores armour)" />
            <KV k="Ion Cannon Bay (Small)" v="Medium (bay — 6D×10 Power damage, ignores armour)" />
            <KV k="Ion Cannon Bay (Medium)" v="Medium (bay — 8D×20 Power damage, ignores armour)" />
            <KV k="Ion Cannon Bay (Large)" v="Long (bay — 10D×100 Power damage, ignores armour)" />
            <KV k="Pulse Laser" v="Long" />
            <KV k="Pulse Laser Barbette" v="Long" />
            <KV k="Particle Beam" v="Very Long (Radiation)" />
            <KV k="Particle Barbette" v="Very Long (Radiation)" />
            <KV k="Missile Rack" v="Special (no cap)" />
            <KV k="Missile Barbette" v="Special (no cap)" />
            <KV k="Torpedo" v="Special (no cap)" />
            <KV k="Sandcaster" v="Special (no cap — defensive only)" />
          </Sub>

          <Sub title="SPECIAL WEAPON MECHANICS">
            <p><span className="text-slate-200">AP (Armour Piercing) trait</span> — reduces effective armour before damage: <code className="text-(--neon-cyan)">effectiveArmour = max(0, armour − apReduction)</code>. Weapons: Railgun AP 4, Fusion Barbette AP 3, Plasma Barbette AP 2, Railgun Barbette AP 5.</p>
            <p><span className="text-slate-200">Barbette ×3 multiplier</span> (HG p.29) — applied after armour: <code className="text-(--neon-cyan)">netDamage = max(0, roll + Effect − effectiveArmour) × 3</code>. A roll fully absorbed by armour deals zero damage regardless of the multiplier. Does not apply to missile or torpedo weapons.</p>
            <p><span className="text-slate-200">Ion weapons</span> (HG p.30, FAQ HG 2022 p.1) — no hull damage. Available as <span className="text-blue-400">Ion Cannon</span> (barbette, 2D×10) and <span className="text-blue-400">Ion Cannon Bay</span> Small/Medium/Large (6D×10 / 8D×20 / 10D×100). On hit, ignoring armour: deducts roll×multiple from target <span className="text-blue-400">Power</span> and <span className="text-blue-400">computer bandwidth</span>. Duration: 1 round; D3 rounds if Effect ≥ 6. Power restores on <code className="text-(--neon-cyan)">ionRoundsLeft</code> expiry. Token shows pulsing blue aura. Bento card shows <span className="text-blue-400">ION NR — -X PWR</span>. Thrust cap: <code className="text-(--neon-cyan)">effectiveThrust = floor(baseThrust × currentPower / maxPower)</code>. Bandwidth depletion: DM-2 to all attacks while <code className="text-(--neon-cyan)">currentBandwidth ≤ 0</code> (shown as COMMS DOWN). Hardened systems (/fib): immune to Ion weapons. <span className="text-slate-400">Naming and scope: HG has two separate combat systems — standard space combat (HG pp.28–86, CRB), which T&D implements, and Fleet Combat (HG pp.104–124), an abstracted large-scale ruleset outside T&D scope. Fleet Combat (HG p.112) calls these weapons "Ion Barbette" and "Small/Medium/Large Ion Bay" and uses a different damage formula (effect-per-weapon × count ÷ Hull Points → Ion Damage table; no Power stat). Standard space combat names and mechanics apply in T&D.</span></p>
            <p><span className="text-slate-200">Sandcaster ammo</span> — 20 canisters per sandcaster slot. Decremented each time Disperse Sand reaction is used. Shown as 🪨 N/max on bento cards (yellow {'<'} 25%, red at 0) and on the ship detail modal and tooltip.</p>
          </Sub>

          <Sub title="POINT DEFENCE — ACTIVE INTERCEPT">
            <p>A ship with unfired laser weapon slots may use its Attack turn to intercept an enemy missile salvo currently in flight, before it reaches its target.</p>
            <p>Select a <span className="text-slate-200">Pulse Laser</span> or <span className="text-slate-200">Beam Laser</span> slot in the Attack Config step, then choose an enemy in-flight salvo as the target. Click <span className="text-slate-200">INTERCEPT</span> to open the intercept step. Roll 2D6 + Gunner + laser bonus (DM+1 for 2-laser, DM+2 for 3-laser). Effect (min 0) missiles are destroyed; the salvo is removed if count reaches 0. The weapon slot is marked fired; result is logged.</p>
            <Note>This consumes the attacker&apos;s Attack turn for that weapon slot — the same slot cannot be used for attack or PD reaction in the same round. May target salvos threatening allied ships.</Note>
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
            <p>When an action is selected, the relevant skill level is pre-filled as the roll DM. The GM can override this value for specialisations (e.g. Engineer(M-Drive) 3 vs generic Engineer 2). The <span className="text-slate-200">🔄</span> button resets to the base skill.</p>
          </Sub>

          <Sub title="AVAILABLE ACTIONS">
            <KV k="Captain (Leadership)" v="IMPROVE INITIATIVE — 2D6 + Leadership (8+). +Effect added to this ship's initiative at the start of next round (lasts 1 round) (CRB p.166)." />
            <KV k="Engineer" v="OVERLOAD M-DRIVE — 2D6 + Engineer (8+). +Effect Thrust available this round (CRB p.167). REPAIR SYSTEM — difficulty scales with severity: Avg 8+ (Sev 1–2) / Diff 10+ (Sev 3–4) / Very Diff 12+ (Sev 5–6). GM selects which critical to repair. Removes 1 critical hit (CRB p.167)." />
            <KV k="Gunner" v="RELOAD TURRET — Automatic, no roll. Reloads 1 missile weapon slot (CRB p.167)." />
            <KV k="Sensors" v="SENSOR LOCK — 2D6 + Electronics (8+). Success: DM+2 flat to all attacks vs locked target (CRB p.172). ELECTRONIC WARFARE — 2D6 + Electronics (8+). Removes an enemy sensor lock (CRB p.167). EW — COUNTER MISSILE — 2D6 + Electronics (10+). Success: removes Effect missiles (min 1) from one in-flight salvo. Cumulative across rounds; a salvo may only be EW'd once per round (CRB p.173)." />
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
            <KV k="SEN — Sensors" v="Sensor Lock action, Electronic Warfare action, EW — Counter Missile action." />
            <p>Skill levels range from 0 to 5. One crew member can hold multiple skills — e.g. a solo pilot/gunner on a fighter.</p>
          </Sub>

          <Sub title="ROLE ASSIGNMENTS">
            <p>Right-click ship → <span className="text-slate-200">Assign Crew…</span> to open the assignment modal.</p>
            <p>The modal has two sections:</p>
            <p><span className="text-slate-200">Roles</span> — one dropdown per non-gunner slot: Pilot, Leadership (LDR), Tactics (TAC), Engineer, Sensors.</p>
            <p><span className="text-slate-200">Gunners</span> — one dropdown per weapon slot (W1, W2…), with weapon names shown next to the slot label.</p>
            <p>Each dropdown lists all named crew members. The relevant skill level is shown in brackets — e.g. <span className="text-(--neon-cyan)">Mira Vasquez [pilot 1]</span> or <span className="text-slate-400">Joko Hendrik [no skill]</span>. Select <span className="text-slate-400">— unassigned —</span> to leave the slot empty.</p>
            <KV k="CLEAR ALL" v="Reset every slot to unassigned." />
            <KV k="SAVE ASSIGNMENTS" v="Commit selections to the ship and close." />
            <p className="text-slate-400 italic">If the profile has no named crew the modal prompts you to add crew in the profile editor first.</p>
            <p className="mt-1">Effects of unassigned slots:</p>
            <KV k="Pilot" v="Initiative roll, evasion DM, dogfight — uses skill 0." />
            <KV k="Leadership" v="Improve Initiative action not available." />
            <KV k="Tactics" v="No Tactics(naval) check at initiative." />
            <KV k="Engineer" v="Engineer actions use skill 0." />
            <KV k="Gunner (W1, W2…)" v="That weapon slot cannot fire." />
            <KV k="Sensors" v="Sensors actions use skill 0." />
            <p>One crew member can cover multiple slots (e.g. same person as Pilot and Gunner W1 on a light fighter). On placement the app auto-assigns the best-skilled member per role — adjust any time before or during combat.</p>
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
          <KV k="↩️ Undo" v="Restore the previous state. Appears in HUD when stack is non-empty. Shortcut: Ctrl+Z / Cmd+Z." />
          <KV k="↪️ Redo" v="Re-apply an undone action. Appears in HUD when redo stack is non-empty. Shortcut: Ctrl+Y / Cmd+Shift+Z." />
          <p>Both buttons are hidden when their respective stacks are empty — they appear only when relevant.</p>
          <Note>The battle log is not rolled back on undo. Instead, an ↩ Undo entry is appended to the log so the history remains readable.</Note>
          <p>The Battle Log panel sits at the bottom-left of the screen. Click <span className="text-slate-200">▲ BATTLE LOG</span> to expand it; click ▼ to collapse. When expanded, a drag handle at the top lets you resize it by dragging upward (80 px min, 600 px max). Height is remembered for the session.</p>
        </Section>

        {/* SAVE & RESUME */}
        <Section id="save-resume" title="Save & Resume">
          <Sub title="AUTOSAVE">
            <p>The app autosaves to IndexedDB after every significant action (ships added/removed, damage applied, phase advanced, etc.). No manual trigger needed.</p>
            <p>On next visit, the <span className="text-slate-200">🔄 RESUME AUTOSAVE</span> button appears on the Dashboard with round, phase, and ship count.</p>
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
          <Note>Clicking 🏠 in the HUD returns to the Dashboard. A confirmation modal warns that unsaved battle data will be lost — save first if you need to resume.</Note>
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
            <p>Open the round from the <span className="text-slate-200">⚔️ DOGFIGHT</span> badge in the HUD.</p>
            <KV k="Step 1 — Escape" v="Declare which ships attempt to flee. Auto-escape if thrust advantage or enemies not pursuing. Otherwise, pursuit check." />
            <KV k="Step 2 — Pilot check" v="2D6 + Pilot + Tonnage DM + Thrust + DEX DM + previous round bonus DM. DEX DM set in ship profile (−3 to +3)." />
            <KV k="Step 3 — Result" v="Winner: +2 DM to attacks. Loser: −2 DM. Tie: fixed weapons cannot fire, turrets OK. The app pre-fills the DM automatically in the Attack modal and blocks barbettes/bays on tie." />
            <KV k="Step 4 — Advance" v="ADVANCE → MICRO-ROUND N+1/6. After round 6 the dogfight ends automatically." />
          </Sub>

          <Sub title="TOKEN VISUALS">
            <p>Ships in a dogfight show a <span className="text-amber-400">pulsing amber ring</span> and ⚔️ badge. Ghost position is hidden during dogfight.</p>
          </Sub>

          <Sub title="ESCAPE MID-DOGFIGHT">
            <p>Escape can be declared at Step 1 of any micro-round.</p>
            <KV k="Auto-escape" v="Ship thrust exceeds all enemy thrusts — OR — enemies choose not to pursue (toggle NOT PURSUING)." />
            <KV k="Pursuit check" v="2D6 + Pilot + Tonnage DM + free Thrust. Evader total > pursuer total → escaped." />
            <p className="text-slate-400">On successful escape <code className="text-(--neon-cyan)">inDogfight</code> is cleared; the ship re-enters normal combat from the next standard round.</p>
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
            <p>Right-click the attacker ship → <span className="text-slate-200">⚔️ Board [target]…</span></p>
            <p>Visible only when: distance ≤ 1, target not in an active dogfight, attacker thrust ≥ target thrust (or target M-Drive disabled), different factions.</p>
          </Sub>

          <Sub title="PHASE 1 — APPROACH">
            <p>Handled outside the app. The approach phase is the normal combat movement that brought the two ships together; the GM declares the boarding when conditions are met.</p>
            <KV k="Voluntary boarding" v="Target cooperates — skip to Contact immediately." />
            <KV k="Forced boarding" v="Target attempted to flee and failed (or is immobilised) — proceed to Contact." />
          </Sub>

          <Sub title="PHASE 2 — CONTACT">
            <p>Select the entry method in the <span className="text-slate-200">⚔️ CONTACT</span> modal:</p>
            <KV k="Airlock (cooperative)" v="No check — instant." />
            <KV k="Airlock (forced)" v="Mechanic (STR) 14+ — 2D rounds + 1D to open." />
            <KV k="Maintenance Hatch" v="Mechanic (STR) 12+ — 2D rounds. 🚨 Decompression risk." />
            <KV k="Breaching Tube" v="No check — &lt; 2 min. No decompression." />
            <KV k="Forced Linkage" v="Pilot (DEX) 8+ — DM +2 to all Contact checks. Locks defender movement." />
            <KV k="Hull Cut" v="Mechanic (DEX) 8+/round — reduces component Resilience until breach. 🚨 Decompression risk." />
            <p>Modifiers: <span className="text-red-400">🌀 Tumbling</span> (DM −1 — click the Tumbling button; roll Pilot DEX Routine 6+, then select D3 result 1–3 rounds; app auto-clears when rounds expire) · <span className="text-emerald-400">🔗 Forced Linkage</span> (DM +2)</p>
          </Sub>

          <Sub title="PHASE 3 — CONFLICT">
            <p>Track objectives in the <span className="text-slate-200">⚔️ CONFLICT</span> modal:</p>
            <KV k="Bridge" v="Remote control of all systems." />
            <KV k="Engineering" v="Propulsion, reactor, life support." />
            <KV k="Turrets" v="Weapon systems." />
            <p>Tools: <span className="text-slate-200">ROLL STACKING</span> (2D ≥ 10 to target non-first combatant) · <span className="text-slate-200">ROLL MISSED SHOT</span> (2D table per missed attack).</p>
            <p>Weapon DM in tight spaces: Rifles −2 · Heavy weapons −4 · Grenades → 6D+.</p>
          </Sub>

          <Sub title="PHASE 4 — SECURITY">
            <p>Choose outcome in the <span className="text-slate-200">⚔️ SECURITY</span> modal:</p>
            <KV k="Attacker wins" v="Optional faction transfer — captured ship joins attacker's faction." />
            <KV k="Defender repels" v="Boarders eliminated, captured, or driven off." />
            <KV k="Ship destroyed" v="Target destroyed by internal damage during Conflict." />
          </Sub>

          <Note>Active boardings show a ⚔️ BOARDING badge in the HUD. Click it to reopen the current phase modal. Ships in a boarding do not participate in the standard Attack phase. A ship already in a dogfight cannot be boarded — it must exit the dogfight first. A ship with Forced Linkage active cannot use thrust to manoeuvre. Normal rounds continue in parallel — the GM can advance phases and resolve the boarding on its own timeline.</Note>
        </Section>

        <Section id="obstacles" title="Obstacles ✦">
          <Note>✦ Optional system — not part of official MgT2e rules. House-rule extension for vectorial combat only. Disabled by default.</Note>
          <p>
            Enable from the HUD <b>OBSTACLES</b> toggle during Setup phase. Once the battle advances past Setup the toggle is locked for the rest of the battle.
            Right-click any empty hex → <b>Place obstacle here</b> to open the placement modal.
          </p>
          <Sub title="Asteroid Field">
            <KV k="Movement" v="Each field hex costs 2 movement points (budget = |v|). Ship stops if budget runs out inside — collision triggered." />
            <KV k="Cover" v="DM −1 (light) or −2 (dense) against ships inside the field." />
            <KV k="Collision" v="Pilot check Average 8+ (light) or Difficult 10+ (dense). Failure: 1D6 or 2D6 − Armor damage." />
          </Sub>
          <Sub title="Debris Field">
            <KV k="Mechanics" v="Dense asteroid field variant. Always DM −2 cover, 2D6 − Armor on collision." />
            <KV k="Auto-spawn" v="A radius-0 debris field appears on the hex of any destroyed ship." />
          </Sub>
          <Sub title="Gravity Well">
            <KV k="Zone" v="All hexes within radius are impassable. ThrustModal blocks vectors that enter the zone." />
            <KV k="Impact" v="If an uncontrolled vector drags a ship inside, it stops at the border and takes 4D6 − Armor." />
            <KV k="Dogfight" v="Active dogfight is terminated automatically before impact damage is applied." />
            <KV k="Warning ring" v="Hex ring at radius + 1 highlighted in orange on the map." />
            <KV k="Scope" v="Represents minor bodies (moon, planetoid) — not full-sized planets." />
          </Sub>
          <Sub title="Nebula">
            <KV k="Movement" v="No cost, no collision risk." />
            <KV k="Sensor lock" v="Cannot be acquired or maintained while either ship is inside. Existing lock cleared on entry." />
            <KV k="Cover" v="DM −2 to attacks from outside against ships inside the nebula." />
            <KV k="Sensors" v="DM −2 to all Electronics(sensors) rolls for ships inside." />
          </Sub>
        </Section>

      </main>
    </div>
  )
}
