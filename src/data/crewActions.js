/**
 * Crew action definitions for the Actions phase.
 * Keyed by crew role. Consumed by ActionModal.
 * // MgT2e CRB p.166–167 — Crew Actions
 */

export const CREW_ACTIONS = {
  leadership: [
    {
      id: 'improve_initiative',
      label: 'Improve Initiative',
      difficulty: 8,
      skill: 'leadership',
      description: "Leadership check. Success: +Effect to initiative next round. // MgT2e CRB p.166",
    },
  ],
  engineer: [
    {
      id: 'overload_drive',
      label: 'Overload M-Drive',
      difficulty: 10,
      skill: 'engineer',
      description: 'Difficult Engineer(m-drive) check (INT). Success: +1 Thrust next round. Effect ≤ −6: M-Drive critical Severity 1. Cumulative DM−2 per attempt. // MgT2e CRB p.171',
    },
    {
      id: 'repair_system',
      label: 'Repair System',
      difficulty: 8,
      skill: 'engineer',
      description: 'Engineer check. Success: removes 1 critical hit. // MgT2e CRB p.167',
    },
  ],
  sensors: [
    {
      id: 'sensor_lock',
      label: 'Sensor Lock',
      difficulty: 8,
      skill: 'sensors',
      requiresTarget: true,
      description: 'Electronics(sensors) check. Success: DM+2 flat to all attacks against target. // MgT2e CRB p.172',
    },
    {
      id: 'electronic_warfare',
      label: 'Electronic Warfare',
      difficulty: 8,
      skill: 'sensors',
      description: 'Electronics check. Success: negates enemy sensor lock. // MgT2e CRB p.167',
    },
    {
      id: 'missile_ew',
      label: 'EW — Counter Missile',
      difficulty: 10,
      skill: 'sensors',
      requiresSalvoTarget: true,
      description: 'Difficult Electronics(comms) check. Success: removes Effect missiles (min 1) from one in-flight salvo. Cumulative across rounds; once per salvo per round. // MgT2e CRB p.173',
    },
  ],
  gunner: [
    {
      id: 'reload_turret',
      label: 'Reload Turret',
      difficulty: 'auto',
      skill: 'gunner',
      description: 'Automatic. Reloads 1 missile turret. // MgT2e CRB p.167',
    },
  ],
}
