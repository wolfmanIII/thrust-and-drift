/**
 * ShipProfileForm — create or edit a ship profile.
 * Receives profileId (null = create) and onSave/onCancel callbacks.
 * All logic is local state; persists via profilesStore on save.
 */

import { useState } from 'react'
import { useProfilesStore } from '../../store/profilesStore.js'
import { WEAPON_IDS, WEAPONS } from '../../data/weapons.js'
import { CREW_SKILLS, blankCrewMember, migrateCrew } from '../../utils/crew.js'
import { hardpointBudget, slotHardpointCost, totalHardpointsUsed } from '../../utils/hardpoints.js'
import { isSingletonInSlot } from '../../utils/weaponOverrides.js'
import { Tooltip } from '../ui/Tooltip.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────

/** Build a blank form state for a new profile. */
function blankForm() {
  return {
    name: '',
    shipClass: '',
    tonnage: 100,
    hull: 20,
    armor: 0,
    thrust: 2,
    jump: 0,
    tl: 12,
    dexDM: 0,
    maxPower: 100,
    computerBandwidth: 0,
    hardened: false,
    holographicControls: false,
    crew: [],
    turrets: [],
  }
}

/** Initialise form state from an existing profile or from scratch. */
function initForm(profile) {
  if (!profile) return blankForm()
  const rawCrew = profile.crew ?? []
  const crew = Array.isArray(rawCrew)
    ? rawCrew.map((m) => ({ ...m, skills: { ...m.skills } }))
    : migrateCrew(rawCrew)
  return {
    name:              profile.name              ?? '',
    shipClass:         profile.shipClass         ?? '',
    tonnage:           profile.tonnage           ?? 100,
    hull:              profile.hull              ?? 20,
    armor:             profile.armor             ?? 0,
    thrust:            profile.thrust            ?? 2,
    jump:              profile.jump              ?? 0,
    tl:                profile.tl                ?? 12,
    dexDM:             profile.dexDM             ?? 0,
    maxPower:          profile.maxPower          ?? 100,
    computerBandwidth: profile.computerBandwidth ?? 0,
    hardened:          profile.hardened          ?? false,
    holographicControls: profile.holographicControls ?? false,
    crew,
    turrets: (profile.turrets ?? []).map((t) => ({
      ...t,
      weapons: [...t.weapons],
      ...(t.weaponOverrides ? { weaponOverrides: { ...t.weaponOverrides } } : {}),
    })),
  }
}

// ── Sub-components ────────────────────────────────────────────────────────

/** Labelled numeric input (0–max). */
function NumField({ label, value, onChange, min = 0, max = 99 }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="font-mono text-xs text-slate-400 tracking-widest">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60"
      />
    </label>
  )
}

/** Labelled checkbox input. */
function CheckboxField({ label, checked, onChange, tooltip }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-(--neon-cyan) cursor-pointer"
      />
      <span className="font-mono text-xs text-slate-400 tracking-widest">{label}</span>
      {tooltip && (
        <Tooltip label={tooltip} position="top">
          <span className="text-slate-500 cursor-help">(?)</span>
        </Tooltip>
      )}
    </label>
  )
}

/** Labelled text input. */
function TextField({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="font-mono text-xs text-slate-400 tracking-widest">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60 placeholder:text-slate-400"
      />
    </label>
  )
}

/**
 * Crew member row: name field + compact skill inputs for each role.
 * Skill value 0 = trained, no bonus. Negative = attribute penalty or untrained (min −3). Max 5.
 */
