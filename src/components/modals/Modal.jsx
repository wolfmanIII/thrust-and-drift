/**
 * Modal — generic backdrop + panel wrapper.
 * variant="panel":  no backdrop, anchored bottom-right; map remains visible and pannable (default)
 * variant="dialog": full-screen backdrop, centered
 */

import { useEffect, useRef } from 'react'

/**
 * @param {{
 *   title?: string,
 *   subtitle?: string,
 *   onClose?: Function,
 *   children: React.ReactNode,
 *   width?: string,
 *   variant?: 'panel' | 'dialog',
 * }} props
 */
export function Modal({ title, subtitle, onClose, children, width = 'max-w-lg', variant = 'panel' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && onClose) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  if (variant === 'panel') {
    return (
      <div className={`fixed bottom-10 right-4 z-50 w-full ${width} pointer-events-auto`}>
        <div
          ref={panelRef}
          tabIndex={-1}
          className="relative bg-slate-900 border border-slate-700 rounded-lg shadow-2xl outline-none max-h-[calc(100vh-4rem)] flex flex-col"
        >
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
              <div>
                <h2 className="font-mono text-sm text-(--neon-cyan) tracking-widest uppercase">{title}</h2>
                {subtitle && <p className="font-mono text-xs text-(--neon-cyan) tracking-widest uppercase mt-0.5">{subtitle}</p>}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-200 font-mono text-lg leading-none transition-colors"
                  aria-label="Close"
                >
                  ×
                </button>
              )}
            </div>
          )}
          <div className="px-4 py-4 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    )
  }

  // variant="dialog" — full-screen backdrop, centered
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
      onMouseDown={(e) => { if (e.target === e.currentTarget && onClose) onClose() }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full ${width} mx-4 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl outline-none max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <div>
            <h2 className="font-mono text-sm text-(--neon-cyan) tracking-widest uppercase">{title}</h2>
            {subtitle && <p className="font-mono text-xs text-(--neon-cyan) tracking-widest uppercase mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 font-mono text-lg leading-none transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-4 py-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
