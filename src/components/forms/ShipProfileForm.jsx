/**
 * ShipProfileForm — create or edit a ship profile.
 * Receives profileId (null = create) and onSave/onCancel callbacks.
 * All logic is local state; persists via profilesStore on save.
 */

import { useState } from 'react'
import { useProfilesStore } from '../../store/profilesStore.js'
import { WEAPON_IDS } from '../../data/weapons.js'

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
    crew: { pilot: 1, captain: 0, engineer: 0, gunner: 0, sensors: 0 },
    turrets: [],
  }
}

/** Initialise form state from an existing profile or from scratch. */
function initForm(profile) {
  if (!profile) return blankForm()
  return {
    name:      profile.name      ?? '',
    shipClass: profile.shipClass ?? '',
    tonnage:   profile.tonnage   ?? 100,
    hull:      profile.hull      ?? 20,
    armor:     profile.armor     ?? 0,
    thrust:    profile.thrust    ?? 2,
    jump:      profile.jump      ?? 0,
    crew: { pilot: 1, captain: 0, engineer: 0, gunner: 0, sensors: 0, ...profile.crew },
    turrets: (profile.turrets ?? []).map((t) => ({ ...t, weapons: [...t.weapons] })),
  }
}

// ── Sub-components ────────────────────────────────────────────────────────

/** Labelled numeric input (0–max). */
function NumField({ label, value, onChange, min = 0, max = 99 }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="font-mono text-xs text-slate-500 tracking-widest">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
        className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:border-[--neon-cyan]/60"
      />
    </label>
  )
}

/** Labelled text input. */
function TextField({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="font-mono text-xs text-slate-500 tracking-widest">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-800 border border-slate-600 text-slate-200 font-mono text-sm rounded px-2 py-1 focus:outline-none focus:border-[--neon-cyan]/60 placeholder:text-slate-600"
      />
    </label>
  )
}

