# Discrete Zoom Levels — Design Document

> Feature: v2.0 — Scale mappa discrete con transizione
> Implementazione: `useMapInteraction.js` + `BattleMap.jsx`

---

## Livelli

| Label | Zoom | Uso |
| --- | --- | --- |
| `CLOSE` | 2.5× | Visione ravvicinata — combattimento stretto, thrust targeting preciso |
| `TACTICAL` | 1.0× | Default — visione bilanciata (stato attuale) |
| `STRATEGIC` | 0.45× | Panoramica — overview campo di battaglia, traiettorie missili |

MIN_ZOOM esistente = 0.3, MAX_ZOOM = 3 — tutti e tre i livelli rientrano nel range.

---

## Rendering Adattivo

Il renderer già scala tutto in base a `zoom`. Comportamento per livello:

| Elemento | CLOSE (2.5×) | TACTICAL (1×) | STRATEGIC (0.45×) |
| --- | --- | --- | --- |
| Coordinate hex | ✓ visibili (`zoom > 1.2`) | ✗ nascoste | ✗ nascoste |
| Label token (nome nave) | ✓ grandi | ✓ normali | ✗ troppo piccole (~4px) — già illeggibili per scaling naturale |
| Vettori / frecce | ✓ | ✓ | ✓ (scalati) |
| Ring labels (CLOSE/SHORT…) | ✓ | ✓ | ✓ |
| Token shape | ✓ grande | ✓ normale | ✓ piccolo |

Nessuna modifica al renderer necessaria — il comportamento STRATEGIC emerge naturalmente dal font scaling (`Math.round(9 * size/32)` → ~4px a 0.45×).

---

## Animazione

**Durata**: 250ms  
**Curva**: ease-in-out (interpolazione cubica: `t² * (3 - 2t)`)  
**Meccanismo**: `requestAnimationFrame` loop in `useMapInteraction`

**Centro fisso**: durante la transizione il centro canvas rimane ancorato allo stesso punto del mondo hex. Formula:

```js
// Per ogni frame dell'animazione:
const scale = newZoom / prevZoom
offset.current = {
  x: canvasCenterX - (canvasCenterX - offset.current.x) * scale,
  y: canvasCenterY - (canvasCenterY - offset.current.y) * scale,
}
```

La rotella del mouse continua a funzionare come adesso (zoom continuo libero) e **non** aggiorna il livello attivo. I livelli discreti sono una sovrastruttura presentazionale indipendente.

---

## API

### `useMapInteraction` — nuovi export

```js
// Anima lo zoom verso il target in ~250ms, centrando sul canvas center.
// Dispatcha 'map:redraw' ad ogni frame.
animateZoom: (targetZoom: number) => void
```

### `BattleMap` — nuovi elementi

```jsx
// Stato locale: quale livello è attivo (null = libero dopo scroll)
const [activeLevel, setActiveLevel] = useState('TACTICAL')

// Tre pulsanti overlay, posizionati in basso a destra del canvas
// (evita sovrapposizione con TopRightControls in alto a destra e BattleLog in basso a sinistra)
```

---

## UI / Posizionamento

```
┌─────────────────────────────────────┐
│  [?] [Legend]           ← top-right │
│                                     │
│         CANVAS                      │
│                                     │
│  BATTLE LOG ↲     [C][T][S] ←       │
└─────────────────────────────────────┘
                     bottom-right, z-10
```

Tre pulsanti `C · T · S` in `absolute bottom-7 right-3`:
- Monospace, stile coerente con BattleLog e TopRightControls
- Attivo: `text-cyan-400 border-cyan-600`
- Inattivo: `text-slate-400 border-slate-700`
- Libero (dopo scroll manuale): nessuno evidenziato (activeLevel = null)

---

## Keyboard Shortcuts

| Tasto | Azione |
| --- | --- |
| `1` | CLOSE (2.5×) |
| `2` | TACTICAL (1.0×) |
| `3` | STRATEGIC (0.45×) |

Handler `keydown` su `window` in `BattleMap`, rimosso su unmount. Non attivo quando un modal è aperto (check `activeModal` da uiStore).

---

## File Modificati

| File | Modifica |
| --- | --- |
| `src/components/map/useMapInteraction.js` | Aggiunge `animateZoom(targetZoom)` — rAF loop con easing, center-anchored |
| `src/components/map/BattleMap.jsx` | Aggiunge `activeLevel` state, 3 pulsanti overlay, keyboard handler |

Nessuna modifica a store, renderer, o altri componenti.
