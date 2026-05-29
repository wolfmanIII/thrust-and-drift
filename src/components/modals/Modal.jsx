/**
 * Modal — generic backdrop + panel wrapper.
 * Handles focus trap, Escape key, and backdrop click.
 */

import { useEffect, useRef } from 'react'

/**
 * @param {{
 *   title: string,
 *   onClose: Function,
 *   children: React.ReactNode,
 *   width?: string,
 * }} props
 */
export function Modal({ title, onClose, children, width = 'max-w-lg' }) {
  const panelRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Focus panel on mount
  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full ${width} mx-4 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl outline-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h2 className="font-mono text-sm text-[--neon-cyan] tracking-widest uppercase">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 font-mono text-lg leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {children}
        </div>
      </div>
    </div>
  )
}