function CrewMemberRow({ member, onChange, onRemove }) {
  return (
    <div className="bg-slate-800 rounded px-2.5 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={member.name}
          placeholder="Name"
          onChange={(e) => onChange({ ...member, name: e.target.value })}
          className="flex-1 bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs rounded px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60 placeholder:text-slate-400"
        />
        <Tooltip label="Remove crew member" position="top">
          <button
            type="button"
            onClick={onRemove}
            className="text-slate-400 hover:text-red-400 font-mono text-sm leading-none transition-colors shrink-0 px-1"
            aria-label="Remove crew member"
          >
            ✕
          </button>
        </Tooltip>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {CREW_SKILLS.map((skill) => (
          <label key={skill} className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] text-slate-400 tracking-wide uppercase">
              {skill.toUpperCase()}
            </span>
            <input
              type="number"
              min={-3}
              max={5}
              value={member.skills[skill] ?? 0}
              onChange={(e) => onChange({
                ...member,
                skills: { ...member.skills, [skill]: Math.max(-3, Math.min(5, Number(e.target.value) || 0)) },
              })}
              className="w-full bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs rounded px-1.5 py-1 focus:outline-none focus:border-(--neon-cyan)/60"
            />
          </label>
        ))}
      </div>
    </div>
  )
}

const TURRET_WEAPON_IDS = WEAPON_IDS

// Single / Double / Triple / Quad — HG p.81 (quad turret, 4 weapons, DM+3 PD).
// Quad Turret is a turret-only mechanic — barbette and bay weapons are each
// their own standalone hardpoint (HG p.29 — "a barbette uses a single Hardpoint") and cannot combine with anything.
const TURRET_TYPE_LABELS = ['—', 'SINGLE', 'DOUBLE', 'TRIPLE', 'QUAD']

function weaponMount(weaponId) {
  return WEAPONS[weaponId]?.mount ?? 'turret'
}

/**
 * Shift a turret's weaponOverrides keys after a weapon at `removedIdx` is
 * removed — every override at a higher index moves down by one so it still
 * points at the same physical weapon.
 * @param {Record<number, object>|undefined} weaponOverrides
 * @param {number} removedIdx
 * @returns {Record<number, object>|undefined}  undefined if nothing remains
 */
function reindexOverridesAfterRemoval(weaponOverrides, removedIdx) {
  if (!weaponOverrides) return undefined
  const result = {}
  for (const [key, val] of Object.entries(weaponOverrides)) {
    const idx = Number(key)
    if (idx === removedIdx) continue
    result[idx > removedIdx ? idx - 1 : idx] = val
  }
  return pruneEmpty(result)
}

/** `{}`-like objects collapse to `undefined` so sparse maps never carry dead keys. */
function pruneEmpty(obj) {
  return Object.keys(obj).length > 0 ? obj : undefined
}

/** Labelled text input for the override editor (empty = inherit base weapon value). */
function OverrideField({ label, value, placeholder, onChange, numeric = false, min, max, wide = false }) {
  return (
    <label className={`flex flex-col gap-0.5 ${wide ? 'col-span-2' : ''}`}>
      <span className="font-mono text-[10px] text-slate-400 tracking-wide uppercase">{label}</span>
      <input
        type={numeric ? 'number' : 'text'}
        min={min}
        max={max}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-xs rounded px-2 py-1 focus:outline-none focus:border-(--neon-cyan)/60 placeholder:text-slate-500"
      />
    </label>
  )
}

/**
 * Inline editor for a single turret weapon's GM override (#21 iteration 1).
 * Only label/damageDice/damageBonus/notes are overridable — range/salvo/ammo/traits
 * are untouched. Empty field = no override for that field (inherits base WEAPONS value).
 * The override is applied at attack time only if the weapon name is a singleton in
 * this slot (`resolveWeaponForSlot`, `utils/weaponOverrides.js`) — CRB p.168 double/triple
 * turret linking requires identical weapons, so a duplicated name always falls back to
 * the base def and the override sits inert until the duplicate is removed.
 */
