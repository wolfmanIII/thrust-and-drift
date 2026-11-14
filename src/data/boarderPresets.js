/**
 * Boarder presets — NPC experience levels and personal armour.
 * Presets only pre-fill the GM's form: the rules never say where an NPC's
 * characteristic bonuses go, so the GM assigns them.
 */

/**
 * NPC experience levels.
 * Green characters have a score of 7 in every characteristic; more experienced
 * ones add bonuses to some of them. `bonuses` is the list printed in the CRB
 * experience table, kept as a hint for the GM (not auto-assigned).
 * // MgT2e CRB p.92–93 — NPC experience table
 * @type {Record<'green'|'average'|'experienced'|'elite', { label: string, base: number, bonuses: number[] }>}
 */
export const NPC_EXPERIENCE = {
  green:       { label: 'Green',       base: 7, bonuses: [] },
  average:     { label: 'Average',     base: 7, bonuses: [1] },
  experienced: { label: 'Experienced', base: 7, bonuses: [1, 2] },
  elite:       { label: 'Elite',       base: 7, bonuses: [1, 2, 3] },
}

/**
 * Personal armour Protection by type and TL.
 * Reflec (+10, lasers only) is omitted: it never protects against canister damage.
 * Ablat's +6 applies against lasers only, so only its general +1 is listed.
 * Battle dress also raises STR/DEX, but "damage to the wearer's characteristics is
 * calculated as normal" — the GM enters the characteristics to be tracked.
 * // MgT2e CRB p.100 (table), FAQ Aug24 p.1 (errata)
 * @type {Record<string, { label: string, protection: number }>}
 */
export const PERSONAL_ARMOUR = {
  none:        { label: 'No armour',            protection: 0 },
  jack:        { label: 'Jack',                 protection: 1 },
  mesh:        { label: 'Mesh',                 protection: 2 },
  cloth_tl7:   { label: 'Cloth (TL7)',          protection: 5 },
  cloth_tl10:  { label: 'Cloth (TL10)',         protection: 8 },
  flak_tl7:    { label: 'Flak Jacket (TL7)',    protection: 3 },
  flak_tl8:    { label: 'Flak Jacket (TL8)',    protection: 5 },
  ablat:       { label: 'Ablat',                protection: 1 },
  vacc_tl8:    { label: 'Vacc Suit (TL8)',      protection: 4 },
  vacc_tl10:   { label: 'Vacc Suit (TL10)',     protection: 8 },
  vacc_tl12:   { label: 'Vacc Suit (TL12)',     protection: 10 },
  hev_tl9:     { label: 'HEV Suit (TL9)',       protection: 8 },
  hev_tl10:    { label: 'HEV Suit (TL10)',      protection: 9 },
  hev_tl13:    { label: 'HEV Suit (TL13)',      protection: 14 },
  hev_tl14:    { label: 'HEV Suit (TL14)',      protection: 15 },
  combat_tl10: { label: 'Combat Armour (TL10)', protection: 13 },
  combat_tl12: { label: 'Combat Armour (TL12)', protection: 17 },
  combat_tl14: { label: 'Combat Armour (TL14)', protection: 19 },
  battle_tl13: { label: 'Battle Dress (TL13)',  protection: 22 },
  battle_tl14: { label: 'Battle Dress (TL14)',  protection: 25 },
}
