# HANDOFF — Thrust & Drift

> Da leggere all'inizio di una nuova sessione per riprendere il lavoro.
> Dopo aver letto questo file, leggi anche `CLAUDE.md`.

---

## Stato corrente

| Campo | Valore |
| --- | --- |
| **Versione** | 1.10.0 |
| **Branch** | main (clean) |
| **Test** | 672 passing |
| **Ultimo commit** | `8ef3bf8` docs: update README and CHANGELOG for v1.10.0; bump version |

---

## Cosa è stato fatto nella sessione precedente

1. **`feat(uiStore): add movementAnimation state and actions`** (`8236f87`) — aggiunto `MOVEMENT_ANIM_DURATION_MS = 600`, stato `movementAnimation: null`, azioni `startMovementAnimation(startPositions, duration)` e `clearMovementAnimation()`.
2. **`feat(battleStore): capture start positions before resolveMovement`** (`ba62f03`) — import `useUiStore`; in `resolveMovement()`: cattura `startPositions` e chiama `startMovementAnimation` prima del `set()`; `clearMovementAnimation()` aggiunto a inizio di `undoLastAction()` e `redoLastAction()`.
3. **`feat(renderer): interpolate ship and missile positions during movement animation`** (`22c33aa`) — aggiunto `easeInOut` + `lerpHex`; il rAF callback interpola `cx/cy` durante animazione; `clearMovementAnimation()` chiamato a fine animazione; rAF loop esteso con condizione `|| movementAnimation !== null`.
4. **`feat(map): disable pointer events on canvas during movement animation`** (`fa45f83`) — `BattleMap.jsx` usa `useUiStore` per leggere `isAnimating`; applica `pointerEvents: 'none'` durante animazione.
5. **`test(uiStore): cover startMovementAnimation and clearMovementAnimation`** (`69a9ee3`) — 4 nuovi test (19 totali nel file); `beforeEach` aggiornato con `movementAnimation: null`.
6. **Docs + version bump v1.10.0** (`e917027`, `8ef3bf8`) — `field-manual.md` §8, `HelpScreen.jsx` §movement, `README.md` feature table, `CHANGELOG.md`, `package.json`.

---

## Prossimo task

Nessun task pianificato. La feature v1.10.0 è completa e verificata (build OK, 672 test passing, nessuna circular dependency).

Possibili aree di sviluppo future:
- **Animazione lancio missili** — analoga al movimento navi (attualmente il token appare istantaneamente)
- **Configurabilità durata animazione** — esporre `MOVEMENT_ANIM_DURATION_MS` nelle impostazioni GM
- **Test renderer** — `easeInOut` e `lerpHex` sono funzioni pure isolabili in un util testabile

---

## Riferimenti utili

- `CLAUDE.md` — regole di progetto, stack, struttura
- `doc/field-manual.md` — manuale di gioco (italiano)
- `src/store/uiStore.js` — `movementAnimation` state
- `src/store/battleStore.js` riga ~450 — `resolveMovement()` con cattura startPositions
- `src/components/map/useCanvasRenderer.js` — `easeInOut`, `lerpHex`, rAF loop
- `src/components/map/BattleMap.jsx` — `isAnimating` + `pointerEvents`
