/**
 * BattleMap — the primary canvas component.
 * Fills the viewport. Delegates all rendering to useCanvasRenderer
 * and all interaction to useMapInteraction.
 * No game logic here — pure wiring of hooks to DOM.
 */

import { useRef, useEffect } from 'react'
import { useCanvasRenderer, HEX_SIZE } from './useCanvasRenderer.js'
import { useMapInteraction } from './useMapInteraction.js'

export function BattleMap() {
  const canvasRef = useRef(null)

  const {
    offset,
    zoom,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    onClick,
    onContextMenu,
    onDoubleClick,
  } = useMapInteraction({ hexSize: HEX_SIZE, canvasRef })

  useCanvasRenderer({ canvasRef, offset, zoom })

  // Prevent default browser context menu and wheel scroll
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const preventScroll = (e) => e.preventDefault()
    canvas.addEventListener('wheel', preventScroll, { passive: false })
    return () => canvas.removeEventListener('wheel', preventScroll)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-crosshair"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
    />
  )
}
