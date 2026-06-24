/**
 * LegendModal — visual reference for tokens, effects, and persistent indicators.
 */

import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

// ── Primitives ────────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-xs text-slate-400 tracking-widest uppercase border-b border-slate-800 pb-1">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Row({ icon, label, description }) {
  return (
    <div className="flex items-center gap-3 min-h-11">
      <div className="w-12 flex justify-center items-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="font-mono text-xs text-slate-200 font-bold leading-tight">{label}</p>
        {description && (
          <p className="font-mono text-xs text-slate-400 leading-tight mt-0.5">{description}</p>
        )}
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ShipIcon({ color }) {
  // Mirrors traceShipBody() — size=18, centered at (20, 21) in a 40×42 viewBox
  const s = 18, cx = 20, cy = 21
  const pts = [
    [0,     -1   ],
    [0.15,  -0.7 ],
    [0.3,   -0.1 ],
    [0.8,    0.4 ],
    [0.85,   0.8 ],
    [0.6,    0.9 ],
    [0.3,    0.5 ],
    [0.25,   0.95],
    [0,      0.85],
    [-0.25,  0.95],
    [-0.3,   0.5 ],
    [-0.6,   0.9 ],
    [-0.85,  0.8 ],
    [-0.8,   0.4 ],
    [-0.3,  -0.1 ],
    [-0.15, -0.7 ],
  ].map(([dx, dy]) => `${cx + dx * s},${cy + dy * s}`).join(' ')
  const stripe = [
    [0, -0.90], [0.09, -0.52], [0.09, 0.50], [0, 0.68], [-0.09, 0.50], [-0.09, -0.52],
  ].map(([dx, dy]) => `${cx + dx * s},${cy + dy * s}`).join(' ')
  return (
    <svg width="40" height="42" viewBox="0 0 40 42">
      <polygon points={pts}    fill={color} fillOpacity="0.85" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
      <polygon points={stripe} fill="rgba(255,255,255,0.14)" />
      <circle cx={cx} cy={cy - s * 0.62} r={s * 0.13} fill="rgba(255,255,255,0.32)" />
    </svg>
  )
}

function MissileIcon({ color = '#fbbf24', stroke = '#92400e' }) {
  // Mirrors traceMissileShape() — scale=2.5, rounded nose via SVG arc
  const s = 2.5, cx = 20, cy = 19
  const r = 0.9 * s
  const offsets = [[-3, 1.5], [0, -1.5], [3, 1.5]]
  return (
    <svg width="40" height="38" viewBox="0 0 40 38">
      {offsets.map(([ox, oy], i) => {
        const x = cx + ox * s
        const y = cy + oy * s
        const noseY = y - 3 * s
        const tailY = y + 4.5 * s
        const d = `M ${x - r},${noseY} A ${r},${r} 0 0 1 ${x + r},${noseY} L ${x + r},${tailY} L ${x - r},${tailY} Z`
        return <path key={i} d={d} fill={color} fillOpacity="0.85" stroke={stroke} strokeWidth="0.6" />
      })}
      <text x="20" y="37" textAnchor="middle" fontSize="7" fill={color} fontFamily="monospace">×N</text>
    </svg>
  )
}

function IonBurstIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="14" fill="none" stroke="#60a5fa" strokeWidth="2.5" strokeOpacity="0.85" />
      <circle cx="20" cy="20" r="9"  fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="20" cy="20" r="4"  fill="#60a5fa" fillOpacity="0.4" />
    </svg>
  )
}

function IonAuraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="15" fill="none" stroke="#60a5fa" strokeWidth="2" strokeOpacity="0.6" strokeDasharray="5 3" />
      <circle cx="20" cy="20" r="8"  fill="#60a5fa" fillOpacity="0.08" />
    </svg>
  )
}

function BeamLine({ color }) {
  return (
    <svg width="48" height="20" viewBox="0 0 48 20">
      <line x1="0" y1="10" x2="48" y2="10" stroke={color} strokeWidth="6" strokeOpacity="0.25" />
      <line x1="0" y1="10" x2="48" y2="10" stroke={color} strokeWidth="2.5" />
      <line x1="0" y1="10" x2="48" y2="10" stroke="white" strokeWidth="0.8" strokeOpacity="0.6" />
    </svg>
  )
}

