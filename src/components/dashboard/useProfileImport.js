/**
 * Encapsulates file-based profile import logic for ProfilesPanel.
 * Manages async state, error display, and input ref reset.
 */

import { useState, useRef } from 'react'
import { useProfilesStore } from '../../store/profilesStore.js'

/**
 * @returns {{
 *   importStatus: { ok: boolean, msg: string } | null,
 *   fileInputRef: React.RefObject<HTMLInputElement>,
 *   handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void,
 * }}
 */
export function useProfileImport() {
  const importFromFile = useProfilesStore((s) => s.importFromFile)
  const [importStatus, setImportStatus] = useState(null)
  const fileInputRef = useRef(null)

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportStatus(null)
    try {
      const { added, skipped } = await importFromFile(file)
      setImportStatus({ ok: true, msg: `${added} aggiunti, ${skipped} saltati.` })
    } catch (err) {
      setImportStatus({ ok: false, msg: err.message })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return { importStatus, fileInputRef, handleImport }
}
