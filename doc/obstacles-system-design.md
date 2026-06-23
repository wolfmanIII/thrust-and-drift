# Obstacles System Design — Thrust & Drift

> Specifica implementativa per gli ostacoli ambientali sulla mappa di combattimento.
> Regole di riferimento: MgT2e CRB pp.160–168, Traveller Companion 2024 pp.169–186.
> Le meccaniche di collisione e danno da detriti non hanno regole RAW esplicite — vengono
> trattate come estensioni ragionevoli del sistema vettoriale.

---

## 1. Panoramica

Gli ostacoli ambientali sono oggetti fissi o zone sulla mappa hex che interagiscono con il
movimento e il combattimento. Non hanno iniziativa, non agiscono attivamente, ma modificano
il comportamento delle navi che li attraversano o si avvicinano.

**Quattro tipi implementati (in ordine di priorità):**

| Tipo | Impatto tattico | Complessità implementativa |
| ------ | ---------------- | --------------------------- |
| Asteroid Field | Cover DM, danno collisione, costo movimento | Media |
| Gravity Well | Zona proibita, fascia di esclusione visiva | Bassa |
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

Attraversare un hex di campo asteroidi costa **2 punti movimento** invece di 1.
Il budget di movimento per round è uguale alla magnitudine del vettore (`|v|`).

```text
budget = |v|  (magnitudine vettore)

per ogni hex nel percorso (in ordine):
  costo = (hex è in asteroid_field) ? 2 : 1
  se budget - costo >= 0:
    budget -= costo
    la nave avanza di un hex
  altrimenti:
    la nave si ferma sull'ultimo hex raggiungibile
    → applica danno collisione (vedi sotto)
```

Il campo rallenta la nave indipendentemente da quant'è il thrust: anche una nave con thrust 6
che ha esaurito il thrust del round si muove con il vettore accumulato e paga il costo in hex.
Una nave già dentro il campo che vuole uscire paga il costo sull'hex di uscita, non su quelli
interni già attraversati — la priorità è sempre raggiungere il bordo.

#### Copertura — attacchi

Una nave dentro un campo asteroidi riceve copertura parziale:

| Densità | DM attacco contro nave nel campo |
| ------- | -------------------------------- |
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

Se il budget di movimento si esaurisce mentre la nave è **dentro** il campo (non riesce a
raggiungere un hex libero), la nave si ferma nell'hex di campo e subisce danno da collisione:

```text
danno collisione = 1D6  (ridotto da Armor come danno normale)
se density === 'dense': 2D6
```

Il danno è cinetico — analogo a un impatto missile — quindi l'armatura si applica normalmente
(`max(0, danno - armor)`). A differenza del gravity well (impatto atmosferico a velocità
orbitale), la collisione con detriti è un urto fisicamente attenuabile dallo scafo.

Il sistema rileva la collisione in `resolveMovement` dopo aver calcolato la posizione finale:
se la posizione finale è in un field hex, viene applicato `applyDamage` con `_skipHistory: true`.
Non serve nessun flag `paidFieldCost` — la collisione si determina esclusivamente dalla
posizione di arrivo.

> **Nota GM:** una nave con vettore sufficiente attraversa il campo senza danni, perché
> riesce a raggiungere un hex libero dall'altra parte. Il danno scatta solo quando il vettore
> non è abbastanza per uscire dal campo in quel round.

---

### 3.2 Debris Field

Variante più densa di Asteroid Field. Stessi hex e stessa logica, parametri diversi:

| Parametro | Asteroid Field | Debris Field |
| ----------- | --------------- | -------------- |
| density fissa | light o dense | sempre dense |
| DM copertura | −1 / −2 | −2 |
| danno collisione | 1D6 / 2D6 (ridotto da Armor) | 2D6 (ridotto da Armor) |
| costo movimento | 2 punti movimento per hex | 2 punti movimento per hex |
| origine tipica | naturale | nave distrutta |

Il Debris Field viene posizionato automaticamente quando una nave viene distrutta in battaglia
(hull → 0): un campo `debris_field` con `radius: 0` appare sull'hex della nave rimossa.
Il GM può eliminarlo manualmente.

