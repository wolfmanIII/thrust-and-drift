import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Tooltip — hover tooltip rendered via portal at fixed screen position.
 * Avoids clipping from overflow:hidden/auto ancestor containers.
 *
 * @param {{ label: string, children: React.ReactNode, position?: 'top'|'bottom' }} props
 */
export function Tooltip({ label, children, position = 'top' }) {
  const [coords, setCoords] = useState(null)
  const anchorRef = useRef(null)

  const show = useCallback(() => {
    if (!anchorRef.current) return
    const r = anchorRef.current.getBoundingClientRect()
    setCoords({ x: r.left + r.width / 2, y: position === 'top' ? r.top : r.bottom })
  }, [position])

  const hide = useCallback(() => setCoords(null), [])

  const isTop = position === 'top'

  return (
    <span ref={anchorRef} className="inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {coords && createPortal(
        <span
          className="pointer-events-none fixed z-9999 whitespace-nowrap px-2 py-1 rounded bg-slate-800 border border-slate-600 text-slate-200 font-display text-xs tracking-widest"
          style={{
            left: coords.x,
            top: isTop ? coords.y - 6 : coords.y + 6,
            transform: isTop ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          {label}
          <span
            className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent
              ${isTop ? 'top-full border-t-4 border-t-slate-600' : 'bottom-full border-b-4 border-b-slate-600'}`}
          />
        </span>,
        document.body
      )}
    </span>
  )
}
