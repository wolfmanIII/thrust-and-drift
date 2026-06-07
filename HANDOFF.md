# HANDOFF — Thrust & Drift

> Da leggere all'inizio di una nuova sessione per riprendere il lavoro.
> Dopo aver letto questo file, leggi anche `CLAUDE.md` e `doc/piano-animazione-movimento.md`.

---

## Stato corrente

| Campo | Valore |
| --- | --- |
| **Versione** | 1.9.5 |
| **Branch** | main (clean, up to date con origin) |
| **Test** | 668 passing |
| **Ultimo commit** | `fe7a14c` docs: add implementation plan for movement animation |

---

## Cosa è stato fatto nella sessione precedente

1. **Documentazione basic mode** (`8215042`) — `doc/field-manual.md` e `HelpScreen.jsx` aggiornati con §3.2 BasicBattleView e §7.3 BasicManoeuvreModal; tabella costi thrust range band (CRB p.161).
2. **Fix autosave critico** (`1cfa34e`) — `useAutosave.js`: `extractBattleSnapshot` e restore `setState` mancavano `dogfights`, `boardings`, `rangeBands` → dati persi al reload in basic mode.
3. **Test autosave** (`46e68cd`) — 2 nuovi test (10 → 12) coprono persist e restore dei 3 campi mancanti.
4. **Rotazione missile token** (`854215c`) — `drawMissileToken` in `tokenRenderers.js` ora usa `computeShipRotation(missile.vector)` + `ctx.save/translate/rotate/restore`, come i token nave.
5. **Docs rotazione missile** (`51239bc`) — `field-manual.md` §3.1 e `HelpScreen.jsx` aggiornati.
6. **README + CHANGELOG v1.9.5** (`3a6c34d`) — versione bumped in `package.json`.
7. **Piano animazione movimento** (`fe7a14c`) — `doc/piano-animazione-movimento.md` scritto, non ancora implementato.

---

## Prossimo task — Animazione movimento (v1.10.0)

Il piano completo è in `doc/piano-animazione-movimento.md`. Riassunto operativo:

### Cosa fare

Aggiungere animazione visiva fluida (~600 ms, easeInOut) quando le navi e i missili
si spostano durante la fase **Movement**. Le posizioni di stato rimangono invariate
(lo store aggiorna subito a fine position); l'animazione è puramente visiva in `uiStore`.

### Ordine commit (dal piano §9)

1. `feat(uiStore): add movementAnimation state and actions`
2. `feat(battleStore): capture start positions before resolveMovement`
3. `feat(renderer): interpolate ship and missile positions during movement animation`
4. `feat(map): disable pointer events on canvas during movement animation` *(opzionale)*
5. `test(uiStore): cover startMovementAnimation and clearMovementAnimation`
6. `docs: update field-manual and HelpScreen for movement animation`
7. `docs: update README and CHANGELOG for v1.10.0`

### File chiave da toccare

| File | Modifica |
| --- | --- |
| `src/store/uiStore.js` | Aggiungere `movementAnimation` state + `startMovementAnimation` + `clearMovementAnimation` |
| `src/store/battleStore.js` | In `resolveMovement()` (riga ~443): catturare start positions, chiamare `useUiStore.getState().startMovementAnimation()` prima del `set()` |
| `src/components/map/useCanvasRenderer.js` | Aggiungere `easeInOut` + `lerpHex`; interpolare `cx/cy` durante animazione; estendere condizione rAF loop |
| `src/components/map/BattleMap.jsx` | Opzionale: `pointerEvents: none` durante animazione |

### Gotcha da tenere a mente

- **Circular dependency** `battleStore ↔ uiStore`: verificare che `import { useUiStore } from './uiStore.js'` in battleStore non crei problemi di build. Se sì, alternativa: export standalone `startMovementAnimation` da uiStore senza passare per il hook.
- **Undo/Redo**: chiamare `clearMovementAnimation()` all'inizio di `undo()` e `redo()` in battleStore, altrimenti le `startPositions` diventano stale.
- **Basic mode**: `resolveMovement()` non viene mai chiamata in basic mode (fase movement saltata — battleStore riga ~652). Nessun impatto.
- **Missili esauriti**: vengono rimossi con `.filter(m => m.thrustRemaining >= 0)` dopo `resolveMovement`. Il renderer non li troverà più in `missiles` → il rendering si interrompe da solo, nessun crash.
- **`lerpHex` con float**: `hexToPixel` e canvas accettano coordinate float, nessun arrotondamento necessario.

---

## Riferimenti utili

- `CLAUDE.md` — regole di progetto, stack, struttura
- `doc/field-manual.md` — manuale di gioco (italiano)
- `doc/piano-animazione-movimento.md` — piano dettagliato con codice di esempio
- `src/store/battleStore.js` riga 443 — `resolveMovement()` (punto di innesto)
- `src/components/map/useCanvasRenderer.js` riga 97–186 — rAF loop e draw calls
- `src/store/uiStore.js` — dove aggiungere stato animazione
