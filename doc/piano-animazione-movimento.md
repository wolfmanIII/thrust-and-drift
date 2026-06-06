# Piano implementazione — Animazione movimento navi e missili

**Versione target**: 1.10.0  
**Data redazione**: 2026-06-06  
**Stato**: BOZZA — da approvare prima dell'implementazione

---

## 1. Obiettivo

Aggiungere un'animazione visiva fluida durante la fase **Movement**: navi e missili
scorrono sul canvas dalla posizione di partenza a quella di destinazione in ~600 ms,
invece di teletrasportarsi istantaneamente.

Questo migliora la leggibilità tattica durante le sessioni su schermo condiviso:
il GM e i giocatori vedono chiaramente la traiettoria percorsa prima che inizi la
fase Attack.

---

## 2. Stato attuale

| Componente | Comportamento attuale |
| --- | --- |
| `battleStore.resolveMovement()` (riga 443) | Applica `applyMovement(position, vector)` istantaneamente per ogni nave e missile; aggiorna lo store in una sola `set()` |
| `useCanvasRenderer.js` (riga 132, 138) | Legge direttamente `ship.position` / `missile.position` — nessuna interpolazione |
| rAF loop (riga 177–186) | Già attivo quando c'è almeno una nave in dogfight; azionato da `requestAnimationFrame` con timestamp |
| `uiStore.js` | Nessuno stato di animazione presente |

---

## 3. Architettura della soluzione

### Principio

- **Lo store aggiorna le posizioni finali subito**, come adesso (nessuna modifica alla
  logica di gioco o all'autosave).
- **Prima** di applicare il movimento, `battleStore` cattura le posizioni di partenza
  e le scrive in `uiStore.movementAnimation`.
- **Il renderer** legge `movementAnimation`; se attiva, calcola la posizione visiva
  interpolata tra start e end. Quando `progress >= 1.0`, pulisce lo stato.
- Il rAF loop in `useCanvasRenderer` già gira continuamente durante il dogfight pulse —
  viene esteso per girare **sempre durante un'animazione attiva**.

```text
battleStore.resolveMovement()
  │
  ├─ legge posizioni di partenza (ships + missiles)
  ├─ scrive animazione in uiStore: { startPositions, startTime, duration }
  └─ applica posizioni finali in battleStore (come adesso)

useCanvasRenderer (rAF loop)
  │
  ├─ legge movementAnimation da uiStore
  ├─ se attiva: calcola progress = (now - startTime) / duration  [0..1]
  │             interpola cx/cy = lerp(start, end, easeInOut(progress))
  │             se progress >= 1 → clearMovementAnimation()
  └─ se nulla: usa ship.position direttamente (comportamento attuale)
```

### Perché uiStore e non battleStore per lo stato di animazione

Lo stato di animazione è **puramente visivo** — non fa parte della simulazione di
gioco, non deve essere salvato in IndexedDB, non deve entrare nello snapshot di
autosave. `uiStore` è il posto corretto (modale, menu contestuale, ecc.).

### Perché battleStore può scrivere in uiStore

Zustand permette accesso diretto allo store tramite `useUiStore.getState().action()`
anche fuori dai componenti React. Non è un hook call — nessuna violazione delle
Rules of Hooks.

---

## 4. Modifiche file per file

### 4.1 `src/store/uiStore.js`

Aggiungere stato e azioni:

```js
// Stato iniziale da aggiungere:
movementAnimation: null,
/*
  null  → nessuna animazione attiva
  {
    startPositions: { [id: string]: { q: number, r: number } },
    startTime: number,   // performance.now() al momento del trigger
    duration: number,    // ms (default 600)
  }
*/

// Azioni da aggiungere:
startMovementAnimation: (startPositions, duration = 600) =>
  set({ movementAnimation: { startPositions, startTime: performance.now(), duration } }),

clearMovementAnimation: () =>
  set({ movementAnimation: null }),
```

### 4.2 `src/store/battleStore.js` — `resolveMovement()`

Dopo aver calcolato `movedShips` / `movedMissiles` e **prima** di chiamare `set()`,
aggiungere:

```js
// Cattura posizioni di partenza per animazione visiva
const startPositions = {}
ships.forEach((sh) => { startPositions[sh.id] = { ...sh.position } })
missiles.forEach((m)  => { startPositions[m.id]  = { ...m.position } })
useUiStore.getState().startMovementAnimation(startPositions)
// Poi il set() esistente, invariato
```

Aggiungere import: `import { useUiStore } from './uiStore.js'`

> **Nota**: `useUiStore.getState()` fuori da React è pattern Zustand standard.
> Verificare che non crei circular dependency (battleStore ↔ uiStore). Se sì,
> alternativa: esporre `startMovementAnimation` come export standalone da `uiStore.js`.

### 4.3 `src/components/map/useCanvasRenderer.js`

**a) Importare uiStore e aggiungere funzione di utilità:**

