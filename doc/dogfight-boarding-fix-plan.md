# Dogfight & Boarding — Piano di Implementazione Fix

**Versione target:** 1.23.0
**Sistemi coinvolti:** Dogfight, Boarding
**Baseline:** v1.22.1 — 907 test, 0 errori ESLint

---

## Ordine di implementazione

L'ordine è stato deciso con i seguenti criteri:

1. **Rischio produzione immediato** prima di tutto (CR-2 Boarding: classi Tailwind dinamiche non presenti nel bundle)
2. **Integrità dati / corruzione stato** (doppio abbordaggio, `isDestroyed` mancante)
3. **Flusso di gioco rotto** (phase gate dogfight, `advanceActor` skip, undo stack bypassed)
4. **Conformità RAW** (tumbling check, basic mode dogfight, DEX DM)
5. **Integrazione AttackModal** (DM auto-fill, fixed weapon block)
6. **Qualità codice** (deduplicazione utility, refactor SRP) — ultimo perché non cambia comportamento

---

## FASE 1 — Produzione + Integrità dati (commit separati)

### FIX-01 · CR-2 Boarding — Classi Tailwind dinamiche in `BoardingOutcomeModal`

**Problema:** `bg-${o.color}-900/30`, `border-${o.color}-500`, `text-${o.color}-400` costruite con template literals. Tailwind v4 non scannerizza stringhe interpolate → queste classi non entrano nel bundle CSS.

**File:** `src/components/modals/BoardingOutcomeModal.jsx:107–118`

**Fix:** Sostituire le classi interpolate con una lookup map statica keyed su `o.color` (`emerald`, `red`, `amber`). Le classi statiche vengono scansionate correttamente.

```js
const OUTCOME_STYLES = {
  emerald: {
    selected:   'bg-emerald-900/30 border-emerald-500',
    icon:       'text-emerald-400',
    label:      'text-emerald-400',
  },
  red: {
    selected:   'bg-red-900/30 border-red-500',
    icon:       'text-red-400',
    label:      'text-red-400',
  },
  amber: {
    selected:   'bg-amber-900/30 border-amber-500',
    icon:       'text-amber-400',
    label:      'text-amber-400',
  },
}
```

Usare `OUTCOME_STYLES[o.color].selected`, `.icon`, `.label` al posto delle interpolazioni.

**Commit:** `fix(boarding): replace dynamic Tailwind classes with static lookup map`

---

### FIX-02 · BUG-1 Boarding — Guard mancante su `inBoarding` in 3 punti

**Problema:** Un attaccante già `inBoarding` può avviare un secondo abbordaggio. Sovrascrive `inBoarding` con il nuovo id, lasciando il primo boarding orfano.

**File 1:** `src/components/ui/ContextMenu.jsx:101`

```js
// PRIMA
const boardingTargets = combatMode === 'vectorial' ? ships.filter((t) => {
  if (t.faction === ship.faction) return false
  if (hexDistance(ship.position, t.position) > 1) return false
  const mDriveDisabled = t.criticalHits?.some((c) => c.system === 'm-drive' && c.disabled)
  return mDriveDisabled || ship.profile.thrust >= t.profile.thrust
}) : []

// DOPO: aggiungere guard su inBoarding per entrambe le navi
const boardingTargets = combatMode === 'vectorial' ? ships.filter((t) => {
  if (t.faction === ship.faction) return false
  if (ship.inBoarding || t.inBoarding) return false          // ← aggiunto
  if (hexDistance(ship.position, t.position) > 1) return false
  const mDriveDisabled = t.criticalHits?.some((c) => c.system === 'm-drive' && c.disabled)
  return mDriveDisabled || ship.profile.thrust >= t.profile.thrust
}) : []
```

**File 2:** `src/components/modals/BoardingSetupModal.jsx:21` — `canBoard()` già controlla `defender.inDogfight` ma non `attacker.inBoarding` né `defender.inBoarding`:

```js
function canBoard(attacker, defender) {
  if (attacker.faction === defender.faction) return false
  if (attacker.inBoarding || defender.inBoarding) return false  // ← aggiunto
  if (defender.inDogfight) return false
  if (hexDistance(attacker.position, defender.position) > 1) return false
  const mDriveDisabled = defender.criticalHits?.some((c) => c.system === 'm-drive' && c.disabled)
  if (!mDriveDisabled && attacker.profile.thrust < defender.profile.thrust) return false
  return true
}
```

