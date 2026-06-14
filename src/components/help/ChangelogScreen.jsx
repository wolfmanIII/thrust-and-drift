/**
 * ChangelogScreen — renders CHANGELOG.md as a structured in-app page.
 * Imports the markdown file as a raw string via Vite's ?raw suffix;
 * parses it into version blocks without an external markdown library.
 */

import { useState } from 'react'
import { useUiStore }    from '../../store/uiStore.js'
import changelogRaw      from '../../../CHANGELOG.md?raw'

// ── Parser ────────────────────────────────────────────────────────────────

/**
 * Parse the raw CHANGELOG.md into an array of version objects.
 * Handles: ## [X.Y.Z] — date, ### Category, - items, indented sub-items.
 * @returns {Array<{ version: string, date: string, groups: Array<{ title: string, items: string[] }> }>}
 */
function parseChangelog(raw) {
  const versions = []
  const blocks   = raw.split(/\n(?=## \[)/)

  for (const block of blocks) {
    if (!block.startsWith('## [')) continue
    const lines       = block.split('\n')
    const headerMatch = lines[0].match(/^## \[(.+?)\]\s*[—–-]+\s*(.+)/)
    if (!headerMatch) continue

    const version = headerMatch[1]
    const date    = headerMatch[2].trim()
    const groups  = []
    let current   = null

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith('### ')) {
        current = { title: line.slice(4).trim(), items: [] }
        groups.push(current)
      } else if (line.startsWith('- ') && current) {
        current.items.push(line.slice(2).trim())
      } else if ((line.startsWith('  - ') || line.startsWith('    - ')) && current && current.items.length > 0) {
        // Indented sub-bullet: append to parent item
        current.items[current.items.length - 1] += '\n' + line.trim().slice(2)
      } else if (line.trim() && !line.startsWith('#') && !line.startsWith('---') && current && current.items.length > 0) {
        // Continuation of previous item
        current.items[current.items.length - 1] += ' ' + line.trim()
      }
    }

    if (groups.length > 0) versions.push({ version, date, groups })
  }

  return versions
}

const VERSIONS = parseChangelog(changelogRaw)

// ── Inline markdown renderer ──────────────────────────────────────────────

/** Render **bold** and `code` spans inline. Returns an array of React nodes. */
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-slate-200 font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="text-(--neon-cyan) bg-slate-900/80 px-1 rounded font-mono">{part.slice(1, -1)}</code>
    }
    return part
  })
}

/** Render one changelog item, including its optional sub-bullets. */
function ChangelogItem({ text }) {
  const [main, ...subs] = text.split('\n')
  return (
    <li className="text-slate-400 leading-relaxed">
      <span>{renderInline(main)}</span>
      {subs.length > 0 && (
        <ul className="mt-1 ml-4 space-y-0.5 list-none">
          {subs.map((sub, i) => (
            <li key={i} className="text-slate-500 text-xs before:content-['·'] before:mr-1.5 before:text-slate-700">
              {renderInline(sub)}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

// ── Category badge ────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  Added:   'text-emerald-400 border-emerald-800/60',
  Fixed:   'text-amber-400  border-amber-800/60',
  Changed: 'text-sky-400    border-sky-800/60',
  Tests:   'text-slate-400  border-slate-700',
  Docs:    'text-slate-400  border-slate-700',
  Style:   'text-violet-400 border-violet-800/60',
  Removed: 'text-red-400    border-red-800/60',
}

function CategoryBadge({ title }) {
  const cls = CATEGORY_COLORS[title] ?? 'text-slate-400 border-slate-700'
  return (
    <span className={`font-mono text-[10px] tracking-widest border rounded px-1.5 py-0.5 ${cls}`}>
      {title.toUpperCase()}
    </span>
  )
}

// ── ChangelogScreen ───────────────────────────────────────────────────────

export function ChangelogScreen() {
  const gotoScreen     = useUiStore((s) => s.gotoScreen)
  const [active, setActive] = useState(VERSIONS[0]?.version ?? '')

  const scrollTo = (version) => {
    setActive(version)
    document.getElementById(`v${version}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="w-full h-full flex bg-slate-950 overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside className="w-36 shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 shrink-0">
          <p className="font-display text-xs text-(--neon-cyan) tracking-widest">// CHANGELOG</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {VERSIONS.map(({ version }) => (
            <button
              key={version}
              onClick={() => scrollTo(version)}
              className={`w-full text-left px-4 py-1.5 font-mono text-xs transition-colors ${
                active === version
                  ? 'text-(--neon-cyan) bg-(--neon-cyan)/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              v{version}
            </button>
          ))}
        </nav>

        <div className="shrink-0 px-4 py-3 border-t border-slate-800 space-y-2">
          <button
            onClick={() => gotoScreen('help')}
            className="w-full py-2 border border-slate-700 text-slate-400 font-display text-xs tracking-widest rounded hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            📖 MANUAL
          </button>
          <button
            onClick={() => gotoScreen('dashboard')}
            className="w-full py-2 border border-slate-700 text-slate-400 font-display text-xs tracking-widest rounded hover:border-slate-500 hover:text-slate-200 transition-colors"
          >
            ← BACK
          </button>
        </div>
      </aside>

      {/* ── Content ───────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-8 py-6 space-y-10">
        {VERSIONS.map(({ version, date, groups }) => (
          <section key={version} id={`v${version}`} className="scroll-mt-4 space-y-4">

            {/* Version header */}
            <div className="flex items-baseline gap-4 border-b border-slate-800 pb-2">
              <h2 className="font-display text-(--neon-cyan) tracking-widest text-base">
                v{version}
              </h2>
              <span className="font-mono text-xs text-slate-600">{date}</span>
            </div>

            {/* Category groups */}
            {groups.map(({ title, items }) => (
              <div key={title} className="space-y-2">
                <div className="flex items-center gap-2">
                  <CategoryBadge title={title} />
                </div>
                <ul className="space-y-2 pl-3 border-l border-slate-800 font-mono text-xs list-none">
                  {items.map((item, i) => (
                    <ChangelogItem key={i} text={item} />
                  ))}
                </ul>
              </div>
            ))}

          </section>
        ))}
      </main>

    </div>
  )
}
