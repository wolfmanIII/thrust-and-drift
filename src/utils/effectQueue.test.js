/**
 * Tests for the module-level canvas effect queue.
 * // Spec §13.4 — Canvas Visual Effects
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { emitEffect, drainEffects, subscribeEffects } from './effectQueue.js'

// Reset the queue before every test (drainEffects clears it)
beforeEach(() => { drainEffects() })

describe('effectQueue', () => {
  describe('emitEffect', () => {
    it('enqueues an effect with the given type', () => {
      emitEffect('laser_ray', { duration: 300, fromHex: { q: 0, r: 0 }, toHex: { q: 1, r: 0 }, weaponType: 'Pulse Laser' })
      const effects = drainEffects()
      expect(effects).toHaveLength(1)
      expect(effects[0].type).toBe('laser_ray')
    })

    it('spreads params onto the effect object', () => {
      emitEffect('impact_burst', { duration: 500, hex: { q: 2, r: 3 }, shipColor: '#60a5fa' })
      const [e] = drainEffects()
      expect(e.duration).toBe(500)
      expect(e.hex).toEqual({ q: 2, r: 3 })
      expect(e.shipColor).toBe('#60a5fa')
    })

    it('sets startedAt to a positive number (performance.now() epoch)', () => {
      const before = performance.now()
      emitEffect('chaff', { duration: 200, hex: { q: 0, r: 0 } })
      const after = performance.now()
      const [e] = drainEffects()
      expect(e.startedAt).toBeGreaterThanOrEqual(before)
      expect(e.startedAt).toBeLessThanOrEqual(after)
    })

    it('multiple calls enqueue in order', () => {
      emitEffect('laser_ray',    { duration: 300 })
      emitEffect('impact_burst', { duration: 500 })
      emitEffect('critical_flash', { duration: 600 })
      const effects = drainEffects()
      expect(effects.map((e) => e.type)).toEqual(['laser_ray', 'impact_burst', 'critical_flash'])
    })
  })

  describe('drainEffects', () => {
    it('returns empty array when queue is empty', () => {
      expect(drainEffects()).toEqual([])
    })

    it('returns all queued effects', () => {
      emitEffect('thrust_plume',  { duration: 400 })
      emitEffect('missile_trail', { duration: 380 })
      const effects = drainEffects()
      expect(effects).toHaveLength(2)
    })

    it('clears the queue after draining', () => {
      emitEffect('chaff', { duration: 200 })
      drainEffects()
      expect(drainEffects()).toHaveLength(0)
    })

    it('two consecutive drains: first gets effects, second gets empty', () => {
      emitEffect('impact_burst', { duration: 500 })
      const first  = drainEffects()
      const second = drainEffects()
      expect(first).toHaveLength(1)
      expect(second).toHaveLength(0)
    })

    it('effects emitted after a drain appear in the next drain', () => {
      emitEffect('laser_ray', { duration: 300 })
      drainEffects()
      emitEffect('critical_flash', { duration: 600 })
      const second = drainEffects()
      expect(second).toHaveLength(1)
      expect(second[0].type).toBe('critical_flash')
    })
  })
})

describe('subscribeEffects', () => {
  it('listener is called when an effect is emitted', () => {
    const fn = vi.fn()
    const unsub = subscribeEffects(fn)
    emitEffect('laser_ray', { duration: 300 })
    expect(fn).toHaveBeenCalledOnce()
    expect(fn.mock.calls[0][0].type).toBe('laser_ray')
    unsub()
    drainEffects()
  })

  it('listener receives the full effect object', () => {
    const fn = vi.fn()
    const unsub = subscribeEffects(fn)
    emitEffect('impact_burst', { duration: 500, hex: { q: 1, r: 2 } })
    const received = fn.mock.calls[0][0]
    expect(received.duration).toBe(500)
    expect(received.hex).toEqual({ q: 1, r: 2 })
    unsub()
    drainEffects()
  })

  it('multiple listeners all receive the effect', () => {
    const a = vi.fn()
    const b = vi.fn()
    const unsubA = subscribeEffects(a)
    const unsubB = subscribeEffects(b)
    emitEffect('critical_flash', { duration: 600 })
    expect(a).toHaveBeenCalledOnce()
    expect(b).toHaveBeenCalledOnce()
    unsubA()
    unsubB()
    drainEffects()
  })

  it('unsubscribe stops listener from receiving further effects', () => {
    const fn = vi.fn()
    const unsub = subscribeEffects(fn)
    unsub()
    emitEffect('laser_ray', { duration: 300 })
    expect(fn).not.toHaveBeenCalled()
    drainEffects()
  })

  it('unsubscribing one listener does not affect others', () => {
    const a = vi.fn()
    const b = vi.fn()
    const unsubA = subscribeEffects(a)
    const unsubB = subscribeEffects(b)
    unsubA()
    emitEffect('chaff', { duration: 200 })
    expect(a).not.toHaveBeenCalled()
    expect(b).toHaveBeenCalledOnce()
    unsubB()
    drainEffects()
  })
})
