/**
 * PassingAttackModal — shown after resolveMovement when hostile ships passed within
 * Short range (≤ 2 hexes) during the movement phase without ending in the same hex.
 * GM can open fire on one of the ships or pass the opportunity.
 * // Traveller Companion p.172 — Ships That Pass in the Night
 */

import { Modal }          from './Modal.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'
import { getRangeBand }   from '../../utils/hex.js'

export function PassingAttackModal() {
  const encounters                = useBattleStore((s) => s.passingEncounters)
  const ships                     = useBattleStore((s) => s.ships)
  const pendingMissileImpacts     = useBattleStore((s) => s.pendingMissileImpacts)
  const dismissPassingEncounter   = useBattleStore((s) => s.dismissPassingEncounter)
  const markPassingEncounterFired = useBattleStore((s) => s.markPassingEncounterFired)
  const openModal                 = useUiStore((s) => s.openModal)
  const activeModal               = useUiStore((s) => s.activeModal)

  // Disable action buttons while another modal (e.g. AttackModal) is open —
  // prevents double-firing when panels stack at the same screen position.
  const actionsLocked = activeModal !== null

  const encounter = encounters[0]
  // Missile impacts take priority — resolve them before handling passing encounters
  if (!encounter || pendingMissileImpacts.length > 0) return null

  const shipA = ships.find((s) => s.id === encounter.shipAId)
  const shipB = ships.find((s) => s.id === encounter.shipBId)

  // Stale encounter: ship removed (undo) or destroyed during missile impact resolution
  if (!shipA || !shipB || shipA.isDestroyed || shipB.isDestroyed) {
    dismissPassingEncounter(encounter.id)
    return null
  }

  const rangeBand  = getRangeBand(encounter.minDistance)
  const remaining  = encounters.length

  function handleOpenFire(attackerShipId) {
    const side = attackerShipId === encounter.shipAId ? 'A' : 'B'
    markPassingEncounterFired(encounter.id, side)
    openModal('attack', { shipId: attackerShipId })
  }

  function handlePass() {
    dismissPassingEncounter(encounter.id)
  }

  return (
    <Modal>
      <div className="flex flex-col gap-5 min-w-85">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h2 className="font-display text-(--neon-cyan) tracking-widest text-sm">
            ✨ PASSING ENCOUNTER
          </h2>
          {remaining > 1 && (
            <span className="font-mono text-xs text-slate-400">
              {remaining} PENDING
            </span>
          )}
        </div>

        {/* ── Ship names ──────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-4">
          <span
            className="font-display text-base tracking-wide"
            style={{ color: shipA.color }}
          >
            {shipA.profile.name}
          </span>
          <span className="text-slate-400 font-mono text-xs">⟶|⟵</span>
          <span
            className="font-display text-base tracking-wide"
            style={{ color: shipB.color }}
          >
            {shipB.profile.name}
          </span>
        </div>

        {/* ── Approach data ───────────────────────────────────────── */}
        <div className="bg-slate-800/60 border border-slate-700 rounded px-4 py-3 flex flex-col gap-1 text-center">
          <div className="font-mono text-xs text-slate-400 tracking-widest">
            CLOSEST APPROACH
          </div>
          <div className="font-display text-2xl text-white">
            {encounter.minDistance === 0
              ? 'ADJACENT'
              : `${encounter.minDistance} HEX${encounter.minDistance !== 1 ? 'ES' : ''}`}
          </div>
          <div className="font-mono text-xs text-(--neon-cyan) tracking-widest">
            {rangeBand.toUpperCase()}
          </div>
        </div>

        <p className="font-mono text-xs text-slate-400 text-center leading-relaxed">
          Open fire now, or let them pass.
          <br />
          Attack roll uses current ship positions.
        </p>

        {/* ── Action buttons ──────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              disabled={encounter.firedA || actionsLocked}
              onClick={() => handleOpenFire(shipA.id)}
              className={`flex-1 font-mono text-xs tracking-widest py-2 rounded transition-colors
                ${encounter.firedA || actionsLocked
                  ? 'bg-slate-800/40 border border-slate-700 text-slate-400 cursor-default'
                  : 'bg-amber-900/40 border border-amber-600/60 text-amber-300 hover:bg-amber-800/50'
                }`}
            >
              {encounter.firedA ? `✅ ${shipA.profile.name.toUpperCase()} FIRED` : `${shipA.profile.name.toUpperCase()} FIRES`}
            </button>
            <button
              disabled={encounter.firedB || actionsLocked}
              onClick={() => handleOpenFire(shipB.id)}
              className={`flex-1 font-mono text-xs tracking-widest py-2 rounded transition-colors
                ${encounter.firedB || actionsLocked
                  ? 'bg-slate-800/40 border border-slate-700 text-slate-400 cursor-default'
                  : 'bg-amber-900/40 border border-amber-600/60 text-amber-300 hover:bg-amber-800/50'
                }`}
            >
              {encounter.firedB ? `✅ ${shipB.profile.name.toUpperCase()} FIRED` : `${shipB.profile.name.toUpperCase()} FIRES`}
            </button>
          </div>
          <button
            disabled={actionsLocked}
            onClick={handlePass}
            className={`w-full font-mono text-xs tracking-widest py-2 rounded transition-colors
              ${actionsLocked
                ? 'bg-slate-800/40 border border-slate-700 text-slate-400 cursor-default'
                : 'bg-slate-800/60 border border-slate-600 text-slate-400 hover:bg-slate-700/60'
              }`}
          >
            PASS — LET THEM GO
          </button>
        </div>

      </div>
    </Modal>
  )
}
