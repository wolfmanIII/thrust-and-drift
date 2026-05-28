/**
 * Dashboard — pre-battle lobby.
 * Left panel: ship profile management.
 * Right panel: session controls (default) or ShipProfileForm (when editing).
 */

import { useState, useRef } from 'react'
import tdLogo from '../../assets/TD-logo-transparent.png'
import { useUiStore }       from '../../store/uiStore.js'
import { useBattleStore }   from '../../store/battleStore.js'
import { useProfilesStore } from '../../store/profilesStore.js'
import { ShipProfileForm }  from '../forms/ShipProfileForm.jsx'
import { CatalogPanel }     from './CatalogPanel.jsx'
import { useProfileImport } from './useProfileImport.js'
import { Tooltip } from '../ui/Tooltip.jsx'

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

  const [filter, setFilter] = useState('')

  const filtered = profiles.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    (p.shipClass ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-slate-700 shrink-0 bg-slate-900">
        <h2 className="font-display text-xs text-[--neon-cyan] tracking-widest uppercase">
          Profili Nave
          <span className="ml-2 text-slate-500">({profiles.length})</span>
        </h2>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <input
          type="text"
          placeholder="Cerca profilo…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs rounded px-3 py-1.5 focus:outline-none focus:border-[--neon-cyan]/60 placeholder:text-slate-600"
        />
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-y-auto px-2 space-y-0.5 py-1">
        {filtered.length === 0 && (
          <p className="text-slate-600 font-mono text-xs italic px-2 py-2">
            {filter ? 'Nessun risultato.' : 'Nessun profilo. Creane uno.'}
          </p>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className={`group flex items-center gap-2 px-2 py-2 rounded transition-colors ${
              editingId === p.id
                ? 'bg-[--neon-cyan]/10 border border-[--neon-cyan]/30'
                : 'border border-transparent hover:bg-slate-800'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className={`font-mono text-xs font-bold truncate ${
                editingId === p.id ? 'text-[--neon-cyan]' : 'text-slate-200'
              }`}>
                {p.name}
              </p>
              <p className="text-slate-600 font-mono text-xs truncate">
                {[p.shipClass, p.tonnage ? `${p.tonnage}t` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
            {/* Action buttons — visible on hover or when editing */}
            <div className={`flex gap-1 shrink-0 ${editingId === p.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              <ActionIcon label="✎" title="Modifica" onClick={() => onEdit(p.id)} dim="text-[--neon-cyan]" />
              <ActionIcon label="⧉" title="Duplica"  onClick={() => duplicateProfile(p.id)} />
              <ActionIcon label="⊗" title="Elimina"  onClick={() => deleteProfile(p.id)} dim="hover:text-red-400" />
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
          className="w-full py-1.5 bg-[--neon-cyan]/10 border border-[--neon-cyan]/30 text-[--neon-cyan] font-display text-xs tracking-widest rounded hover:bg-[--neon-cyan]/20 transition-colors"
        >
          + NUOVO PROFILO
        </button>
        <button
          onClick={onCatalog}
          className={`w-full py-1.5 border font-display text-xs tracking-widest rounded transition-colors ${
            catalogOpen
              ? 'border-amber-600/50 bg-amber-900/20 text-amber-400'
              : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-300'
          }`}
        >
          📖 CATALOGO UFFICIALE
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
            ↓ IMPORTA
          </button>
          <button
            onClick={exportAll}
            className="flex-1 py-1 border border-slate-700 text-slate-400 font-display text-xs rounded hover:border-slate-500 transition-colors"
          >
            ↑ ESPORTA
          </button>
        </div>
      </div>
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
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-[--neon-cyan] animate-pulse' : 'bg-slate-700'}`} />
      <span className="font-mono text-xs text-slate-600 flex-1">{label}</span>
      <span className={`font-mono text-xs ${active ? 'text-[--neon-cyan]/60' : 'text-slate-500'}`}>{value}</span>
    </div>
  )
}

/** Left column: mode selector + action buttons. */
function CommandConsole({ mode, onModeChange, onNewSession, onResumeClick, loading, error }) {
  return (
    <div className="border-r border-slate-800 flex flex-col overflow-hidden">

      <div className="px-5 py-3 border-b border-slate-800 shrink-0">
        <p className="font-display text-xs text-slate-500 tracking-widest">// CONSOLE OPERATIVA</p>
      </div>

      <div className="px-5 py-3 space-y-1.5 border-b border-slate-800 shrink-0">
        <StatusLine label="NAVIGAZIONE"  value="ATTIVA"  />
        <StatusLine label="SENSORI"      value="ONLINE"  />
        <StatusLine label="ARMAMENTI"    value="PRONTI"  />
        <StatusLine label="DATI MISSIONE" value="IN ATTESA" active={false} />
      </div>

      <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">

        <div>
          <p className="font-display text-xs text-slate-600 tracking-widest mb-2">MODALITÀ COMBATTIMENTO</p>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/60 border border-slate-800 rounded-lg">
            {[
              { value: 'vectorial', label: 'VETTORIALE', sub: 'Hex + vettori' },
              { value: 'basic',     label: 'BASE',       sub: 'Bande distanza' },
            ].map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => onModeChange(value)}
                className={`py-2 px-2 rounded font-display text-xs tracking-widest transition-colors text-center ${
                  mode === value
                    ? 'bg-[--neon-cyan]/15 border border-[--neon-cyan]/40 text-[--neon-cyan]'
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
          <p className="font-display text-xs text-slate-600 tracking-widest mb-2">AZIONI</p>
          <div className="space-y-2">
            <button
              onClick={onNewSession}
              className="w-full py-3.5 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-display text-xs tracking-widest rounded-lg hover:bg-[--neon-cyan]/20 transition-colors"
            >
              <span className="text-base block mb-0.5">▶</span>
              NUOVA SESSIONE
              <span className="block font-mono text-slate-500 mt-0.5 normal-case tracking-normal font-normal text-xs">
                Avvia da zero
              </span>
            </button>
            <button
              onClick={onResumeClick}
              disabled={loading}
              className="w-full py-3 border border-slate-700 text-slate-400 font-display text-xs tracking-widest rounded-lg hover:border-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
            >
              <span className="text-sm block mb-0.5">{loading ? '⌛' : '↺'}</span>
              {loading ? 'CARICAMENTO…' : 'RIPRENDI SESSIONE'}
              <span className="block font-mono text-slate-600 mt-0.5 normal-case tracking-normal font-normal text-xs">
                Carica da file .json
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
          Aggiungi profili nel pannello a sinistra prima di iniziare.
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
          <span className="font-display text-xs text-slate-500 tracking-widest">DISPLAY TATTICO</span>
          <div className="flex-1 h-px bg-slate-800" />
          <span className="font-display text-xs text-slate-600 tracking-widest">STANDBY</span>
        </div>

        <div className="px-6 py-3 border-b border-slate-800/60 shrink-0 grid grid-cols-2 gap-x-8 gap-y-1">
          {[
            { k: 'PROTOCOLLO', v: 'MgT2E/VCS-1.0' },
            { k: 'MODALITÀ',   v: '—' },
            { k: 'ROUND',      v: '—' },
            { k: 'FASE',       v: '—' },
            { k: 'NAVI',       v: '—' },
            { k: 'MISSILI',    v: '—' },
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
              <p className="font-display text-xs text-slate-500 tracking-widest">NESSUN DATO MISSIONE</p>
              <p className="font-mono text-xs text-slate-600">Avvia una nuova sessione</p>
              <p className="font-mono text-xs text-slate-600">o carica una sessione precedente</p>
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

/** Labeled data readout for session preview. */
function DataField({ label, value, accent = false, small = false }) {
  return (
    <div>
      <p className="font-display text-xs text-slate-600 tracking-widest leading-none mb-0.5">{label}</p>
      <p className={`font-mono truncate ${small ? 'text-xs' : 'text-sm'} ${accent ? 'text-[--neon-cyan] font-bold' : 'text-slate-300'}`}>
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

  const PHASE_LABELS = {
    setup: 'SETUP', initiative: 'INIZIATIVA', acceleration: 'ACCELERAZIONE',
    movement: 'MOVIMENTO', attack: 'ATTACCO', actions: 'AZIONI', end: 'FINE ROUND',
  }
  const FACTION_LABELS = { players: 'GIOCATORI', npc: 'NPC', neutral: 'NEUTRALI' }
  const FACTION_COLORS = { players: 'text-[--neon-cyan]', npc: 'text-red-400', neutral: 'text-slate-400' }

  const byFaction = ships.reduce((acc, ship) => {
    const f = ship.faction ?? 'neutral'
    if (!acc[f]) acc[f] = []
    acc[f].push(ship)
    return acc
  }, {})

  const savedAt = _exportedAt ? new Date(_exportedAt).toLocaleString('it-IT') : '—'

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(15,23,42,0.5) 3px, rgba(15,23,42,0.5) 4px)' }}
      />
      <div className="relative z-10 flex flex-col h-full">

        <div className="px-6 py-3 border-b border-amber-900/40 shrink-0 flex items-center gap-3 bg-amber-950/10">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="font-display text-xs text-amber-500/80 tracking-widest">MISSIONE IDENTIFICATA</span>
          <div className="flex-1 h-px bg-amber-900/40" />
        </div>

        <div className="px-6 py-4 grid grid-cols-2 gap-x-6 gap-y-3 border-b border-slate-800 shrink-0">
          <DataField label="DESIGNAZIONE" value={name} />
          <DataField label="FILE" value={_filename} small />
          <DataField label="ROUND" value={round} accent />
          <DataField label="FASE" value={PHASE_LABELS[phase] ?? phase?.toUpperCase()} />
          <DataField label="MODALITÀ" value={combatMode === 'vectorial' ? 'VETTORIALE' : 'BASE'} />
          <DataField label="NAVI / MISSILI" value={`${ships.length} / ${missiles.length}`} />
          <DataField label="SALVATO IL" value={savedAt} small />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="font-display text-xs text-slate-600 tracking-widest mb-3">ROSTER NAVI</p>
          {ships.length === 0 && (
            <p className="font-mono text-xs text-slate-700">Nessuna nave registrata.</p>
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
            {loading ? 'CARICAMENTO…' : '▶  CARICA E INIZIA'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full py-2 border border-slate-700 text-slate-500 font-display text-xs tracking-widest rounded-lg hover:border-slate-600 hover:text-slate-400 transition-colors disabled:opacity-40"
          >
            ANNULLA
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

  const handleNewSession = () => {
    resetBattle(mode)
    gotoScreen('battle')
  }

  const handleResumeFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      if (json?.type !== 'battle-state' || !json.battle) throw new Error('File non valido: tipo errato o campo "battle" mancante.')
      setPendingFile(file)
      setPendingData({ ...json.battle, _exportedAt: json.exportedAt, _filename: file.name })
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
            <h1 className="font-display font-bold text-[--neon-cyan] tracking-widest text-2xl leading-tight">
              <i>THRUST &amp; DRIFT</i>
            </h1>
            <span className="font-display text-xs text-slate-500 tracking-widest">
              TACTICAL INTERFACE // MONGOOSE TRAVELLER 2E
            </span>
            <span className="font-display text-xs text-slate-600 tracking-widest">
              SPACE COMBAT SIMULATOR
            </span>
          </div>
          <span className="ml-auto text-slate-700 font-mono text-xs">v0.1</span>
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
