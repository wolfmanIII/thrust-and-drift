import { describe, it, expect } from 'vitest'
import { importProfiles, importBattle } from './io.js'

// Helper: build a mock File from a plain object (or raw string for malformed JSON)
function makeFile(content) {
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  return { text: () => Promise.resolve(text) }
}

// Helper: build a valid profiles payload
function profilesPayload(overrides = {}) {
  return {
    version: '1.0',
    type: 'ship-profiles',
    exportedAt: new Date().toISOString(),
    profiles: [{ id: 'p1', name: 'Scout', hull: 20 }],
    ...overrides,
  }
}

// Helper: build a valid battle payload
function battlePayload(overrides = {}) {
  return {
    version: '1.0',
    type: 'battle-state',
    exportedAt: new Date().toISOString(),
    battle: { round: 3, ships: [] },
    ...overrides,
  }
}

// ── importProfiles ────────────────────────────────────────────────────────────

describe('importProfiles', () => {
  it('returns profiles array from valid file', async () => {
    const file = makeFile(profilesPayload())
    const result = await importProfiles(file)
    expect(result).toEqual([{ id: 'p1', name: 'Scout', hull: 20 }])
  })

  it('returns empty array when profiles field is []', async () => {
    const file = makeFile(profilesPayload({ profiles: [] }))
    const result = await importProfiles(file)
    expect(result).toEqual([])
  })

  it('throws on malformed JSON', async () => {
    const file = makeFile('{not valid json')
    await expect(importProfiles(file)).rejects.toThrow('Invalid file: malformed JSON')
  })

  it('throws when root is a JSON array instead of object', async () => {
    const file = makeFile('[1, 2, 3]')
    await expect(importProfiles(file)).rejects.toThrow('Invalid file: unexpected JSON structure')
  })

  it('throws when root is null', async () => {
    const file = makeFile('null')
    await expect(importProfiles(file)).rejects.toThrow('Invalid file: unexpected JSON structure')
  })

  it('throws on wrong type tag', async () => {
    const file = makeFile(profilesPayload({ type: 'battle-state' }))
    await expect(importProfiles(file)).rejects.toThrow('Invalid file: wrong type')
  })

  it('error message includes expected and actual type', async () => {
    const file = makeFile(profilesPayload({ type: 'unknown' }))
    await expect(importProfiles(file)).rejects.toThrow('"ship-profiles"')
  })

  it('error message shows "none" when type field is absent', async () => {
    const payload = profilesPayload()
    delete payload.type
    const file = makeFile(payload)
    await expect(importProfiles(file)).rejects.toThrow('"none"')
  })

  it('throws when profiles field is not an array', async () => {
    const file = makeFile(profilesPayload({ profiles: { id: 'p1' } }))
    await expect(importProfiles(file)).rejects.toThrow('"profiles" field missing or not an array')
  })

  it('throws when profiles field is absent', async () => {
    const payload = profilesPayload()
    delete payload.profiles
    const file = makeFile(payload)
    await expect(importProfiles(file)).rejects.toThrow('"profiles" field missing or not an array')
  })

  it('throws when file.text() rejects', async () => {
    const file = { text: () => Promise.reject(new Error('disk read error')) }
    await expect(importProfiles(file)).rejects.toThrow('Cannot read file: disk read error')
  })
})

// ── importBattle ──────────────────────────────────────────────────────────────

describe('importBattle', () => {
  it('returns battle object from valid file', async () => {
    const file = makeFile(battlePayload())
    const result = await importBattle(file)
    expect(result).toEqual({ round: 3, ships: [] })
  })

  it('throws on malformed JSON', async () => {
    const file = makeFile('{bad}')
    await expect(importBattle(file)).rejects.toThrow('Invalid file: malformed JSON')
  })

  it('throws on wrong type tag', async () => {
    const file = makeFile(battlePayload({ type: 'ship-profiles' }))
    await expect(importBattle(file)).rejects.toThrow('Invalid file: wrong type')
  })

  it('throws when battle field is absent', async () => {
    const payload = battlePayload()
    delete payload.battle
    const file = makeFile(payload)
    await expect(importBattle(file)).rejects.toThrow('"battle" field missing or not an object')
  })

  it('throws when battle field is not an object (string)', async () => {
    const file = makeFile(battlePayload({ battle: 'round3' }))
    await expect(importBattle(file)).rejects.toThrow('"battle" field missing or not an object')
  })

  it('throws when battle field is null', async () => {
    const file = makeFile(battlePayload({ battle: null }))
    await expect(importBattle(file)).rejects.toThrow('"battle" field missing or not an object')
  })

  it('throws when file.text() rejects', async () => {
    const file = { text: () => Promise.reject(new Error('permission denied')) }
    await expect(importBattle(file)).rejects.toThrow('Cannot read file: permission denied')
  })
})