```js
import { useUiStore } from '../../store/uiStore.js'

/** @param {number} t */
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/**
 * Interpolates between two hex positions.
 * @param {{ q: number, r: number }} start
 * @param {{ q: number, r: number }} end
 * @param {number} t  — 0..1
 * @returns {{ q: number, r: number }}
 */
function lerpHex(start, end, t) {
  return { q: start.q + (end.q - start.q) * t, r: start.r + (end.r - start.r) * t }
}
```

**b) Nel callback di rendering** (dentro il rAF loop, dove vengono disegnate navi e
missili), calcolare la posizione visiva interpolata:

```js
const anim = useUiStore.getState().movementAnimation
const now = performance.now()

// Ogni nave:
ships.forEach((ship) => {
  let renderPos = ship.position
  if (anim?.startPositions[ship.id]) {
    const t = easeInOut(Math.min(1, (now - anim.startTime) / anim.duration))
    renderPos = lerpHex(anim.startPositions[ship.id], ship.position, t)
  }
  const { x: cx, y: cy } = hexToPixel(renderPos.q, renderPos.r, size, ox, oy)
  drawShipToken(ctx, ship, cx, cy, ship.id === selectedShipId, timestampRef.current)
})

// Ogni missile (stessa logica):
missiles.forEach((missile) => {
  let renderPos = missile.position
  if (anim?.startPositions[missile.id]) {
    const t = easeInOut(Math.min(1, (now - anim.startTime) / anim.duration))
    renderPos = lerpHex(anim.startPositions[missile.id], missile.position, t)
  }
  const { x: cx, y: cy } = hexToPixel(renderPos.q, renderPos.r, size, ox, oy)
  drawMissileToken(ctx, missile, cx, cy)
})

// Pulisce animazione quando completata
if (anim && (now - anim.startTime) >= anim.duration) {
  useUiStore.getState().clearMovementAnimation()
}
```

**c) Estendere la condizione del rAF loop** per girare anche durante l'animazione:

```js
// Attuale (solo dogfight):
const needsLoop = ships.some((s) => s.inDogfight)

// Nuovo:
const needsLoop = ships.some((s) => s.inDogfight)
  || useUiStore.getState().movementAnimation !== null
```

> **Attenzione**: `useUiStore.getState()` dentro il rAF è safe — accesso diretto
> allo store, non un hook. Il loop si ferma automaticamente quando l'animazione
> finisce e nessun dogfight è attivo.

### 4.4 `src/components/map/BattleMap.jsx` — blocco input durante animazione (opzionale)

Per evitare che il GM clicchi durante il movimento (potrebbe creare stati inconsistenti):

```js
const isAnimating = useUiStore((s) => s.movementAnimation !== null)

// Sul canvas o sul container:
<canvas
  style={{ pointerEvents: isAnimating ? 'none' : 'auto' }}
  ...
/>
```

Alternativa meno invasiva: nessun blocco — il GM può già cliccare tra un'azione
e l'altra; 600 ms sono brevi abbastanza da non essere fastidiosi.

