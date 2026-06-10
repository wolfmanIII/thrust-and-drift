# Thrust Targeting UX — Design Document

> Feature: sostituire `ThrustModal` con interazione rubber-band sulla mappa.
> Scope: solo modalità **vectorial**. Basic mode (range bands) non è toccata.

---

## 1. Obiettivo

Eliminare la modale `ThrustModal` per il thrust vettoriale.
Al suo posto: l'utente trascina il cursore sulla mappa partendo dalla nave;
una linea tratteggiata mostra il vettore di thrust scelto e un ghost indica
dove la nave si troverà il prossimo round dopo l'applicazione.

Conferma → click. Annullamento → ESC o click fuori dalla mappa.

---

## 2. Comportamento atteso

### 2.1 Flusso

```
right-click nave
  → ContextMenu "Apply Thrust"
    → uiStore.startThrustTargeting(shipId)
    → hideContextMenu()

[targeting mode attivo]
  onMouseMove → aggiorna mouseHexRef + redraw
  canvas mostra:
    - linea tratteggiata: shipPos → shipPos + thrustDelta (clampato)
    - ghost: shipPos + ship.vector + thrustDelta  (posizione prossimo round)
    - badge sul canvas: "N / MAX thrust"
    - linea diventa arancione/rossa quando si raggiunge il cap

  onClick (senza drag) → applyShipThrust + emitEffect + cancelThrustTargeting
  ESC / click fuori canvas → cancelThrustTargeting
```

### 2.2 Calcolo del thrust delta

```
rawDelta = { q: mouseHex.q - ship.position.q,
             r: mouseHex.r - ship.position.r }
rawMag   = hexDistance({ q:0, r:0 }, rawDelta)

if rawMag === 0 → delta = { q:0, r:0 }
else if rawMag <= thrustAvailable → delta = rawDelta
else →
  scale        = (thrustAvailable - 0.5) / rawMag      // -0.5 per sicurezza post-round
  fractional   = { q: rawDelta.q * scale, r: rawDelta.r * scale }
  delta        = hexRound(fractional)
  // safety: se hexDistance ancora > thrustAvailable, decrementa di 1 hex nella direzione
  while hexDistance({q:0,r:0}, delta) > thrustAvailable:
    scale -= 1 / rawMag
    delta  = hexRound({ q: rawDelta.q * scale, r: rawDelta.r * scale })
```

`thrustAvailable = Math.max(0, ship.profile.thrust + (ship.thrustBonusThisRound ?? 0) - ship.thrustUsedThisRound - (ship.thrustPenalty ?? 0))`
— identico alla formula già in `ThrustModal.jsx`.

### 2.3 Ghost position

```
ghostHex = hexAdd(hexAdd(ship.position, ship.vector), delta)
```

È la posizione in cui la nave si troverà il **prossimo round** dopo aver applicato
il thrust scelto + la deriva inerziale.

---

## 3. Modifiche per file

### 3.1 `src/store/uiStore.js`

**Aggiungere:**

```js
// === THRUST TARGETING ===
/**
 * Quando non null, la mappa è in "thrust targeting mode".
 * @type {{ shipId: string } | null}
 */
thrustTargeting: null,

/** @param {string} shipId */
startThrustTargeting: (shipId) => set({ thrustTargeting: { shipId } }),
cancelThrustTargeting: () => set({ thrustTargeting: null }),
```

**Aggiornare il typedef `ModalId`:** rimuovere `'thrust'` (la modale non viene più aperta).

---

### 3.2 `src/components/map/BattleMap.jsx`

**Aggiungere** un ref condiviso per la posizione hex del mouse e passarlo ai due hook:

```js
const mouseHexRef = useRef({ q: 0, r: 0 })

const { offset, zoom, onMouseDown, onMouseMove, onMouseUp,
        onWheel, onClick, onContextMenu, onDoubleClick } =
  useMapInteraction({ hexSize: HEX_SIZE, canvasRef, mouseHexRef })

useCanvasRenderer({ canvasRef, offset, zoom, mouseHexRef })
```

**Aggiungere** listener ESC per uscire dal targeting mode:

