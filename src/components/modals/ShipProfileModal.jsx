/**
 * ShipProfileModal — import/export profiles via File API.
 * Full CRUD is in ShipProfileForm (separate component, future scope).
 * This modal handles only the I/O operations triggered from the context menu.
 */

import { useRef, useState } from 'react'
import { Modal } from './Modal.jsx'
import { useUiStore } from '../../store/uiStore.js'
import { useProfilesStore } from '../../store/profilesStore.js'

export function ShipProfileModal() {
  const closeModal   = useUiStore((s) => s.closeModal)
  const modalPayload = useUiStore((s) => s.modalPayload)

  const exportAll      = useProfilesStore((s) => s.exportAll)
  const importFromFile = useProfilesStore((s) => s.importFromFile)
  const profiles       = useProfilesStore((s) => s.profiles)

  const fileInputRef = useRef(null)
  const [status, setStatus] = useState(null)   // { type: 'ok'|'error', message: string }
  const [loading, setLoading] = useState(false)

  const mode = modalPayload?.mode ?? 'export'
  const title = mode === 'import' ? 'Load Profiles' : 'Save Profiles'

  const handleExport = () => {
    exportAll()
    setStatus({ type: 'ok', message: `${profiles.length} profiles exported.` })
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setStatus(null)
    try {
      const { added, skipped } = await importFromFile(file)
      setStatus({
        type: 'ok',
        message: `Import complete: ${added} added, ${skipped} already present.`,
      })
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Modal title={title} onClose={closeModal}>
      <div className="space-y-4">
        <p className="text-slate-400 font-mono text-xs">
          {mode === 'import'
            ? 'Select a JSON file exported from this application.'
            : `${profiles.length} profiles currently in memory.`}
        </p>

        {mode === 'export' && (
          <button
            onClick={handleExport}
            className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors"
          >
            💾 EXPORT JSON
          </button>
        )}

        {mode === 'import' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full py-2 bg-(--neon-cyan)/10 border border-(--neon-cyan)/40 text-(--neon-cyan) font-mono text-sm tracking-widest rounded hover:bg-(--neon-cyan)/20 transition-colors disabled:opacity-60"
            >
              {loading ? 'LOADING…' : '📂 SELECT FILE'}
            </button>
          </>
        )}

        {status && (
          <p className={`font-mono text-xs text-center ${
            status.type === 'ok' ? 'text-green-400' : 'text-red-400'
          }`}>
            {status.type === 'ok' ? '✓ ' : '⚠ '}{status.message}
          </p>
        )}

        <button
          onClick={closeModal}
          className="w-full py-1.5 border border-slate-700 text-slate-400 font-mono text-xs rounded hover:border-slate-500 transition-colors"
        >
          CLOSE
        </button>
      </div>
    </Modal>
  )
}