function WeaponOverrideEditor({ weaponName, base, override, isSingleton, onField }) {
  return (
    <div className="bg-slate-900 border border-(--neon-cyan)/30 rounded px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-slate-400 tracking-widest uppercase">
          Override — {weaponName}
        </span>
      </div>
      {!isSingleton && (
        <p className="text-amber-400 font-mono text-[10px] leading-snug">
          ⚠ Inactive — another {weaponName} shares this slot. CRB p.168 double/triple turret
          linking requires identical weapons; this override is ignored until only one remains.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <OverrideField
          label="Custom name"
          value={override?.label}
          placeholder={base.label}
          onChange={(v) => onField('label', v)}
          wide
        />
        <OverrideField
          label="Damage dice"
          value={override?.damageDice}
          placeholder={String(base.damageDice)}
          onChange={(v) => onField('damageDice', v)}
          numeric
          min={0}
          max={20}
        />
        <OverrideField
          label="Damage bonus"
          value={override?.damageBonus}
          placeholder={String(base.damageBonus ?? 0)}
          onChange={(v) => onField('damageBonus', v)}
          numeric
          min={-9}
          max={20}
        />
        <OverrideField
          label="GM notes"
          value={override?.notes}
          placeholder="Refit notes…"
          onChange={(v) => onField('notes', v)}
          wide
        />
      </div>
    </div>
  )
}

/**
 * Turret row: slot number, weapon chips, add weapon dropdown, remove turret.
 * The caller keys this component by `turret.weapons.length` (in addition to
 * `turret.slot`) so adding/removing a weapon remounts it — the cleanest way
 * to reset `editingIdx` without a stale index once positions shift, no
 * effect required.
 */
function TurretRow({ turret, slotIdx, onAddWeapon, onRemoveWeapon, onRemoveTurret, onOverrideField }) {
  const [editingIdx, setEditingIdx] = useState(null)

  const n          = turret.weapons.length
  const firstMount = n > 0 ? weaponMount(turret.weapons[0]) : null
  const isFixedMount = firstMount === 'barbette' || firstMount === 'bay'
  const maxWeapons   = isFixedMount ? 1 : 4
  const canAddMore   = n < maxWeapons
  const typeLabel    = isFixedMount ? firstMount.toUpperCase() : (TURRET_TYPE_LABELS[n] ?? 'QUAD')

  // Barbette/bay weapons are standalone — only offer them in an empty slot.
  // A slot already holding a turret weapon may only receive more turret weapons.
  const addableWeaponIds = n === 0
    ? TURRET_WEAPON_IDS
    : TURRET_WEAPON_IDS.filter((w) => weaponMount(w) === 'turret')

  const editingName = editingIdx != null ? turret.weapons[editingIdx] : null
  const editingBase = editingName ? WEAPONS[editingName] : null

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 rounded px-2 py-1.5">
        <span className="text-slate-400 font-mono text-xs shrink-0 w-16">
          Weapon {turret.slot}
        </span>
        <span className="text-slate-600 font-mono text-[10px] shrink-0">{typeLabel}</span>

        {/* Weapon chips */}
        {turret.weapons.map((w, wIdx) => {
          const override      = turret.weaponOverrides?.[wIdx]
          const isSingleton    = isSingletonInSlot(turret, w)
          const overrideActive = !!override && isSingleton
          return (
            <span
              key={wIdx}
              className="flex items-center gap-1 bg-slate-700 border border-slate-600 text-slate-300 font-mono text-xs rounded px-1.5 py-0.5"
            >
              {overrideActive ? (override.label || w) : w}
              {overrideActive && (
                <span className="text-(--neon-cyan)" title="Custom override active">●</span>
              )}
              {override && !isSingleton && (
                <span className="text-amber-400" title="Override inactive — duplicate weapon in slot">!</span>
              )}
              <Tooltip label="GM override — name/damage/notes" position="top">
                <button
                  type="button"
                  onClick={() => setEditingIdx(editingIdx === wIdx ? null : wIdx)}
                  className={`leading-none transition-colors ${editingIdx === wIdx ? 'text-(--neon-cyan)' : 'text-slate-400 hover:text-(--neon-cyan)'}`}
                  aria-label={`Customize ${w}`}
                >
                  ⚙
                </button>
              </Tooltip>
              <button
                type="button"
                onClick={() => onRemoveWeapon(slotIdx, wIdx)}
                className="text-slate-400 hover:text-red-400 leading-none transition-colors"
                aria-label={`Remove ${w}`}
              >
                ×
              </button>
            </span>
          )
        })}

        {/* Add weapon — turret slots hold up to 4 (quad turret, HG p.81); barbette/bay are single-mount (HG p.29) */}
        {canAddMore && (
          <select
            value=""
            onChange={(e) => { onAddWeapon(slotIdx, e.target.value); e.target.value = '' }}
            className="bg-slate-700 border border-slate-600 text-slate-400 font-mono text-xs rounded px-1.5 py-0.5 focus:outline-none focus:border-(--neon-cyan)/60 cursor-pointer"
          >
            <option value="">+ weapon</option>
            {addableWeaponIds.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        )}
        {!canAddMore && (
          <span className="text-slate-400 font-mono text-xs italic">
            {isFixedMount ? `${typeLabel} — single mount` : 'QUAD — max 4'}
          </span>
        )}

        {/* Remove turret */}
        <Tooltip label="Remove weapon slot" position="top">
          <button
            type="button"
            onClick={() => onRemoveTurret(slotIdx)}
            className="ml-auto text-slate-400 hover:text-red-400 font-mono text-sm leading-none transition-colors px-1"
            aria-label="Remove weapon slot"
          >
            ✕
          </button>
        </Tooltip>
      </div>

      {editingIdx != null && editingBase && (
        <WeaponOverrideEditor
          weaponName={editingName}
          base={editingBase}
          override={turret.weaponOverrides?.[editingIdx]}
          isSingleton={isSingletonInSlot(turret, editingName)}
          onField={(field, value) => onOverrideField(slotIdx, editingIdx, field, value)}
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

/**
 * @param {{
 *   profileId: string|null,
 *   onSave: Function,
 *   onCancel: Function,
 * }} props
 */
export function ShipProfileForm({ profileId, onSave, onCancel }) {
  const profiles      = useProfilesStore((s) => s.profiles)
  const addProfile    = useProfilesStore((s) => s.addProfile)
  const updateProfile = useProfilesStore((s) => s.updateProfile)

  const existing = profileId ? profiles.find((p) => p.id === profileId) : null
  const [form, setForm] = useState(() => initForm(existing))
  const [error, setError] = useState(null)

  const isNew = !profileId

  const hardpointsBudget = hardpointBudget(form.tonnage)
  const hardpointsUsed   = totalHardpointsUsed(form.turrets)

  // ── Field helpers ──────────────────────────────────────────────────────

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const addCrewMember   = () => setForm((f) => ({ ...f, crew: [...f.crew, blankCrewMember()] }))
  const removeCrewMember = (idx) => setForm((f) => ({ ...f, crew: f.crew.filter((_, i) => i !== idx) }))
  const updateCrewMember = (idx, updated) => setForm((f) => ({
    ...f,
    crew: f.crew.map((m, i) => i === idx ? updated : m),
  }))

  const addTurret = () => {
    const nextSlot = (form.turrets.at(-1)?.slot ?? 0) + 1
    setForm((f) => ({ ...f, turrets: [...f.turrets, { slot: nextSlot, weapons: [] }] }))
  }

  const removeTurret = (slotIdx) => {
    setForm((f) => ({ ...f, turrets: f.turrets.filter((_, i) => i !== slotIdx) }))
  }

  const addWeapon = (slotIdx, weapon) => {
    if (!weapon) return
    const targetSlot = form.turrets[slotIdx]
    // Only an empty slot's first weapon changes the slot's Hardpoint cost —
    // a 2nd/3rd/4th turret weapon in the same slot is still 1 Hardpoint total.
    // Existing profiles that already exceed budget are never retroactively
    // blocked (CRB p.183 budget applies only to new slot additions going forward).
    if (targetSlot?.weapons.length === 0) {
      const budget = hardpointBudget(form.tonnage)
      const used = totalHardpointsUsed(form.turrets)
      const newCost = slotHardpointCost({ weapons: [weapon] })
      if (used + newCost > budget) {
        setError(`Hardpoint budget exceeded — ${used}/${budget} used, this mount needs ${newCost} more.`)
        return
      }
    }
    setError(null)
    setForm((f) => ({
      ...f,
      turrets: f.turrets.map((t, i) => {
        if (i !== slotIdx) return t
        if (t.weapons.length === 0) return { ...t, weapons: [weapon] }
        // Barbette/bay weapons are standalone hardpoints (HG p.29) — cannot
        // combine with anything. Quad turret (HG p.81) applies to turret weapons only.
        const firstMount = weaponMount(t.weapons[0])
        if (firstMount !== 'turret') return t
        if (weaponMount(weapon) !== 'turret') return t
        if (t.weapons.length >= 4) return t
        return { ...t, weapons: [...t.weapons, weapon] }
      }),
    }))
  }

  const removeWeapon = (slotIdx, weaponIdx) => {
    setForm((f) => ({
      ...f,
      turrets: f.turrets.map((t, i) => {
        if (i !== slotIdx) return t
        const weapons = t.weapons.filter((_, j) => j !== weaponIdx)
        // weaponOverrides is keyed by position — removing an index shifts every
        // later weapon down one slot, so its override must shift with it.
        const weaponOverrides = reindexOverridesAfterRemoval(t.weaponOverrides, weaponIdx)
        return { ...t, weapons, weaponOverrides }
      }),
    }))
  }

  /**
   * Set or clear one override field for a turret weapon (#21 iteration 1).
   * An empty value clears that field; the whole `weaponOverrides[weaponIdx]`
   * entry is dropped once every field on it is empty, keeping the map sparse.
   */
  const setOverrideField = (slotIdx, weaponIdx, field, rawValue) => {
    setForm((f) => ({
      ...f,
      turrets: f.turrets.map((t, i) => {
        if (i !== slotIdx) return t
        const current = { ...(t.weaponOverrides?.[weaponIdx] ?? {}) }
        if (rawValue === '') {
          delete current[field]
        } else {
          current[field] = (field === 'damageDice' || field === 'damageBonus') ? Number(rawValue) : rawValue
        }
        const weaponOverrides = { ...(t.weaponOverrides ?? {}), [weaponIdx]: pruneEmpty(current) }
        if (weaponOverrides[weaponIdx] === undefined) delete weaponOverrides[weaponIdx]
        return { ...t, weaponOverrides: pruneEmpty(weaponOverrides) }
      }),
    }))
  }

  // ── Save ───────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setError(null)
    if (isNew) {
      addProfile({ ...form, name: form.name.trim() })
    } else {
      updateProfile(profileId, { ...form, name: form.name.trim() })
    }
    onSave()
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      {/* Form header */}
      <div className="px-5 py-3 border-b border-slate-800 shrink-0">
        <h2 className="font-mono text-xs text-slate-400 tracking-widest uppercase">
          {isNew ? '+ NEW PROFILE' : `EDIT — ${existing?.name ?? ''}`}
        </h2>
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Basic info */}
        <section className="space-y-3">
          <h3 className="font-mono text-xs text-slate-400 tracking-widest uppercase border-b border-slate-800 pb-1">
            Identification
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <TextField
                label="NAME *"
                value={form.name}
                onChange={(v) => set('name', v)}
                placeholder="e.g. Far Trader"
              />
            </div>
            <TextField
              label="CLASS"
              value={form.shipClass}
              onChange={(v) => set('shipClass', v)}
              placeholder="e.g. Type A"
            />
            <NumField label="TONNAGE"      value={form.tonnage} onChange={(v) => set('tonnage', v)} min={1} max={100000} />
          </div>
        </section>

        {/* Combat stats */}
        <section className="space-y-3">
          <h3 className="font-mono text-xs text-slate-400 tracking-widest uppercase border-b border-slate-800 pb-1">
            Combat Stats
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <NumField label="HULL"    value={form.hull}   onChange={(v) => set('hull', v)}   min={1} max={9999} />
            <NumField label="ARMOUR"  value={form.armor}  onChange={(v) => set('armor', v)}  min={0} max={20} />
            <NumField label="THRUST"  value={form.thrust} onChange={(v) => set('thrust', v)} min={1} max={9} />
            <NumField label="JUMP"    value={form.jump}   onChange={(v) => set('jump', v)}   min={0} max={6} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <NumField label="TECH LVL" value={form.tl}    onChange={(v) => set('tl', v)}     min={7} max={16} />
            <NumField label="PILOT DEX DM" value={form.dexDM} onChange={(v) => set('dexDM', v)} min={-3} max={3} />
          </div>
          <CheckboxField
            label="HOLOGRAPHIC CONTROLS BRIDGE (TL9)"
            checked={form.holographicControls}
            onChange={(v) => set('holographicControls', v)}
            tooltip="Bridge optimised for the task at hand — DM+2 to Initiative rolls (CRB p.186 / HG Update 2022 p.31)"
          />
        </section>

        {/* Power Plant — Ion Cannon target stat */}
        <section className="space-y-3">
          <h3 className="font-mono text-xs text-slate-400 tracking-widest uppercase border-b border-slate-800 pb-1">
            Power Plant
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="MAX POWER"
              value={form.maxPower}
              onChange={(v) => set('maxPower', v)}
              min={10}
              max={9999}
            />
            <NumField
              label="COMPUTER BW"
              value={form.computerBandwidth}
              onChange={(v) => set('computerBandwidth', v)}
              min={0}
              max={999}
            />
          </div>
          <CheckboxField
            label="HARDENED SYSTEMS (/fib)"
            checked={form.hardened}
            onChange={(v) => set('hardened', v)}
            tooltip="Computer with /fib designation — immune to Ion weapons (FAQ HG 2022 p.1)"
          />
        </section>

        {/* Crew Manifest */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <h3 className="font-mono text-xs text-slate-400 tracking-widest uppercase">
              Crew Manifest ({form.crew.length})
            </h3>
            <button
              type="button"
              onClick={addCrewMember}
              className="text-(--neon-cyan) font-mono text-xs border border-(--neon-cyan)/30 rounded px-2 py-0.5 hover:bg-(--neon-cyan)/10 transition-colors"
            >
              + Add
            </button>
          </div>
          {form.crew.length === 0 && (
            <p className="text-slate-400 font-mono text-xs italic">No crew assigned.</p>
          )}
          <div className="space-y-2">
            {form.crew.map((member, idx) => (
              <CrewMemberRow
                key={member.id}
                member={member}
                onChange={(updated) => updateCrewMember(idx, updated)}
                onRemove={() => removeCrewMember(idx)}
              />
            ))}
          </div>
        </section>

        {/* Turrets */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <h3 className="font-mono text-xs text-slate-400 tracking-widest uppercase">
              Weapons ({form.turrets.length})
            </h3>
            <div className="flex items-center gap-3">
              <Tooltip label="CRB p.183 — 1 Hardpoint per full 100 tons (Firmpoints under 100t). HG p.31 — Large Bay costs 5." position="top">
                <span className={`font-mono text-xs tracking-widest ${hardpointsUsed > hardpointsBudget ? 'text-red-400' : 'text-slate-400'}`}>
                  HARDPOINTS {hardpointsUsed}/{hardpointsBudget}
                </span>
              </Tooltip>
              <button
                type="button"
                onClick={addTurret}
                className="text-(--neon-cyan) font-mono text-xs border border-(--neon-cyan)/30 rounded px-2 py-0.5 hover:bg-(--neon-cyan)/10 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>
          {form.turrets.length === 0 && (
            <p className="text-slate-400 font-mono text-xs italic">No weapon slots.</p>
          )}
          <div className="space-y-1.5">
            {form.turrets.map((t, idx) => (
              <TurretRow
                key={`${t.slot}-${t.weapons.length}`}
                turret={t}
                slotIdx={idx}
                onAddWeapon={addWeapon}
                onRemoveWeapon={removeWeapon}
                onRemoveTurret={removeTurret}
                onOverrideField={setOverrideField}
              />
            ))}
          </div>
        </section>

      </div>

      {/* Footer: error + actions */}
      <div className="px-5 py-3 border-t border-slate-800 shrink-0 space-y-2">
        {error && (
          <p className="text-red-400 font-mono text-xs">🚨 {error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500 transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-xs tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors"
          >
            {isNew ? '+ CREATE PROFILE' : '✅ SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  )
}
