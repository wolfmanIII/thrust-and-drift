/**
 * Tests for uiStore — modal, screen, selection, context menu, placement.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './uiStore.js'

beforeEach(() => {
  useUiStore.setState({
    screen:            'dashboard',
    activeModal:       null,
    modalPayload:      null,
    selectedShipId:    null,
    contextMenu:       null,
    pendingPlacement:  null,
    movementAnimation: null,
  })
})

// === SCREEN ===

describe('gotoScreen', () => {
  it('sets screen to battle', () => {
    useUiStore.getState().gotoScreen('battle')
    expect(useUiStore.getState().screen).toBe('battle')
  })

  it('sets screen to dashboard', () => {
    useUiStore.setState({ screen: 'battle' })
    useUiStore.getState().gotoScreen('dashboard')
    expect(useUiStore.getState().screen).toBe('dashboard')
  })
})

// === MODAL ===

describe('openModal / closeModal', () => {
  it('sets activeModal', () => {
    useUiStore.getState().openModal('attack')
    expect(useUiStore.getState().activeModal).toBe('attack')
  })

  it('stores payload', () => {
    useUiStore.getState().openModal('thrust', { shipId: 'abc' })
    expect(useUiStore.getState().modalPayload).toEqual({ shipId: 'abc' })
  })

  it('payload defaults to null', () => {
    useUiStore.getState().openModal('action')
    expect(useUiStore.getState().modalPayload).toBeNull()
  })

  it('closeModal clears activeModal and payload', () => {
    useUiStore.getState().openModal('attack', { shipId: 'x' })
    useUiStore.getState().closeModal()
    expect(useUiStore.getState().activeModal).toBeNull()
    expect(useUiStore.getState().modalPayload).toBeNull()
  })

  it('opening replaces previous modal', () => {
    useUiStore.getState().openModal('attack', { shipId: 'x' })
    useUiStore.getState().openModal('thrust', { shipId: 'y' })
    expect(useUiStore.getState().activeModal).toBe('thrust')
    expect(useUiStore.getState().modalPayload).toEqual({ shipId: 'y' })
  })
})

// === SELECTION ===

describe('selectShip / clearSelection', () => {
  it('selectShip sets selectedShipId', () => {
    useUiStore.getState().selectShip('ship-42')
    expect(useUiStore.getState().selectedShipId).toBe('ship-42')
  })

  it('clearSelection sets selectedShipId to null', () => {
    useUiStore.getState().selectShip('ship-42')
    useUiStore.getState().clearSelection()
    expect(useUiStore.getState().selectedShipId).toBeNull()
  })

  it('selectShip(null) clears selection', () => {
    useUiStore.getState().selectShip('ship-42')
    useUiStore.getState().selectShip(null)
    expect(useUiStore.getState().selectedShipId).toBeNull()
  })
})

// === CONTEXT MENU ===

describe('showContextMenu / hideContextMenu', () => {
  it('sets contextMenu state', () => {
    const ctx = { x: 100, y: 200, type: 'ship', targetId: 'abc' }
    useUiStore.getState().showContextMenu(ctx)
    expect(useUiStore.getState().contextMenu).toEqual(ctx)
  })

  it('hideContextMenu sets contextMenu to null', () => {
    useUiStore.getState().showContextMenu({ x: 0, y: 0, type: 'empty', targetId: null })
    useUiStore.getState().hideContextMenu()
    expect(useUiStore.getState().contextMenu).toBeNull()
  })

  it('showContextMenu replaces previous context', () => {
    useUiStore.getState().showContextMenu({ x: 10, y: 10, type: 'ship',    targetId: 'a' })
    useUiStore.getState().showContextMenu({ x: 20, y: 20, type: 'missile', targetId: 'b' })
    expect(useUiStore.getState().contextMenu.type).toBe('missile')
    expect(useUiStore.getState().contextMenu.targetId).toBe('b')
  })
})

// === MOVEMENT ANIMATION ===

describe('movementAnimation', () => {
  it('startMovementAnimation imposta startPositions e startTime', () => {
    const startPositions = { 'ship-1': { q: 2, r: 3 }, 'ship-2': { q: -1, r: 0 } }
    const before = performance.now()
    useUiStore.getState().startMovementAnimation(startPositions)
    const after = performance.now()
    const anim = useUiStore.getState().movementAnimation
    expect(anim).not.toBeNull()
    expect(anim.startPositions).toEqual(startPositions)
    expect(anim.duration).toBe(600)
    expect(anim.startTime).toBeGreaterThanOrEqual(before)
    expect(anim.startTime).toBeLessThanOrEqual(after)
  })

  it('startMovementAnimation accetta duration custom', () => {
    useUiStore.getState().startMovementAnimation({ 'a': { q: 0, r: 0 } }, 1000)
    expect(useUiStore.getState().movementAnimation.duration).toBe(1000)
  })

  it('clearMovementAnimation riporta movementAnimation a null', () => {
    useUiStore.getState().startMovementAnimation({ 'ship-1': { q: 0, r: 0 } })
    useUiStore.getState().clearMovementAnimation()
    expect(useUiStore.getState().movementAnimation).toBeNull()
  })

  it('startMovementAnimation sovrascrive animazione precedente', () => {
    useUiStore.getState().startMovementAnimation({ 'ship-1': { q: 0, r: 0 } })
    const pos2 = { 'ship-2': { q: 5, r: 5 } }
    useUiStore.getState().startMovementAnimation(pos2)
    expect(useUiStore.getState().movementAnimation.startPositions).toEqual(pos2)
  })
})

// === PLACEMENT MODE ===

describe('startPlacement / cancelPlacement', () => {
  it('startPlacement sets pendingPlacement', () => {
    const placement = { profile: { id: 'p1', name: 'Ship' }, faction: 'players', color: '#0f0' }
    useUiStore.getState().startPlacement(placement)
    expect(useUiStore.getState().pendingPlacement).toEqual(placement)
  })

  it('cancelPlacement clears pendingPlacement', () => {
    useUiStore.getState().startPlacement({ profile: {}, faction: 'npc', color: '#f00' })
    useUiStore.getState().cancelPlacement()
    expect(useUiStore.getState().pendingPlacement).toBeNull()
  })
})

describe('thrustTargeting', () => {
  it('startThrustTargeting sets shipId', () => {
    useUiStore.getState().startThrustTargeting('ship-42')
    expect(useUiStore.getState().thrustTargeting).toEqual({ shipId: 'ship-42' })
  })

  it('cancelThrustTargeting resets to null', () => {
    useUiStore.getState().startThrustTargeting('ship-42')
    useUiStore.getState().cancelThrustTargeting()
    expect(useUiStore.getState().thrustTargeting).toBeNull()
  })
})