function BurstIcon({ color }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {[0,1,2,3,4,5,6,7].map((i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <line
            key={i}
            x1={20 + Math.cos(a) * 8}  y1={20 + Math.sin(a) * 8}
            x2={20 + Math.cos(a) * 18} y2={20 + Math.sin(a) * 18}
            stroke={color} strokeWidth="2"
          />
        )
      })}
      <circle cx="20" cy="20" r="5" fill="white" fillOpacity="0.35" />
    </svg>
  )
}

function CritFlashIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="20" cy="20" r="8"  fill="#f87171" fillOpacity="0.25" stroke="#f87171" strokeWidth="1.5" />
      <text x="20" y="25" textAnchor="middle" fontSize="10" fill="#f87171" fontFamily="monospace">CRIT</text>
    </svg>
  )
}

function PlumeIcon() {
  return (
    <svg width="36" height="40" viewBox="0 0 36 40">
      <defs>
        <linearGradient id="plume-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points="18,2 28,38 18,30 8,38" fill="url(#plume-grad)" />
    </svg>
  )
}

function MissileLaunchIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="none" stroke="#fb923c" strokeWidth="2" strokeOpacity="0.5" />
      {[0,1,2,3,4,5].map((i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <line
            key={i}
            x1={20 + Math.cos(a) * 7}  y1={20 + Math.sin(a) * 7}
            x2={20 + Math.cos(a) * 15} y2={20 + Math.sin(a) * 15}
            stroke="#fb923c" strokeWidth="1.8"
          />
        )
      })}
    </svg>
  )
}

function MissileTrailIcon() {
  return (
    <svg width="48" height="20" viewBox="0 0 48 20">
      <circle cx="40" cy="10" r="5" fill="#facc15" fillOpacity="0.3" stroke="#facc15" strokeWidth="1.2" />
      <circle cx="40" cy="10" r="2" fill="#facc15" />
      <line x1="0" y1="10" x2="33" y2="10" stroke="#fb923c" strokeWidth="2" strokeOpacity="0.6" strokeDasharray="4 3" />
    </svg>
  )
}

function SensorLockIcon() {
  return (
    <svg width="48" height="24" viewBox="0 0 48 24">
      <line x1="2" y1="12" x2="36" y2="12" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="4 3" />
      <circle cx="42" cy="12" r="6" fill="none" stroke="#22d3ee" strokeWidth="2" strokeOpacity="0.8" />
    </svg>
  )
}

function EvasiveAuraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="none" stroke="#7dd3fc" strokeWidth="2" strokeOpacity="0.4" strokeDasharray="3 3" />
      <circle cx="20" cy="20" r="8"  fill="#7dd3fc" fillOpacity="0.12" stroke="#7dd3fc" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4"  fill="#7dd3fc" fillOpacity="0.4" />
    </svg>
  )
}

function DogfightIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="none" stroke="#f87171" strokeWidth="2" strokeOpacity="0.5" />
      <text x="20" y="27" textAnchor="middle" fontSize="22" fill="#f87171">⚔️</text>
    </svg>
  )
}

function ExhaustedIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="9" fill="#facc15" fillOpacity="0.08" stroke="#facc15" strokeWidth="1" strokeOpacity="0.25" />
      <line x1="10" y1="10" x2="30" y2="30" stroke="#f87171" strokeWidth="2" />
      <line x1="30" y1="10" x2="10" y2="30" stroke="#f87171" strokeWidth="2" />
    </svg>
  )
}

function ExplosionIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="15" fill="none" stroke="#fb923c" strokeWidth="2" strokeOpacity="0.7" />
      <circle cx="20" cy="20" r="9"  fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="20" cy="20" r="4"  fill="#ffffff" fillOpacity="0.9" />
      {[0,1,2,3,4,5,6,7].map((i) => {
        const a = (i / 8) * Math.PI * 2
        return <line key={i}
          x1={20 + Math.cos(a) * 6}  y1={20 + Math.sin(a) * 6}
          x2={20 + Math.cos(a) * 13} y2={20 + Math.sin(a) * 13}
          stroke={i % 2 === 0 ? '#fb923c' : '#fbbf24'} strokeWidth="1.5"
        />
      })}
    </svg>
  )
}

