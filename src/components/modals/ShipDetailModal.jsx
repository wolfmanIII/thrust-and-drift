/**
 * ShipDetailModal — read-only full ship sheet during battle.
 */

import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { migrateCrew, CREW_SKILLS } from '../../utils/crew.js'
import { countMissileAmmoCapacity, countTorpedoAmmoCapacity, countSandcasters } from '../../utils/combat.js'
import { WEAPONS } from '../../data/weapons.js'

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-slate-400 font-mono text-xs">{label}</span>
      <span className="text-slate-200 font-mono text-xs font-bold">{value ?? '—'}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-mono text-xs text-slate-400 tracking-widest uppercase mb-1 border-b border-slate-800 pb-1">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function ShipDetailModal() {
  const closeModal   = useUiStore((s) => s.closeModal)
  const modalPayload = useUiStore((s) => s.modalPayload)
  const ships        = useBattleStore((s) => s.ships)

  const ship = ships.find((s) => s.id === modalPayload?.shipId)
  if (!ship) return null

  const { profile, hullCurrent, vector, criticalHits, evasiveThrust, initiative } = ship
  const hullPct     = profile.hull > 0 ? Math.round((hullCurrent / profile.hull) * 100) : 0
  const ammoMax        = countMissileAmmoCapacity(profile)
  const torpedoAmmoMax = countTorpedoAmmoCapacity(profile)
  const sandAmmoMax    = countSandcasters(profile)

  return (
    <Modal title={ship.name} subtitle={profile.name !== ship.name ? profile.name : undefined} onClose={closeModal} width="max-w-xl">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Left column */}
        <div className="space-y-3">
          <Section title="Structure">
            <StatRow label="Hull" value={`${hullCurrent}/${profile.hull} (${hullPct}%)`} />
            <StatRow label="Armour" value={profile.armor} />
            <StatRow label="Tonnage" value={profile.tonnage ? `${profile.tonnage}t` : null} />
          </Section>

          <Section title="Propulsion">
            <StatRow label="Thrust" value={profile.thrust} />
            <StatRow label="Jump" value={profile.jump || '—'} />
            <StatRow label="Vector" value={`(${vector.q}, ${vector.r})`} />
          </Section>

          <Section title="Current Round">
            <StatRow label="Initiative" value={initiative} />
            <StatRow label="Evading" value={evasiveThrust > 0 ? `${evasiveThrust} thrust used` : '—'} />
            {(ship.ionRoundsLeft ?? 0) > 0 && (
              <StatRow label="Ion disruption" value={`−${ship.ionPowerReduction ?? 0} PWR · ${ship.ionRoundsLeft}R remaining`} />
            )}
            {(ship.ionRoundsLeft ?? 0) > 0 && (ship.basePower ?? 0) > 0 && (
              <StatRow
                label="Power"
                value={`${ship.currentPower ?? ship.basePower} / ${ship.basePower ?? ship.profile.maxPower ?? 100}${(ship.currentPower ?? ship.basePower ?? 1) <= 0 ? ' — OFFLINE' : ''}`}
              />
            )}
            {(ship.ionRoundsLeft ?? 0) > 0 && (ship.baseBandwidth ?? 0) > 0 && (
              <StatRow
                label="Bandwidth"
                value={(ship.currentBandwidth ?? ship.baseBandwidth ?? 0) <= 0 ? 'DEPLETED — DM-2 attacks' : `${ship.currentBandwidth} / ${ship.baseBandwidth}`}
              />
            )}
          </Section>

          {(ammoMax > 0 || torpedoAmmoMax > 0 || sandAmmoMax > 0) && (
            <Section title="Ammunition">
              {ammoMax > 0 && (
                <StatRow label="Missile ammo" value={`${ship.missileAmmoTotal ?? ammoMax}/${ammoMax}`} />
              )}
              {torpedoAmmoMax > 0 && (
                <StatRow label="Torpedo ammo" value={`${ship.torpedoAmmoTotal ?? torpedoAmmoMax}/${torpedoAmmoMax}`} />
              )}
              {sandAmmoMax > 0 && (
                <StatRow label="Sand canisters" value={`${ship.sandAmmoTotal ?? sandAmmoMax}/${sandAmmoMax}`} />
              )}
            </Section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <Section title="Crew">
            {(() => {
              const crewArray = Array.isArray(profile.crew)
                ? profile.crew
                : migrateCrew(profile.crew ?? {})
              if (crewArray.length === 0) {
                return <p className="text-slate-400 font-mono text-xs italic">No crew.</p>
              }
              return crewArray.map((member) => {
                const skillStr = CREW_SKILLS
                  .filter((s) => (member.skills[s] ?? 0) > 0)
                  .map((s) => `${s} ${member.skills[s]}`)
                  .join(', ') || '—'
                return (
                  <StatRow key={member.id} label={member.name || '(unnamed)'} value={skillStr} />
                )
              })
            })()}
          </Section>

          <Section title="Weapons">
            {(profile.turrets ?? []).length === 0 && (
              <p className="text-slate-400 font-mono text-xs italic">None</p>
            )}
            {(profile.turrets ?? []).map((t) => {
              // Barbette/bay weapons are standalone hardpoints (HG p.29) —
              // never "Turret", regardless of count. Quad Turret (HG p.81) is turret-only.
              const firstMount = t.weapons.length > 0 ? (WEAPONS[t.weapons[0]]?.mount ?? 'turret') : 'turret'
              const mountLabel = firstMount === 'turret'
                ? `${['—', 'Single', 'Double', 'Triple', 'Quad'][t.weapons.length] ?? 'Quad'} Turret`
                : firstMount === 'barbette' ? 'Barbette' : 'Bay'
              return (
                <div key={t.slot} className="py-0.5">
                  <span className="text-slate-400 font-mono text-xs">
                    W{t.slot} [{mountLabel}]:{' '}
                  </span>
                  <span className="text-slate-300 font-mono text-xs">
                    {t.weapons.join(', ')}
                  </span>
                </div>
              )
            })}
          </Section>

          {criticalHits.length > 0 && (
            <Section title="Critical Hits">
              {criticalHits.map((c, i) => (
                <div key={i} className="py-0.5">
                  <span className="text-red-400 font-mono text-xs">
                    {c.system} (Sev. {c.severity})
                  </span>
                </div>
              ))}
            </Section>
          )}
        </div>
      </div>
    </Modal>
  )
}
