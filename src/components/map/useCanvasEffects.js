/**
 * Hook owning the canvas effects rAF loop.
 * Renders on a separate overlay canvas (pointer-events:none) so effects
 * never interfere with the main battle map render loop.
 *
 * One-shot effects: consumed from effectQueue, play and expire.
 * Persistent effects: derived from live store state each frame.
 * // Spec §13.4 — Canvas Visual Effects
 */

import { useEffect, useRef } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { hexToPixel } from '../../utils/hex.js'
import { drainEffects, emitEffect } from '../../utils/effectQueue.js'
import {
  drawLaserRay,
  drawImpactBurst,
  drawThrustPlume,
  drawCriticalFlash,
  drawMissileTrail,
  drawMissileLaunch,
  drawChaff,
  drawSensorLockRing,
  drawEvasiveAura,
  drawMissileExhausted,
  drawDogfightAlert,
  drawShipDestroyed,
  drawIonBurst,
  drawIonAura,
} from './effectRenderers.js'

const HEX_SIZE = 32  // must match useCanvasRenderer.js

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Render a single one-shot effect at the given animation progress.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} effect
 * @param {number} t  Progress 0→1
 * @param {number} size  Pixel hex size (HEX_SIZE * zoom)
 * @param {number} ox   Pan offset X
 * @param {number} oy   Pan offset Y
 */
function renderOneshotEffect(ctx, effect, t, size, ox, oy) {
  const hpx = (hex) => hexToPixel(hex.q, hex.r, size, ox, oy)

  switch (effect.type) {
    case 'laser_ray': {
      if (!effect.fromHex || !effect.toHex) break
      drawLaserRay(ctx, hpx(effect.fromHex), hpx(effect.toHex), effect.weaponType, t)
      break
    }
    case 'impact_burst': {
      if (!effect.hex) break
      const { x: cx, y: cy } = hpx(effect.hex)
      drawImpactBurst(ctx, cx, cy, effect.shipColor, t)
      break
    }
    case 'thrust_plume': {
      if (!effect.hex || !effect.delta) break
      const { x: cx, y: cy } = hpx(effect.hex)
      const raw = hexToPixel(effect.delta.q, effect.delta.r, size)
      const len = Math.sqrt(raw.x * raw.x + raw.y * raw.y)
      if (len === 0) break
      drawThrustPlume(ctx, cx, cy, raw.x / len, raw.y / len, effect.shipColor, t)
      break
    }
    case 'critical_flash': {
      if (!effect.hex) break
      const { x: cx, y: cy } = hpx(effect.hex)
      drawCriticalFlash(ctx, cx, cy, effect.system, t)
      break
    }
    case 'missile_trail': {
      if (!effect.fromHex || !effect.toHex) break
      drawMissileTrail(ctx, hpx(effect.fromHex), hpx(effect.toHex), t)
      break
    }
    case 'missile_launch': {
      if (!effect.hex) break
      const { x: cx, y: cy } = hpx(effect.hex)
      drawMissileLaunch(ctx, cx, cy, t)
      break
    }
    case 'chaff': {
      if (!effect.hex) break
      const { x: cx, y: cy } = hpx(effect.hex)
      drawChaff(ctx, cx, cy, t)
      break
    }
    case 'ship_destroyed': {
      if (!effect.hex) break
      const { x: cx, y: cy } = hpx(effect.hex)
      drawShipDestroyed(ctx, cx, cy, t)
      break
    }
    case 'ion_burst': {
      if (!effect.hex) break
      const { x: cx, y: cy } = hpx(effect.hex)
      drawIonBurst(ctx, cx, cy, t)
      break
    }
  }
}

/**
 * Draw all condition-based persistent overlays from current store state.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object[]} ships
 * @param {object[]} missiles
 * @param {number} size
 * @param {number} ox
 * @param {number} oy
 * @param {number} timestamp  rAF timestamp
 */
