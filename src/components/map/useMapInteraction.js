/**
 * Hook encapsulating all BattleMap canvas interaction:
 * pan (left-drag), zoom (scroll), click, right-click, hover.
 *
 * Returns refs and event handlers to attach to the canvas element.
 * Does NOT call ctx.draw* — rendering is handled by useCanvasRenderer.
 */

import { useRef, useCallback } from 'react'
import { pixelToHex, hexDistance, computeClampedDelta } from '../../utils/hex.js'
import { emitEffect } from '../../utils/effectQueue.js'
import { useUiStore } from '../../store/uiStore.js'
import { useBattleStore } from '../../store/battleStore.js'

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3
const ZOOM_FACTOR = 0.001

/**
 * @param {{
 *   hexSize: number,
 *   canvasRef: React.RefObject<HTMLCanvasElement>,
 *   mouseHexRef: React.MutableRefObject<{q:number,r:number}>,
 * }} params
 * @returns {{
 *   offset: React.MutableRefObject<{x: number, y: number}>,
 *   zoom: React.MutableRefObject<number>,
 *   onMouseDown: Function,
 *   onMouseMove: Function,
 *   onMouseUp: Function,
 *   onWheel: Function,
 *   onClick: Function,
 *   onContextMenu: Function,
 *   onDoubleClick: Function,
 * }}
 */
export function useMapInteraction({ hexSize, canvasRef, mouseHexRef }) {
  const offset = useRef({ x: 0, y: 0 })
  const zoom = useRef(1)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const hasDragged = useRef(false)

  // Granular selectors — no full-store subscriptions
  const showContextMenu       = useUiStore((s) => s.showContextMenu)
  const hideContextMenu       = useUiStore((s) => s.hideContextMenu)
  const selectShip            = useUiStore((s) => s.selectShip)
  const pendingPlacement      = useUiStore((s) => s.pendingPlacement)
  const cancelPlacement       = useUiStore((s) => s.cancelPlacement)
  const thrustTargeting       = useUiStore((s) => s.thrustTargeting)
  const cancelThrustTargeting = useUiStore((s) => s.cancelThrustTargeting)

  const ships           = useBattleStore((s) => s.ships)
  const missiles        = useBattleStore((s) => s.missiles)
  const addShip         = useBattleStore((s) => s.addShip)
  const applyShipThrust = useBattleStore((s) => s.applyShipThrust)

  /** Convert canvas-relative pixel coords to world hex coordinates. */
  const pixelToWorld = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return { q: 0, r: 0 }
    const rect = canvas.getBoundingClientRect()
    const px = (clientX - rect.left - offset.current.x) / zoom.current
    const py = (clientY - rect.top - offset.current.y) / zoom.current
    return pixelToHex(px, py, hexSize)
  }, [canvasRef, hexSize])

  /** Find the ship instance at a hex cell, if any. */
  const findShipAt = useCallback((hex) => {
    return ships.find((s) => s.position.q === hex.q && s.position.r === hex.r) ?? null
  }, [ships])

  /** Find a missile token at a hex cell, if any. Ships take priority on overlap. */
  const findMissileAt = useCallback((hex) => {
    return missiles.find((m) => m.position.q === hex.q && m.position.r === hex.r) ?? null
  }, [missiles])

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    hideContextMenu()
    isPanning.current = true
    hasDragged.current = false
    panStart.current = { x: e.clientX - offset.current.x, y: e.clientY - offset.current.y }
  }, [hideContextMenu])

  const onMouseMove = useCallback((e) => {
    // Track cursor hex for thrust targeting preview
    if (thrustTargeting) {
      mouseHexRef.current = pixelToWorld(e.clientX, e.clientY)
      canvasRef.current?.dispatchEvent(new CustomEvent('map:redraw'))
    }

    if (!isPanning.current) return
    const dx = e.clientX - panStart.current.x - offset.current.x
    const dy = e.clientY - panStart.current.y - offset.current.y
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDragged.current = true
    offset.current = {
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    }
    canvasRef.current?.dispatchEvent(new CustomEvent('map:redraw'))
  }, [thrustTargeting, mouseHexRef, pixelToWorld, canvasRef])

  const onMouseUp = useCallback(() => {
    isPanning.current = false
  }, [])

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const prevZoom = zoom.current
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.current - e.deltaY * ZOOM_FACTOR))
    zoom.current = newZoom

    // Zoom toward mouse cursor
    const scale = newZoom / prevZoom
    offset.current = {
      x: mouseX - (mouseX - offset.current.x) * scale,
      y: mouseY - (mouseY - offset.current.y) * scale,
    }
    canvasRef.current?.dispatchEvent(new CustomEvent('map:redraw'))
  }, [canvasRef])

  const onClick = useCallback((e) => {
    if (hasDragged.current) return
    const hex = pixelToWorld(e.clientX, e.clientY)

    // Thrust targeting: confirm delta on click
    if (thrustTargeting) {
      const ship = ships.find((s) => s.id === thrustTargeting.shipId)
      if (ship) {
        const thrustAvailable = Math.max(0,
          ship.profile.thrust + (ship.thrustBonusThisRound ?? 0)
          - ship.thrustUsedThisRound - (ship.thrustPenalty ?? 0) - (ship.ionPenalty ?? 0)
        )
        const delta = computeClampedDelta(mouseHexRef.current, ship.position, thrustAvailable)
        const cost  = hexDistance({ q: 0, r: 0 }, delta)
        if (cost > 0) {
          applyShipThrust(ship.id, delta, cost)
          emitEffect('thrust_plume', { duration: 2500, hex: ship.position, delta, shipColor: ship.color })
        }
      }
      cancelThrustTargeting()
      return
    }

    // Placement mode: place the pending ship on the clicked hex
    if (pendingPlacement) {
      addShip(pendingPlacement.profile, hex, pendingPlacement.faction, pendingPlacement.color)
      cancelPlacement()
      return
    }

    const ship = findShipAt(hex)
    selectShip(ship ? ship.id : null)
  }, [pixelToWorld, thrustTargeting, ships, mouseHexRef, applyShipThrust, cancelThrustTargeting, pendingPlacement, findShipAt, selectShip, addShip, cancelPlacement])

  const onContextMenu = useCallback((e) => {
    e.preventDefault()
    const hex = pixelToWorld(e.clientX, e.clientY)
    const ship    = findShipAt(hex)
    const missile = !ship ? findMissileAt(hex) : null
    const canvas  = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    showContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      type:     ship ? 'ship' : missile ? 'missile' : 'empty',
      targetId: ship ? ship.id : missile ? missile.id : null,
      hex,
    })
  }, [pixelToWorld, findShipAt, findMissileAt, showContextMenu, canvasRef])

  const onDoubleClick = useCallback((e) => {
    if (hasDragged.current) return
    const hex = pixelToWorld(e.clientX, e.clientY)
    const ship = findShipAt(hex)
    if (!ship) {
      offset.current = { x: 0, y: 0 }
      zoom.current = 1
      canvasRef.current?.dispatchEvent(new CustomEvent('map:redraw'))
    }
  }, [pixelToWorld, findShipAt, canvasRef])

  return {
    offset,
    zoom,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel,
    onClick,
    onContextMenu,
    onDoubleClick,
  }
}
