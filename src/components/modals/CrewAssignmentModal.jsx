/**
 * CrewAssignmentModal — assign named crew members to specific roles before battle.
 * Non-gunner roles (pilot, leadership, tactics, engineer, sensors) have one slot each.
 * Each turret slot gets its own gunner assignment.
 * A role left unassigned contributes 0 skill — no modifier applied.
 */

import { useState, useMemo } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'
import { migrateCrew } from '../../utils/crew.js'

const ROLE_LABELS = {
  pilot:      'Pilot',
  leadership: 'Leadership (LDR)',
  tactics:    'Tactics (TAC)',
  engineer:   'Engineer',
  sensors:    'Sensors',
}

const NON_GUNNER_ROLES = ['pilot', 'leadership', 'tactics', 'engineer', 'sensors']

/** Skill badge shown next to a crew member's name. */
function SkillBadge({ member, role }) {
  const level = member.skills?.[role] ?? 0
  if (level === 0) return <span className="text-slate-600 font-mono text-xs">—</span>
  return <span className="text-(--neon-cyan) font-mono text-xs">{role} {level}</span>
}

export function CrewAssignmentModal() {
  const closeModal         = useUiStore((s) => s.closeModal)
  const modalPayload       = useUiStore((s) => s.modalPayload)
  const ships              = useBattleStore((s) => s.ships)
  const setCrewAssignments = useBattleStore((s) => s.setCrewAssignments)

  const ship = ships.find((s) => s.id === modalPayload?.shipId)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const crewArray = useMemo(() =>
    Array.isArray(ship?.profile.crew)
      ? ship.profile.crew
      : migrateCrew(ship?.profile.crew ?? {}),
  [ship?.id])

  const turrets = ship?.profile.turrets ?? []

  const [assignments, setAssignments] = useState(() => {
    const existing = ship?.crewAssignments
    if (existing) return existing
    const a = { gunners: {} }
    for (const role of NON_GUNNER_ROLES) a[role] = null
    for (const t of turrets) a.gunners[t.slot] = null
    return a
  })

  if (!ship) return null

  const setRole    = (role, memberId) => setAssignments((prev) => ({ ...prev, [role]: memberId || null }))
  const setGunner  = (slot, memberId) => setAssignments((prev) => ({
    ...prev,
    gunners: { ...prev.gunners, [slot]: memberId || null },
  }))

  const handleSave = () => {
    setCrewAssignments(ship.id, assignments)
    closeModal()
  }

  const handleClearAll = () => {
    const cleared = { gunners: {} }
    for (const role of NON_GUNNER_ROLES) cleared[role] = null
    for (const t of turrets) cleared.gunners[t.slot] = null
    setAssignments(cleared)
  }

  const renderSelect = (value, onChange, role) => (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0 bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs rounded px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60"
    >
      <option value="">— unassigned —</option>
      {crewArray.map((m) => {
        const sk = m.skills?.[role] ?? 0
        const label = sk > 0
          ? `${m.name || '(unnamed)'} [${role} ${sk}]`
          : `${m.name || '(unnamed)'}${sk === 0 ? ' [no skill]' : ''}`
        return (
          <option key={m.id} value={m.id}>{label}</option>
        )
      })}
    </select>
  )

  return (
    <Modal title={`Crew Assignments — ${ship.profile.name}`} onClose={closeModal}>
      <div className="space-y-4">

        {crewArray.length === 0 && (
          <p className="text-slate-600 font-mono text-xs italic">
            No named crew on this ship. Add crew members in the profile editor.
          </p>
        )}

        {crewArray.length > 0 && (
          <>
            {/* Non-gunner roles */}
            <div>
              <p className="font-mono text-xs text-slate-400 tracking-widest uppercase mb-1.5">Roles</p>
              <div className="space-y-1.5">
                {NON_GUNNER_ROLES.map((role) => (
                  <div key={role} className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400 w-36 shrink-0">
                      {ROLE_LABELS[role]}
                    </span>
                    {renderSelect(assignments[role], (v) => setRole(role, v), role)}
                  </div>
                ))}
              </div>
            </div>

            {/* Gunner per turret */}
            {turrets.length > 0 && (
              <div>
                <p className="font-mono text-xs text-slate-400 tracking-widest uppercase mb-1.5">
                  Gunners
                </p>
                <div className="space-y-1.5">
                  {turrets.map((t) => (
                    <div key={t.slot} className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400 w-36 shrink-0">
                        Gunner (T{t.slot})
                        <span className="text-slate-500 ml-1">
                          {(t.weapons ?? []).join(', ')}
                        </span>
                      </span>
                      {renderSelect(assignments.gunners?.[t.slot], (v) => setGunner(t.slot, v), 'gunner')}
                    </div>
                  ))}
                </div>
                <p className="font-mono text-xs text-slate-500 mt-1.5">
                  Turrets without a gunner cannot fire.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 border border-slate-700 text-slate-500 font-mono text-xs rounded hover:border-slate-500 hover:text-slate-400 transition-colors"
              >
                CLEAR ALL
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-1.5 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors"
              >
                SAVE ASSIGNMENTS
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
