/**
 * BattleMap — the primary canvas component.
 * Fills the viewport. Delegates all rendering to useCanvasRenderer
 * and all interaction to useMapInteraction.
 * No game logic here — pure wiring of hooks to DOM.
 */

import { useRef, useEffect, useCallback } from 'react'
import { useCanvasRenderer, HEX_SIZE } from './useCanvasRenderer.js'
import { useCanvasEffects } from './useCanvasEffects.js'
import { useAudioEngine }   from '../../hooks/useAudioEngine.js'
import { useMapInteraction } from './useMapInteraction.js'
import { useShipHover }    from './useShipHover.js'
import { useMissileHover } from './useMissileHover.js'
import { ShipTooltip }    from './ShipTooltip.jsx'
import { MissileTooltip } from './MissileTooltip.jsx'
import { useUiStore } from '../../store/uiStore.js'

export function BattleMap() {
  const canvasRef        = useRef(null)
  const effectsCanvasRef = useRef(null)
  const isAnimating = useUiStore((s) => s.movementAnimation !== null)

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

  const { onHoverMove, onHoverLeave, onHoverDown } = useShipHover({ canvasRef, hexSize: HEX_SIZE, offset, zoom })
  const { onMissileHoverMove, onMissileHoverLeave, onMissileHoverDown } = useMissileHover({ canvasRef, hexSize: HEX_SIZE, offset, zoom })

  useCanvasRenderer({ canvasRef, offset, zoom })
  useCanvasEffects({ effectsCanvasRef, offset, zoom })
  useAudioEngine()

  const combinedMouseMove = useCallback((e) => { onMouseMove(e); onHoverMove(e); onMissileHoverMove(e) }, [onMouseMove, onHoverMove, onMissileHoverMove])
  const combinedMouseDown = useCallback((e) => { onMouseDown(e); onHoverDown(e); onMissileHoverDown(e) }, [onMouseDown, onHoverDown, onMissileHoverDown])

  // Prevent default browser context menu and wheel scroll
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const preventScroll = (e) => e.preventDefault()
    canvas.addEventListener('wheel', preventScroll, { passive: false })
    return () => canvas.removeEventListener('wheel', preventScroll)
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ pointerEvents: isAnimating ? 'none' : 'auto' }}
        onMouseDown={combinedMouseDown}
        onMouseMove={combinedMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={(e) => { onHoverLeave(e); onMissileHoverLeave(e) }}
        onWheel={onWheel}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onDoubleClick={onDoubleClick}
      />
      {/* Effects overlay — pointer-events:none so all interaction passes through */}
      <canvas
        ref={effectsCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
      <ShipTooltip />
      <MissileTooltip />
    </>
  )
}
