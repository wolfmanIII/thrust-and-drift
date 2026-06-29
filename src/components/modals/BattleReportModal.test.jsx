/**
 * Tests for BattleReportModal — PDF battle report (v2.0).
 * Verifies header content, ship roster rendering, battle log grouping,
 * and the Print button behaviour.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BattleReportModal } from './BattleReportModal.jsx'
import { useBattleStore } from '../../store/battleStore.js'
import { useUiStore }     from '../../store/uiStore.js'

function makeShip(overrides = {}) {
  return {
    id:           's1',
    faction:      'players',
    hullCurrent:  10,
    criticalHits: [],
    profile:      { name: 'Beowulf', hull: 16 },
    name:         overrides.profile?.name ?? 'Beowulf',
    ...overrides,
  }
}

function makeEntry(overrides = {}) {
  return {
    id:      String(Math.random()),
    round:   1,
    phase:   'attack',
    type:    'attack',
    message: 'Test event',
    ...overrides,
  }
}

beforeEach(() => {
  useBattleStore.setState({ ships: [], log: [], round: 1, combatMode: 'vectorial' })
  useUiStore.setState({ activeModal: 'battleReport', modalPayload: null })
})

// ── Header ────────────────────────────────────────────────────────────────────

describe('BattleReportModal — header', () => {
  it('renders the title', () => {
    render(<BattleReportModal />)
    expect(screen.getByText('THRUST & DRIFT')).toBeInTheDocument()
  })

  it('shows round number', () => {
    useBattleStore.setState({ round: 7 })
    render(<BattleReportModal />)
    expect(screen.getAllByText(/Round 7/).length).toBeGreaterThan(0)
  })

  it('shows "Vectorial Combat" when combatMode is vectorial', () => {
    render(<BattleReportModal />)
    expect(screen.getByText('Vectorial Combat')).toBeInTheDocument()
  })

  it('shows "Basic Combat" when combatMode is basic', () => {
    useBattleStore.setState({ combatMode: 'basic' })
    render(<BattleReportModal />)
    expect(screen.getByText('Basic Combat')).toBeInTheDocument()
  })
})

// ── Ship Roster ───────────────────────────────────────────────────────────────

describe('BattleReportModal — ship roster', () => {
  it('shows ship name', () => {
    useBattleStore.setState({ ships: [makeShip()] })
    render(<BattleReportModal />)
    expect(screen.getByText('Beowulf')).toBeInTheDocument()
  })

  it('shows current hull and max hull', () => {
    useBattleStore.setState({ ships: [makeShip({ hullCurrent: 12 })] })
    render(<BattleReportModal />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('/16')).toBeInTheDocument()
  })

  it('shows Active for hull > 0', () => {
    useBattleStore.setState({ ships: [makeShip({ hullCurrent: 1 })] })
    render(<BattleReportModal />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('shows WRECK for hull = 0', () => {
    useBattleStore.setState({ ships: [makeShip({ hullCurrent: 0 })] })
    render(<BattleReportModal />)
    expect(screen.getByText('WRECK')).toBeInTheDocument()
  })

  it('shows WRECK for hull < 0 (negative from overkill damage)', () => {
    useBattleStore.setState({ ships: [makeShip({ hullCurrent: -3 })] })
    render(<BattleReportModal />)
    expect(screen.getByText('WRECK')).toBeInTheDocument()
  })

  it('shows critical system and severity', () => {
    useBattleStore.setState({
      ships: [makeShip({ criticalHits: [{ system: 'M-Drive', severity: 2 }] })],
    })
    render(<BattleReportModal />)
    expect(screen.getByText(/M-Drive Sev-2/)).toBeInTheDocument()
  })

  it('shows "—" when no criticals', () => {
    useBattleStore.setState({ ships: [makeShip({ criticalHits: [] })] })
    render(<BattleReportModal />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('shows faction label: Players', () => {
    useBattleStore.setState({ ships: [makeShip({ faction: 'players' })] })
    render(<BattleReportModal />)
    expect(screen.getByText('Players')).toBeInTheDocument()
  })

  it('shows faction label: NPC', () => {
    useBattleStore.setState({ ships: [makeShip({ faction: 'npc' })] })
    render(<BattleReportModal />)
    expect(screen.getByText('NPC')).toBeInTheDocument()
  })

  it('shows faction label: Neutral', () => {
    useBattleStore.setState({ ships: [makeShip({ faction: 'neutral' })] })
    render(<BattleReportModal />)
    expect(screen.getByText('Neutral')).toBeInTheDocument()
  })

  it('shows multiple criticals for a single ship', () => {
    useBattleStore.setState({
      ships: [makeShip({
        criticalHits: [
          { system: 'Power Plant', severity: 1 },
          { system: 'Sensors',     severity: 3 },
        ],
      })],
    })
    render(<BattleReportModal />)
    expect(screen.getByText(/Power Plant Sev-1/)).toBeInTheDocument()
    expect(screen.getByText(/Sensors Sev-3/)).toBeInTheDocument()
  })

  it('shows placeholder when no ships are in battle', () => {
    render(<BattleReportModal />)
    expect(screen.getByText(/No vessels in battle/)).toBeInTheDocument()
  })
})

// ── Battle Log ────────────────────────────────────────────────────────────────

describe('BattleReportModal — battle log', () => {
  it('shows placeholder when log is empty', () => {
    render(<BattleReportModal />)
    expect(screen.getByText(/No log entries/)).toBeInTheDocument()
  })

  it('renders a log entry message', () => {
    useBattleStore.setState({ log: [makeEntry({ message: 'Alpha fires on Bravo.' })] })
    render(<BattleReportModal />)
    expect(screen.getByText('Alpha fires on Bravo.')).toBeInTheDocument()
  })

  it('shows a round header for each distinct round', () => {
    useBattleStore.setState({
      log: [
        makeEntry({ round: 1, message: 'Event A' }),
        makeEntry({ round: 2, message: 'Event B' }),
        makeEntry({ round: 3, message: 'Event C' }),
      ],
    })
    render(<BattleReportModal />)
    expect(screen.getByText(/── Round 1 ──/)).toBeInTheDocument()
    expect(screen.getByText(/── Round 2 ──/)).toBeInTheDocument()
    expect(screen.getByText(/── Round 3 ──/)).toBeInTheDocument()
  })

  it('groups multiple entries under the same round header', () => {
    useBattleStore.setState({
      log: [
        makeEntry({ round: 1, message: 'First event' }),
        makeEntry({ round: 1, message: 'Second event' }),
      ],
    })
    render(<BattleReportModal />)
    // Only one round header for round 1
    expect(screen.getAllByText(/── Round 1 ──/)).toHaveLength(1)
    expect(screen.getByText('First event')).toBeInTheDocument()
    expect(screen.getByText('Second event')).toBeInTheDocument()
  })

  it('shows phase label for each entry', () => {
    useBattleStore.setState({ log: [makeEntry({ phase: 'movement' })] })
    render(<BattleReportModal />)
    expect(screen.getByText('Movement')).toBeInTheDocument()
  })

  it('maps all known phases to human-readable labels', () => {
    const cases = [
      ['setup',        'Setup'],
      ['initiative',   'Initiative'],
      ['acceleration', 'Acceleration'],
      ['movement',     'Movement'],
      ['attack',       'Attack'],
      ['actions',      'Actions'],
      ['end',          'End'],
    ]
    for (const [phase, label] of cases) {
      useBattleStore.setState({ log: [makeEntry({ phase })] })
      const { unmount } = render(<BattleReportModal />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    }
  })
})

// ── Print button ──────────────────────────────────────────────────────────────

describe('BattleReportModal — print', () => {
  it('Print button is present', () => {
    render(<BattleReportModal />)
    expect(screen.getByText(/Print \/ Save PDF/)).toBeInTheDocument()
  })

  it('clicking Print calls window.print()', () => {
    const spy = vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<BattleReportModal />)
    fireEvent.click(screen.getByText(/Print \/ Save PDF/))
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})
