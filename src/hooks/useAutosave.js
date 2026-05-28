/**
 * useAutosave — subscribes to battleStore and profilesStore.
 * Writes to IndexedDB after every significant state change.
 * Restores battle state from IndexedDB on mount (if present).
 *
 * "Significant" = any change to ships, missiles, round, phase, log, initiativeOrder.
 * UI-only state (modals, selection) is never persisted.
 *
 * Called once at the App root. No return value.
 */

import { useEffect, useRef } from 'react'
import { useBattleStore } from '../store/battleStore.js'
import { useProfilesStore } from '../store/profilesStore.js'
import { dbGet, dbPut, STORE_BATTLE, STORE_PROFILES } from '../utils/db.js'

const BATTLE_KEY = 'current'
const PROFILES_KEY = 'all'

/** Fields from battleStore that are persisted. */
function extractBattleSnapshot(state) {
  return {
    id: state.id,
    name: state.name,
    round: state.round,
    combatMode: state.combatMode,
    phase: state.phase,
    initiativeOrder: state.initiativeOrder,
    currentActorIndex: state.currentActorIndex,
    ships: state.ships,
    missiles: state.missiles,
    log: state.log,
    mapSettings: state.mapSettings,
    savedAt: new Date().toISOString(),
  }
}

/** Shallow equality on significant fields to avoid writes on UI-only changes. */
function hasSignificantChange(prev, next) {
  return (
    prev.round !== next.round ||
    prev.phase !== next.phase ||
    prev.currentActorIndex !== next.currentActorIndex ||
    prev.ships !== next.ships ||
    prev.missiles !== next.missiles ||
    prev.log !== next.log ||
    prev.initiativeOrder !== next.initiativeOrder
  )
}

export function useAutosave() {
  const prevBattleRef = useRef(null)

  // ── Restore battle state on mount ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    dbGet(STORE_BATTLE, BATTLE_KEY).then((saved) => {
      if (cancelled || !saved) return
      // Only restore if saved battle has ships AND store is still empty (fresh load)
      if (Array.isArray(saved.ships) && saved.ships.length > 0 && useBattleStore.getState().ships.length === 0) {
        useBattleStore.setState({
          id: saved.id,
          name: saved.name,
          round: saved.round,
          combatMode: saved.combatMode ?? 'vectorial',
          phase: saved.phase,
          initiativeOrder: saved.initiativeOrder ?? [],
          currentActorIndex: saved.currentActorIndex ?? 0,
          ships: saved.ships ?? [],
          missiles: saved.missiles ?? [],
          log: saved.log ?? [],
          mapSettings: saved.mapSettings ?? { scale: 1 },
        })
      }
    }).catch(() => {/* IndexedDB unavailable — no recovery */})

    return () => { cancelled = true }
  }, [])

  // ── Restore profiles on mount ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    dbGet(STORE_PROFILES, PROFILES_KEY).then((saved) => {
      if (cancelled || !saved || !Array.isArray(saved)) return
      if (saved.length > 0) {
        useProfilesStore.setState({ profiles: saved })
      }
    }).catch(() => {/* IndexedDB unavailable — no recovery */})

    return () => { cancelled = true }
  }, [])

  // ── Subscribe to battleStore — persist on significant changes ──────────
  useEffect(() => {
    prevBattleRef.current = useBattleStore.getState()

    const unsubscribe = useBattleStore.subscribe((state) => {
      const prev = prevBattleRef.current
      if (!hasSignificantChange(prev, state)) return
      prevBattleRef.current = state
      dbPut(STORE_BATTLE, BATTLE_KEY, extractBattleSnapshot(state)).catch(() => {})
    })

    return unsubscribe
  }, [])

  // ── Subscribe to profilesStore — persist on any change ─────────────────
  useEffect(() => {
    const unsubscribe = useProfilesStore.subscribe((state) => {
      dbPut(STORE_PROFILES, PROFILES_KEY, state.profiles).catch(() => {})
    })

    return unsubscribe
  }, [])
}
