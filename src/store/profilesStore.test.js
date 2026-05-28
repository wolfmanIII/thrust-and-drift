/**
 * Integration tests for profilesStore CRUD actions.
 * importFromFile uses importProfiles (File API) — mocked.
 * exportAll uses exportProfiles (DOM blob/click) — mocked.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useProfilesStore } from './profilesStore.js'

vi.mock('../utils/io.js', () => ({
  exportProfiles: vi.fn(),
  importProfiles: vi.fn(),
  exportBattle:   vi.fn(),
  importBattle:   vi.fn(),
}))

import { exportProfiles, importProfiles } from '../utils/io.js'

// === HELPERS ===

function makeProfile(overrides = {}) {
  return {
    id:        'test-id-1',
    name:      'Test Ship',
    shipClass: 'Type S',
    tonnage:   100,
    hull:      10,
    thrust:    4,
    turrets:   [],
    crew:      { pilot: 2, gunner: 1 },
    ...overrides,
  }
}

beforeEach(() => {
  useProfilesStore.setState({ profiles: [] })
  vi.clearAllMocks()
})

// === addProfile ===

describe('addProfile', () => {
  it('appends profile to list', () => {
    useProfilesStore.getState().addProfile(makeProfile())
    expect(useProfilesStore.getState().profiles).toHaveLength(1)
  })

  it('preserves provided id', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'my-id' }))
    expect(useProfilesStore.getState().profiles[0].id).toBe('my-id')
  })

  it('generates id if missing', () => {
    const { id: _, ...noId } = makeProfile()
    useProfilesStore.getState().addProfile(noId)
    const { id } = useProfilesStore.getState().profiles[0]
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('generates createdAt if missing', () => {
    const { createdAt: _, ...noDate } = makeProfile()
    useProfilesStore.getState().addProfile(noDate)
    expect(useProfilesStore.getState().profiles[0].createdAt).toBeTruthy()
  })

  it('preserves provided createdAt', () => {
    const ts = '2025-01-01T00:00:00.000Z'
    useProfilesStore.getState().addProfile(makeProfile({ createdAt: ts }))
    expect(useProfilesStore.getState().profiles[0].createdAt).toBe(ts)
  })

  it('multiple profiles accumulate', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'a', name: 'Alpha' }))
    useProfilesStore.getState().addProfile(makeProfile({ id: 'b', name: 'Beta'  }))
    expect(useProfilesStore.getState().profiles).toHaveLength(2)
  })
})

// === updateProfile ===

describe('updateProfile', () => {
  it('applies partial update to target', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'x' }))
    useProfilesStore.getState().updateProfile('x', { name: 'Updated', hull: 20 })
    const p = useProfilesStore.getState().profiles[0]
    expect(p.name).toBe('Updated')
    expect(p.hull).toBe(20)
  })

  it('does not affect other profiles', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'a', name: 'Alpha' }))
    useProfilesStore.getState().addProfile(makeProfile({ id: 'b', name: 'Beta'  }))
    useProfilesStore.getState().updateProfile('a', { name: 'Changed' })
    const b = useProfilesStore.getState().profiles.find(p => p.id === 'b')
    expect(b.name).toBe('Beta')
  })

  it('unknown id is no-op', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'a' }))
    expect(() => useProfilesStore.getState().updateProfile('ghost', { name: 'X' })).not.toThrow()
    expect(useProfilesStore.getState().profiles[0].name).toBe('Test Ship')
  })
})

// === deleteProfile ===

describe('deleteProfile', () => {
  it('removes profile by id', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'a' }))
    useProfilesStore.getState().deleteProfile('a')
    expect(useProfilesStore.getState().profiles).toHaveLength(0)
  })

  it('only removes matching id', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'a', name: 'Alpha' }))
    useProfilesStore.getState().addProfile(makeProfile({ id: 'b', name: 'Beta'  }))
    useProfilesStore.getState().deleteProfile('a')
    const profiles = useProfilesStore.getState().profiles
    expect(profiles).toHaveLength(1)
    expect(profiles[0].id).toBe('b')
  })

  it('unknown id is no-op', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'a' }))
    useProfilesStore.getState().deleteProfile('ghost')
    expect(useProfilesStore.getState().profiles).toHaveLength(1)
  })
})

// === duplicateProfile ===

describe('duplicateProfile', () => {
  it('creates a copy with new id', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'orig' }))
    useProfilesStore.getState().duplicateProfile('orig')
    const profiles = useProfilesStore.getState().profiles
    expect(profiles).toHaveLength(2)
    expect(profiles[1].id).not.toBe('orig')
  })

  it('appends "(Copy)" to name', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'orig', name: 'Viper' }))
    useProfilesStore.getState().duplicateProfile('orig')
    expect(useProfilesStore.getState().profiles[1].name).toBe('Viper (Copy)')
  })

  it('original profile unchanged', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'orig', name: 'Viper', hull: 10 }))
    useProfilesStore.getState().duplicateProfile('orig')
    const original = useProfilesStore.getState().profiles.find(p => p.id === 'orig')
    expect(original.name).toBe('Viper')
    expect(original.hull).toBe(10)
  })

  it('copy has independent data (no reference sharing)', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'orig', turrets: [{ weapons: ['Laser'] }] }))
    useProfilesStore.getState().duplicateProfile('orig')
    useProfilesStore.getState().updateProfile('orig', { name: 'Changed Original' })
    const copy = useProfilesStore.getState().profiles.find(p => p.id !== 'orig')
    expect(copy.name).toBe('Test Ship (Copy)')
  })

  it('unknown id is no-op', () => {
    expect(() => useProfilesStore.getState().duplicateProfile('ghost')).not.toThrow()
    expect(useProfilesStore.getState().profiles).toHaveLength(0)
  })
})

// === importFromFile ===

describe('importFromFile', () => {
  it('adds incoming profiles not already present', async () => {
    importProfiles.mockResolvedValue([
      makeProfile({ id: 'new-1', name: 'Ship A' }),
      makeProfile({ id: 'new-2', name: 'Ship B' }),
    ])
    const result = await useProfilesStore.getState().importFromFile({})
    expect(useProfilesStore.getState().profiles).toHaveLength(2)
    expect(result.added).toBe(2)
    expect(result.skipped).toBe(0)
  })

  it('skips profiles with duplicate ids', async () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'exists' }))
    importProfiles.mockResolvedValue([
      makeProfile({ id: 'exists',  name: 'Duplicate' }),
      makeProfile({ id: 'new-one', name: 'New'       }),
    ])
    const result = await useProfilesStore.getState().importFromFile({})
    expect(useProfilesStore.getState().profiles).toHaveLength(2)
    expect(result.added).toBe(1)
    expect(result.skipped).toBe(1)
  })

  it('all duplicates → no change, skipped = incoming count', async () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'a' }))
    importProfiles.mockResolvedValue([makeProfile({ id: 'a', name: 'Same' })])
    const result = await useProfilesStore.getState().importFromFile({})
    expect(useProfilesStore.getState().profiles).toHaveLength(1)
    expect(result.added).toBe(0)
    expect(result.skipped).toBe(1)
  })

  it('empty file → no change', async () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'a' }))
    importProfiles.mockResolvedValue([])
    const result = await useProfilesStore.getState().importFromFile({})
    expect(useProfilesStore.getState().profiles).toHaveLength(1)
    expect(result.added).toBe(0)
    expect(result.skipped).toBe(0)
  })
})

// === exportAll ===

describe('exportAll', () => {
  it('calls exportProfiles with current profiles', () => {
    useProfilesStore.getState().addProfile(makeProfile({ id: 'a', name: 'Alpha' }))
    useProfilesStore.getState().addProfile(makeProfile({ id: 'b', name: 'Beta'  }))
    useProfilesStore.getState().exportAll()
    expect(exportProfiles).toHaveBeenCalledOnce()
    const [arg] = exportProfiles.mock.calls[0]
    expect(arg).toHaveLength(2)
    expect(arg[0].id).toBe('a')
  })

  it('passes empty array when no profiles', () => {
    useProfilesStore.getState().exportAll()
    expect(exportProfiles).toHaveBeenCalledWith([])
  })
})