```js
const cancelThrustTargeting = useUiStore((s) => s.cancelThrustTargeting)

useEffect(() => {
  const handler = (e) => {
    if (e.key === 'Escape') cancelThrustTargeting()
  }
  window.addEventListener('keydown', handler)
  return () => window.removeEventListener('keydown', handler)
}, [cancelThrustTargeting])
```

---

### 3.3 `src/components/map/useMapInteraction.js`

**Signature aggiornata:**

```js
export function useMapInteraction({ hexSize, canvasRef, mouseHexRef })
```

**Aggiungere selettori:**

```js
const thrustTargeting     = useUiStore((s) => s.thrustTargeting)
const cancelThrustTargeting = useUiStore((s) => s.cancelThrustTargeting)
const ships               = useBattleStore((s) => s.ships)
const applyShipThrust     = useBattleStore((s) => s.applyShipThrust)
```

**`onMouseMove`** — aggiungere tracking hex (prima del pan):

```js
const onMouseMove = useCallback((e) => {
  // Aggiorna sempre la posizione hex per il targeting mode
  if (thrustTargeting) {
    mouseHexRef.current = pixelToWorld(e.clientX, e.clientY)
    canvasRef.current?.dispatchEvent(new CustomEvent('map:redraw'))
  }

  // Pan originale invariato
  if (!isPanning.current) return
  ...
}, [thrustTargeting, mouseHexRef, pixelToWorld, canvasRef, ...])
```

**`onClick`** — aggiungere branch thrust targeting (prima del placement check):

```js
// Thrust targeting confirm
if (thrustTargeting && !hasDragged.current) {
  const ship = ships.find((s) => s.id === thrustTargeting.shipId)
  if (ship) {
    const thrustAvailable = Math.max(0,
      ship.profile.thrust + (ship.thrustBonusThisRound ?? 0)
      - ship.thrustUsedThisRound - (ship.thrustPenalty ?? 0)
    )
    const delta = computeClampedDelta(mouseHexRef.current, ship.position, thrustAvailable)
    const cost  = hexDistance({ q: 0, r: 0 }, delta)
    if (cost > 0) {
      applyShipThrust(ship.id, delta, cost)
      emitEffect('thrust_plume', { duration: 2500, hex: ship.position, delta, shipColor: ship.color })
    }
  }
  cancelThrustTargeting()
  return
}
```

**Estrarre `computeClampedDelta`** come funzione pura nel file (non esportata):

```js
/**
 * Compute thrust delta from ship position to targetHex, clamped to thrustAvailable.
 * @param {{ q: number, r: number }} targetHex
 * @param {{ q: number, r: number }} shipPos
 * @param {number} thrustAvailable
 * @returns {{ q: number, r: number }}
 */
function computeClampedDelta(targetHex, shipPos, thrustAvailable) {
  const rawDelta = { q: targetHex.q - shipPos.q, r: targetHex.r - shipPos.r }
  const rawMag   = hexDistance({ q: 0, r: 0 }, rawDelta)
  if (rawMag === 0 || thrustAvailable === 0) return { q: 0, r: 0 }
  if (rawMag <= thrustAvailable) return rawDelta

  let scale = (thrustAvailable - 0.5) / rawMag
  let delta = hexRound({ q: rawDelta.q * scale, r: rawDelta.r * scale })
  while (hexDistance({ q: 0, r: 0 }, delta) > thrustAvailable && scale > 0) {
    scale -= 1 / rawMag
    delta = hexRound({ q: rawDelta.q * scale, r: rawDelta.r * scale })
  }
  return delta
}
```

Importare da `hex.js`: `hexDistance`, `hexRound`.
Importare da `effectQueue.js`: `emitEffect`.

---

### 3.4 `src/components/map/useCanvasRenderer.js`

**Signature aggiornata:**

```js
export function useCanvasRenderer({ canvasRef, offset, zoom, mouseHexRef })
```

**Aggiungere selettori:**

```js
const thrustTargeting = useUiStore((s) => s.thrustTargeting)
```

**Passare `thrustTargeting` come dipendenza** di `render` e `useCallback`.

