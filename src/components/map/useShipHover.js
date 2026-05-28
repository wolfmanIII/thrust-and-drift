/**
 * useShipHover — detects which ship token is under the cursor on the canvas.
 * Shows the ship tooltip after a 200ms idle delay to avoid flickering during pan.
 * Clears immediately on mouse leave, mouse down (pan start), or when cursor
 * moves to an empty hex.
 */

import { useCallback, useRef, useEffect } from 'react'
import { pixelToHex } from '../../utils/hex.js'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

/**
 * @param {{
 *   canvasRef: React.RefObject<HTMLCanvasElement>,
 *   hexSize:   number,
 *   offset:    React.MutableRefObject<{x: number, y: number}>,
 *   zoom:      React.MutableRefObject<number>,
 * }} params
 * @returns {{
 *   onHoverMove:  Function,
 *   onHoverLeave: Function,
 *   onHoverDown:  Function,
 * }}
 */
export function useShipHover({ canvasRef, hexSize, offset, zoom }) {
  const ships           = useBattleStore((s) => s.ships)
  const setHoveredShip  = useUiStore((s) => s.setHoveredShip)
  const clearHoveredShip = useUiStore((s) => s.clearHoveredShip)

  const timerRef = useRef(null)

  const clearTimer = useCallback(() => {
    clearTimeout(timerRef.current)
  }, [])

  // Clear timer on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const onHoverMove = useCallback((e) => {
    clearTimer()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const px = (e.clientX - rect.left - offset.current.x) / zoom.current
    const py = (e.clientY - rect.top  - offset.current.y) / zoom.current
    const hex = pixelToHex(px, py, hexSize)

    const ship = ships.find((s) => s.position.q === hex.q && s.position.r === hex.r) ?? null
    if (!ship) { clearHoveredShip(); return }

    const { clientX, clientY } = e
    timerRef.current = setTimeout(() => {
      setHoveredShip({ shipId: ship.id, x: clientX, y: clientY })
    }, 200)
  }, [canvasRef, hexSize, offset, zoom, ships, setHoveredShip, clearHoveredShip, clearTimer])

  const onHoverLeave = useCallback(() => {
    clearTimer()
    clearHoveredShip()
  }, [clearTimer, clearHoveredShip])

  // Pan start clears hover immediately
  const onHoverDown = useCallback(() => {
    clearTimer()
    clearHoveredShip()
  }, [clearTimer, clearHoveredShip])

  return { onHoverMove, onHoverLeave, onHoverDown }
}