**File 3:** `src/store/battleStore.js:1603` — guard di `startBoarding` (primo argomento di `wh`):

```js
// PRIMA
return !!(attacker && defender && attacker.faction !== defender.faction)

// DOPO
return !!(
  attacker && defender &&
  attacker.faction !== defender.faction &&
  !attacker.inBoarding && !defender.inBoarding   // ← aggiunto
)
```

**Commit:** `fix(boarding): guard against double-boarding — check inBoarding in ContextMenu, canBoard, startBoarding`

---

### FIX-03 · D4 Boarding — `ship_destroyed` non imposta `isDestroyed`

**Problema:** `resolveBoarding` con `outcome === 'ship_destroyed'` rimuove `inBoarding` dalla nave difensore ma non la marca come distrutta. Il token rimane sul campo funzionante.

**File:** `src/store/battleStore.js:1740`

```js
// Nel set() di resolveBoarding, nel map delle ships:
ships: s.ships.map((sh) => {
  if (sh.inBoarding !== boardingId) return sh
  const isDefender = sh.id === boarding?.defenderId
  const destroyed  = outcome === 'ship_destroyed' && isDefender
  return {
    ...sh,
    inBoarding: null,
    ...(destroyed ? { isDestroyed: true, hullCurrent: 0 } : {}),
  }
}),
```

**Commit:** `fix(boarding): ship_destroyed outcome marks defender isDestroyed and zeroes hull`

---

## FASE 2 — Flusso di gioco (commit separati)

### FIX-04 · BUG-2 Dogfight — `canAdvancePhase` non blocca con dogfight attivi

**Problema:** Il GM può premere NEXT PHASE con dogfight in corso, rompendo il flusso. `canAdvancePhase` in `HUD.jsx:55` non controlla `activeDogfights`.

**File:** `src/components/ui/HUD.jsx`

```js
// Aggiungere il selector
const dogfights = useBattleStore((s) => s.dogfights)

// Nel useMemo canAdvancePhase, prima degli altri check:
const canAdvancePhase = useMemo(() => {
  if (pendingMissileImpacts.length > 0) return false
  if (dogfights.some((g) => g.active)) return false           // ← aggiunto
  if (phase === 'setup')      return ships.length > 0
  if (phase === 'initiative') return initiativeOrder.length > 0
  if (ACTOR_TURN_PHASES.has(phase)) return currentActorIndex >= initiativeOrder.length
  return true
}, [phase, ships, currentActorIndex, initiativeOrder, pendingMissileImpacts, dogfights])
```

Nel `handleAdvancePhase`, aggiungere il messaggio di blocco:

```js
} else if (dogfights.some((g) => g.active)) {
  const count = dogfights.filter((g) => g.active).length
  setPhaseBlockMsg(`Resolve ${count} active dogfight${count !== 1 ? 's' : ''} first.`)
}
```

Aggiungere `dogfights` alle deps del `useCallback handleAdvancePhase`.

**Commit:** `fix(dogfight): block phase advance while dogfights are active`

---

### FIX-05 · BUG-1 Dogfight — `advanceActor` non salta navi `inDogfight`

**Problema:** Navi `inDogfight !== null` vengono surfaced nel tracker actor e marcate `hasActedThisPhase: true` senza aver agito. Il flusso corretto è saltarle come si fa con le navi distrutte.

**File:** `src/store/battleStore.js:1162`

```js
// Nel loop skip, aggiungere la condizione inDogfight:
while (next < order.length) {
  const nextShip = ships.find((s) => s.id === order[next])
  if (!nextShip?.isDestroyed && !nextShip?.inDogfight) break   // ← aggiunto inDogfight
  next++
}
```

Anche la nave corrente (`shipId = order[currentActorIndex]`) non dovrebbe ricevere `hasActedThisPhase: true` se è `inDogfight`. Aggiungere guard prima di `updateShip`:

```js
const shipId = order[currentActorIndex]
const currentShip = ships.find((s) => s.id === shipId)
if (shipId && !currentShip?.inDogfight) {
  get().updateShip(shipId, { hasActedThisPhase: true })
}
```

**Commit:** `fix(dogfight): advanceActor skips ships in dogfight`

---

### FIX-06 · BUG-5 Boarding — `handleApplyCutDamage` bypassa undo stack

