/**
 * Module-level one-shot canvas effect queue.
 * Not React state — effects are transient visual data only.
 * Any module (store, component, hook) can call emitEffect.
 * useCanvasEffects drains the queue once per rAF frame.
 * Audio subscribers receive every effect synchronously via subscribeEffects.
 */

/** @type {Array<{ type: string, startedAt: number, duration: number }>} */
const _pending = []

/** @type {Array<(effect: object) => void>} */
const _listeners = []

/**
 * Enqueue a one-shot canvas effect and notify all audio listeners.
 * @param {string} type  Effect identifier (laser_ray, impact_burst, etc.)
 * @param {object} params  Effect-specific params; must include `duration` (ms)
 */
export function emitEffect(type, params) {
  const effect = { type, startedAt: performance.now(), ...params }
  _pending.push(effect)
  _listeners.forEach((fn) => fn(effect))
}

/**
 * Return all pending effects and clear the queue.
 * Called once per rAF frame by useCanvasEffects.
 * @returns {Array<object>}
 */
export function drainEffects() {
  return _pending.splice(0)
}

/**
 * Subscribe to all emitted effects. Returns an unsubscribe function.
 * @param {(effect: object) => void} fn
 * @returns {() => void}
 */
export function subscribeEffects(fn) {
  _listeners.push(fn)
  return () => {
    const i = _listeners.indexOf(fn)
    if (i !== -1) _listeners.splice(i, 1)
  }
}
