# THRUST & DRIFT // Space Combat Simulator — Agent Instructions

## ROLE

Senior Frontend Engineer. Vite + React specialist. Write efficient, maintainable, and performant code.

## TECH STACK

- **Runtime**: Browser-only — no backend, no server, no network calls
- **Framework**: React 19 (JSX, hooks, concurrent features)
- **Build**: Vite 8 + `@vitejs/plugin-react`
- **State**: Zustand 5 (profiles, battle, ui stores)
- **Styling**: Tailwind v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js`)
- **Map Rendering**: Canvas API (native) — pan, zoom, hex grid, tokens
- **File I/O**: Browser File API — JSON import/export, no persistence layer
- **Linting**: ESLint 10 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`
- **Package Manager**: npm

## PROJECT DESCRIPTION

Local VTT lite (Virtual Tabletop) for Mongoose Traveller 2e space combat. Implements core space combat rules + vectorial combat system (Traveller Companion 2024, pp.169–186). GM-operated, designed for shared-screen sessions.

## CODING GUIDELINES

1. **Conciseness**: Do not explain basic concepts. Only explain complex architectural decisions.
2. **Safety**: Handle all edge cases. Explicit error handling — no `catch(e) {}` swallowing.
3. **Modern JS**: ES2024, named exports preferred, no default exports on stores/utils.
4. **React Patterns**: Functional components only. Custom hooks for logic reuse (`use` prefix). Keep components lean — extract logic to hooks or utils.
5. **State Management**: All game state in Zustand stores (`store/`). UI-only state (hover, focus) may live in component `useState`. No prop drilling past 2 levels — use store selectors.
6. **Canvas Rendering**: All draw calls in `useCanvasRenderer.js`. Never call `ctx.draw*` from JSX components directly.
7. **No Placeholders**: Write full implementations. Never leave TODOs.
8. **SOLID Principles**: Apply to **all** `.js`/`.jsx` files. Single-responsibility for hooks and utils.
9. **Code Organization**: UI (JSX/components) strictly separated from logic (hooks, utils, store).
10. **Industrial Theme**: Sci-fi Traveller/industrial tone for user-facing strings. Dark palette — slate/zinc base, neon cyan accents.
11. **Imports**: Always explicit. Never `import *`.
12. **Strict Scope**: Stay within discussed scope. Do not add extra features unless requested.
13. **Tailwind v4 Syntax**: Canonical class syntax — `(--var)` not `[var(--var)]`, `bg-linear-to-t` not `bg-gradient-to-t`. No `tailwind.config.js` — use CSS `@theme` for custom tokens.
14. **No External State Libraries**: Do not introduce Redux, Jotai, Context-based state — Zustand only.
15. **Game Rules Fidelity**: All mechanical calculations (DM, damage, thrust, range bands) must match Mongoose Traveller 2e RAW. Flag any ambiguity before implementing.

## CRITICAL RULES

- DO NOT apologize.
- DO NOT remove existing comments or code unless necessary for refactoring.
- DO NOT hallucinate React APIs, Zustand APIs, or Canvas methods.
- DO NOT add synchronous heavy computation on the main thread — offload to `setTimeout`/`requestAnimationFrame` or a Web Worker if needed.
- DO NOT add Co-Authored-By lines to git commits.
- DO commit frequently — every logical unit (component, hook, store slice, util) is a separate commit.
- DO NOT introduce TypeScript unless explicitly requested — project uses JSX.
- DO NOT exercise operational complacency. Flag suboptimal patterns immediately.

## PROJECT STRUCTURE

```text
src/
├── main.jsx                    ← React entry point
├── App.jsx                     ← Root component, router/layout
├── App.css                     ← Global styles (augments Tailwind)
├── index.css                   ← Tailwind directives + @theme tokens
├── components/
│   ├── map/
│   │   ├── BattleMap.jsx       ← Canvas principale
│   │   ├── useCanvasRenderer.js← Hook rendering hex + token
│   │   ├── useMapInteraction.js← Hook pan, zoom, click, right-click
│   │   └── tokenRenderers.js   ← Draw functions per navi e missili
│   ├── modals/
│   │   ├── Modal.jsx           ← Generic modal wrapper
│   │   ├── ShipProfileModal.jsx
│   │   ├── AddShipModal.jsx
│   │   ├── ThrustModal.jsx     ← ⚠ UNUSED — dead code (rubber-band targeting replaced it)
│   │   ├── AttackModal.jsx     ← Attack resolution + DM calc
│   │   ├── ShipDetailModal.jsx
│   │   ├── ActionModal.jsx
│   │   ├── InitiativeModal.jsx
│   │   └── BattleReportModal.jsx ← PDF battle report (window.print() + @media print)
│   ├── ui/
│   │   ├── ContextMenu.jsx     ← Right-click context menu
│   │   ├── HUD.jsx             ← Round/phase/initiative overlay
│   │   ├── BattleLog.jsx       ← Collapsible event log
│   │   └── PhaseTracker.jsx
│   └── forms/
│       ├── ShipProfileForm.jsx
│       ├── ThrustInput.jsx     ← 6 hex direction buttons + Δq/Δr input
│       └── DiceRoller.jsx
├── store/
│   ├── profilesStore.js        ← Ship profiles (CRUD + import/export)
│   ├── battleStore.js          ← Active battle state
│   └── uiStore.js              ← Modal open state, selected ship, etc.
├── utils/
│   ├── hex.js                  ← Hex math (cube coords, neighbors, distance)
│   ├── combat.js               ← DM calc, damage, range bands
│   ├── io.js                   ← JSON import/export via File API
│   └── dice.js                 ← Dice rolling + result formatting
└── data/
    ├── weapons.js              ← Weapon tables, traits, damage
    ├── rangeBands.js           ← Distance band thresholds (hex)
    └── defaultProfiles.js      ← Preset ship profiles
```

## DOCUMENTATION

- Code: JSDoc on hooks and complex functions (English, technical tone).
- Project: keep `doc/` updated in Italian Markdown.
- Game rules references: always cite source (e.g. `// MgT2e CRB p.164`, `// Traveller Companion p.172`).

## SIMPLIFY & PLAYWRIGHT USAGE

- Before running `/simplify` or Playwright e2e verification, evaluate first if actually needed for the change. Skip if not.
- `/simplify`: run on non-trivial diffs (new feature, refactor touching 3+ files, architectural change). Skip for trivial fixes, doc-only changes, single-line tweaks.
- Playwright: run only when the change affects live UI/interaction flow not already covered by existing e2e suite, or when unit/component tests can't verify the actual user-facing behavior. Skip for pure logic/util changes already covered by unit tests.

## AVAILABLE TOOLING — CodeGraph & claude-mem

This project has both indexed. Use them before falling back to grep/find or unaided recall:

- **CodeGraph** (`.codegraph/`): reach for it BEFORE grep/find or reading files to locate or understand code. `codegraph_explore` (MCP) or `codegraph explore "<symbols/question>"` (shell) returns verbatim, line-numbered source plus call paths between symbols in one call.
- **claude-mem**: cross-session memory of past work on this repo. Use `mem-search`/`smart-search`/`timeline` style lookups when checking whether something was already solved, how a past bug/feature was handled, or for session history context — before re-deriving it from scratch.
