/**
 * Dice rolling utilities.
 * All functions are pure — no side effects.
 */

/**
 * Roll n dice with the given number of sides.
 * Returns individual results and their sum.
 * @param {number} n      Number of dice
 * @param {number} sides  Sides per die
 * @returns {{ results: number[], total: number }}
 */
export function rollDice(n, sides) {
  const results = Array.from({ length: n }, () =>
    Math.floor(Math.random() * sides) + 1
  )
  return { results, total: results.reduce((a, b) => a + b, 0) }
}

/**
 * Roll 2D6 — the standard Traveller task check.
 * @returns {{ results: number[], total: number }}
 */
export function roll2D6() {
  return rollDice(2, 6)
}

/**
 * Roll 1D6.
 * @returns {{ results: number[], total: number }}
 */
export function roll1D6() {
  return rollDice(1, 6)
}

/**
 * Format a dice result array as a human-readable string.
 * Example: [3, 5] → "3 + 5 = 8"
 * @param {number[]} results
 * @returns {string}
 */
export function formatDiceResults(results) {
  const total = results.reduce((a, b) => a + b, 0)
  return `${results.join(' + ')} = ${total}`
}

/**
 * Format a full roll result with DMs applied.
 * @param {{ results: number[], total: number }} roll
 * @param {number} dm   Total DM modifier
 * @param {number} target  Target number (e.g. 8 for standard check)
 * @returns {{ display: string, finalTotal: number, success: boolean, effect: number }}
 */
export function formatCheckResult(roll, dm, target = 8) {
  const finalTotal = roll.total + dm
  const effect = finalTotal - target
  const success = finalTotal >= target
  const dmStr = dm >= 0 ? `+${dm}` : `${dm}`
  const display = `[${roll.results.join('+')}]${dm !== 0 ? ` ${dmStr}` : ''} = ${finalTotal}`
  return { display, finalTotal, success, effect }
}