**Problema:** `BoardingContactModal.jsx:160` chiama `useBattleStore.setState` direttamente, bypassando `wh`. I danni di taglio hull non sono undoable.

**Fix:** Aggiungere una store action dedicata in `battleStore.js`:

```js
applyBoardingCutDamage: wh(
  (boardingId) => !!get().boardings.find((b) => b.id === boardingId && b.outcome === null),
  (boardingId, dmg) => {
    set((s) => ({
      boardings: s.boardings.map((b) =>
        b.id !== boardingId ? b : { ...b, hullDamageSoFar: (b.hullDamageSoFar ?? 0) + dmg }
      ),
    }))
  },
),
```

In `BoardingContactModal.jsx`, importare e usare `applyBoardingCutDamage` al posto di `useBattleStore.setState`:

```js
const applyBoardingCutDamage = useBattleStore((s) => s.applyBoardingCutDamage)

function handleApplyCutDamage(dmg) {
  applyBoardingCutDamage(boarding.id, dmg)
}
```

**Commit:** `fix(boarding): route cut damage through store action for undo support`

---

## FASE 3 — Conformità RAW (commit separati)

### FIX-07 · D1 Boarding — Tumbling senza check Routine (6+)

**Problema:** `toggleDefenderRotation` è un toggle booleano istantaneo. RAW (HG p.127): attivare la rotazione richiede un check Pilot (DEX) Routine (6+); se passa, dura D3 round.

**File:** `src/store/battleStore.js` — nuova action; `src/components/modals/BoardingContactModal.jsx` — UI roll.

**Fix — store:**

```js
// Rimuovere toggleDefenderRotation
// Aggiungere:
applyDefenderRotation: wh(
  (boardingId) => !!get().boardings.find((b) => b.id === boardingId && !b.defenderRotating),
  (boardingId, rollResult) => {
    // rollResult: { total, passed, durationRolled }
    // durationRolled: D3 (1-3) fornito dal GM
    set((s) => ({
      boardings: s.boardings.map((b) =>
        b.id !== boardingId ? b : {
          ...b,
          defenderRotating: rollResult.passed,
          rotatingRoundsLeft: rollResult.passed ? rollResult.durationRolled : 0,
        }
      ),
    }))
  },
),
clearDefenderRotation: wh(null, (boardingId) => {
  set((s) => ({
    boardings: s.boardings.map((b) =>
      b.id !== boardingId ? b : { ...b, defenderRotating: false, rotatingRoundsLeft: 0 }
    ),
  }))
}),
```

**Fix — `buildNextRoundState`:** decrementare `rotatingRoundsLeft` per ogni boarding attivo; se scende a 0, `defenderRotating: false`.

**Fix — UI `BoardingContactModal`:** sostituire il toggle "TUMBLING" con un roll inline `2D6 + Pilot ≥ 6`. Se passato, mostrare input D3 per la durata. Pulsante "CLEAR ROTATION" se già attiva.

**Commit:** `fix(boarding): tumbling requires Routine(6+) Pilot check and D3-round duration`

---

### FIX-08 · BUG-7 Dogfight — Nessuna detection in basic mode

**Problema:** `useDogfightDetection.js:53` ha `if (combatMode !== 'vectorial') return` — dogfight non viene mai triggerato in basic mode anche se due navi si trovano a Close range.

**Analisi:** In basic mode le navi non hanno posizioni hex, ma il range band tra due navi è rappresentato in `rangeBands`. Il trigger dovrebbe scattare quando `rangeBands[pairKey] === 'Close'` o `rangeBands[pairKey] === 'Adjacent'`.

**File:** `src/hooks/useDogfightDetection.js`

**Fix:**

```js
// Rimuovere il return precoce su combatMode !== 'vectorial'
// Separare la logica per modalità:

if (combatMode === 'vectorial') {
  // logica esistente su hexDistance
} else {
  // basic mode: controlla rangeBands
  for (const [pairKey, band] of Object.entries(rangeBands)) {
    if (band !== 'Close' && band !== 'Adjacent') continue
    const [idA, idB] = pairKey.split('_')
    const shipA = ships.find((s) => s.id === idA)
    const shipB = ships.find((s) => s.id === idB)
    if (!shipA || !shipB) continue
    if (shipA.faction === shipB.faction) continue
    if (shipA.inDogfight || shipB.inDogfight) continue
    if (shipA.isDestroyed || shipB.isDestroyed) continue
    triggerDogfight(shipA, shipB)
  }
}
```

