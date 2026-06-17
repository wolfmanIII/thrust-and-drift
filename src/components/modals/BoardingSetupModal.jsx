/**
 * BoardingSetupModal — GM selects the boarding target and confirms initiation.
 * Triggered from the context menu on the attacker ship; payload contains attackerId.
 * Shows only valid targets (enemy, adjacent, attacker thrust ≥ defender thrust or M-Drive disabled).
 * @see boarding-system-design.md §2, §5.1
 * @see HG 2022 p.126 — approach conditions
 */

import { useMemo } from 'react'
import { Modal } from './Modal.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'
import { hexDistance }    from '../../utils/hex.js'

/**
 * Whether a defender can be boarded by the given attacker.
 * @param {object} attacker  ShipInstance
 * @param {object} defender  ShipInstance
 * @returns {boolean}
 */
function canBoard(attacker, defender) {
  if (attacker.faction === defender.faction) return false
  if (defender.inDogfight) return false
  if (hexDistance(attacker.position, defender.position) > 1) return false
  const mDriveDisabled = defender.criticalHits?.some((c) => c.system === 'm-drive' && c.disabled)
  if (!mDriveDisabled && attacker.profile.thrust < defender.profile.thrust) return false
  return true
}

export function BoardingSetupModal() {
  const { activeModal, modalPayload, closeModal, openModal } = useUiStore()
  const { ships, startBoarding } = useBattleStore()

  const isOpen = activeModal === 'boarding-setup'
  const attacker = ships.find((s) => s.id === modalPayload?.attackerId)

  const targets = useMemo(() => {
    if (!attacker) return []
    return ships.filter((s) => canBoard(attacker, s))
  }, [attacker, ships])

  if (!isOpen || !attacker) return null

  function handleConfirm(defenderId) {
    startBoarding(attacker.id, defenderId)
    closeModal()
    openModal('boarding-contact', { boardingAttackerId: attacker.id, boardingDefenderId: defenderId })
  }

  return (
    <Modal title="⚔️ BOARDING ACTION" onClose={closeModal}>
      <div className="space-y-4 min-w-72">

        {/* Attacker */}
        <div className="bg-slate-800/80 rounded px-3 py-2.5">
          <p className="text-slate-400 font-mono text-xs uppercase mb-1">Attacker</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: attacker.color }} />
            <span className="text-slate-200 font-mono text-sm font-bold">{attacker.profile.name}</span>
          </div>
          <p className="text-slate-400 font-mono text-xs mt-1">
            Thrust {attacker.profile.thrust} · {attacker.profile.tonnage} ton
          </p>
        </div>

        {/* Target list */}
        {targets.length === 0 ? (
          <p className="text-amber-400 font-mono text-xs text-center py-4">
            NO VALID TARGETS — must be adjacent and thrust ≥ defender
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-slate-400 font-mono text-xs uppercase">Select target</p>
            {targets.map((t) => (
              <button
                key={t.id}
                onClick={() => handleConfirm(t.id)}
                className="w-full flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-(--neon-cyan) rounded px-3 py-2.5 transition-colors text-left"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 font-mono text-sm font-bold truncate">{t.profile.name}</p>
                  <p className="text-slate-400 font-mono text-xs">
                    Thrust {t.profile.thrust} · {t.profile.tonnage} ton
                    {' · '}
                    {t.faction.toUpperCase()}
                  </p>
                </div>
                <span className="text-(--neon-cyan) font-mono text-xs shrink-0">BOARD →</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={closeModal}
          className="w-full py-1.5 text-slate-400 font-mono text-xs hover:text-slate-300 transition-colors"
        >
          CANCEL
        </button>
      </div>
    </Modal>
  )
}
