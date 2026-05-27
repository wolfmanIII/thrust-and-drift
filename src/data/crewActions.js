/**
 * Crew action definitions for the Actions phase.
 * Keyed by crew role. Consumed by ActionModal.
 * // MgT2e CRB p.166–167 — Crew Actions
 */

export const CREW_ACTIONS = {
  captain: [
    {
      id: 'improve_initiative',
      label: 'Migliora Iniziativa',
      difficulty: 8,
      skill: 'captain',
      description: "Leadership check. Successo: +Effect all'iniziativa del round successivo. // MgT2e CRB p.166",
    },
  ],
  engineer: [
    {
      id: 'overload_drive',
      label: 'Overload M-Drive',
      difficulty: 8,
      skill: 'engineer',
      description: 'Engineer check. Successo: +Effect al Thrust per questo round. // MgT2e CRB p.167',
    },
    {
      id: 'repair_system',
      label: 'Ripara Sistema',
      difficulty: 8,
      skill: 'engineer',
      description: 'Engineer check. Successo: rimuove 1 colpo critico. // MgT2e CRB p.167',
    },
  ],
  sensors: [
    {
      id: 'sensor_lock',
      label: 'Sensor Lock',
      difficulty: 8,
      skill: 'sensors',
      requiresTarget: true,
      description: 'Electronics(sensors) check. Successo: +Effect DM agli attacchi contro il bersaglio. // MgT2e CRB p.167',
    },
    {
      id: 'electronic_warfare',
      label: 'Electronic Warfare',
      difficulty: 8,
      skill: 'sensors',
      description: 'Electronics check. Successo: nega sensor lock nemico. // MgT2e CRB p.167',
    },
  ],
  gunner: [
    {
      id: 'reload_turret',
      label: 'Ricarica Torretta',
      difficulty: 'auto',
      skill: 'gunner',
      description: 'Automatico. Ricarica 1 torretta missili. // MgT2e CRB p.167',
    },
  ],
}