**Nota:** `triggerDogfight` (apertura `DogfightNotificationModal`) deve funzionare senza `position` — verificare che `DogfightNotificationModal` non dipenda da `ship.position`.

**Commit:** `fix(dogfight): trigger dogfight detection in basic mode via rangeBands`

---

### FIX-09 · RAW Dogfight — DEX DM mancante nel Pilot check

**Problema:** Il check dogfight (RAW p.174, CRB p.72) usa `2D6 + Pilot + DM`. Il DM include la caratteristica DEX del pilota. Attualmente il campo non esiste nel profilo nave.

**Analisi:** Per navi spaziali senza equipaggio nominato, DEX DM = 0 è l'assunzione standard. Per navi con crew nominato, il pilota ha un DEX implicito. Questo fix richiede di aggiungere DEX al pilota o di usare 0 come default documentato.

**Scelta progettuale:** Aggiungere un campo opzionale `dexDM: 0` al profilo nave (non al singolo membro crew, per semplicità). Il GM può modificarlo in ShipProfileForm. Default 0, range -3..+3.

**File:** `src/utils/dogfight.js:30` — `computeShipDMs` (già in `DogfightRoundModal`):

```js
// Nel calcolo del total, aggiungere:
const dexDM = ship.profile.dexDM ?? 0
// total = rollValue + pilotSkill + tonnageDM + thrustDM + extraEnemyDM + dexDM
```

**File:** `src/components/forms/ShipProfileForm.jsx` — aggiungere campo `DEX DM` (select -3..+3) nella sezione Pilot/Crew, con tooltip "Pilot's DEX characteristic DM (CRB p.72)".

**File:** `src/data/defaultProfiles.js` — aggiungere `dexDM: 0` ai default.

**Commit:** `feat(dogfight): add pilot DEX DM field to profile and apply to dogfight check`

---

## FASE 4 — Integrazione AttackModal (commit unico)

### FIX-10 · RAW Dogfight — DM dogfight non pre-fillato in AttackModal

**Problema:** Quando una nave in dogfight apre AttackModal, il DM dogfight (+2 vincitore, -2 perdente) non viene applicato automaticamente. Il GM deve ricordarselo.

**File:** `src/store/uiStore.js` — il payload di `openModal('attack', payload)` deve includere il DM dogfight.

**Fix — `ContextMenu.jsx`:** quando si apre l'AttackModal per una nave `inDogfight`, calcolare il DM (`dogfightAttackDM`) e passarlo nel payload:

```js
// In ContextMenu, alla voce "FIRE WEAPONS":
const dogfightGroup = dogfights.find((g) => g.active && g.shipIds.includes(ship.id))
const dogfightDM    = dogfightGroup ? dogfightAttackDM(ship.id, dogfightGroup) : 0

open('attack', { shipId: ship.id, dogfightDM })
```

**File:** `src/components/modals/AttackModal.jsx` — leggere `payload.dogfightDM` e pre-sommare nelle sezioni DM dell'AttackModal. Mostrare una badge "DOGFIGHT ±N" visibile nel DM breakdown.

**Commit:** `feat(dogfight): pre-fill dogfight attack DM in AttackModal`

---

### FIX-11 · RAW Dogfight — Fixed weapon block su tie non enforced

**Problema:** RAW p.174: su pareggio nel check dogfight, nessun lato può usare fixed weapons. L'app mostra solo il testo informativo ma non blocca in AttackModal.

**Fix:** Nel payload dell'AttackModal (vedi FIX-10), aggiungere `dogfightTie: boolean`. In AttackModal, se `dogfightTie === true`, filtrare le weapons con `mount === 'fixed'` dalla lista selezionabile e mostrare un banner `⚠ Dogfight tie — fixed weapons unavailable`.

**Commit:** parte del commit FIX-10 o commit separato `fix(dogfight): block fixed weapons on dogfight tie in AttackModal`

---

## FASE 5 — Qualità codice (commit unico o due)

### REF-01 · Deduplicazione utility dogfight

**Problema:** Funzioni identiche definite più volte in file diversi.

