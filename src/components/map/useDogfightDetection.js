/**
 * useDogfightDetection — detects potential dogfight groups after movement.
 * Watches for phase transition movement→attack and scans ships in same hex
 * with different factions. Returns groups for the notification modal.
 * @see dogfight-system-design.md §2
 */

import { useEffect, useRef, useState } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { hexDistance } from '../../utils/hex.js'

/**
 * Scan active ships for same-hex, different-faction pairs.
 * Groups all ships occupying the same hex into one entry.
 * Ships already in a dogfight are excluded.
 * @param {object[]} ships  ShipInstance array
 * @returns {{ shipIds: string[] }[]}
 */
export function detectDogfightGroups(ships) {
  const active = ships.filter((s) => !s.inDogfight)

  // Bucket ships by hex position
  const byHex = new Map()
  for (const ship of active) {
    const key = `${ship.position.q},${ship.position.r}`
    if (!byHex.has(key)) byHex.set(key, [])
    byHex.get(key).push(ship)
  }

  const groups = []
  for (const hexShips of byHex.values()) {
    if (hexShips.length < 2) continue
    const factions = new Set(hexShips.map((s) => s.faction))
    if (factions.size < 2) continue  // single faction — no dogfight possible
    // Extra guard: verify at least one pair has distance 0 (should always be true here)
    const hasPair = hexShips.some((a, i) =>
      hexShips.slice(i + 1).some((b) => hexDistance(a.position, b.position) === 0)
    )
    if (hasPair) groups.push({ shipIds: hexShips.map((s) => s.id) })
  }

  return groups
}

/**
 * Detects dogfight conditions after the movement→attack phase transition.
 * Only active in vectorial combat mode.
 * @returns {{ detectedGroups: { shipIds: string[] }[], clearDetected: Function }}
 */
export function useDogfightDetection() {
  const phase      = useBattleStore((s) => s.phase)
  const ships      = useBattleStore((s) => s.ships)
  const combatMode = useBattleStore((s) => s.combatMode)

  const prevPhaseRef = useRef(phase)
  const [detectedGroups, setDetectedGroups] = useState([])

  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (prevPhase !== 'movement' || phase !== 'attack') return
    if (combatMode !== 'vectorial') return

    const groups = detectDogfightGroups(ships)
    if (groups.length > 0) setDetectedGroups(groups)
  }, [phase, ships, combatMode])

  return {
    detectedGroups,
    clearDetected: () => setDetectedGroups([]),
  }
}
