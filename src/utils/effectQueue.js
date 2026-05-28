/**
 * Module-level one-shot canvas effect queue.
 * Not React state — effects are transient visual data only.
 * Any module (store, component, hook) can call emitEffect.
 * useCanvasEffects drains the queue once per rAF frame.
 */

/** @type {Array<{ type: string, startedAt: number, duration: number }>} */
const _pending = []

/**
 * Enqueue a one-shot canvas effect.
 * @param {string} type  Effect identifier (laser_ray, impact_burst, etc.)
 * @param {object} params  Effect-specific params; must include `duration` (ms)
 */
export function emitEffect(type, params) {
  _pending.push({ type, startedAt: performance.now(), ...params })
}

/**
 * Return all pending effects and clear the queue.
 * Called once per rAF frame by useCanvasEffects.
 * @returns {Array<object>}
 */
export function drainEffects() {
  return _pending.splice(0)
}