| Funzione | Dove duplicata |
|---|---|
| `bestPilot(ship)` | `DogfightRoundModal.jsx:39`, `DogfightNotificationModal.jsx:106` |
| `freeThrust(ship)` | `DogfightRoundModal.jsx:90`, `DogfightRoundModal.jsx:123`, `DogfightNotificationModal.jsx:118` |
| `computeShipDMs(ship, group)` | `DogfightRoundModal.jsx:28` — solo qui, ma appartiene a `utils/dogfight.js` |
| `escapeCheckTotals(ships, group)` | `DogfightRoundModal.jsx:93` — idem |

**Fix:** Spostare tutte e 4 in `src/utils/dogfight.js` come named export. Aggiornare gli import in `DogfightRoundModal.jsx` e `DogfightNotificationModal.jsx`.

**Commit:** `refactor(dogfight): extract bestPilot, freeThrust, computeShipDMs, escapeCheckTotals to utils/dogfight.js`

---

### REF-02 · `endDogfight` con `wh` per consistenza

**Problema:** Tutte le altre dogfight action usano `wh`, ma `endDogfight` no — la fine del dogfight non è undoable.

**Valutazione:** La fine del dogfight è un'azione terminale che svuota i gruppi, ma è coerente che sia undoable (il GM potrebbe sbagliare). Avvolgerla in `wh` non causa problemi.

**File:** `src/store/battleStore.js:1572`

```js
endDogfight: wh(
  (groupId) => !!get().dogfights.find((g) => g.id === groupId && g.active),
  (groupId) => { /* logica esistente */ },
),
```

**Commit:** parte di REF-01 o separato `fix(dogfight): wrap endDogfight in wh for undo consistency`

---

### REF-03 · `boardingId` nel payload delle modali boarding

**Problema:** Le modali boarding (`BoardingContactModal`, `BoardingConflictModal`, `BoardingOutcomeModal`) trovano il boarding cercando per `attackerId + phase`. Con due boarding simultanei dello stesso attaccante (ora impossibile grazie a FIX-02, ma difensivamente corretto), il lookup fallirebbe.

**Fix:** Passare `boardingId` nel `modalPayload` quando si apre ogni boarding modal. Il lookup diventa `boardings.find((b) => b.id === payload.boardingId)`.

**File:** ogni punto di `openModal('boarding-*', { ... })` nello store/ContextMenu.

**Commit:** `refactor(boarding): use boardingId in modal payload instead of attackerId+phase lookup`

---

## Riepilogo commit order

```
fix(boarding): replace dynamic Tailwind classes with static lookup map         [FIX-01]
fix(boarding): guard against double-boarding                                    [FIX-02]
fix(boarding): ship_destroyed outcome marks defender isDestroyed                [FIX-03]
fix(dogfight): block phase advance while dogfights are active                   [FIX-04]
fix(dogfight): advanceActor skips ships in dogfight                             [FIX-05]
fix(boarding): route cut damage through store action for undo support           [FIX-06]
fix(boarding): tumbling requires Routine(6+) Pilot check and D3-round duration  [FIX-07]
fix(dogfight): trigger dogfight detection in basic mode via rangeBands          [FIX-08]
feat(dogfight): add pilot DEX DM field and apply to dogfight check              [FIX-09]
feat(dogfight): pre-fill dogfight attack DM in AttackModal + block fixed on tie [FIX-10/11]
refactor(dogfight): extract utility functions to utils/dogfight.js              [REF-01]
fix(dogfight): wrap endDogfight in wh for undo consistency                      [REF-02]
refactor(boarding): use boardingId in modal payload                             [REF-03]
```

---

## Note versioning

- FIX-01…FIX-06: bugfix → patch
- FIX-07…FIX-09: RAW compliance + nuovo campo profilo → minor
- FIX-10…FIX-11: nuova integrazione AttackModal → minor
- REF-01…REF-03: refactor puro, zero cambiamento comportamento → patch

**Versione consigliata:** v1.23.0 (minor per FIX-07 + FIX-09 + FIX-10/11 che aggiungono comportamento visibile all'utente).

---

## Test da scrivere post-implementazione

- `startBoarding` con attaccante già `inBoarding` → rifiutato
- `resolveBoarding('ship_destroyed')` → `isDestroyed: true` sul difensore
- `advanceActor` con nave `inDogfight` → viene skippata
- `applyBoardingCutDamage` → entra nello undo stack
- Dogfight detection in basic mode su `rangeBands[key] === 'Close'`
- `computeShipDMs` con `dexDM` nel profilo → incluso nel totale
