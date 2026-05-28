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

function SessionPanel() {
  const gotoScreen       = useUiStore((s) => s.gotoScreen)
  const resetBattle      = useBattleStore((s) => s.resetBattle)
  const importBattleState = useBattleStore((s) => s.importBattleState)

  const fileInputRef = useRef(null)
  const [loading, setLoading]   = useState(false)
  const [resumeErr, setResumeErr] = useState(null)

  const handleNewSession = () => {
    resetBattle()
    gotoScreen('battle')
  }

  const handleResumeFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setResumeErr(null)
    try {
      await importBattleState(file)
      gotoScreen('battle')
    } catch (err) {
      setResumeErr(err.message)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-10 gap-6">
      {/* Tagline */}
      <div className="text-center space-y-1">
        <p className="text-slate-500 font-display text-xs tracking-widest">
          SIMULATORE DI COMBATTIMENTO SPAZIALE
        </p>
        <p className="text-slate-600 font-display text-xs">
          Mongoose Traveller 2e · Vectorial Combat System
        </p>
      </div>

      {/* Session actions */}
      <div className="w-full max-w-sm space-y-3">
        {/* New session */}
        <button
          onClick={handleNewSession}
          className="w-full py-4 bg-[--neon-cyan]/10 border border-[--neon-cyan]/40 text-[--neon-cyan] font-display text-sm tracking-widest rounded-lg hover:bg-[--neon-cyan]/20 transition-colors group"
        >
          <span className="block text-lg mb-0.5">▶</span>
          NUOVA SESSIONE
          <span className="block text-xs text-slate-500 mt-0.5 normal-case tracking-normal font-normal group-hover:text-slate-400 transition-colors">
            Avvia combattimento da zero
          </span>
        </button>

        {/* Resume session */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleResumeFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="w-full py-3 border border-slate-600 text-slate-300 font-display text-sm tracking-widest rounded-lg hover:border-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40 group"
        >
          <span className="block text-base mb-0.5">{loading ? '⌛' : '↺'}</span>
          {loading ? 'CARICAMENTO…' : 'RIPRENDI SESSIONE'}
          <span className="block text-xs text-slate-500 mt-0.5 normal-case tracking-normal font-normal">
            Carica da file .json
          </span>
        </button>

        {resumeErr && (
          <p className="text-red-400 font-mono text-xs text-center">⚠ {resumeErr}</p>
        )}
      </div>

      {/* Hint */}
      <p className="text-slate-700 font-mono text-xs text-center max-w-xs leading-relaxed">
        Aggiungi profili nave nel pannello di sinistra prima di iniziare.
        Le sessioni si salvano dall'interfaccia di combattimento.
      </p>
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
          <img src={tdLogo} alt="Thrust & Drift" className="w-16 h-16 shrink-0" />
          <h1 className="font-display font-bold text-[--neon-cyan] tracking-widest text-lg">
            THRUST &amp; DRIFT
          </h1>
          <span className="text-slate-600 font-display text-xs tracking-widest hidden sm:block">
            // SPACE COMBAT SIMULATOR
          </span>
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