function renderPersistentEffects(ctx, ships, missiles, size, ox, oy, timestamp) {
  const hpx = (pos) => hexToPixel(pos.q, pos.r, size, ox, oy)

  // Sensor lock rings — dashed line + ring on target
  for (const ship of ships) {
    if (!ship.sensorLockOn || ship.isDestroyed || ship.hullCurrent === 0) continue
    const target = ships.find((s) => s.id === ship.sensorLockOn)
    if (!target || target.isDestroyed || target.hullCurrent === 0) continue
    drawSensorLockRing(ctx, hpx(ship.position), hpx(target.position), timestamp)
  }

  // Evasive auras
  for (const ship of ships) {
    if (!ship.evasiveThrust) continue
    const { x: cx, y: cy } = hpx(ship.position)
    drawEvasiveAura(ctx, cx, cy, timestamp)
  }

  // Ion disruption aura
  for (const ship of ships) {
    if (!(ship.ionRoundsLeft > 0) || ship.isDestroyed) continue
    const { x: cx, y: cy } = hpx(ship.position)
    drawIonAura(ctx, cx, cy, timestamp)
  }

  // Exhausted missiles (thrust = 0 before reaching target)
  for (const missile of missiles) {
    if (missile.thrustRemaining > 0) continue
    const { x: cx, y: cy } = hpx(missile.position)
    drawMissileExhausted(ctx, cx, cy)
  }

  // Dogfight detection: ships sharing a hex position
  /** @type {Map<string, object[]>} */
  const posMap = new Map()
  for (const ship of ships) {
    const key = `${ship.position.q},${ship.position.r}`
    if (!posMap.has(key)) posMap.set(key, [])
    posMap.get(key).push(ship)
  }
  for (const [, group] of posMap) {
    if (group.length < 2) continue
    const { x: cx, y: cy } = hpx(group[0].position)
    drawDogfightAlert(ctx, cx, cy, timestamp)
  }
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

/**
 * @param {{
 *   effectsCanvasRef: React.RefObject<HTMLCanvasElement>,
 *   offset: React.MutableRefObject<{x:number,y:number}>,
 *   zoom: React.MutableRefObject<number>,
 * }} params
 */
export function useCanvasEffects({ effectsCanvasRef, offset, zoom }) {
  // Needed only for missile-trail detection (prev vs current comparison)
  const missiles = useBattleStore((s) => s.missiles)

  const prevMissilesRef = useRef([])
  useEffect(() => {
    for (const missile of missiles) {
      const prev = prevMissilesRef.current.find((m) => m.id === missile.id)
      if (
        prev &&
        (prev.position.q !== missile.position.q ||
          prev.position.r !== missile.position.r)
      ) {
        emitEffect('missile_trail', {
          duration: 2500,
          fromHex: prev.position,
          toHex:   missile.position,
        })
      }
    }
    prevMissilesRef.current = missiles
  }, [missiles])

  // Active one-shot effects list — ref to avoid triggering re-renders
  const activeRef = useRef([])

  // rAF loop — runs for component lifetime.
  // Reads ships/missiles directly from useBattleStore.getState() each frame —
  // Zustand updates its store synchronously on set(), so getState() always
  // reflects the latest state without waiting for React to commit and fire
  // useLayoutEffect. This eliminates the stale-ref window between the React
  // commit phase and the next rAF callback.
  useEffect(() => {
    const canvas = effectsCanvasRef.current
    if (!canvas) return

    let rafId

    function frame(timestamp) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const drained = drainEffects()
      if (drained.length > 0) activeRef.current.push(...drained)

      const z    = zoom.current
      const ox   = offset.current.x
      const oy   = offset.current.y
      const size = HEX_SIZE * z

      const { ships: liveShips, missiles: liveMissiles } = useBattleStore.getState()
      renderPersistentEffects(ctx, liveShips, liveMissiles, size, ox, oy, timestamp)

      activeRef.current = activeRef.current.filter((effect) => {
        const t = (timestamp - effect.startedAt) / effect.duration
        if (t >= 1) return false
        renderOneshotEffect(ctx, effect, Math.min(t, 1), size, ox, oy)
        return true
      })

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [effectsCanvasRef, offset, zoom])

  // Sync effects canvas dimensions with container
  useEffect(() => {
    const canvas = effectsCanvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [effectsCanvasRef])
}