// ── Obstacle icons ────────────────────────────────────────────────────────────
// Flat-top hex centred at (20,20), size=14 → points "34,20 27,32 13,32 6,20 13,8 27,8"

function AsteroidFieldIcon({ density = 'light' }) {
  const fill   = density === 'dense' ? 'rgba(161,138,104,0.30)' : 'rgba(161,138,104,0.18)'
  const stroke = density === 'dense' ? 'rgba(161,138,104,0.70)' : 'rgba(161,138,104,0.50)'
  const label  = density === 'dense' ? 'AST-D' : 'AST'
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <polygon points="34,20 27,32 13,32 6,20 13,8 27,8"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="20" y="24" textAnchor="middle" fontSize="7.5" fill={stroke}
        fontFamily="monospace" fontWeight="bold">{label}</text>
    </svg>
  )
}

function DebrisFieldIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <polygon points="34,20 27,32 13,32 6,20 13,8 27,8"
        fill="rgba(100,100,120,0.28)" stroke="rgba(150,150,180,0.60)"
        strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="20" y="24" textAnchor="middle" fontSize="7.5" fill="rgba(150,150,180,0.80)"
        fontFamily="monospace" fontWeight="bold">DEB</text>
    </svg>
  )
}

function GravityWellIcon() {
  // Zone hex size=9 centred at (20,20) → "29,20 24.5,28 15.5,28 11,20 15.5,12 24.5,12"
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      {/* Warning ring — outer orange dashed circle */}
      <circle cx="20" cy="20" r="17"
        fill="rgba(251,146,60,0.08)" stroke="rgba(251,146,60,0.40)"
        strokeWidth="1" strokeDasharray="3 3" />
      {/* Exclusion zone hex — solid purple */}
      <polygon points="29,20 24.5,28 15.5,28 11,20 15.5,12 24.5,12"
        fill="rgba(139,92,246,0.22)" stroke="rgba(139,92,246,0.70)" strokeWidth="1.5" />
      {/* Core token — filled circle */}
      <circle cx="20" cy="20" r="5.5" fill="rgba(139,92,246,0.85)" />
    </svg>
  )
}

function NebulaIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <polygon points="34,20 27,32 13,32 6,20 13,8 27,8"
        fill="rgba(56,189,248,0.10)" stroke="rgba(56,189,248,0.30)"
        strokeWidth="1.5" strokeDasharray="4 3" />
      <text x="20" y="24" textAnchor="middle" fontSize="7.5" fill="rgba(56,189,248,0.55)"
        fontFamily="monospace" fontWeight="bold">NEB</text>
    </svg>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function LegendModal() {
  const closeModal       = useUiStore((s) => s.closeModal)
  const obstaclesEnabled = useBattleStore((s) => s.obstaclesEnabled)

  return (
    <Modal title="Legend" onClose={closeModal} width="max-w-2xl">
      <p className="mb-4 px-3 py-2 rounded border border-sky-800/50 bg-sky-950/40 font-mono text-xs text-sky-400">
        Canvas visuals (tokens, beams, effects) — <span className="font-bold">vectorial mode only</span>.
        In basic mode ships appear as cards; no map is rendered.
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">

        {/* Left column */}
        <div className="space-y-5">

          <Section title="Tokens — vectorial mode">
            <Row icon={<ShipIcon color="#22d3ee" />}         label="Player ship"    description="cyan — current faction" />
            <Row icon={<ShipIcon color="#f87171" />}         label="Enemy ship"     description="red — hostile faction" />
            <Row icon={<ShipIcon color="#a3a3a3" />}         label="Neutral ship"   description="grey" />
            <Row icon={<MissileIcon />}                      label="Missile salvo"  description="amber — count + thrust remaining" />
            <Row icon={<MissileIcon color="#f87171" stroke="#991b1b" />} label="Torpedo salvo" description="red — 6D per torpedo" />
          </Section>

          <Section title="Turret beams — vectorial mode">
            <Row icon={<BeamLine color="#7dd3fc" />} label="Pulse Laser"   />
            <Row icon={<BeamLine color="#38bdf8" />} label="Beam Laser"    />
            <Row icon={<BeamLine color="#c084fc" />} label="Particle Beam" />
            <Row icon={<BeamLine color="#fb923c" />} label="Railgun"       />
            <Row icon={<BeamLine color="#f97316" />} label="Fusion Gun"    />
            <Row icon={<BeamLine color="#4ade80" />} label="Plasma Gun"    />
          </Section>

          <Section title="Barbette beams — vectorial mode">
            <Row icon={<BeamLine color="#bae6fd" />} label="Pulse Laser Barbette"  />
            <Row icon={<BeamLine color="#93c5fd" />} label="Beam Laser Barbette"   />
            <Row icon={<BeamLine color="#e9d5ff" />} label="Particle Barbette"     />
            <Row icon={<BeamLine color="#fed7aa" />} label="Fusion Barbette"       />
            <Row icon={<BeamLine color="#bbf7d0" />} label="Plasma Barbette"       />
            <Row icon={<BeamLine color="#fcd34d" />} label="Railgun Barbette"      />
          </Section>

        </div>

        {/* Right column */}
        <div className="space-y-5">

          <Section title="Hit effects — vectorial mode">
            <Row icon={<BurstIcon color="#fb923c" />} label="Impact burst"    description="hit registered on target" />
            <Row icon={<CritFlashIcon />}             label="Critical flash"  description="critical system hit applied" />
            <Row icon={<IonBurstIcon />}              label="Ion burst"       description="ion disruption — thrust penalty applied" />
            <Row icon={<ExplosionIcon />}             label="Ship destroyed"  description="hull at 0 — shockwave + debris" />
          </Section>

          <Section title="Movement effects — vectorial mode">
            <Row icon={<PlumeIcon />}         label="Thrust plume"   description="delta-v applied this phase" />
            <Row icon={<MissileLaunchIcon />} label="Missile launch" description="salvo deployed from ship" />
            <Row icon={<MissileTrailIcon />}  label="Missile trail"  description="salvo in flight" />
          </Section>

          <Section title="Persistent indicators — vectorial mode">
            <Row icon={<SensorLockIcon />}   label="Sensor lock"       description="dashed line + ring on target" />
            <Row icon={<EvasiveAuraIcon />}  label="Evasive manoeuvre" description="evasion declared this phase" />
            <Row icon={<IonAuraIcon />}      label="Ion disruption"    description="thrust reduced — clears next round" />
            <Row icon={<DogfightIcon />}     label="Dogfight"          description="two+ ships share a hex" />
            <Row icon={<ExhaustedIcon />}    label="Missile exhausted" description="out of thrust, won't reach target" />
          </Section>

        </div>

      </div>

      {obstaclesEnabled && (
        <>
          <hr className="border-slate-800 my-1" />
          <Section title="Obstacles ✦ — optional, non-RAW, vectorial mode">
            <div className="grid grid-cols-2 gap-x-6">
              <div className="space-y-1">
                <Row icon={<AsteroidFieldIcon density="light" />}
                  label="Asteroid Field (light)"
                  description="movement ×2 · 1D6−Armor collision · DM−1 cover" />
                <Row icon={<AsteroidFieldIcon density="dense" />}
                  label="Asteroid Field (dense)"
                  description="movement ×2 · 2D6−Armor collision · DM−2 cover" />
                <Row icon={<DebrisFieldIcon />}
                  label="Debris Field"
                  description="movement ×2 · 2D6−Armor collision · auto-spawns on ship kill" />
              </div>
              <div className="space-y-1">
                <Row icon={<GravityWellIcon />}
                  label="Gravity Well"
                  description="exclusion zone · 4D6−Armor impact · orange ring = warning" />
                <Row icon={<NebulaIcon />}
                  label="Nebula"
                  description="sensor lock blocked · DM−2 attacks & sensors" />
              </div>
            </div>
          </Section>
        </>
      )}
    </Modal>
  )
}