**Aggiungere nuovo layer nel `render()`** tra Layer 3 (ghost acceleration) e Layer 4 (vector arrows):

```js
// --- Layer 3b: Thrust targeting overlay ---
if (thrustTargeting && phase === 'acceleration') {
  const targetingShip = ships.find((s) => s.id === thrustTargeting.shipId)
  if (targetingShip) {
    drawThrustTargeting(ctx, targetingShip, mouseHexRef.current, size, ox, oy)
  }
}
```

**Aggiungere funzione** `drawThrustTargeting` nel file (non esportata):

```js
/**
 * Draw thrust targeting overlay: dashed thrust line, clamped delta endpoint,
 * ghost at next-round position, thrust budget badge.
 */
function drawThrustTargeting(ctx, ship, mouseHex, size, ox, oy) {
  const thrustAvailable = Math.max(0,
    ship.profile.thrust + (ship.thrustBonusThisRound ?? 0)
    - ship.thrustUsedThisRound - (ship.thrustPenalty ?? 0)
  )
  const delta    = computeClampedDelta(mouseHex, ship.position, thrustAvailable)
  const cost     = hexDistance({ q: 0, r: 0 }, delta)
  const atCap    = cost >= thrustAvailable && thrustAvailable > 0
  const lineColor = atCap ? '#f97316' : '#22d3ee'  // orange-500 : neon-cyan

  const { x: sx, y: sy } = hexToPixel(ship.position.q, ship.position.r, size, ox, oy)
  const thrustEndHex = hexAdd(ship.position, delta)
  const { x: ex, y: ey } = hexToPixel(thrustEndHex.q, thrustEndHex.r, size, ox, oy)

  // Linea tratteggiata: shipPos → thrustEndpoint
  ctx.save()
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.moveTo(sx, sy)
  ctx.lineTo(ex, ey)
  ctx.stroke()
  ctx.setLineDash([])

  // Cerchio al thrustEndpoint
  ctx.beginPath()
  ctx.arc(ex, ey, 4, 0, Math.PI * 2)
  ctx.fillStyle = lineColor
  ctx.fill()

  // Ghost alla posizione prossimo round: ship.pos + ship.vector + delta
  const ghostHex = hexAdd(hexAdd(ship.position, ship.vector), delta)
  const { x: gx, y: gy } = hexToPixel(ghostHex.q, ghostHex.r, size, ox, oy)
  drawGhostToken(ctx, ship, gx, gy)

  // Linea sottile dal ghost attuale (senza thrust) al nuovo ghost
  const defaultGhostHex = hexAdd(ship.position, ship.vector)
  const { x: dgx, y: dgy } = hexToPixel(defaultGhostHex.q, defaultGhostHex.r, size, ox, oy)
  ctx.setLineDash([2, 4])
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.4
  ctx.beginPath()
  ctx.moveTo(dgx, dgy)
  ctx.lineTo(gx, gy)
  ctx.stroke()
  ctx.setLineDash([])

  // Badge thrust budget (canvas text, in basso a sx rispetto al ghost)
  ctx.globalAlpha = 1
  ctx.font = `bold ${Math.round(9 * (size / 32))}px monospace`
  ctx.fillStyle = atCap ? '#f97316' : '#94a3b8'  // orange o slate-400
  ctx.textAlign = 'center'
  ctx.fillText(`${cost}/${thrustAvailable}`, gx, gy + size * 0.9)

  ctx.restore()
}
```

Importare `hexAdd`, `hexToPixel`, `hexDistance` e la funzione `computeClampedDelta`.

> **Nota**: `computeClampedDelta` è definita sia in `useMapInteraction.js` (per la conferma)
> sia in `useCanvasRenderer.js` (per il preview). È una funzione pura identica — duplicazione
> accettabile per rispettare la separazione UI/rendering senza creare un util solo per questo.
> In alternativa: estrarla in `src/utils/hex.js` o `src/utils/combat.js` ed esportarla.

---

### 3.5 `src/components/ui/ContextMenu.jsx`

**In `ShipContextMenu`** aggiungere il selettore:

