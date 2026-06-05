# Obstacles System Design — Thrust & Drift

> Specifica implementativa per gli ostacoli ambientali sulla mappa di combattimento.
> Regole di riferimento: MgT2e CRB pp.160–168, Traveller Companion 2024 pp.169–186.
> Le meccaniche di gravità e collisione non hanno regole RAW esplicite — vengono trattate
> come estensioni ragionevoli del sistema vettoriale.

---

## 1. Panoramica

Gli ostacoli ambientali sono oggetti fissi o zone sulla mappa hex che interagiscono con il
movimento e il combattimento. Non hanno iniziativa, non agiscono attivamente, ma modificano
il comportamento delle navi che li attraversano o si avvicinano.

**Quattro tipi implementati (in ordine di priorità):**

| Tipo | Impatto tattico | Complessità implementativa |
|------|----------------|---------------------------|
| Asteroid Field | Cover DM, danno collisione, costo movimento | Media |
| Gravity Well | Modifica vettori automaticamente ogni round | Alta |
| Debris Field | Come asteroid field, più denso | Bassa (variante di Asteroid) |
| Nebula | Penalità sensori, copertura totale | Bassa |

Gli ostacoli vengono piazzati dal GM prima o durante la battaglia tramite context menu su hex vuoto.

---

## 2. Modello Dati

### 2.1 ObstacleToken

```typescript
interface ObstacleToken {
  id: string                     // UUID
  type: ObstacleType
  position: HexCoord             // Hex centrale
  radius: number                 // Raggio in hex (0 = singola cella)
  label?: string                 // Nome opzionale (es. "Beta Belt", "Zed Station Debris")

  // Campi specifici per tipo (presenti solo se rilevanti)
  density?: 'light' | 'dense'   // Asteroid/Debris Field
  mass?: 'small' | 'large'      // Gravity Well — determina forza pull
}

type ObstacleType = 'asteroid_field' | 'debris_field' | 'gravity_well' | 'nebula'
```

### 2.2 Estensione BattleState

```typescript
interface BattleState {
  // ... campi esistenti ...
  obstacles: ObstacleToken[]
}
```

`obstacles` viene incluso negli snapshot undo/redo e nei file di export/import.

### 2.3 Funzione helper — hex in ostacolo

```javascript
// Restituisce l'ostacolo che occupa l'hex dato, o null
function getObstacleAt(obstacles, hex) {
  return obstacles.find(o => hexDistance(o.position, hex) <= o.radius) ?? null
}

// Restituisce tutti gli ostacoli che intersecano un insieme di hex
function getObstaclesInPath(obstacles, hexList) {
  return hexList.flatMap(h => obstacles.filter(o => hexDistance(o.position, h) <= o.radius))
}
```

---

## 3. Meccaniche per Tipo

### 3.1 Asteroid Field

**Definizione:** zona di hex occupati da detriti rocciosi. Fornisce copertura e rischio collisione.

**Raggio tipico:** 1–4 hex.

#### Costo movimento

Attraversare un hex di campo asteroidi costa **+1 thrust** aggiuntivo rispetto al normale.
Questo viene sommato al thrust già speso nel round.

Meccanica:

```
se nave.nextPosition è dentro asteroid_field:
  thrustCost += 1
  se thrustUsedThisRound + thrustCost > thrustDisponibile:
    → la nave non può attraversare il campo in questo round
    → ThrustModal mostra avviso "Campo asteroidi: +1 thrust richiesto"
```

Il costo si applica solo se la posizione finale è nel campo. Transitare attraverso senza fermarsi
(vettore porta oltre) applica comunque il costo se almeno un hex del percorso è nel campo.

#### Copertura — attacchi

Una nave dentro un campo asteroidi riceve copertura parziale:

| Densità | DM attacco contro nave nel campo |
|---------|----------------------------------|
| light   | −1                               |
| dense   | −2                               |

