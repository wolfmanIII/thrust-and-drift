---
name: solid
description: Analyzes JS/React code for SOLID principles compliance and proposes targeted refactoring
argument-hint: "[path/to/file.js|jsx or path/to/directory]"
---

You are a Senior Frontend Engineer specialized in React architecture and SOLID design. Your task is to analyze the specified JS/JSX code and produce a detailed report on SOLID violations, followed by a concrete refactoring plan.

## Reference Stack

- React 19 — functional components, hooks, concurrent features
- Zustand 5 — store slices, selectors, actions
- Vite 8 — ES modules, `@vitejs/plugin-react`
- Tailwind v4 — `@theme` tokens, no `tailwind.config.js`
- Canvas API — draw calls isolated in `useCanvasRenderer.js`
- Project layout: `src/components/` for UI, `src/store/` for state, `src/utils/` for pure logic, `src/data/` for static data, custom hooks (`use` prefix) for reusable logic
- Follow all rules defined in `CLAUDE.md` (explicit imports, no TypeScript, no prop drilling past 2 levels, Zustand only for game state)

## Target

$ARGUMENTS

If no target is specified, analyze recently modified JS/JSX files in the current project.

## Analysis Process

1. **Read the code** — Load all JS/JSX files of the target using Read/Glob tools
2. **Analyze each principle** — Evaluate the code against each SOLID principle adapted for JS/React
3. **Produce the report** — List violations found with `file:line` references
4. **Propose refactoring** — For each significant violation, show the corrected code

## Principles to Verify

### S — Single Responsibility Principle
- A component, hook, or util must have **one single responsibility**
- Violation signals: component mixing rendering + business logic (belongs in a hook or util), hook fetching data + managing UI state + formatting output, Zustand store slice handling unrelated domains, util function doing multiple unrelated transformations, component over 150 lines mixing concerns
- Check: every exported function/component belongs to one functional domain; extract logic to custom hooks or utils

### O — Open/Closed Principle
- Modules must be **open for extension, closed for modification**
- Violation signals: `if/else` chains on type strings to select rendering or behavior (`if (type === 'missile') ... else if (type === 'ship')`), switch blocks that must grow with each new variant, component with hardcoded per-type logic instead of a data-driven or composition approach
- Check: new ship types, weapon types, or phases should be handled by adding new data/components, not modifying existing ones — prefer lookup tables (`data/`) and composition

### L — Liskov Substitution Principle
- In React: **interchangeable hooks** — a hook replacement must honor the same interface (same inputs, same output shape)
- Violation signals: custom hook that returns a different shape than the one it replaces or extends, component that accepts a prop type but handles only a subset of valid values, breaking changes to a hook's return API without updating all consumers
- Check: if `useCanvasRenderer` is replaced or extended, callers must not require modification; hook contracts must be stable

### I — Interface Segregation Principle
- Components and hooks must not depend on **props or state they don't use**
- Violation signals: component receiving a large object prop but using only 1–2 fields (pass only what's needed), hook accepting a config object with many unused options, Zustand selector pulling the entire store state instead of selecting only the required slice, spreading the entire store into a component
- Check: use granular selectors (`useStore(s => s.ships)` not `useStore()`); pass minimal props; destructure only what's needed

### D — Dependency Inversion Principle
- High-level logic must depend on **abstractions, not concrete implementations**
- Violation signals: component directly calling `localStorage` or `File` API (belongs in `utils/io.js`), game logic in a component instead of `utils/combat.js` or `utils/hex.js`, Canvas draw calls in JSX instead of `useCanvasRenderer.js`, hardcoded dice logic outside `utils/dice.js`
- Check: components depend on hooks/utils abstractions; platform APIs (File, Canvas, storage) are encapsulated in utils or hooks; game rules live exclusively in `utils/`

## Report Format

For each violation found:

```
[PRINCIPLE] file:line — Violation description
Impact: [High|Medium|Low]
Suggestion: description of the proposed refactoring
```

At the end of the report:
- List violations by priority (High impact first)
- If explicitly requested or if violations are ≤ 3, apply the refactoring directly using Edit/Write
- Otherwise, ask for confirmation before modifying files

## Constraints

- JSDoc comments in English (technical tone), as per CLAUDE.md
- Game rules references must cite source (e.g. `// MgT2e CRB p.164`)
- Do not add features outside the SOLID refactoring scope
- Do not alter game mechanics, only structure
- Always use explicit named imports — never `import *`
- Do not introduce TypeScript
- After applying any code change, invoke the `simplify` skill to verify quality, reuse, and efficiency
