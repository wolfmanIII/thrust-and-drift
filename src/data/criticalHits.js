/**
 * Critical hit location and effects tables.
 * // MgT2e CRB p.169–170
 */

// MgT2e CRB p.169 — Critical Hit Location table (2D6)
export const CRITICAL_LOCATION_TABLE = {
  2:  'Sensors',
  3:  'Power Plant',
  4:  'Fuel',
  5:  'Weapon',
  6:  'Armour',
  7:  'Hull',
  8:  'M-Drive',
  9:  'Cargo',
  10: 'J-Drive',
  11: 'Crew',
  12: 'Bridge',
}

/**
 * Get the critical hit location from a 2D6 roll total.
 * // MgT2e CRB p.169
 * @param {number} total  2–12
 * @returns {string}
 */
export function getCriticalLocation(total) {
  return CRITICAL_LOCATION_TABLE[Math.max(2, Math.min(12, total))]
}

// Mechanic codes (drive automated store effects):
// 'descriptive'       — GM resolves narratively; no automated store effect
// 'thrust_reduce'     — M-Drive sev 2–4: thrustPenalty set to max(current, value)
// 'thrust_zero'       — M-Drive sev 5–6: thrustPenalty = profile.thrust
// 'hull_extra_damage' — Hull: roll value×D6 extra damage (ignores armour)
// MgT2e CRB p.170 — Critical Hit Effects table
export const CRITICAL_HIT_EFFECTS = {
  Sensors: [
    null,
    { description: 'All sensor checks suffer DM−2', mechanic: 'descriptive' },
    { description: 'Sensors inoperative beyond Medium range', mechanic: 'descriptive' },
    { description: 'Sensors inoperative beyond Short range', mechanic: 'descriptive' },
    { description: 'Sensors inoperative beyond Close range', mechanic: 'descriptive' },
    { description: 'Sensors inoperative beyond Adjacent range', mechanic: 'descriptive' },
    { description: 'Sensors completely disabled', mechanic: 'descriptive' },
  ],
  'Power Plant': [
    null,
    { description: 'Power reduced by 10%', mechanic: 'descriptive' },
    { description: 'Power reduced by 10%', mechanic: 'descriptive' },
    { description: 'Power reduced by 50%', mechanic: 'descriptive' },
    { description: 'Power offline', mechanic: 'descriptive' },
    { description: 'Hull +1 Severity. Power offline', mechanic: 'descriptive' },
    { description: 'Hull +1D Severity. Power offline', mechanic: 'descriptive' },
  ],
  Fuel: [
    null,
    { description: 'Leak: −1D tons of fuel per hour', mechanic: 'descriptive' },
    { description: 'Leak: −1D tons of fuel per round', mechanic: 'descriptive' },
    { description: 'Leak: −1D × 10% of total fuel', mechanic: 'descriptive' },
    { description: 'Fuel tank destroyed', mechanic: 'descriptive' },
    { description: 'Tank destroyed. Hull +1 Severity', mechanic: 'descriptive' },
    { description: 'Tank destroyed. Hull +1D Severity', mechanic: 'descriptive' },
  ],
  Weapon: [
    null,
    { description: 'A random weapon suffers DM−1 when fired', mechanic: 'descriptive' },
    { description: 'A random weapon is disabled', mechanic: 'descriptive' },
    { description: 'Random weapons destroyed', mechanic: 'descriptive' },
    { description: 'A random weapon explodes. Hull +1 Severity', mechanic: 'descriptive' },
    { description: 'D3 random weapons explode. Hull +1 Severity', mechanic: 'descriptive' },
    { description: '1D random weapons explode. Hull +1 Severity', mechanic: 'descriptive' },
  ],
  Armour: [
    null,
    { description: 'Armour reduced by −1', mechanic: 'descriptive' },
    { description: 'Armour reduced by −D3', mechanic: 'descriptive' },
    { description: 'Armour reduced by −1D', mechanic: 'descriptive' },
    { description: 'Armour reduced by −1D', mechanic: 'descriptive' },
    { description: 'Armour reduced by −2D. Hull +1 Severity', mechanic: 'descriptive' },
    { description: 'Armour reduced by −2D. Hull +1 Severity', mechanic: 'descriptive' },
  ],
  Hull: [
    null,
    { description: 'Vessel takes 1D extra damage', mechanic: 'hull_extra_damage', value: 1 },
    { description: 'Vessel takes 2D extra damage', mechanic: 'hull_extra_damage', value: 2 },
    { description: 'Vessel takes 3D extra damage', mechanic: 'hull_extra_damage', value: 3 },
    { description: 'Vessel takes 4D extra damage', mechanic: 'hull_extra_damage', value: 4 },
    { description: 'Vessel takes 5D extra damage', mechanic: 'hull_extra_damage', value: 5 },
    { description: 'Vessel takes 6D extra damage', mechanic: 'hull_extra_damage', value: 6 },
  ],
  'M-Drive': [
    null,
    { description: 'All ship checks suffer DM−1', mechanic: 'descriptive' },
    { description: 'All checks DM−1. Thrust reduced by −1', mechanic: 'thrust_reduce', value: 1 },
    { description: 'All checks DM−1. Thrust reduced by −1', mechanic: 'thrust_reduce', value: 1 },
    { description: 'All checks DM−1. Thrust reduced by −1', mechanic: 'thrust_reduce', value: 1 },
    { description: 'Thrust reduced to zero', mechanic: 'thrust_zero' },
    { description: 'Thrust reduced to zero. Hull +1 Severity', mechanic: 'thrust_zero' },
  ],
  Cargo: [
    null,
    { description: '10% of cargo is destroyed', mechanic: 'descriptive' },
    { description: '1D × 10% of cargo is destroyed', mechanic: 'descriptive' },
    { description: '2D × 10% of cargo is destroyed', mechanic: 'descriptive' },
    { description: 'All cargo is destroyed', mechanic: 'descriptive' },
    { description: 'All cargo is destroyed. Hull +1 Severity', mechanic: 'descriptive' },
    { description: 'All cargo is destroyed. Hull +1 Severity', mechanic: 'descriptive' },
  ],
  'J-Drive': [
    null,
    { description: 'All Jump drive checks suffer DM−2', mechanic: 'descriptive' },
    { description: 'Jump drive disabled', mechanic: 'descriptive' },
    { description: 'Jump drive destroyed', mechanic: 'descriptive' },
    { description: 'Jump drive destroyed. Hull +1 Severity', mechanic: 'descriptive' },
    { description: 'Jump drive destroyed. Hull +1 Severity', mechanic: 'descriptive' },
    { description: 'Jump drive destroyed. Hull +1 Severity', mechanic: 'descriptive' },
  ],
  Crew: [
    null,
    { description: 'A random occupant takes 1D damage', mechanic: 'descriptive' },
    { description: 'Life support fails within 1D hours', mechanic: 'descriptive' },
    { description: '1D occupants take 2D damage', mechanic: 'descriptive' },
    { description: 'Life support fails within 1D rounds', mechanic: 'descriptive' },
    { description: 'All occupants take 3D damage', mechanic: 'descriptive' },
    { description: 'Life support fails immediately', mechanic: 'descriptive' },
  ],
  Bridge: [
    null,
    { description: 'A random bridge station is disabled', mechanic: 'descriptive' },
    { description: 'Computer reboots; software unavailable this round and next', mechanic: 'descriptive' },
    { description: 'Computer damaged. Bandwidth reduced by −50%', mechanic: 'descriptive' },
    { description: 'Bridge station destroyed. Occupant takes 1D×1D damage', mechanic: 'descriptive' },
    { description: 'Computer destroyed', mechanic: 'descriptive' },
    { description: 'Bridge station destroyed. Occupant takes 1D×1D damage. Hull +1 Severity', mechanic: 'descriptive' },
  ],
}

/**
 * Get the critical hit effect for a system at a given severity.
 * // MgT2e CRB p.170
 * @param {string} system  Location name
 * @param {number} severity  1–6
 * @returns {{ description: string, mechanic: string, value?: number } | null}
 */
export function getCriticalEffect(system, severity) {
  const effects = CRITICAL_HIT_EFFECTS[system]
  if (!effects) return null
  return effects[Math.max(1, Math.min(6, severity))] ?? null
}