/** Turret row: slot number, weapon chips, add weapon dropdown, remove turret. */
function TurretRow({ turret, slotIdx, onAddWeapon, onRemoveWeapon, onRemoveTurret }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 bg-slate-800 rounded px-2 py-1.5">
      <span className="text-slate-500 font-mono text-xs shrink-0 w-16">
        Turret {turret.slot}
      </span>

      {/* Weapon chips */}
      {turret.weapons.map((w, wIdx) => (
        <span
          key={wIdx}
          className="flex items-center gap-1 bg-slate-700 border border-slate-600 text-slate-300 font-mono text-xs rounded px-1.5 py-0.5"
        >
          {w}
          <button
            type="button"
            onClick={() => onRemoveWeapon(slotIdx, wIdx)}
            className="text-slate-500 hover:text-red-400 leading-none transition-colors"
            aria-label={`Remove ${w}`}
          >
            ×
          </button>
        </span>
      ))}

      {/* Add weapon */}
      <select
        value=""
        onChange={(e) => { onAddWeapon(slotIdx, e.target.value); e.target.value = '' }}
        className="bg-slate-700 border border-slate-600 text-slate-400 font-mono text-xs rounded px-1.5 py-0.5 focus:outline-none focus:border-[--neon-cyan]/60 cursor-pointer"
      >
        <option value="">+ weapon</option>
        {WEAPON_IDS.map((w) => (
          <option key={w} value={w}>{w}</option>
        ))}
      </select>

      {/* Remove turret */}
      <button
        type="button"
        onClick={() => onRemoveTurret(slotIdx)}
        className="ml-auto text-slate-600 hover:text-red-400 font-mono text-xs transition-colors"
        aria-label="Remove turret"
      >
        ⊗ turret
      </button>
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

  // ── Field helpers ──────────────────────────────────────────────────────

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const setCrew = (key, value) => setForm((f) => ({ ...f, crew: { ...f.crew, [key]: value } }))

  const addTurret = () => {
    const nextSlot = (form.turrets.at(-1)?.slot ?? 0) + 1
    setForm((f) => ({ ...f, turrets: [...f.turrets, { slot: nextSlot, weapons: [] }] }))
  }

  const removeTurret = (slotIdx) => {
    setForm((f) => ({ ...f, turrets: f.turrets.filter((_, i) => i !== slotIdx) }))
  }

  const addWeapon = (slotIdx, weapon) => {
    if (!weapon) return
    setForm((f) => ({
      ...f,
      turrets: f.turrets.map((t, i) =>
        i === slotIdx ? { ...t, weapons: [...t.weapons, weapon] } : t
      ),
    }))
  }

  const removeWeapon = (slotIdx, weaponIdx) => {
    setForm((f) => ({
      ...f,
      turrets: f.turrets.map((t, i) =>
        i === slotIdx ? { ...t, weapons: t.weapons.filter((_, j) => j !== weaponIdx) } : t
      ),
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
          <h3 className="font-mono text-xs text-slate-500 tracking-widest uppercase border-b border-slate-800 pb-1">
            Identification
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <TextField
                label="NOME *"
                value={form.name}
                onChange={(v) => set('name', v)}
                placeholder="e.g. Far Trader"
              />
            </div>
            <TextField
              label="CLASSE"
              value={form.shipClass}
              onChange={(v) => set('shipClass', v)}
              placeholder="e.g. Type A"
            />
            <NumField label="TONNAGE"      value={form.tonnage} onChange={(v) => set('tonnage', v)} min={1} max={100000} />
          </div>
        </section>

        {/* Combat stats */}
        <section className="space-y-3">
          <h3 className="font-mono text-xs text-slate-500 tracking-widest uppercase border-b border-slate-800 pb-1">
            Combat Stats
          </h3>
          <div className="grid grid-cols-4 gap-3">
            <NumField label="HULL"    value={form.hull}   onChange={(v) => set('hull', v)}   min={1} max={9999} />
            <NumField label="ARMOUR"   value={form.armor} onChange={(v) => set('armor', v)}  min={0} max={20} />
            <NumField label="THRUST"  value={form.thrust} onChange={(v) => set('thrust', v)} min={1} max={9} />
            <NumField label="JUMP"    value={form.jump}   onChange={(v) => set('jump', v)}   min={0} max={6} />
          </div>
        </section>

        {/* Crew */}
        <section className="space-y-3">
          <h3 className="font-mono text-xs text-slate-500 tracking-widest uppercase border-b border-slate-800 pb-1">
            Crew (Skill Level)
          </h3>
          <div className="grid grid-cols-5 gap-3">
            <NumField label="PILOT"    value={form.crew.pilot}    onChange={(v) => setCrew('pilot', v)}    min={0} max={5} />
            <NumField label="CAPTAIN"  value={form.crew.captain}  onChange={(v) => setCrew('captain', v)}  min={0} max={5} />
            <NumField label="ENGINEER" value={form.crew.engineer} onChange={(v) => setCrew('engineer', v)} min={0} max={5} />
            <NumField label="GUNNER"   value={form.crew.gunner}   onChange={(v) => setCrew('gunner', v)}   min={0} max={5} />
            <NumField label="SENSORS"  value={form.crew.sensors}  onChange={(v) => setCrew('sensors', v)}  min={0} max={5} />
          </div>
        </section>

        {/* Turrets */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
            <h3 className="font-mono text-xs text-slate-500 tracking-widest uppercase">
              Turrets ({form.turrets.length})
            </h3>
            <button
              type="button"
              onClick={addTurret}
              className="text-[--neon-cyan] font-mono text-xs border border-[--neon-cyan]/30 rounded px-2 py-0.5 hover:bg-[--neon-cyan]/10 transition-colors"
            >
              + Add
            </button>
          </div>
          {form.turrets.length === 0 && (
            <p className="text-slate-600 font-mono text-xs italic">No turrets.</p>
          )}
          <div className="space-y-1.5">
            {form.turrets.map((t, idx) => (
              <TurretRow
                key={t.slot}
                turret={t}
                slotIdx={idx}
                onAddWeapon={addWeapon}
                onRemoveWeapon={removeWeapon}
                onRemoveTurret={removeTurret}
              />
            ))}
          </div>
        </section>

      </div>

      {/* Footer: error + actions */}
      <div className="px-5 py-3 border-t border-slate-800 shrink-0 space-y-2">
        {error && (
          <p className="text-red-400 font-mono text-xs">⚠ {error}</p>
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
            className="flex-1 py-2 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-mono text-xs tracking-widest rounded hover:bg-[--neon-cyan]/20 transition-colors"
          >
            {isNew ? '+ CREATE PROFILE' : '✓ SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  )
}
