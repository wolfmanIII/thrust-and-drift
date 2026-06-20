/**
 * useDogfightDetection — detects potential dogfight groups after movement.
 * Watches for phase transition movement→attack and scans for hostile ships
 * at Adjacent range. Returns groups for the notification modal.
 * @see dogfight-system-design.md §2
 */

import { useEffect, useRef, useState } from 'react'
import { useBattleStore } from '../../store/battleStore.js'
import { hexDistance } from '../../utils/hex.js'

/**
 * Scan active ships for same-hex, different-faction pairs (vectorial mode).
 * Groups all ships occupying the same hex into one entry.
 * Ships already in a dogfight are excluded.
 * @param {object[]} ships  ShipInstance array
 * @returns {{ shipIds: string[] }[]}
 */
export function detectDogfightGroups(ships) {
  const active = ships.filter((s) => !s.inDogfight && !s.inBoarding)

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
 * Scan active ships for Adjacent-band, different-faction pairs (basic mode).
 * Uses rangeBands store: triggers when any pair reaches 'Adjacent' range.
 * @param {object[]} ships       ShipInstance array
 * @param {object}   rangeBands  { pairKey: bandLabel }
 * @returns {{ shipIds: string[] }[]}
 */
export function detectDogfightGroupsBasic(ships, rangeBands) {
  const active = ships.filter((s) => !s.inDogfight && !s.inBoarding && !s.isDestroyed)
  const groups = []

  for (const [pairKey, band] of Object.entries(rangeBands)) {
    if (band !== 'Adjacent') continue
    const [idA, idB] = pairKey.split('_')
    const shipA = active.find((s) => s.id === idA)
    const shipB = active.find((s) => s.id === idB)
    if (!shipA || !shipB) continue
    if (shipA.faction === shipB.faction) continue
    groups.push({ shipIds: [shipA.id, shipB.id] })
  }

  return groups
}

/**
 * Detects dogfight conditions after the movement→attack phase transition.
 * Active in both vectorial (same-hex detection) and basic (Adjacent band) modes.
 * @returns {{ detectedGroups: { shipIds: string[] }[], clearDetected: Function }}
 */
export function useDogfightDetection() {
  const phase      = useBattleStore((s) => s.phase)
  const ships      = useBattleStore((s) => s.ships)
  const combatMode = useBattleStore((s) => s.combatMode)
  const rangeBands = useBattleStore((s) => s.rangeBands)
  const round      = useBattleStore((s) => s.round)

  const prevPhaseRef      = useRef(phase)
  const shipsRef          = useRef(ships)
  const rangeBandsRef     = useRef(rangeBands)
  const lastDetectedRound = useRef(-1)
  const [detectedGroups, setDetectedGroups] = useState([])

  useEffect(() => { shipsRef.current = ships },          [ships])
  useEffect(() => { rangeBandsRef.current = rangeBands }, [rangeBands])

  useEffect(() => {
    const prevPhase = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (prevPhase !== 'movement' || phase !== 'attack') return
    if (combatMode !== 'vectorial' && combatMode !== 'basic') return
    // One detection per round — undo+redo of the phase transition must not re-open the modal
    if (round === lastDetectedRound.current) return

    const groups = combatMode === 'basic'
      ? detectDogfightGroupsBasic(shipsRef.current, rangeBandsRef.current)
      : detectDogfightGroups(shipsRef.current)

    if (groups.length > 0) {
      lastDetectedRound.current = round
      setDetectedGroups(groups)
    }
  }, [phase, combatMode, round])

  return {
    detectedGroups,
    clearDetected: () => setDetectedGroups([]),
  }
}