---

### 3.3 Gravity Well

**Definizione:** corpo celeste massiccio (pianeta, luna, gigante gassoso) rappresentato sulla
mappa come **zona di esclusione statica**. Non esercita pull meccanico sui vettori delle navi.

**Motivazione:** il combattimento vettoriale si svolge su scala di 6 minuti per round, con hex
da ~648 km ciascuno. A questa scala e distanza, l'accelerazione gravitazionale di un pianeta
è dell'ordine di mm/s² — trascurabile rispetto al thrust delle navi. Il pull gravitazionale
è rilevante per la navigazione interplanetaria (scala di ore/giorni), non per lo scontro tattico.

**Raggio tipico:** 2–5 hex (rappresenta il corpo fisico + atmosfera/anelli).

#### Zona proibita

Tutti gli hex entro il raggio del gravity well sono **non attraversabili**:

- ThrustModal non permette di impostare un vettore che porterebbe la nave dentro il raggio
- Se il vettore corrente porterebbe la nave dentro la zona (nessun thrust disponibile per correggere),
  `resolveMovement` blocca la nave sull'hex di bordo più vicino e applica danno da impatto atmosferico:

```text
danno impatto = 4D6  (ignora Armor)
log entry: "[nave] impatta [label] — atmospheric entry"
```

Se la nave colpisce la gravity well mentre è in dogfight attivo (`inDogfight !== null`),
il dogfight viene terminato automaticamente (`endDogfight`) prima di applicare il danno —
la nave è in emergenza atmosferica e non può più manovrare. Vedi §14.3.

#### Fascia di avviso

Gli hex al raggio + 1 (bordo esterno) vengono evidenziati con un colore distinto (arancione
semitrasparente) per segnalare la zona pericolosa. ThrustModal mostra un banner se il ghost
token si avvicina al bordo.

---

### 3.4 Nebula

**Definizione:** zona di gas e polvere interstellare che oscura sensori e riduce la visibilità.

**Raggio tipico:** 3–8 hex (zone ampie).

#### Effetti

| Effetto | Regola |
| --------- | -------- |
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

`resolveMovement` viene esteso con passaggi aggiuntivi nell'ordine:

```text
1. Per ogni nave: calcola posizione finale applicando il budget di movimento (|v|)
   con costo 2 per hex di campo asteroid/debris, 1 per hex normale (vedi §3.1)
2. Controlla collisioni asteroid/debris — applica danno se la posizione finale è in un field hex
3. Controlla impatto gravity well — blocca nave al bordo, applica danno atmosferico;
   se la nave è in dogfight, chiama endDogfight prima del danno (vedi §14.3)
4. Rimuovi sensor lock per navi entrate in nebula
5. [esistente] Passing encounters
6. [esistente] Dogfight detection
```

Il danno da ostacoli viene calcolato UNA SOLA VOLTA al termine del round macroscopico,
indipendentemente dal numero di micro-round completati nel dogfight. Vedi §14.

---

## 5. Rendering Canvas

### 5.1 Layer

Gli ostacoli vengono disegnati nel **layer 1** (dopo la griglia, prima degli highlight e dei token):

```text
1. Griglia hex
2. [NUOVO] Ostacoli (zone colorate semitrasparenti + bordo tratteggiato)
3. [NUOVO] Fascia di avviso gravity well (bordo esterno arancione)
4. Highlight celle
5. Ghost positions
6. Frecce vettore
7. Token missili
8. Token navi
9. Label navi
```

### 5.2 Visual per tipo

| Tipo | Fill | Bordo | Dettaglio centro |
| ------ | ------ | ------- | ---------------- |
| asteroid_field (light) | `rgba(161,138,104,0.18)` | `rgba(161,138,104,0.5)` dashed | nessuno |
| asteroid_field (dense) | `rgba(161,138,104,0.30)` | `rgba(161,138,104,0.7)` dashed | nessuno |
| debris_field | `rgba(100,100,120,0.28)` | `rgba(150,150,180,0.6)` dashed | nessuno |
| gravity_well | `rgba(139,92,246,0.20)` | `rgba(139,92,246,0.7)` solid | cerchio pieno viola + label |
| gravity_well (fascia avviso) | `rgba(251,146,60,0.10)` | `rgba(251,146,60,0.4)` dashed | nessuno |
| nebula | `rgba(56,189,248,0.10)` | `rgba(56,189,248,0.3)` dashed | nessuno |

