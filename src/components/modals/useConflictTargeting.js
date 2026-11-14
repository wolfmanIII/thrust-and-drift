/**
 * useConflictTargeting — who actually gets hit during the Conflict phase.
 * Un-aimed attacks use the stack (2D after a successful hit); missed shots may strike a
 * random member of either group. Targets come from the GM-defined rosters.
 * // MgT2e HG pp.132–133
 */

import { useState } from 'react'
import { roll2D6 } from '../../utils/dice.js'
import { getStackOrder, pickStackTarget, pickRandomMember } from '../../utils/boarders.js'

const EMPTY_PARTIES = { attacker: [], defender: [] }

/**
 * @param {object} boarding
 * @returns {{
 *   firingSide: 'attacker'|'defender',
 *   targetSide: 'attacker'|'defender',
 *   chooseFiringSide: (side: 'attacker'|'defender') => void,
 *   frontOfLine: import('../../utils/boarders.js').Boarder|null,
 *   stackHit: { results: number[], total: number, side: string, boarder: object|null }|null,
 *   rollStackHit: () => void,
 *   missedMember: { side: string, boarder: object|null }|null,
 *   resolveMissedShot: (outcome: string) => void,
 * }}
 */
export function useConflictTargeting(boarding) {
  const [firingSide, setFiringSide]       = useState('attacker')
  const [stackHit, setStackHit]           = useState(null)
  const [missedMember, setMissedMember]   = useState(null)

  const parties    = boarding.parties ?? EMPTY_PARTIES
  const targetSide = firingSide === 'attacker' ? 'defender' : 'attacker'

  const chooseFiringSide = (side) => {
    setFiringSide(side)
    setStackHit(null)
    setMissedMember(null)
  }

  const rollStackHit = () => {
    const roll = roll2D6()
    setStackHit({
      results: roll.results,
      total:   roll.total,
      side:    targetSide,
      boarder: pickStackTarget(parties[targetSide], roll.total),
    })
  }

  /**
   * Missed Shots table: 1–3 hits a random member of the firing group, 4–5 a random member of the
   * opposing group (both need 8+ to hit). // HG p.133
   * @param {string} outcome  MissedShotResult
   */
  const resolveMissedShot = (outcome) => {
    const side = outcome === 'attacker_hit' ? firingSide : outcome === 'defender_hit' ? targetSide : null
    setMissedMember(side ? { side, boarder: pickRandomMember(parties[side]) } : null)
  }

  return {
    firingSide,
    targetSide,
    chooseFiringSide,
    frontOfLine: getStackOrder(parties[targetSide])[0] ?? null,
    stackHit,
    rollStackHit,
    missedMember,
    resolveMissedShot,
  }
}