```js
const startThrustTargeting = useUiStore((s) => s.startThrustTargeting)
```

**Sostituire** la riga "Apply Thrust":

```jsx
// Prima:
<MenuItem icon="🚀" label="Apply Thrust" onClick={() => open('thrust', { shipId: targetId })} />

// Dopo:
<MenuItem icon="🚀" label="Apply Thrust" onClick={() => { startThrustTargeting(targetId); close() }} />
```

---

### 3.6 `src/components/modals/ThrustModal.jsx`

**Eliminare il file.** Non viene più triggerata da nessuna parte.

Rimuovere anche:
- L'import in `App.jsx` (o dove viene montata)
- `'thrust'` dal typedef `ModalId` in `uiStore.js`

---

## 4. Layer di rendering aggiornato

```
Layer 1  — hex grid
Layer 2  — (non usato / futuro)
Layer 3  — ghost acceleration (posizione inerziale prossimo round, senza thrust)
Layer 3b — thrust targeting overlay  ← NUOVO
             · linea tratteggiata shipPos → thrustEndpoint
             · cerchio @ thrustEndpoint
             · ghost @ shipPos + vector + delta
             · linea sottile defaultGhost → newGhost
             · badge "cost/max"
Layer 4  — vector arrows
Layer 5  — missile tokens
Layer 6  — ship tokens
Layer 7  — ship labels
```

---

## 5. Edge cases

| Caso | Comportamento |
|---|---|
| `thrustAvailable === 0` | delta = `{0,0}`; ghost coincide con il ghost inerziale; badge "0/0"; click chiude il targeting mode senza applicare |
| Nave in dogfight | "Apply Thrust" non compare nel context menu (invariato — `inDogfight !== null` disabilita il menu) |
| Nave già al cap | La linea è sempre arancione; il ghost non si sposta oltre |
| Delta = `{0,0}` al click | `cost === 0` → `applyShipThrust` non chiamata; targeting mode annullato silenziosamente |
| Mouse fuori canvas | `mouseHexRef` mantiene l'ultimo valore valido; no crash |
| Phase change durante targeting | Il renderer smette di disegnare il layer 3b (guard `phase === 'acceleration'`); `cancelThrustTargeting` andrebbe chiamato anche su `advancePhase` — aggiungere call in `battleStore.advancePhase` o in un subscriber |

---

## 6. Cosa NON cambia

- `applyShipThrust` in `battleStore.js` — nessuna modifica
- `useCanvasRenderer` Layer 3 (ghost inerziale) — rimane; il targeting lo affianca
- `ThrustInput.jsx` — non è usato da ThrustModal (era per il form profilo); non toccare
- Basic mode `basicManoeuvre` modal — non toccare
- `pushHistory` / undo — l'azione è ancora `applyShipThrust`, nessuna modifica

---

## 7. Test da aggiungere

1. `computeClampedDelta`: delta entro budget → restituisce rawDelta invariato
2. `computeClampedDelta`: delta oltre budget → distanza risultante `<= thrustAvailable`
3. `computeClampedDelta`: `thrustAvailable === 0` → `{q:0, r:0}`
4. `uiStore`: `startThrustTargeting` / `cancelThrustTargeting` round-trip
5. `useMapInteraction` (mock): click in targeting mode con cost > 0 → `applyShipThrust` chiamata con delta corretto
6. `useMapInteraction` (mock): click in targeting mode con cost === 0 → `applyShipThrust` non chiamata

---

## 8. Ordine di implementazione consigliato

1. Estrarre `computeClampedDelta` in `src/utils/hex.js` + test unitari (step 1–3 sopra)
2. `uiStore.js` — aggiungere `thrustTargeting` state + test (step 4)
3. `useMapInteraction.js` — signature + click handler + mousemove tracking
4. `BattleMap.jsx` — `mouseHexRef` + ESC listener
5. `useCanvasRenderer.js` — Layer 3b
6. `ContextMenu.jsx` — swap `open('thrust')` → `startThrustTargeting`
7. Eliminare `ThrustModal.jsx` + cleanup import/typedef
8. Test interazione (step 5–6)