Tutti gli ostacoli multi-hex (radius > 0) vengono disegnati come un insieme di hex colorati,
non come un cerchio: per ogni hex nel raggio, si disegna il fill dell'esagono.

Il token centrale del gravity well mostra un cerchio pieno viola (r = 14px) con label del nome
se impostato.

### 5.3 Draw function

```javascript
// in obstacleRenderers.js (nuovo file)
export function drawObstacle(ctx, obstacle, hexSize, offsetX, offsetY) {
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

  if (obstacle.type === 'gravity_well') {
    // Fascia di avviso: hex al raggio + 1
    getHexesInRadius(obstacle.position, obstacle.radius + 1)
      .filter(h => hexDistance(h, obstacle.position) === obstacle.radius + 1)
      .forEach(hex => {
        const { x, y } = hexToPixel(hex.q, hex.r, hexSize, offsetX, offsetY)
        traceHexPath(ctx, x, y, hexSize)
        ctx.fillStyle = 'rgba(251,146,60,0.10)'
        ctx.fill()
        ctx.setLineDash([3, 3])
        ctx.strokeStyle = 'rgba(251,146,60,0.4)'
        ctx.lineWidth = 1
        ctx.stroke()
        ctx.setLineDash([])
      })
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

```text
─────────────────────────────
🪨 Place obstacle here
```

Visibile sempre (non phase-gated — il GM può piazzare ostacoli in qualsiasi momento).

### 6.2 Context Menu — token ostacolo

Right-click su un hex che contiene un ostacolo:

```text
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
| ------ | ------- |
| Asteroid Field | Radius (1–4), Density (light / dense), Label (opzionale) |
| Debris Field | Radius (1–3), Label (opzionale) |
| Gravity Well | Radius (2–5), Label (opzionale) |
| Nebula | Radius (3–8), Label (opzionale) |

**Conferma:** aggiunge l'ostacolo sull'hex selezionato e chiude il modal.

---

## 7. Integrazione ThrustModal

ThrustModal legge `obstacles` dallo store e mostra avvisi contestuali nel pannello di anteprima:

```text
se il percorso del ghost token attraversa hex di asteroid_field o debris_field:
  → banner giallo: "⚠ Asteroid field — movement cost ×2 per field hex"
  → mostra stima "Estimated range: N hex" calcolata con il budget a 2 punti per field hex

se ghost token è nella fascia di avviso gravity well (raggio + 1):
  → banner arancione: "⚠ Approaching [label] — exclusion zone ahead"

se ghost token è dentro gravity well (raggio):
  → banner rosso: "⚠ COLLISION — trajectory enters exclusion zone"
  → il vettore non è applicabile; pulsante CONFIRM disabilitato
```

---

## 8. Integrazione AttackModal / useAttackSetup

`useAttackSetup` calcola il DM di copertura dagli ostacoli:

