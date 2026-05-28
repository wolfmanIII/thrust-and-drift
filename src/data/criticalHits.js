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
    { description: 'Tutti i controlli dei sensori subiscono DM−2', mechanic: 'descriptive' },
    { description: 'Sensori inoperativi oltre la gittata Media', mechanic: 'descriptive' },
    { description: 'Sensori inoperativi oltre la gittata Corta', mechanic: 'descriptive' },
    { description: 'Sensori inoperativi oltre la gittata Ravvicinata', mechanic: 'descriptive' },
    { description: 'Sensori inoperativi oltre la gittata Adiacente', mechanic: 'descriptive' },
    { description: 'Sensori completamente disabilitati', mechanic: 'descriptive' },
  ],
  'Power Plant': [
    null,
    { description: 'Alimentazione ridotta del 10%', mechanic: 'descriptive' },
    { description: 'Alimentazione ridotta del 10%', mechanic: 'descriptive' },
    { description: 'Alimentazione ridotta del 50%', mechanic: 'descriptive' },
    { description: 'Alimentazione azzerata', mechanic: 'descriptive' },
    { description: 'Hull +1 Severità. Alimentazione azzerata', mechanic: 'descriptive' },
    { description: 'Hull +1D Severità. Alimentazione azzerata', mechanic: 'descriptive' },
  ],
  Fuel: [
    null,
    { description: 'Perdita: −1D tonnellate di carburante per ora', mechanic: 'descriptive' },
    { description: 'Perdita: −1D tonnellate di carburante per round', mechanic: 'descriptive' },
    { description: 'Perdita: −1D × 10% del carburante totale', mechanic: 'descriptive' },
    { description: 'Serbatoio carburante distrutto', mechanic: 'descriptive' },
    { description: 'Serbatoio distrutto. Hull +1 Severità', mechanic: 'descriptive' },
    { description: 'Serbatoio distrutto. Hull +1D Severità', mechanic: 'descriptive' },
  ],
  Weapon: [
    null,
    { description: "Un'arma casuale subisce DM−1 quando utilizzata", mechanic: 'descriptive' },
    { description: "Un'arma casuale è disabilitata", mechanic: 'descriptive' },
    { description: 'Armi casuali distrutte', mechanic: 'descriptive' },
    { description: "Un'arma casuale esplode. Hull +1 Severità", mechanic: 'descriptive' },
    { description: 'D3 armi casuali esplodono. Hull +1 Severità', mechanic: 'descriptive' },
    { description: '1D armi casuali esplodono. Hull +1 Severità', mechanic: 'descriptive' },
  ],
  Armour: [
    null,
    { description: 'Armatura ridotta di −1', mechanic: 'descriptive' },
    { description: 'Armatura ridotta di −D3', mechanic: 'descriptive' },
    { description: 'Armatura ridotta di −1D', mechanic: 'descriptive' },
    { description: 'Armatura ridotta di −1D', mechanic: 'descriptive' },
    { description: 'Armatura ridotta di −2D. Hull +1 Severità', mechanic: 'descriptive' },
    { description: 'Armatura ridotta di −2D. Hull +1 Severità', mechanic: 'descriptive' },
  ],
  Hull: [
    null,
    { description: 'Il vascello subisce 1D danno aggiuntivo', mechanic: 'hull_extra_damage', value: 1 },
    { description: 'Il vascello subisce 2D danno aggiuntivo', mechanic: 'hull_extra_damage', value: 2 },
    { description: 'Il vascello subisce 3D danno aggiuntivo', mechanic: 'hull_extra_damage', value: 3 },
    { description: 'Il vascello subisce 4D danno aggiuntivo', mechanic: 'hull_extra_damage', value: 4 },
    { description: 'Il vascello subisce 5D danno aggiuntivo', mechanic: 'hull_extra_damage', value: 5 },
    { description: 'Il vascello subisce 6D danno aggiuntivo', mechanic: 'hull_extra_damage', value: 6 },
  ],
  'M-Drive': [
    null,
    { description: 'Tutti i controlli del vascello subiscono DM−1', mechanic: 'descriptive' },
    { description: 'Tutti i controlli DM−1. Thrust ridotto di −1', mechanic: 'thrust_reduce', value: 1 },
    { description: 'Tutti i controlli DM−1. Thrust ridotto di −1', mechanic: 'thrust_reduce', value: 1 },
    { description: 'Tutti i controlli DM−1. Thrust ridotto di −1', mechanic: 'thrust_reduce', value: 1 },
    { description: 'Thrust ridotto a zero', mechanic: 'thrust_zero' },
    { description: 'Thrust ridotto a zero. Hull +1 Severità', mechanic: 'thrust_zero' },
  ],
  Cargo: [
    null,
    { description: 'Il 10% del carico è distrutto', mechanic: 'descriptive' },
    { description: '1D × 10% del carico è distrutto', mechanic: 'descriptive' },
    { description: '2D × 10% del carico è distrutto', mechanic: 'descriptive' },
    { description: 'Tutto il carico è distrutto', mechanic: 'descriptive' },
    { description: 'Tutto il carico è distrutto. Hull +1 Severità', mechanic: 'descriptive' },
    { description: 'Tutto il carico è distrutto. Hull +1 Severità', mechanic: 'descriptive' },
  ],
  'J-Drive': [
    null,
    { description: 'Tutti i controlli del motore Jump subiscono DM−2', mechanic: 'descriptive' },
    { description: 'Motore Jump disabilitato', mechanic: 'descriptive' },
    { description: 'Motore Jump distrutto', mechanic: 'descriptive' },
    { description: 'Motore Jump distrutto. Hull +1 Severità', mechanic: 'descriptive' },
    { description: 'Motore Jump distrutto. Hull +1 Severità', mechanic: 'descriptive' },
    { description: 'Motore Jump distrutto. Hull +1 Severità', mechanic: 'descriptive' },
  ],
  Crew: [
    null,
    { description: 'Un occupante casuale subisce 1D danno', mechanic: 'descriptive' },
    { description: 'Il supporto vitale cessa entro 1D ore', mechanic: 'descriptive' },
    { description: '1D occupanti subiscono 2D danno', mechanic: 'descriptive' },
    { description: 'Il supporto vitale cessa entro 1D round', mechanic: 'descriptive' },
    { description: 'Tutti gli occupanti subiscono 3D danno', mechanic: 'descriptive' },
    { description: 'Il supporto vitale cessa immediatamente', mechanic: 'descriptive' },
  ],
  Bridge: [
    null,
    { description: 'Postazione ponte casuale disabilitata', mechanic: 'descriptive' },
    { description: 'Il computer si riavvia; software non disponibili questo round e il prossimo', mechanic: 'descriptive' },
    { description: 'Computer danneggiato. Bandwidth ridotta del −50%', mechanic: 'descriptive' },
    { description: 'Postazione ponte distrutta. Occupante subisce 1D×1D danno', mechanic: 'descriptive' },
    { description: 'Computer distrutto', mechanic: 'descriptive' },
    { description: 'Postazione ponte distrutta. Occupante subisce 1D×1D danno. Hull +1 Severità', mechanic: 'descriptive' },
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
