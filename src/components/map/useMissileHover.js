/**
 * useMissileHover — detects which missile token is under the cursor on the canvas.
 * Shows the missile tooltip after a 150ms idle delay.
 * Clears immediately on mouse leave, mouse down (pan start), or when cursor
 * moves to a hex with no missile.
 */

import { useCallback, useRef, useEffect } from 'react'
import { pixelToHex } from '../../utils/hex.js'
import { useUiStore }    from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

/**
 * @param {{
 *   canvasRef: React.RefObject<HTMLCanvasElement>,
 *   hexSize:   number,
 *   offset:    React.MutableRefObject<{x: number, y: number}>,
 *   zoom:      React.MutableRefObject<number>,
 * }} params
 * @returns {{ onMissileHoverMove: Function, onMissileHoverLeave: Function, onMissileHoverDown: Function }}
 */
export function useMissileHover({ canvasRef, hexSize, offset, zoom }) {
  const missiles           = useBattleStore((s) => s.missiles)
  const setHoveredMissile  = useUiStore((s) => s.setHoveredMissile)
  const clearHoveredMissile = useUiStore((s) => s.clearHoveredMissile)

  const timerRef = useRef(null)

  const clearTimer = useCallback(() => clearTimeout(timerRef.current), [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const onMissileHoverMove = useCallback((e) => {
    clearTimer()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left - offset.current.x) / zoom.current
    const py = (e.clientY - rect.top  - offset.current.y) / zoom.current
    const hex = pixelToHex(px, py, hexSize)

    const missile = missiles.find((m) => m.position.q === hex.q && m.position.r === hex.r) ?? null
    if (!missile) { clearHoveredMissile(); return }

    const { clientX, clientY } = e
    timerRef.current = setTimeout(() => {
      setHoveredMissile({ missileId: missile.id, x: clientX, y: clientY })
    }, 150)
  }, [canvasRef, hexSize, offset, zoom, missiles, setHoveredMissile, clearHoveredMissile, clearTimer])

  const onMissileHoverLeave = useCallback(() => {
    clearTimer()
    clearHoveredMissile()
  }, [clearTimer, clearHoveredMissile])

  const onMissileHoverDown = useCallback(() => {
    clearTimer()
    clearHoveredMissile()
  }, [clearTimer, clearHoveredMissile])

  return { onMissileHoverMove, onMissileHoverLeave, onMissileHoverDown }
}
