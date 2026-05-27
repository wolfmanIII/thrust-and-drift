/**
 * Range band definitions for Traveller space combat.
 * // MgT2e CRB p.164 — Range Bands table
 *
 * Each band defines:
 *   - label:      Display name
 *   - maxDistance: Maximum hex distance for this band (inclusive)
 *   - attackDM:   Standard attack DM at this range
 */

/**
 * Range band definitions ordered from closest to furthest.
 * @type {Array<{ label: string, maxDistance: number, attackDM: number }>}
 */
export const RANGE_BANDS = [
  { label: 'Adjacent',  maxDistance: 0,  attackDM:  0 },
  { label: 'Short',     maxDistance: 2,  attackDM:  1 },
  { label: 'Medium',    maxDistance: 15, attackDM:  0 },
  { label: 'Long',      maxDistance: 38, attackDM: -2 },
  { label: 'Very Long', maxDistance: 77, attackDM: -4 },
  { label: 'Distant',   maxDistance: Infinity, attackDM: -6 },
]

/**
 * Map range band label to its attack DM.
 * Useful for direct lookup without array traversal.
 * Distance → band conversion: use hex.js getRangeBand().
 * @type {Record<string, number>}
 */
export const RANGE_BAND_DM = Object.fromEntries(
  RANGE_BANDS.map(b => [b.label, b.attackDM])
)
