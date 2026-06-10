/**
 * Dashboard — pre-battle lobby.
 * Left panel: ship profile management.
 * Right panel: session controls (default) or ShipProfileForm (when editing).
 */

import { useState, useRef, useEffect } from 'react'
import tdLogo from '../../assets/TD-logo-transparent.png'
import { useUiStore }       from '../../store/uiStore.js'
import { useBattleStore }   from '../../store/battleStore.js'
import { useProfilesStore } from '../../store/profilesStore.js'
import { ShipProfileForm }  from '../forms/ShipProfileForm.jsx'
import { CatalogPanel }     from './CatalogPanel.jsx'
import { useProfileImport } from './useProfileImport.js'
import { Tooltip }          from '../ui/Tooltip.jsx'
import { Modal }            from '../modals/Modal.jsx'
import { dbGet, dbDelete, STORE_BATTLE } from '../../utils/db.js'
import { parseBattleFile } from '../../utils/io.js'

// ── Left panel: profiles list ─────────────────────────────────────────────

/**
 * @param {{
 *   editingId:  string|null,
 *   onEdit:     Function,
 *   onNew:      Function,
 *   onCatalog:  Function,
 *   catalogOpen: boolean,
 * }} props
 */
function ProfilesPanel({ editingId, onEdit, onNew, onCatalog, catalogOpen }) {
  const profiles         = useProfilesStore((s) => s.profiles)
  const deleteProfile    = useProfilesStore((s) => s.deleteProfile)
  const duplicateProfile = useProfilesStore((s) => s.duplicateProfile)
  const exportAll        = useProfilesStore((s) => s.exportAll)

  const { importStatus, fileInputRef, handleImport } = useProfileImport()

  const [filter, setFilter]               = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    (p.shipClass ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-slate-700 shrink-0 bg-slate-900">
        <h2 className="font-display text-xs text-(--neon-cyan) tracking-widest uppercase">
          Ship Profiles
          <span className="ml-2 text-slate-500">({profiles.length})</span>
        </h2>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <input
          type="text"
          placeholder="Search profile…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:border-(--neon-cyan)/60 placeholder:text-slate-600"
        />
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 py-1">
        {filtered.length === 0 && (
          <p className="text-slate-600 font-mono text-xs italic px-2 py-2">
            {filter ? 'No results.' : 'No profiles. Create one.'}
          </p>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className={`group flex items-center gap-2 px-2 py-2 rounded transition-colors ${
              editingId === p.id
                ? 'bg-(--neon-cyan)/10 border border-(--neon-cyan)/30'
                : 'border border-transparent hover:bg-slate-800'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className={`font-mono text-xs font-bold truncate ${
                editingId === p.id ? 'text-(--neon-cyan)' : 'text-slate-200'
              }`}>
                {p.name}
              </p>
              <p className="text-slate-600 font-mono text-xs truncate">
                {[p.shipClass, p.tonnage ? `${p.tonnage}t` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            {/* Action buttons — visible on hover or when editing */}
            <div className={`flex gap-1 shrink-0 ${editingId === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              <ActionIcon label="✎" title="Edit"      onClick={() => onEdit(p.id)} dim="text-(--neon-cyan)" />
              <ActionIcon label="⧉" title="Duplicate" onClick={() => duplicateProfile(p.id)} />
              <ActionIcon label="⊗" title="Delete"    onClick={() => setConfirmDeleteId(p.id)} dim="hover:text-red-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-slate-800 shrink-0 space-y-2">
        {importStatus && (
          <p className={`font-mono text-xs ${importStatus.ok ? 'text-green-400' : 'text-red-400'}`}>
            {importStatus.ok ? '✓ ' : '⚠ '}{importStatus.msg}
          </p>
        )}
        <button
          onClick={onNew}
          className="w-full py-1.5 bg-(--neon-cyan)/10 border border-(--neon-cyan)/30 text-(--neon-cyan) font-display text-xs tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors"
        >
          + NEW PROFILE
        </button>
        <button
          onClick={onCatalog}
          className={`w-full py-1.5 border font-display text-xs tracking-widest rounded transition-colors ${
            catalogOpen
              ? 'border-amber-600/50 bg-amber-900/20 text-amber-400'
              : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
          }`}
        >
          📖 OFFICIAL CATALOG
        </button>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-1 border border-slate-700 text-slate-400 font-display text-xs rounded hover:border-slate-500 transition-colors"
          >
            ↓ IMPORT
          </button>
          <button
            onClick={exportAll}
            className="flex-1 py-1 border border-slate-700 text-slate-400 font-display text-xs rounded hover:border-slate-500 transition-colors"
          >
            ↑ EXPORT
          </button>
        </div>
      </div>

      {confirmDeleteId && (() => {
        const target = profiles.find((p) => p.id === confirmDeleteId)
        return (
          <Modal title="DELETE PROFILE" onClose={() => setConfirmDeleteId(null)} width="max-w-sm">
            <div className="space-y-4">
              <p className="font-mono text-sm text-slate-300 leading-relaxed">
                Delete profile <span className="text-(--neon-cyan) font-bold">{target?.name}</span>?
              </p>
              <p className="font-mono text-xs text-slate-500">
                This action is irreversible. The profile cannot be recovered.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { deleteProfile(confirmDeleteId); setConfirmDeleteId(null) }}
                  className="flex-1 py-2 bg-red-900/30 border border-red-700/50 text-red-400 font-display text-xs tracking-widest rounded hover:bg-red-900/50 transition-colors"
                >
                  DELETE
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-2 border border-slate-600 text-slate-300 font-display text-xs tracking-widest rounded hover:border-slate-400 transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}

/** Tiny icon button used in profile rows. */
function ActionIcon({ label, title, onClick, dim = '' }) {
  return (
    <Tooltip label={title}>
      <button
        onClick={onClick}
        className={`w-6 h-6 flex items-center justify-center text-slate-500 font-mono text-sm rounded hover:bg-slate-700 transition-colors ${dim}`}
      >
        {label}
      </button>
    </Tooltip>
  )
}

// ── Right panel: session controls ─────────────────────────────────────────

/** Blinking status dot with label and value. */
function StatusLine({ label, value, active = true }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-(--neon-cyan) animate-pulse' : 'bg-slate-700'}`} />
      <span className="font-mono text-xs text-slate-600 flex-1">{label}</span>
      <span className={`font-mono text-xs ${active ? 'text-(--neon-cyan)/60' : 'text-slate-500'}`}>{value}</span>
    </div>
  )
}

const PHASE_LABELS = {
  setup: 'SETUP', initiative: 'INITIATIVE', acceleration: 'ACCELERATION',
  movement: 'MOVEMENT', attack: 'ATTACK', actions: 'ACTIONS', end: 'END OF ROUND',
}

/** Left column: mode selector + action buttons. */
function CommandConsole({ mode, onModeChange, onNewSession, onResumeClick, onResumeAutosave, onClearAutosave, onHelp, autosave, loading, error }) {
  return (
    <div className="border-r border-slate-800 flex flex-col overflow-hidden">

      <div className="px-5 py-3 border-b border-slate-800 shrink-0">
        <p className="font-display text-xs text-slate-500 tracking-widest">// OPERATIONS CONSOLE</p>
      </div>

      <div className="px-5 py-3 space-y-1.5 border-b border-slate-800 shrink-0">
        <StatusLine label="NAVIGATION"    value="ACTIVE"   />
        <StatusLine label="SENSORS"       value="ONLINE"   />
        <StatusLine label="ARMAMENTS"     value="READY"    />
        <StatusLine label="MISSION DATA"  value="STANDBY" active={false} />
      </div>

      <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">

        <div>
          <p className="font-display text-xs text-slate-600 tracking-widest mb-2">COMBAT MODE</p>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-lg">
            {[
              { value: 'vectorial', label: 'VECTORIAL', sub: 'Hex + vectors' },
              { value: 'basic',     label: 'BASIC',     sub: 'Range bands'  },
            ].map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => onModeChange(value)}
                className={`py-2 px-2 rounded font-display text-xs tracking-widest transition-colors text-center ${
                  mode === value
                    ? 'bg-(--neon-cyan)/15 border border-(--neon-cyan)/40 text-(--neon-cyan)'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
                <span className="block font-mono tracking-normal normal-case text-slate-600 mt-0.5 text-xs">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-display text-xs text-slate-600 tracking-widest mb-2">ACTIONS</p>
          <div className="space-y-2">

            {autosave && (
              <div className="flex gap-1">
                <button
                  onClick={onResumeAutosave}
                  className="flex-1 py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-display text-xs tracking-widest rounded-lg hover:bg-(--neon-cyan)/20 transition-colors"
                >
                  ↺ RESUME
                </button>
                <button
                  onClick={onClearAutosave}
                  className="py-2 px-3 border border-red-900/50 text-red-600 font-mono text-xs rounded-lg hover:border-red-700/60 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              onClick={onNewSession}
              className={`w-full py-3.5 border font-display text-xs tracking-widest rounded-lg transition-colors ${
                autosave
                  ? 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  : 'bg-(--neon-cyan)/10 border-(--neon-cyan)/40 text-(--neon-cyan) hover:bg-(--neon-cyan)/20'
              }`}
            >
              <span className="text-base block mb-0.5">▶</span>
              NEW SESSION
              <span className="block font-mono text-slate-500 mt-0.5 normal-case tracking-normal font-normal text-xs">
                Start fresh
              </span>
            </button>

            <button
              onClick={onResumeClick}
              disabled={loading}
              className="w-full py-3 border border-slate-700 text-slate-400 font-display text-xs tracking-widest rounded-lg hover:border-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              <span className="text-sm block mb-0.5">{loading ? '⌛' : '↓'}</span>
              {loading ? 'LOADING…' : 'RESUME FROM FILE'}
              <span className="block font-mono text-slate-600 mt-0.5 normal-case tracking-normal font-normal text-xs">
                Load from .json file
              </span>
            </button>

            <button
              onClick={onHelp}
              className="w-full py-3 border border-slate-700 text-slate-400 font-display text-xs tracking-widest rounded-lg hover:border-slate-500 hover:text-slate-300 transition-colors"
            >
              <span className="text-sm block mb-0.5">📖</span>
              FIELD MANUAL
              <span className="block font-mono text-slate-600 mt-0.5 normal-case tracking-normal font-normal text-xs">
                How to play
              </span>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-400 font-mono text-xs">⚠ {error}</p>
        )}
      </div>

      <div className="shrink-0 px-5 py-3 border-t border-slate-800">
        <p className="font-mono text-xs text-slate-500 leading-relaxed">
          Add profiles in the left panel before starting.
        </p>
      </div>
    </div>
  )
}

/** Crosshair decoration for the idle display. */
function TargetReticle() {
  return (
    <svg width="96" height="96" viewBox="0 0 100 100" className="opacity-20" aria-hidden="true">
      <circle cx="50" cy="50" r="38" fill="none" stroke="#0891b2" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="24" fill="none" stroke="#0891b2" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="4"  fill="none" stroke="#0891b2" strokeWidth="0.8" />
      <line x1="12" y1="50" x2="26" y2="50" stroke="#0891b2" strokeWidth="0.8" />
      <line x1="74" y1="50" x2="88" y2="50" stroke="#0891b2" strokeWidth="0.8" />
      <line x1="50" y1="12" x2="50" y2="26" stroke="#0891b2" strokeWidth="0.8" />
      <line x1="50" y1="74" x2="50" y2="88" stroke="#0891b2" strokeWidth="0.8" />
      <line x1="24" y1="24" x2="31" y2="31" stroke="#0891b2" strokeWidth="0.8" />
      <line x1="76" y1="24" x2="69" y2="31" stroke="#0891b2" strokeWidth="0.8" />
      <line x1="24" y1="76" x2="31" y2="69" stroke="#0891b2" strokeWidth="0.8" />
      <line x1="76" y1="76" x2="69" y2="69" stroke="#0891b2" strokeWidth="0.8" />
    </svg>
  )
}

/** Right column shown when no session is loaded. */
function TacticalDisplayIdle() {
  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(15,23,42,0.5) 3px, rgba(15,23,42,0.5) 4px)' }}
      />
      <div className="relative z-10 flex flex-col h-full">

        <div className="px-6 py-3 border-b border-slate-800/60 shrink-0 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
          <span className="font-display text-xs text-slate-500 tracking-widest">TACTICAL DISPLAY</span>
          <div className="flex-1 h-px bg-slate-800" />
          <span className="font-display text-xs text-slate-600 tracking-widest">STANDBY</span>
        </div>

        <div className="px-6 py-3 border-b border-slate-800/60 shrink-0 grid grid-cols-2 gap-x-8 gap-y-1">
          {[
            { k: 'PROTOCOL', v: 'MgT2E/VCS-1.0' },
            { k: 'MODE',     v: '—' },
            { k: 'ROUND',    v: '—' },
            { k: 'PHASE',    v: '—' },
            { k: 'SHIPS',    v: '—' },
            { k: 'MISSILES', v: '—' },
          ].map(({ k, v }) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="font-mono text-xs text-slate-600">{k}</span>
              <span className="font-mono text-xs text-slate-500">{v}</span>
            </div>
          ))}
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-5">
            <TargetReticle />
            <div className="space-y-1">
              <p className="font-display text-xs text-slate-500 tracking-widest">NO MISSION DATA</p>
              <p className="font-mono text-xs text-slate-600">Start a new session</p>
              <p className="font-mono text-xs text-slate-600">or load a previous session</p>
            </div>
          </div>
        </div>

        <div className="shrink-0 px-6 py-2 border-t border-slate-800/60">
          <div className="flex justify-between font-mono text-xs text-slate-600">
            <span>SYS:ONLINE</span>
            <span>TD-IF/0.1</span>
            <span>MONGOOSE TRAVELLER 2E</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Right column shown when an autosave exists but no file is pending. */
function TacticalDisplayAutosave({ autosave }) {
  const { round, phase, combatMode, ships = [], missiles = [], name, savedAt } = autosave

  const FACTION_LABELS = { players: 'PLAYERS', npc: 'NPC', neutral: 'NEUTRAL' }
  const FACTION_COLORS = { players: 'text-(--neon-cyan)', npc: 'text-red-400', neutral: 'text-slate-400' }

  const byFaction = ships.reduce((acc, ship) => {
    const f = ship.faction ?? 'neutral'
    if (!acc[f]) acc[f] = []
    acc[f].push(ship)
    return acc
  }, {})

  const savedAtFormatted = savedAt ? new Date(savedAt).toLocaleString('en-GB') : '—'

  return (
    <div className="relative flex flex-col h-full overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(15,23,42,0.5) 3px, rgba(15,23,42,0.5) 4px)' }}
      />
      <div className="relative z-10 flex flex-col h-full">

        <div className="px-6 py-3 border-b border-(--neon-cyan)/20 shrink-0 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-(--neon-cyan) animate-pulse shrink-0" />
          <span className="font-display text-xs text-(--neon-cyan)/70 tracking-widest">TACTICAL DISPLAY</span>
          <div className="flex-1 h-px bg-(--neon-cyan)/10" />
          <span className="font-display text-xs text-(--neon-cyan)/40 tracking-widest">AUTOSAVE</span>
        </div>

        <div className="px-6 py-3 border-b border-slate-800/60 shrink-0 grid grid-cols-2 gap-x-8 gap-y-1">
          {[
            { k: 'PROTOCOL',  v: 'MgT2E/VCS-1.0' },
            { k: 'MODE',      v: combatMode === 'vectorial' ? 'VECTORIAL' : 'BASIC' },
            { k: 'ROUND',     v: round },
            { k: 'PHASE',     v: PHASE_LABELS[phase] ?? phase?.toUpperCase() ?? '—' },
            { k: 'SHIPS',     v: ships.length },
            { k: 'MISSILES',  v: missiles.length },
          ].map(({ k, v }) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="font-mono text-xs text-slate-600">{k}</span>
              <span className="font-mono text-xs text-(--neon-cyan)/70">{v}</span>
            </div>
          ))}
        </div>

        {name && (
          <div className="px-6 py-2 border-b border-slate-800/40 shrink-0">
            <span className="font-mono text-xs text-slate-600">SESSION </span>
            <span className="font-mono text-xs text-slate-300">{name}</span>
            <span className="font-mono text-xs text-slate-600 ml-3">SAVED </span>
            <span className="font-mono text-xs text-slate-500">{savedAtFormatted}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="font-display text-xs text-slate-600 tracking-widest mb-3">SHIP ROSTER</p>
          {ships.length === 0 && (
            <p className="font-mono text-xs text-slate-700">No ships on record.</p>
          )}
          {Object.entries(byFaction).map(([faction, factionShips]) => (
            <div key={faction} className="mb-4">
              <p className={`font-display text-xs tracking-widest mb-2 ${FACTION_COLORS[faction] ?? 'text-slate-400'}`}>
                {FACTION_LABELS[faction] ?? faction.toUpperCase()} · {factionShips.length}
              </p>
              <div className="space-y-1.5">
                {factionShips.map((ship) => <ShipPreviewRow key={ship.id} ship={ship} />)}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 px-6 py-2 border-t border-slate-800/60">
          <div className="flex justify-between font-mono text-xs text-slate-600">
            <span>SYS:ONLINE</span>
            <span>RESUME OR CLEAR VIA LEFT PANEL</span>
            <span>MONGOOSE TRAVELLER 2E</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Labeled data readout for session preview. */
function DataField({ label, value, accent = false, small = false }) {
  return (
    <div>
      <p className="font-display text-xs text-slate-600 tracking-widest leading-none mb-0.5">{label}</p>
      <p className={`font-mono truncate ${small ? 'text-xs' : 'text-sm'} ${accent ? 'text-(--neon-cyan) font-bold' : 'text-slate-300'}`}>
        {value ?? '—'}
      </p>
    </div>
  )
}

/** Single ship row inside session preview. */
function ShipPreviewRow({ ship }) {
  const hull = ship.profile?.hull ?? 0
  const pct  = hull > 0 ? Math.max(0, ship.hullCurrent / hull) : 1
  const barColor = pct > 0.6 ? '#22c55e' : pct > 0.3 ? '#eab308' : '#ef4444'
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ship.color ?? '#64748b' }} />
      <span className="font-mono text-xs text-slate-300 truncate flex-1">{ship.profile?.name ?? '?'}</span>
      <div className="w-14 h-1 bg-slate-800 rounded-full overflow-hidden shrink-0">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: barColor }} />
      </div>
      <span className="font-mono text-xs text-slate-600 w-10 text-right shrink-0">
        {ship.hullCurrent}/{hull || '?'}
      </span>
    </div>
  )
}

/** Right column shown after a session file is parsed (before import). */
function SessionPreview({ data, onConfirm, onCancel, loading }) {
  const { name, round, phase, combatMode, ships = [], missiles = [], _exportedAt, _filename } = data

  const FACTION_LABELS = { players: 'PLAYERS', npc: 'NPC', neutral: 'NEUTRAL' }
  const FACTION_COLORS = { players: 'text-(--neon-cyan)', npc: 'text-red-400', neutral: 'text-slate-400' }

  const byFaction = ships.reduce((acc, ship) => {
    const f = ship.faction ?? 'neutral'
    if (!acc[f]) acc[f] = []
    acc[f].push(ship)
    return acc
  }, {})

  const savedAt = _exportedAt ? new Date(_exportedAt).toLocaleString('en-GB') : '—'

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(15,23,42,0.5) 3px, rgba(15,23,42,0.5) 4px)' }}
      />
      <div className="relative z-10 flex flex-col h-full">

        <div className="px-6 py-3 border-b border-amber-900/40 shrink-0 flex items-center gap-3 bg-amber-950/10">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-display text-xs text-amber-500/80 tracking-widest">MISSION IDENTIFIED</span>
          <div className="flex-1 h-px bg-amber-900/40" />
        </div>

        <div className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-3 border-b border-slate-800 shrink-0">
          <DataField label="SESSION" value={name} />
          <DataField label="FILE" value={_filename} small />
          <DataField label="ROUND" value={round} accent />
          <DataField label="PHASE" value={PHASE_LABELS[phase] ?? phase?.toUpperCase()} />
          <DataField label="MODE" value={combatMode === 'vectorial' ? 'VECTORIAL' : 'BASIC'} />
          <DataField label="SHIPS / MISSILES" value={`${ships.length} / ${missiles.length}`} />
          <DataField label="SAVED AT" value={savedAt} small />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="font-display text-xs text-slate-600 tracking-widest mb-3">SHIP ROSTER</p>
          {ships.length === 0 && (
            <p className="font-mono text-xs text-slate-700">No ships on record.</p>
          )}
          {Object.entries(byFaction).map(([faction, factionShips]) => (
            <div key={faction} className="mb-4">
              <p className={`font-display text-xs tracking-widest mb-2 ${FACTION_COLORS[faction] ?? 'text-slate-400'}`}>
                {FACTION_LABELS[faction] ?? faction.toUpperCase()} · {factionShips.length}
              </p>
              <div className="space-y-1.5">
                {factionShips.map((ship) => <ShipPreviewRow key={ship.id} ship={ship} />)}
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 px-6 py-4 border-t border-slate-800 space-y-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-3 bg-amber-600/20 border border-amber-500/40 text-amber-400 font-display text-sm tracking-widest rounded-lg hover:bg-amber-600/30 transition-colors disabled:opacity-40"
          >
            {loading ? 'LOADING…' : '▶  LOAD AND START'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full py-2 border border-slate-700 text-slate-500 font-display text-xs tracking-widest rounded-lg hover:border-slate-600 hover:text-slate-400 transition-colors disabled:opacity-40"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  )
}

function SessionPanel() {
  const gotoScreen        = useUiStore((s) => s.gotoScreen)
  const resetBattle       = useBattleStore((s) => s.resetBattle)
  const importBattleState = useBattleStore((s) => s.importBattleState)

  const fileInputRef = useRef(null)
  const [mode, setMode]               = useState('vectorial')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [pendingFile, setPendingFile]  = useState(null)
  const [pendingData, setPendingData]  = useState(null)
  const [autosave, setAutosave]        = useState(null)

  // Read full autosave data from IndexedDB on mount
  useEffect(() => {
    dbGet(STORE_BATTLE, 'current').then((saved) => {
      if (!saved || !Array.isArray(saved.ships) || saved.ships.length === 0) return
      setAutosave(saved)
    }).catch(() => {})
  }, [])

  const handleNewSession = () => {
    resetBattle(mode)
    gotoScreen('battle')
  }

  const handleResumeAutosave = () => {
    // battleStore already restored by useAutosave on mount
    gotoScreen('battle')
  }

  const handleClearAutosave = () => {
    dbDelete(STORE_BATTLE, 'current').catch(() => {})
    setAutosave(null)
  }

  const handleResumeFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const wrapper = await parseBattleFile(file)
      setPendingFile(file)
      setPendingData({ ...wrapper.battle, _exportedAt: wrapper.exportedAt, _filename: file.name })
    } catch (err) {
      setError(err.message)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirmLoad = async () => {
    if (!pendingFile) return
    setLoading(true)
    setError(null)
    try {
      await importBattleState(pendingFile)
      gotoScreen('battle')
    } catch (err) {
      setError(err.message)
      setPendingFile(null)
      setPendingData(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelPreview = () => {
    setPendingFile(null)
    setPendingData(null)
    setError(null)
  }

  return (
    <div className="h-full grid grid-cols-[340px_1fr] overflow-hidden">
      <CommandConsole
        mode={mode}
        onModeChange={setMode}
        onNewSession={handleNewSession}
        onResumeClick={() => fileInputRef.current?.click()}
        onResumeAutosave={handleResumeAutosave}
        onClearAutosave={handleClearAutosave}
        onHelp={() => gotoScreen('help')}
        autosave={autosave}
        loading={loading}
        error={error}
      />
      {pendingData ? (
        <SessionPreview
          data={pendingData}
          onConfirm={handleConfirmLoad}
          onCancel={handleCancelPreview}
          loading={loading}
        />
      ) : autosave ? (
        <TacticalDisplayAutosave autosave={autosave} />
      ) : (
        <TacticalDisplayIdle />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleResumeFile}
        className="hidden"
      />
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────

export function Dashboard() {
  /**
   * Right-panel view state:
   *   null         — SessionPanel
   *   'catalog'    — CatalogPanel
   *   'new'        — ShipProfileForm (create)
   *   string (id)  — ShipProfileForm (edit)
   */
  const [view, setView] = useState(null)

  const handleEdit    = (id)  => setView(id)
  const handleNew     = ()    => setView('new')
  const handleCatalog = ()    => setView((v) => (v === 'catalog' ? null : 'catalog'))
  const handleClose   = ()    => setView(null)

  const editingId   = view !== null && view !== 'catalog' ? view : null
  const catalogOpen = view === 'catalog'

  return (
    <div className="w-full h-full flex bg-slate-950">

      {/* ── Left: sidebar full-height ─────────────────────────────────── */}
      <div className="w-72 shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
        <ProfilesPanel
          editingId={editingId}
          onEdit={handleEdit}
          onNew={handleNew}
          onCatalog={handleCatalog}
          catalogOpen={catalogOpen}
        />
      </div>

      {/* ── Right: header + content ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        <header className="shrink-0 px-6 py-4 border-b border-slate-800 flex items-center gap-4">
          <div className="relative shrink-0 w-24 h-24">
            <img src={tdLogo} alt="Thrust & Drift" className="w-24 h-24" />
            <div className="logo-shimmer" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="font-display font-bold text-(--neon-cyan) tracking-widest text-2xl leading-tight">
              <i>THRUST &amp; DRIFT</i>
            </h1>
            <span className="font-display text-xs text-slate-500 tracking-widest">
              TACTICAL INTERFACE // MONGOOSE TRAVELLER 2E
            </span>
            <span className="font-display text-xs text-slate-600 tracking-widest">
              SPACE COMBAT SIMULATOR
            </span>
          </div>
          <span className="ml-auto text-slate-700 font-mono text-xs">v1.12.1</span>
        </header>

        <main className="flex-1 overflow-hidden">
          {catalogOpen ? (
            <CatalogPanel />
          ) : editingId ? (
            <ShipProfileForm
              key={editingId}
              profileId={editingId === 'new' ? null : editingId}
              onSave={handleClose}
              onCancel={handleClose}
            />
          ) : (
            <SessionPanel />
          )}
        </main>

      </div>
    </div>
  )
}
