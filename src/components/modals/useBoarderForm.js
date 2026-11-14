/**
 * useBoarderForm — form state and validation for creating boarders.
 * Experience and armour presets only pre-fill the fields: the rules never say where an NPC's
 * characteristic bonuses go, so the GM assigns them. // MgT2e CRB p.92–93, p.100
 */

import { useState } from 'react'
import { NPC_EXPERIENCE, PERSONAL_ARMOUR } from '../../data/boarderPresets.js'
import { validateBoarderData, MAX_BOARDER_BATCH } from '../../utils/boarders.js'

const DEFAULT_FORM = {
  name:       'Marine',
  count:      '1',
  experience: 'green',
  armourKey:  'none',
  protection: '0',
  str:        '7',
  dex:        '7',
  end:        '7',
  overflowTo: 'dex',
}

/**
 * @returns {{
 *   form: typeof DEFAULT_FORM,
 *   setField: (key: string, value: string) => void,
 *   chooseExperience: (key: string) => void,
 *   chooseArmour: (key: string) => void,
 *   experienceHint: string|null,
 *   error: string|null,
 *   build: () => Array<object>|null,
 *   reset: () => void,
 * }}
 */
export function useBoarderForm() {
  const [form, setForm] = useState(DEFAULT_FORM)

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const chooseExperience = (key) => {
    const level = NPC_EXPERIENCE[key]
    if (!level) return
    const base = String(level.base)
    setForm((f) => ({ ...f, experience: key, str: base, dex: base, end: base }))
  }

  const chooseArmour = (key) => {
    const armour = PERSONAL_ARMOUR[key]
    if (!armour) return
    setForm((f) => ({ ...f, armourKey: key, protection: String(armour.protection) }))
  }

  const count = Number(form.count)
  const stats = {
    str:        Number(form.str),
    dex:        Number(form.dex),
    end:        Number(form.end),
    protection: Number(form.protection),
    overflowTo: form.overflowTo,
  }

  let error = validateBoarderData(stats)
  if (!error && !(Number.isInteger(count) && count >= 1 && count <= MAX_BOARDER_BATCH)) {
    error = `Quantity must be an integer from 1 to ${MAX_BOARDER_BATCH}`
  }

  const bonuses = NPC_EXPERIENCE[form.experience]?.bonuses ?? []
  const experienceHint = bonuses.length > 0
    ? `CRB table: characteristic bonuses ${bonuses.map((b) => `+${b}`).join(', ')} — assign them below.`
    : null

  /** @returns {Array<object>|null} data for addBoarders, or null while the form is invalid */
  const build = () => {
    if (error) return null
    const base = form.name.trim() === '' ? 'Boarder' : form.name.trim()
    return Array.from({ length: count }, (_, i) => ({
      ...stats,
      name:      count > 1 ? `${base} ${i + 1}` : base,
      armourKey: form.armourKey === 'none' ? null : form.armourKey,
    }))
  }

  const reset = () => setForm(DEFAULT_FORM)

  return { form, setField, chooseExperience, chooseArmour, experienceHint, error, build, reset }
}
