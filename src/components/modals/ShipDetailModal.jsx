/**
 * ShipDetailModal — read-only full ship sheet during battle.
 */

import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-slate-500 font-mono text-xs">{label}</span>
      <span className="text-slate-200 font-mono text-xs font-bold">{value ?? '—'}</span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-mono text-xs text-slate-500 tracking-widest uppercase mb-1 border-b border-slate-800 pb-1">
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
  const hullPct = profile.hull > 0 ? Math.round((hullCurrent / profile.hull) * 100) : 0

  return (
    <Modal title={profile.name} onClose={closeModal} width="max-w-xl">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {/* Left column */}
        <div className="space-y-3">
          <Section title="Struttura">
            <StatRow label="Hull" value={`${hullCurrent}/${profile.hull} (${hullPct}%)`} />
            <StatRow label="Armatura" value={profile.armor} />
            <StatRow label="Tonnellaggio" value={profile.tonnage ? `${profile.tonnage}t` : null} />
          </Section>

          <Section title="Propulsione">
            <StatRow label="Thrust" value={profile.thrust} />
            <StatRow label="Jump" value={profile.jump || '—'} />
            <StatRow label="Vettore" value={`(${vector.q}, ${vector.r})`} />
          </Section>

          <Section title="Round corrente">
            <StatRow label="Iniziativa" value={initiative} />
            <StatRow label="Evasione" value={`${evasiveThrust} thrust`} />
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-3">
          <Section title="Equipaggio">
            <StatRow label="Pilota" value={profile.crew?.pilot} />
            <StatRow label="Capitano" value={profile.crew?.captain || '—'} />
            <StatRow label="Ingegnere" value={profile.crew?.engineer || '—'} />
            <StatRow label="Artigliere" value={profile.crew?.gunner || '—'} />
          </Section>

          <Section title="Armi">
            {(profile.turrets ?? []).length === 0 && (
              <p className="text-slate-600 font-mono text-xs italic">Nessuna</p>
            )}
            {(profile.turrets ?? []).map((t) => (
              <div key={t.slot} className="py-0.5">
                <span className="text-slate-500 font-mono text-xs">Torretta {t.slot}: </span>
                <span className="text-slate-300 font-mono text-xs">
                  {t.weapons.join(', ')}
                </span>
              </div>
            ))}
          </Section>

          {criticalHits.length > 0 && (
            <Section title="Colpi critici">
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