---

## 5. Casi limite da gestire

| Caso | Gestione |
| --- | --- |
| Nave rimossa dal campo durante l'animazione | `startPositions[id]` esiste ma `ships` non contiene più quella nave → nessun rendering, nessun crash (il loop skippa la nave) |
| Animazione in corso + nuovo `resolveMovement()` (non dovrebbe accadere — fase bloccata) | `startMovementAnimation()` sovrascrive il precedente `movementAnimation` — nessun problema |
| Missile con `thrustRemaining` esaurito (rimosso dal filter) | Rimosso da `missiles` dopo `resolveMovement()` → il rAF non lo disegna più dopo il primo frame post-set; accettabile |
| Basic mode (`combatMode === 'basic'`) | `resolveMovement()` non viene chiamata in basic mode (fase `movement` saltata, riga 652–656 di battleStore) → `startMovementAnimation` non viene mai chiamata → nessun impatto |
| `hexToPixel` con coordinate non-intere (durante lerp) | `hexToPixel` fa arithmetic float → `canvas.arc/fillRect` accettano float → nessun problema |

---

## 6. Test da aggiungere

### 6.1 `src/store/uiStore.test.js`

```js
describe('movementAnimation', () => {
  it('startMovementAnimation imposta startPositions e startTime', () => { ... })
  it('clearMovementAnimation riporta a null', () => { ... })
})
```

### 6.2 `src/utils/lerp.test.js` (o inline in useCanvasRenderer)

`lerpHex` è una funzione pura — testare direttamente se estratta:

```js
it('lerpHex a t=0 restituisce start', () => { ... })
it('lerpHex a t=1 restituisce end', () => { ... })
it('lerpHex a t=0.5 restituisce punto medio', () => { ... })
```

---

## 7. File da NON modificare

- `src/utils/combat.js` — `applyMovement` rimane invariato
- `src/store/battleStore.js` — solo aggiunta minima (cattura startPositions + call uiStore)
- `src/components/map/tokenRenderers.js` — i draw function rimangono invariati
- `src/hooks/useAutosave.js` — `movementAnimation` non entra nello snapshot

---

## 8. Durata animazione

| Opzione | Pro | Contro |
| --- | --- | --- |
| **400 ms** | Reattivo, quasi impercettibile | Difficile seguire rotte lunghe |
| **600 ms** (raccomandato) | Chiaro senza rallentare il flusso | — |
| **1000 ms** | Molto leggibile per rotte lunghe | Può risultare lento a sessione avanzata |

Valore configurabile da costante `MOVEMENT_ANIM_DURATION_MS` in cima a `uiStore.js`.

---

## 9. Ordine di commit

1. `feat(uiStore): add movementAnimation state and actions`
2. `feat(battleStore): capture start positions before resolveMovement`
3. `feat(renderer): interpolate ship and missile positions during movement animation`
4. `feat(map): disable pointer events on canvas during movement animation` *(opzionale)*
5. `test(uiStore): cover startMovementAnimation and clearMovementAnimation`
6. `docs: update field-manual and HelpScreen for movement animation`
7. `docs: update README and CHANGELOG for v1.10.0`

---

## 10. Rischi e dipendenze

- **Circular dependency** `battleStore` ↔ `uiStore`: basso rischio — Zustand gestisce
  accessi cross-store via `getState()` senza import circolare problematico, ma va
  verificato al momento del build.
- **rAF loop attivo fuori dal dogfight**: incremento trascurabile di CPU per 600 ms
  per round. Accettabile.
- **Undo/Redo**: `movementAnimation` non entra negli snapshot di undo — se il GM
  fa undo durante l'animazione, la posizione torna a prima della fase Movement ma
  `movementAnimation.startPositions` potrebbe puntare a posizioni obsolete.
  Soluzione semplice: `clearMovementAnimation()` all'inizio di ogni `undo()` /
  `redo()` in battleStore.
