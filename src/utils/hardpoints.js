/**
 * Hardpoint budget — CRB p.183: "A ship has one Hardpoint for every full
 * 100 tons of its hull. Each weapon system uses one Hardpoint."
 * Exception — HG p.31 Bay Weapons table: a Large Bay consumes 5 Hardpoints
 * instead of 1 (Small/Medium Bay remain 1, same as turret/barbette).
 *
 * Small craft (< 100 tons) use Firmpoints instead of Hardpoints (CRB p.183):
 * < 35 tons → 1, 35–70 tons → 2, 71–99 tons → 3. For the purposes of this
 * budget count, a Firmpoint is treated the same as a Hardpoint (1 slot each,
 * same cost rules) — the RAW distinction that a Firmpoint may only carry a
 * fixed mount or single turret (never double/triple/barbette/bay) is a
 * separate, not-yet-enforced restriction, out of scope for this budget count.
 */

import { WEAPONS } from '../data/weapons.js'

/** Total Hardpoints (or Firmpoints, for small craft) available for a given hull tonnage. */
export function hardpointBudget(tonnage) {
  const t = tonnage ?? 0
  if (t >= 100) return Math.floor(t / 100)
  if (t >= 71) return 3
  if (t >= 35) return 2
  return 1
}

/**
 * Hardpoint cost of a single weapon slot (turret object with a `weapons`
 * array). A slot's cost depends only on its mount type, not on how many
 * weapons it holds — a Double/Triple/Quad Turret is still 1 Hardpoint,
 * a Barbette is 1 Hardpoint, a Small/Medium Bay is 1 Hardpoint, and a
 * Large Bay is 5 Hardpoints (HG p.31).
 */
export function slotHardpointCost(turret) {
  const firstWeapon = turret?.weapons?.[0]
  if (!firstWeapon) return 0
  const weapon = WEAPONS[firstWeapon]
  if (weapon?.mount === 'bay' && firstWeapon.includes('Large')) return 5
  return 1
}

/** Total Hardpoints consumed across all weapon slots. */
export function totalHardpointsUsed(turrets) {
  return (turrets ?? []).reduce((sum, t) => sum + slotHardpointCost(t), 0)
}
