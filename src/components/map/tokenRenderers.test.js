/**
 * Tests for drawShipToken — current actor pulsing ring (REQ-02).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drawShipToken } from './tokenRenderers.js'

// Mock shipTokenShapes so shape-specific arc calls don't interfere
vi.mock('./shipTokenShapes.js', () => ({
  getShapeTracer: () => (ctx) => { ctx.beginPath(); ctx.moveTo(0, 0) },
  getDetailDrawer: () => null,
}))

const ACTOR_RING_RADIUS = 30   // TOKEN_RADIUS (18) + 12

function makeCtx() {
  const arcCalls = []
  return {
    arcCalls,
    save:         vi.fn(),
    restore:      vi.fn(),
    beginPath:    vi.fn(),
    arc:          vi.fn((...args) => arcCalls.push(args)),
    moveTo:       vi.fn(),
    lineTo:       vi.fn(),
    closePath:    vi.fn(),
    fill:         vi.fn(),
    stroke:       vi.fn(),
    fillText:     vi.fn(),
    setLineDash:  vi.fn(),
    translate:    vi.fn(),
    rotate:       vi.fn(),
    measureText:  vi.fn(() => ({ width: 40 })),
    fillRect:     vi.fn(),
    strokeStyle:  '',
    fillStyle:    '',
    lineWidth:    0,
    font:         '',
    textAlign:    '',
    textBaseline: '',
    globalAlpha:  1,
  }
}

function makeShip(overrides = {}) {
  return {
    id: 'ship-1',
    color: '#0f0',
    profile: { name: 'Fighter', hull: 10, tokenShape: 'delta' },
    hullCurrent: 8,
    vector: { q: 0, r: 0 },
    inDogfight: null,
    isDestroyed: false,
    ...overrides,
  }
}

describe('drawShipToken — current actor ring (REQ-02)', () => {
  let ctx

  beforeEach(() => { ctx = makeCtx() })

  it('draws an arc at radius TOKEN_RADIUS+12 when isCurrentActor=true', () => {
    drawShipToken(ctx, makeShip(), 100, 100, false, true, 0)
    const actorRing = ctx.arcCalls.find(([, , r]) => r === ACTOR_RING_RADIUS)
    expect(actorRing).toBeDefined()
  })

  it('does NOT draw the actor ring when isCurrentActor=false', () => {
    drawShipToken(ctx, makeShip(), 100, 100, false, false, 0)
    const actorRing = ctx.arcCalls.find(([, , r]) => r === ACTOR_RING_RADIUS)
    expect(actorRing).toBeUndefined()
  })

  it('does NOT draw the actor ring for a destroyed ship', () => {
    drawShipToken(ctx, makeShip({ isDestroyed: true }), 100, 100, false, true, 0)
    const actorRing = ctx.arcCalls.find(([, , r]) => r === ACTOR_RING_RADIUS)
    expect(actorRing).toBeUndefined()
  })

  it('still draws the selection ring when both selected and isCurrentActor', () => {
    const SELECTION_RADIUS = 22   // TOKEN_RADIUS (18) + 4
    drawShipToken(ctx, makeShip(), 100, 100, true, true, 0)
    const selectionRing = ctx.arcCalls.find(([, , r]) => r === SELECTION_RADIUS)
    expect(selectionRing).toBeDefined()
    const actorRing = ctx.arcCalls.find(([, , r]) => r === ACTOR_RING_RADIUS)
    expect(actorRing).toBeDefined()
  })
})
