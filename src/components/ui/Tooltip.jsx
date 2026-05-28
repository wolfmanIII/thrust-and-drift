/**
 * Tooltip — lightweight hover tooltip, styled for the dark/neon UI.
 * Wraps any single child; shows label above (default) or below.
 *
 * @param {{ label: string, children: React.ReactNode, position?: 'top'|'bottom' }} props
 */
export function Tooltip({ label, children, position = 'top' }) {
  const isTop = position === 'top'
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        className={`
          pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap
          px-2 py-1 rounded
          bg-slate-800 border border-slate-600 text-slate-200 font-display text-xs tracking-widest
          opacity-0 group-hover:opacity-100 transition-opacity duration-100
          ${isTop ? 'bottom-full mb-1.5' : 'top-full mt-1.5'}
        `}
      >
        {label}
        {/* Arrow */}
        <span
          className={`
            absolute left-1/2 -translate-x-1/2 w-0 h-0
            border-x-4 border-x-transparent
            ${isTop
              ? 'top-full border-t-4 border-t-slate-600'
              : 'bottom-full border-b-4 border-b-slate-600'}
          `}
        />
      </span>
    </span>
  )
}