```javascript
const targetObstacle = getObstacleAt(obstacles, target.position)
const obstacleCoverDM = computeObstacleCoverDM(targetObstacle)

// obstacleCoverDM incluso nel breakdown DM
// riga "Field cover: −N" nella tabella DM
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
const actorInNebula  = getObstacleAt(obstacles, actor.position)?.type === 'nebula'
const targetInNebula = getObstacleAt(obstacles, target.position)?.type === 'nebula'

if (actorInNebula || targetInNebula) {
  // disabilita l'azione Sensor Lock
  // mostra messaggio: "Sensor lock impossible — nebula interference"
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
| ------ | ------- |
| `utils/obstacles.test.js` | `getObstacleAt` (hit, miss, raggio 0, raggio N), `getObstaclesInPath`, `computeObstacleCoverDM` per tutti i tipi |
| `store/battleStore.test.js` | `addObstacle` / `removeObstacle` / `updateObstacle` in undo/redo; `resolveMovement` + budget movimento con field hex (nave che attraversa, nave che si ferma dentro, danno collisione); impatto gravity well; nebula rimuove sensor lock |
| `components/modals/PlaceObstacleModal.test.jsx` | render step 1, selezione tipo aggiorna step 2, confirm chiama addObstacle, gravity well non mostra campo mass |

---

## 12. Documenti Correlati

- [thrust-and-drift-space-combat-simulator-spec.md](thrust-and-drift-space-combat-simulator-spec.md) — architettura generale, modelli dati, roadmap (§13.9)
- [dogfight-system-design.md](dogfight-system-design.md) — sistema dogfight
- [boarding-system-design.md](boarding-system-design.md) — sistema di abbordaggio

---

## 13. Scope Escluso (v1 Obstacles)

- **Pull gravitazionale attivo** — fisicamente non rilevante alla scala temporale del combattimento
  tattico (round = 6 minuti, distanze nell'ordine di migliaia di km); l'accelerazione gravitazionale
  a queste distanze è dell'ordine di mm/s², trascurabile rispetto al thrust delle navi. Eventuale
  implementazione come house rule opzionale rimandato a versione futura. (→ §14 per interazione dogfight)
- Ostacoli in movimento (asteroide con vettore proprio)
- Ostacoli distruttibili (sparare agli asteroidi)
- Stazione spaziale come ostacolo attivo con torrette proprie
- Asse Z per corpi celesti (orbite)
- Effetti radiazioni su equipaggio

---

## 14. Interazione con il Dogfight

### 14.1 Danno da ostacoli durante il dogfight

Il danno da collisione asteroid/debris e il danno da impatto gravity well vengono
calcolati **UNA SOLA VOLTA** al termine del round macroscopico (6 minuti),
indipendentemente dal numero di micro-round completati in quel round.

**Motivazione:** i micro-round del dogfight sono un'astrazione per la risoluzione dei
check Pilot contrapposti. Il vettore effettivo della nave cambia alla fine del round
standard, non ogni 6 secondi. Applicare il danno per ogni micro-round moltiplicherebbe
l'effetto ×6 rispetto all'intenzione regolistica.

**Implementazione:** in `resolveMovement`, il controllo collisioni ostacoli viene eseguito
sulle posizioni post-movimento **finali**. Navi con `inDogfight !== null` vengono incluse
nel controllo (la posizione finale è reale) ma non ricevono danno moltiplicato.

### 14.2 Piazzamento ostacoli durante un dogfight attivo

Il GM può piazzare ostacoli in qualsiasi momento tramite il context menu. Se un ostacolo
viene piazzato su una casella già occupata da una nave in dogfight, l'effetto si applica
al prossimo `resolveMovement`, non retroattivamente.

### 14.3 Gravity well — navi in dogfight

Una nave in dogfight non può "scegliere" di entrare nel raggio di un gravity well tramite
manovra volontaria (`ThrustModal` è disabilitato durante un dogfight). L'unico modo in
cui ci entra è per vettore ereditato che la trascinasse dentro durante il `resolveMovement`.

In questo caso:

- `resolveMovement` termina il dogfight automaticamente (`endDogfight(sh.inDogfight)`)
  **prima** di applicare il danno da impatto — la nave è in emergenza atmosferica e non
  può più manovrare
- Il danno da impatto atmosferico (4D6, ignora Armor) viene applicato una sola volta
  per round macroscopico come da §3.3
- Log entry: `"[nave] trascina fuori dal dogfight per impatto con [label]"`

### 14.4 Ordine di esecuzione in resolveMovement (con ostacoli)

```text
1. Aggiorna posizioni e vettori (ship + missiles)
2. [OSTACOLI] Collisioni asteroid/debris → danno se paidFieldCost = false
3. [OSTACOLI] Impatto gravity well → endDogfight se attivo → danno atmosferico
4. [OSTACOLI] Nebula → rimuovi sensor lock
5. Passing encounters (esclusi inDogfight, inBoarding)
6. Dogfight detection (movement→attack transition, vectorial only)
```
