import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BasicBattleView } from './BasicBattleView.jsx'
import { useBattleStore }  from '../../store/battleStore.js'
import { useUiStore }      from '../../store/uiStore.js'

function makeShip(overrides = {}) {
  return {
    id:                  's1',
    faction:             'players',
    color:               '#22d3ee',
    hullCurrent:         10,
    initiative:          8,
    evasiveThrust:       0,
    isDestroyed:         false,
    inDogfight:          null,
    inBoarding:          null,
    sensorLockOn:        null,
    sensorLockedBy:      null,
    sensorLockDM:        0,
    turretsNeedingReload: 0,
    criticalHits:        [],
    missileAmmoTotal:    0,
    thrustUsedThisRound: 0,
    thrustBonusThisRound: 0,
    thrustPenalty:       0,
    profile: {
      name:    'Beowulf',
      hull:    16,
      thrust:  2,
      turrets: [],
    },
    ...overrides,
  }
}

beforeEach(() => {
  useBattleStore.setState({ ships: [], missiles: [], rangeBands: {}, combatMode: 'basic' })
  useUiStore.setState({ contextMenu: null })
})

describe('ShipBentoCard', () => {
  it('renders ship name and hull', () => {
    useBattleStore.setState({ ships: [makeShip()], missiles: [] })
    render(<BasicBattleView />)
    expect(screen.getByText('Beowulf')).toBeTruthy()
    expect(screen.getByText('Hull 10/16')).toBeTruthy()
  })

  it('shows DOGFIGHT badge when inDogfight is set', () => {
    useBattleStore.setState({ ships: [makeShip({ inDogfight: 'group-1' })], missiles: [] })
    render(<BasicBattleView />)
    expect(screen.getByText('DOGFIGHT')).toBeTruthy()
  })

  it('shows BOARDING badge when inBoarding is set', () => {
    useBattleStore.setState({ ships: [makeShip({ inBoarding: 'board-1' })], missiles: [] })
    render(<BasicBattleView />)
    expect(screen.getByText('BOARDING')).toBeTruthy()
  })

  it('shows EVA badge when evasiveThrust > 0', () => {
    useBattleStore.setState({ ships: [makeShip({ evasiveThrust: 3 })], missiles: [] })
    render(<BasicBattleView />)
    expect(screen.getByText('EVA 3')).toBeTruthy()
  })

  it('shows LOCKED badge when sensorLockedBy is set', () => {
    const locker = makeShip({ id: 's2', faction: 'npc', profile: { name: 'Hunter', hull: 10, thrust: 2, turrets: [] } })
    const target = makeShip({ id: 's1', sensorLockedBy: 's2' })
    useBattleStore.setState({ ships: [target, locker], missiles: [] })
    render(<BasicBattleView />)
    expect(screen.getByText('LOCKED')).toBeTruthy()
  })

  it('shows inbound missile row when missile targets this ship', () => {
    const ship = makeShip({ id: 's1' })
    const missile = { id: 'm1', launchedBy: 's2', target: 's1', count: 2, type: 'Standard', position: {}, vector: {}, thrustRemaining: 8 }
    const launcher = makeShip({ id: 's2', faction: 'npc', profile: { name: 'Pirate', hull: 10, thrust: 2, turrets: [] } })
    useBattleStore.setState({ ships: [ship, launcher], missiles: [missile] })
    render(<BasicBattleView />)
    expect(screen.getByText(/inbound/)).toBeTruthy()
    expect(screen.getAllByText(/2×/).length).toBeGreaterThan(0)
  })

  it('shows critical hit row with system and severity', () => {
    useBattleStore.setState({
      ships: [makeShip({ criticalHits: [{ system: 'M-Drive', severity: 2 }] })],
      missiles: [],
    })
    render(<BasicBattleView />)
    expect(screen.getByText(/M-Drive Sev\.2/)).toBeTruthy()
  })

  it('does not show status zone when no active states', () => {
    useBattleStore.setState({ ships: [makeShip()], missiles: [] })
    render(<BasicBattleView />)
    expect(screen.queryByText(/inbound/)).toBeNull()
    expect(screen.queryByText(/Lock →/)).toBeNull()
    expect(screen.queryByText(/reloading/)).toBeNull()
  })

  it('does not show ammo row for ship without Missile Rack', () => {
    useBattleStore.setState({ ships: [makeShip()], missiles: [] })
    render(<BasicBattleView />)
    expect(screen.queryByText(/Ammo/)).toBeNull()
  })

  it('shows ammo row for ship with Missile Rack', () => {
    const ship = makeShip({
      missileAmmoTotal: 9,
      profile: {
        name: 'Armed Trader', hull: 16, thrust: 2,
        turrets: [{ weapons: ['Missile Rack'] }],
      },
    })
    useBattleStore.setState({ ships: [ship], missiles: [] })
    render(<BasicBattleView />)
    expect(screen.getByText('Ammo 9/12')).toBeTruthy()
  })
})