Il DM si applica sia agli attacchi diretti sia alle risoluzioni Point Defence missile.
Non si applica agli attacchi effettuati *dalla* nave nel campo (gli asteroidi bloccano solo la
visuale verso l'interno).

Implementazione in `useAttackSetup.js`:

```javascript
const targetInField = getObstacleAt(obstacles, target.position)
const fieldCoverDM = targetInField?.type === 'asteroid_field'
  ? (targetInField.density === 'dense' ? -2 : -1)
  : 0
```

#### Collisione

Se una nave **termina il movimento** in un hex di campo asteroidi senza aver speso il +1 thrust
(es. vettore incontrollato che porta nel campo), subisce danno da collisione automatico.

```
danno collisione = 1D6
  → il danno ignora Armor (impatto diretto sullo scafo)
  → se density === 'dense': 2D6
```

Il sistema rileva la collisione in `resolveMovement`, dopo aver aggiornato le posizioni,
confrontando la nuova posizione di ogni nave con gli ostacoli. Se la nave non ha pagato
il costo extra di throughput (controllato da flag sul vettore), viene applicato il danno
tramite `applyDamage` con `_skipHistory: true` (come i critici threshold).

> **Nota GM:** il campo asteroidi non blocca il movimento in assoluto. Una nave con thrust
> sufficiente può sempre attraversarlo pagando il costo. Il rischio collisione scatta solo
> quando il vettore porta la nave nel campo senza thrust residuo disponibile.

---

### 3.2 Debris Field

Variante più densa di Asteroid Field. Stessi hex e stessa logica, parametri diversi:

| Parametro | Asteroid Field | Debris Field |
|-----------|---------------|--------------|
| density fissa | light o dense | sempre dense |
| DM copertura | −1 / −2 | −2 |
| danno collisione | 1D6 / 2D6 | 2D6 |
| costo movimento | +1 thrust | +1 thrust |
| origine tipica | naturale | nave distrutta |

Il Debris Field viene posizionato automaticamente quando una nave viene distrutta in battaglia
(hull → 0): un campo `debris_field` con `radius: 0` appare sull'hex della nave rimossa.
Il GM può eliminarlo manualmente.

---

### 3.3 Gravity Well

**Definizione:** corpo massiccio (pianeta, luna, gigante gassoso) che deforma i vettori delle
navi entro il suo raggio di influenza.

**Raggio tipico:** 3–6 hex. Il token visivo è più grande degli altri ostacoli.

#### Pull gravitazionale

Ogni round, **durante la fase Movement**, dopo che i vettori sono stati aggiornati da thrust
ma *prima* che le posizioni vengano aggiornate, il sistema applica il pull:

```javascript
function applyGravityPull(ship, gravityWell) {
  const dist = hexDistance(ship.position, gravityWell.position)
  if (dist > gravityWell.radius) return ship.vector   // fuori raggio

  // Direzione verso il centro del gravity well (hex più vicino al centro)
  const pullDir = hexDirectionToward(ship.position, gravityWell.position)

  // Forza pull in base alla massa e alla distanza
  const pullStrength = gravityWell.mass === 'large'
    ? (dist <= 1 ? 3 : dist <= 2 ? 2 : 1)
    : (dist <= 1 ? 2 : dist <= 2 ? 1 : 0)

  return hexAdd(ship.vector, hexScale(pullDir, pullStrength))
}
```

`hexDirectionToward(from, to)` restituisce il vettore unitario hex nella direzione di `to`
rispetto a `from`. Usare la direzione del vicino più vicino al centro del well.

Il pull modifica il **vettore** della nave, non la posizione direttamente. L'effetto si
accumula round dopo round se la nave non compensa con thrust sufficiente.

#### Zona di pericolo (impact zone)

L'hex centrale del gravity well è impraticabile. Se una nave termina il movimento nell'hex
del corpo celeste (radius 0), subisce danno grave:

| Massa | Danno impatto | Effetto |
|-------|--------------|---------|
| small | 6D6, ignora armor | nave probabilmente distrutta |
| large | distruzione immediata | hull → 0 |

La zona entro `radius: 1` dal centro è "bassa orbita" — nessun danno diretto, ma il pull è
al massimo e sfuggire richiede thrust elevato.

#### Avviso ThrustModal

Quando una nave è nel raggio di un gravity well, ThrustModal mostra:

```
⚠ GRAVITY WELL — pull [N] hex verso [direzione] al prossimo movimento
   Thrust richiesto per mantenere orbita: N
```

Il calcolo è basato sul pull che verrà applicato con il vettore corrente, permettendo al GM
di compensare prima di confermare il thrust.

---

### 3.4 Nebula

**Definizione:** zona di gas e polvere interstellare che oscura sensori e riduce la visibilità.

**Raggio tipico:** 3–8 hex (zone ampie).

#### Effetti

| Effetto | Regola |
|---------|--------|
| Sensor lock impossibile | Nessuna nave dentro la nebula può acquisire o mantenere sensor lock |
| DM sensori | −2 a tutti i tiri Electronics(sensors) per navi dentro la nebula |
| Copertura pesante | DM −2 agli attacchi *verso* navi nella nebula da navi *fuori* dalla nebula |
| Nessun effetto movimento | La nebula non modifica vettori né costa thrust aggiuntivo |

Il DM copertura nebula e il DM copertura asteroid field **si sommano** se una nave è in entrambi
(raro, ma possibile ai bordi).

Sensor lock esistente: se una nave con sensor lock attivo entra nella nebula, il lock viene
rimosso automaticamente (`sensorLockOn → null`, `sensorLockedBy → null` su entrambe le navi).

---

## 4. Store — Azioni

### 4.1 Azioni da aggiungere a battleStore

```javascript
// Aggiunge un ostacolo alla mappa
addObstacle(obstacle: Partial<ObstacleToken>): void
  // genera UUID, applica defaults, push to obstacles[]
  // incluso in pushHistory() via wh()

// Rimuove un ostacolo per ID
removeObstacle(id: string): void
  // incluso in pushHistory() via wh()

// Aggiorna proprietà di un ostacolo (densità, raggio, label)
updateObstacle(id: string, patch: Partial<ObstacleToken>): void
  // incluso in pushHistory() via wh()
```

### 4.2 Integrazione resolveMovement

`resolveMovement` viene esteso con tre passaggi aggiuntivi nell'ordine:

```
1. Applica gravity pull a tutti i vettori (prima del movimento)
2. Aggiorna posizioni (esistente)
3. Controlla collisioni asteroid/debris (dopo il movimento)
4. Rimuovi sensor lock per navi entrate in nebula (dopo il movimento)
5. [esistente] Passa passing encounters
6. [esistente] Passa dogfight detection
```

---

## 5. Rendering Canvas

### 5.1 Layer

Gli ostacoli vengono disegnati nel **layer 1** (dopo la griglia, prima degli highlight e dei token):

```
1. Griglia hex
2. [NUOVO] Ostacoli (zone colorate semitrasparenti + bordo tratteggiato)
3. Highlight celle
4. Ghost positions
5. Frecce vettore
6. Token missili
7. Token navi
8. Label navi
```

### 5.2 Visual per tipo

| Tipo | Fill | Bordo | Icona centro |
|------|------|-------|-------------|
| asteroid_field (light) | `rgba(161,138,104,0.18)` | `rgba(161,138,104,0.5)` dashed | `⬡` grigio chiaro |
| asteroid_field (dense) | `rgba(161,138,104,0.30)` | `rgba(161,138,104,0.7)` dashed | `⬡` più marcato |
| debris_field | `rgba(100,100,120,0.28)` | `rgba(150,150,180,0.6)` dashed | nessuna |
| gravity_well | `rgba(139,92,246,0.12)` | `rgba(139,92,246,0.5)` solid | corpo celeste (cerchio pieno) |
| nebula | `rgba(56,189,248,0.10)` | `rgba(56,189,248,0.3)` dashed | nessuna |

Tutti gli ostacoli multi-hex (radius > 0) vengono disegnati come un insieme di hex colorati,
non come un cerchio: per ogni hex nel raggio, si disegna il fill dell'esagono.

Il token centrale del gravity well mostra un cerchio pieno con colore viola, dimensione
proporzionale alla massa (`small` = r 12px, `large` = r 20px), con label del nome se
impostato.

### 5.3 Draw function

```javascript
// in tokenRenderers.js o nuovo obstacleRenderers.js
export function drawObstacle(ctx, obstacle, hexSize, offsetX, offsetY) {
  // genera lista hex nell'area
  const hexes = getHexesInRadius(obstacle.position, obstacle.radius)
  hexes.forEach(hex => {
    const { x, y } = hexToPixel(hex.q, hex.r, hexSize, offsetX, offsetY)
    traceHexPath(ctx, x, y, hexSize)
    ctx.fillStyle = OBSTACLE_FILL[obstacle.type]
    ctx.fill()
    ctx.setLineDash(OBSTACLE_DASH[obstacle.type])
    ctx.strokeStyle = OBSTACLE_STROKE[obstacle.type]
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.setLineDash([])
  })

  // Icona/label al centro
  if (obstacle.type === 'gravity_well') {
    drawGravityWellCore(ctx, obstacle, hexSize, offsetX, offsetY)
  }
  if (obstacle.label) {
    drawObstacleLabel(ctx, obstacle, hexSize, offsetX, offsetY)
  }
}
```

---

## 6. UI — Context Menu e Modal

### 6.1 Context Menu — hex vuoto

Aggiungere sotto "Add ship here":

```
─────────────────────────────
🪨 Place obstacle here →     (submenu o diretto a modal)
```

Visibile sempre (non phase-gated — il GM può piazzare ostacoli in qualsiasi momento).

### 6.2 Context Menu — token ostacolo

Right-click su un hex che contiene un ostacolo:

```
┌──────────────────────────────┐
│ [tipo] — [label opzionale]   │
│ Radius: N hex                │
│ ─────────────────────────── │
│ ✏️  Edit obstacle            │
│ 🗑️  Remove obstacle          │
└──────────────────────────────┘
```

### 6.3 PlaceObstacleModal

Modale semplice a step:

**Step 1 — Tipo:**
- Radio buttons: Asteroid Field / Debris Field / Gravity Well / Nebula
- Preview descrizione effetti per il tipo selezionato

**Step 2 — Configurazione:**

| Tipo | Campi |
|------|-------|
| Asteroid Field | Radius (1–4), Density (light / dense), Label (opzionale) |
| Debris Field | Radius (1–3), Label (opzionale) |
| Gravity Well | Radius (2–6), Mass (small / large), Label (opzionale) |
| Nebula | Radius (3–8), Label (opzionale) |

**Conferma:** aggiunge l'ostacolo sull'hex selezionato e chiude il modal.

---

## 7. Integrazione ThrustModal

ThrustModal legge `obstacles` dallo store e mostra avvisi contestuali nel pannello di anteprima:

```
se nextPosition in asteroid_field:
  → banner giallo: "⚠ Campo asteroidi — +1 thrust richiesto"
  → thrust disponibile mostrato come (thrust - thrustUsed - 1)

se ship.position in gravity_well.radius:
  → banner viola: "⚠ Gravity well — pull N hex → [direzione] al prossimo movimento"
  → mostra vettore risultante dopo il pull (con highlight della differenza)

se ghost token sarebbe in gravity_well.radius 0:
  → banner rosso: "⚠ IMPATTO — hull → 0"
```

---

## 8. Integrazione AttackModal / useAttackSetup

`useAttackSetup` calcola il DM di copertura dagli ostacoli:

```javascript
const targetObstacle = getObstacleAt(obstacles, target.position)
const obstacleCoverDM = computeObstacleCoverDM(targetObstacle)

// obstacleCoverDM viene incluso nel breakdown DM
// mostrato come riga "Field cover: −N" nella tabella DM
```

```javascript
function computeObstacleCoverDM(obstacle) {
  if (!obstacle) return 0
  switch (obstacle.type) {
    case 'asteroid_field': return obstacle.density === 'dense' ? -2 : -1
    case 'debris_field':   return -2
    case 'nebula':         return -2
    default:               return 0
  }
}
```

---

## 9. Integrazione ActionModal — Sensor Lock

In `ActionModal`, prima di confermare l'acquisizione sensor lock, controllare:

```javascript
const actorInNebula   = getObstacleAt(obstacles, actor.position)?.type === 'nebula'
const targetInNebula  = getObstacleAt(obstacles, target.position)?.type === 'nebula'

if (actorInNebula || targetInNebula) {
  // disabilita l'azione Sensor Lock
  // mostra messaggio: "Sensor lock impossibile in nebula"
}
```

---

## 10. Export / Import

`obstacles[]` viene incluso nel payload `BattleState`:

```json
{
  "version": "1.0",
  "type": "battle-state",
  "battle": {
    "obstacles": [
      {
        "id": "...",
        "type": "asteroid_field",
        "position": { "q": 2, "r": -1 },
        "radius": 2,
        "density": "light",
        "label": "Alpha Belt"
      }
    ]
  }
}
```

Backward compatibility: sessioni salvate senza `obstacles` leggono `battle.obstacles ?? []`.

---

## 11. Test Coverage

| File | Suite |
|------|-------|
| `utils/obstacles.test.js` | `getObstacleAt`, `getObstaclesInPath`, `computeObstacleCoverDM`, `applyGravityPull` (pull direzione, forza per distanza/massa, fuori raggio = no-op) |
| `store/battleStore.test.js` | `addObstacle`, `removeObstacle`, `updateObstacle` in undo/redo; `resolveMovement` + gravity pull; collisione asteroid/debris; nebula rimuove sensor lock |
| `components/modals/PlaceObstacleModal.test.jsx` | render per tipo, step 1→2, confirm chiama addObstacle |

---

## 12. Scope Escluso (v1 Obstacles)

- Ostacoli in movimento (asteroide con vettore proprio)
- Ostacoli distruttibili (sparare agli asteroidi)
- Stazione spaziale come ostacolo attivo con torrette proprie
- Asse Z per corpi celesti (orbite)
- Effetti radiazioni su equipaggio

Questi punti sono candidati per una versione futura.
