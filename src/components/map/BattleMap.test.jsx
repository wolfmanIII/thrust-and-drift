/**
 * Tests for BattleMap — discrete zoom level controls (v2.0).
 * Canvas rendering hooks are mocked; only the C/T/S button logic
 * and keyboard shortcuts are verified here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BattleMap } from './BattleMap.jsx'
import { useUiStore } from '../../store/uiStore.js'

// ── Hoisted mock ref so vi.mock factory can reference it ──────────────────────
const mocks = vi.hoisted(() => ({ animateZoom: vi.fn() }))

// ── Canvas-heavy hooks — no-ops in jsdom ─────────────────────────────────────
vi.mock('./useCanvasRenderer.js', () => ({ useCanvasRenderer: () => {}, HEX_SIZE: 32 }))
vi.mock('./useCanvasEffects.js',  () => ({ useCanvasEffects:  () => {} }))
vi.mock('../../hooks/useAudioEngine.js', () => ({ useAudioEngine: () => {} }))
vi.mock('./useShipHover.js',    () => ({ useShipHover:    () => ({ onHoverMove: () => {}, onHoverLeave: () => {}, onHoverDown: () => {} }) }))
vi.mock('./useMissileHover.js', () => ({ useMissileHover: () => ({ onMissileHoverMove: () => {}, onMissileHoverLeave: () => {}, onMissileHoverDown: () => {} }) }))
vi.mock('./ShipTooltip.jsx',    () => ({ ShipTooltip:    () => null }))
vi.mock('./MissileTooltip.jsx', () => ({ MissileTooltip: () => null }))
vi.mock('./useMapInteraction.js', () => ({
  useMapInteraction: () => ({
    offset: { current: { x: 0, y: 0 } },
    zoom:   { current: 1 },
    animateZoom:   mocks.animateZoom,
    onMouseDown:   () => {},
    onMouseMove:   () => {},
    onMouseUp:     () => {},
    onWheel:       () => {},
    onClick:       () => {},
    onContextMenu: () => {},
    onDoubleClick: () => {},
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  useUiStore.setState({ activeModal: null, movementAnimation: null, thrustTargeting: null })
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('BattleMap — zoom buttons render', () => {
  it('renders C, T and S buttons', () => {
    render(<BattleMap />)
    expect(screen.getByTitle('Close (1)')).toBeInTheDocument()
    expect(screen.getByTitle('Tactical (2)')).toBeInTheDocument()
    expect(screen.getByTitle('Strategic (3)')).toBeInTheDocument()
  })

  it('TACTICAL is the default active button', () => {
    render(<BattleMap />)
    const t = screen.getByTitle('Tactical (2)')
    expect(t.className).toContain('border-cyan-600')
    expect(t.className).toContain('text-cyan-400')
  })

  it('CLOSE and STRATEGIC start as inactive', () => {
    render(<BattleMap />)
    const c = screen.getByTitle('Close (1)')
    const s = screen.getByTitle('Strategic (3)')
    expect(c.className).not.toContain('border-cyan-600')
    expect(s.className).not.toContain('border-cyan-600')
  })
})

// ── Click interactions ────────────────────────────────────────────────────────

describe('BattleMap — button clicks call animateZoom', () => {
  it('clicking Close (C) calls animateZoom(2.5)', () => {
    render(<BattleMap />)
    fireEvent.click(screen.getByTitle('Close (1)'))
    expect(mocks.animateZoom).toHaveBeenCalledOnce()
    expect(mocks.animateZoom).toHaveBeenCalledWith(2.5)
  })

  it('clicking Tactical (T) calls animateZoom(1.0)', () => {
    render(<BattleMap />)
    fireEvent.click(screen.getByTitle('Tactical (2)'))
    expect(mocks.animateZoom).toHaveBeenCalledWith(1.0)
  })

  it('clicking Strategic (S) calls animateZoom(0.45)', () => {
    render(<BattleMap />)
    fireEvent.click(screen.getByTitle('Strategic (3)'))
    expect(mocks.animateZoom).toHaveBeenCalledWith(0.45)
  })

  it('clicked button becomes visually active', () => {
    render(<BattleMap />)
    fireEvent.click(screen.getByTitle('Close (1)'))
    expect(screen.getByTitle('Close (1)').className).toContain('border-cyan-600')
  })

  it('previously active button loses active style after switching level', () => {
    render(<BattleMap />)
    fireEvent.click(screen.getByTitle('Close (1)'))
    // Tactical was previously active; it should lose its active style
    expect(screen.getByTitle('Tactical (2)').className).not.toContain('border-cyan-600')
  })
})

// ── Keyboard shortcuts ────────────────────────────────────────────────────────

describe('BattleMap — keyboard shortcuts', () => {
  it('key "1" animates to CLOSE (2.5×)', () => {
    render(<BattleMap />)
    fireEvent.keyDown(window, { key: '1' })
    expect(mocks.animateZoom).toHaveBeenCalledWith(2.5)
  })

  it('key "2" animates to TACTICAL (1.0×)', () => {
    render(<BattleMap />)
    fireEvent.keyDown(window, { key: '2' })
    expect(mocks.animateZoom).toHaveBeenCalledWith(1.0)
  })

  it('key "3" animates to STRATEGIC (0.45×)', () => {
    render(<BattleMap />)
    fireEvent.keyDown(window, { key: '3' })
    expect(mocks.animateZoom).toHaveBeenCalledWith(0.45)
  })

  it('key "1" makes CLOSE button active', () => {
    render(<BattleMap />)
    fireEvent.keyDown(window, { key: '1' })
    expect(screen.getByTitle('Close (1)').className).toContain('border-cyan-600')
  })

  it('other keys are ignored', () => {
    render(<BattleMap />)
    fireEvent.keyDown(window, { key: 'a' })
    fireEvent.keyDown(window, { key: '4' })
    expect(mocks.animateZoom).not.toHaveBeenCalled()
  })
})

// ── Modal guard ───────────────────────────────────────────────────────────────

describe('BattleMap — shortcuts disabled when modal is open', () => {
  it('key "1" ignored when activeModal is set', () => {
    useUiStore.setState({ activeModal: 'attack' })
    render(<BattleMap />)
    fireEvent.keyDown(window, { key: '1' })
    expect(mocks.animateZoom).not.toHaveBeenCalled()
  })

  it('key "3" ignored with any open modal', () => {
    useUiStore.setState({ activeModal: 'legend' })
    render(<BattleMap />)
    fireEvent.keyDown(window, { key: '3' })
    expect(mocks.animateZoom).not.toHaveBeenCalled()
  })
})
