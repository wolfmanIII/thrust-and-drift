/**
 * IndexedDB wrapper — single-database, two object stores.
 * DB: thrust-and-drift / version 1
 * Stores:
 *   battle   — key 'current', holds serialised BattleState
 *   profiles — key 'all',     holds serialised profiles array
 */

const DB_NAME = 'thrust-and-drift'
const DB_VERSION = 1
const STORE_BATTLE = 'battle'
const STORE_PROFILES = 'profiles'

/** @returns {Promise<IDBDatabase>} */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE_BATTLE)) {
        db.createObjectStore(STORE_BATTLE)
      }
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES)
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Read a value by key from the given store.
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<any>}
 */
async function dbGet(storeName, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).get(key)
    req.onsuccess = (e) => resolve(e.target.result ?? null)
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Write a value at key in the given store.
 * @param {string} storeName
 * @param {string} key
 * @param {any} value
 * @returns {Promise<void>}
 */
async function dbPut(storeName, key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).put(value, key)
    req.onsuccess = () => resolve()
    req.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Delete a key from the given store.
 * @param {string} storeName
 * @param {string} key
 * @returns {Promise<void>}
 */
async function dbDelete(storeName, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const req = tx.objectStore(storeName).delete(key)
    req.onsuccess = () => resolve()
    req.onerror = (e) => reject(e.target.error)
  })
}

export { dbGet, dbPut, dbDelete, STORE_BATTLE, STORE_PROFILES }
