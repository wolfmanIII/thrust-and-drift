/**
 * JSON import/export via Browser File API.
 * No persistence layer — all I/O is file-based.
 */

const PROFILES_VERSION = '1.0'
const BATTLE_VERSION = '1.0'

/**
 * Read a File, parse its JSON content, and validate the expected type tag.
 * Single responsibility: file I/O + JSON parsing only.
 * @param {File} file
 * @param {string} expectedType  Value expected in `data.type`
 * @returns {Promise<object>}
 * @throws {Error} On malformed JSON or wrong type tag
 */
async function parseJSONFile(file, expectedType) {
  let text
  try {
    text = await file.text()
  } catch (e) {
    throw new Error(`Cannot read file: ${e.message}`, { cause: e })
  }
  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    throw new Error(`Invalid file: malformed JSON. (${e.message})`, { cause: e })
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid file: unexpected JSON structure.')
  }
  if (data.type !== expectedType) {
    throw new Error(`Invalid file: wrong type. Expected "${expectedType}", got "${data.type ?? 'none'}".`)
  }
  return data
}

/**
 * Trigger a JSON file download in the browser.
 * @param {object} data      Data to serialize
 * @param {string} filename  Suggested filename
 */
function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Export ship profiles to a JSON file.
 * @param {object[]} profiles
 */
export function exportProfiles(profiles) {
  const data = {
    version: PROFILES_VERSION,
    type: 'ship-profiles',
    exportedAt: new Date().toISOString(),
    profiles,
  }
  downloadJSON(data, `traveller-profiles-${Date.now()}.json`)
}

/**
 * Import ship profiles from a File object.
 * @param {File} file
 * @returns {Promise<object[]>}
 * @throws {Error} If the file is not a valid profiles export
 */
export async function importProfiles(file) {
  const data = await parseJSONFile(file, 'ship-profiles')
  if (!Array.isArray(data.profiles)) {
    throw new Error('Invalid file: "profiles" field missing or not an array.')
  }
  return data.profiles
}

/**
 * Export the current battle state to a JSON file.
 * @param {object} battle  BattleState object
 */
export function exportBattle(battle) {
  const data = {
    version: BATTLE_VERSION,
    type: 'battle-state',
    exportedAt: new Date().toISOString(),
    battle,
  }
  downloadJSON(data, `traveller-battle-round${battle.round}-${Date.now()}.json`)
}

/**
 * Import a battle state from a File object.
 * @param {File} file
 * @returns {Promise<object>}  The battle object only
 * @throws {Error} If the file is not a valid battle export
 */
export async function importBattle(file) {
  const data = await parseBattleFile(file)
  return data.battle
}

/**
 * Parse and validate a battle file, returning the full wrapper object.
 * Use this when the caller also needs metadata (exportedAt, version).
 * @param {File} file
 * @returns {Promise<{ version: string, type: string, exportedAt: string, battle: object }>}
 * @throws {Error} If the file is not a valid battle export
 */
export async function parseBattleFile(file) {
  const data = await parseJSONFile(file, 'battle-state')
  if (!data.battle || typeof data.battle !== 'object') {
    throw new Error('Invalid file: "battle" field missing or not an object.')
  }
  return data
}
