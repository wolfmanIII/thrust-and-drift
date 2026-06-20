# Reddit Bug Report — Implementation Plan (v1.23.0)

Segnalazioni ricevute da Reddit, giugno 2026.  
Ordine di implementazione: dal più semplice/impattante al più complesso.

---

## FIX-01 — Critical hits: chiarire effetti manuali nell'UI

**Priorità:** Alta  
**Complessità:** Bassa  
**File:** `src/components/modals/AttackModal.jsx`, `src/data/criticalHits.js`

### Problema

I critici con `mechanic: 'descriptive'` mostrano solo il testo dell'effetto senza indicare che il GM deve applicarlo manualmente. L'utente si aspetta che il software lo applichi (es. "A random weapon is disabled" → nessun weapon disabilitato in store; "Fuel tank destroyed. Hull +1D Severity" → nessun danno applicato).

### Cosa fa il codice attualmente

`criticalHits.js` ha due classi di meccaniche:
- **Automatiche:** `armour_reduce_fixed`, `armour_reduce_d3`, `armour_reduce_xd`, `hull_extra_damage`, `thrust_reduce` — applicate dallo store.
- **Descrittive:** `descriptive` — mostrate come testo, nessuna azione automatica.

Sistemi completamente descrittivi: Sensors, Fuel Tank, Weapon, Bridge, Power Plant (parzialmente), Hull (parzialmente).

### Fix

In `AttackCriticalStep`, quando `effect.mechanic === 'descriptive'`, aggiungere un banner visibile:

```jsx
{effect.mechanic === 'descriptive' && (
  <div className="bg-amber-950/40 border border-amber-500/40 rounded px-3 py-2 font-mono text-xs text-amber-400">
    ⚠ MANUAL — Apply this effect to the ship before closing.
  </div>
)}
```

Nessuna modifica a criticalHits.js o battleStore.

---

## FIX-02 — Repair check: difficoltà scala con la severity

**Priorità:** Alta  
**Complessità:** Bassa  
**File:** `src/components/modals/ActionModal.jsx`, `src/data/crewActions.js`

### Problema

`repair_system` ha `difficulty: 8` fisso. Per RAW (CRB p.167):

| Severity | Difficoltà |
| -------- | ---------- |
| 1–2      | Average (8+) |
| 3–4      | Difficult (10+) |
| 5–6      | Very Difficult (12+) |

### Cosa fa il codice attualmente

`ActionModal` legge `selectedAction.difficulty` direttamente da `CREW_ACTIONS`. È un valore statico.

### Fix

In `ActionModal`, prima di mostrare la difficulty, intercettare `repair_system` e calcolare la difficoltà dinamica dal primo critico del target (o dal critico selezionato, vedi FIX-03):

```js
function repairDifficulty(critSeverity) {
  if (critSeverity <= 2) return 8
  if (critSeverity <= 4) return 10
  return 12
}
```

Quando `selectedAction.id === 'repair_system'` e la nave ha critici, sovrascrivere `difficulty` con `repairDifficulty(ship.criticalHits[selectedCritIndex ?? 0]?.severity ?? 1)`.

Aggiornare anche il label mostrato ("Average 8+" / "Difficult 10+" / "Very Difficult 12+").

---

## FIX-03 — Scegliere quale critico riparare

**Priorità:** Media  
**Complessità:** Bassa-Media  
**File:** `src/components/modals/ActionModal.jsx`, `src/store/battleStore.js`

### Problema

`repairCritical(shipId)` rimuove sempre `criticalHits[0]` (il più vecchio). Il GM non può prioritizzare (es. riparare un M-Drive critico prima di un sensore).

### Fix

**Store:** aggiungere parametro `critIndex` a `repairCritical`:

```js
repairCritical: wh(
  (shipId) => ...,
  (shipId, critIndex = 0) => {
    const removed = ship.criticalHits[critIndex]
    const remainingCrits = ship.criticalHits.filter((_, i) => i !== critIndex)
    // ... resto invariato
  }
)
```

**ActionModal:** quando `selectedAction.id === 'repair_system'` e `ship.criticalHits.length > 1`, mostrare un selector prima del roll:

```jsx
<select value={selectedCritIndex} onChange={(e) => setSelectedCritIndex(Number(e.target.value))}>
  {ship.criticalHits.map((c, i) => (
    <option key={i} value={i}>{c.system} Sev.{c.severity}</option>
  ))}
</select>
```

Passare `selectedCritIndex` a `repairCritical`. Difficoltà dinamica (FIX-02) calcolata sul critico selezionato.

---

## FIX-04 — Missile PD: aggiornare il conteggio del salvo

**Priorità:** Alta  
**Complessità:** Media  
**File:** `src/components/modals/AttackModal.jsx`, `src/store/battleStore.js`

### Problema

Quando la PD abbatte N missili in `handlePdRoll`, la logica calcola `missilesRemoved` e lo mostra in UI, ma non aggiorna l'oggetto missile nell'array `missiles` dello store. Il salvo continua a volare con il count originale.

Il caso "tutti abbattuti" (missilesRemoved >= missileCount) non rimuove il missile dallo store né impedisce l'impatto.

Nota: l'ammo del lanciatore è già scalato al lancio (`launchMissile` decrementa `missileAmmoTotal`). Non va toccato.

### Fix

**Store:** aggiungere `updateMissileCount(missileId, newCount)` e usare `removeMissile` esistente per count = 0:

```js
updateMissileCount: (missileId, newCount) => {
  if (newCount <= 0) {
    get().removeMissile(missileId)
    return
  }
  set((s) => ({
    missiles: s.missiles.map((m) =>
      m.id === missileId ? { ...m, count: newCount } : m
    )
  }))
}
```

**AttackModal:** in `handlePdRoll`, dopo aver calcolato `removed`, chiamare lo store:

```js
const remaining = (missileCount ?? 1) - removed
if (missileId) updateMissileCount(missileId, remaining)
```

`missileId` deve essere disponibile nel payload del modal (da verificare/aggiungere se mancante).

**Sandcaster:** verificare che `spendSandAmmo` venga chiamato correttamente nel flusso PD. Se il sandcaster viene usato come reazione ma `spendSandAmmo` non è invocato → aggiungere la chiamata.

---

## FIX-05 — Ion power: blocco armi e sensori a Power = 0

**Priorità:** Alta  
**Complessità:** Media  
**File:** `src/components/modals/useAttackSetup.js`, `src/components/modals/ActionModal.jsx`, `src/components/ui/ContextMenu.jsx`

### Problema

`currentPower` viene usato solo da `computeIonThrustEffect` per il thrust. Quando Power = 0, armi e sensori continuano a funzionare. Per RAW (HG p.30), Power = 0 significa tutti i sistemi powered offline.

### Implementazione semplificata (scope v1.23.0)

Non implementiamo il Power budget completo (richiederebbe `powerCost` per ogni arma/sistema — scope v1.24+). Implementiamo la regola del caso estremo: **Power ≤ 0 blocca tutto**.

**`useAttackSetup.js`:** aggiungere guard:

```js
const noPower = (attacker?.currentPower ?? attacker?.profile?.maxPower ?? 100) <= 0
// se noPower → availableWeapons = [] + avviso
```

**`ActionModal.jsx`:** quando `ship.currentPower <= 0`, disabilitare le azioni Sensors (sensor_lock, electronic_warfare, missile_ew) con label "⚡ No power":

```js
const noPower = ship.currentPower <= 0
// mostrare azioni sensori come disabled con tooltip "Power offline"
```

**`ContextMenu.jsx`:** disabilitare "Attack" se `currentPower <= 0`.

**UI feedback:** in `ShipDetailModal` e `ShipTooltip`, evidenziare in rosso quando `currentPower <= 0` con label "⚡ POWER OFFLINE".

### Nota per v1.24+

Implementazione completa Power budget: aggiungere `powerCost` a ogni arma in `weapons.js`, calcolare `powerUsed = sum(weaponPowerCost)` e confrontare con `currentPower`. Sensori: HG p.28 specifica il costo. Computer: scala con bandwidth.

---

## FIX-06 — Leadership: durata 1 round

**Priorità:** Media  
**Complessità:** Media  
**File:** `src/store/battleStore.js`, `src/components/modals/ActionModal.jsx`

### Problema

`initiativeBonusNextRound` è consumato solo in `rollAllInitiative`. Se l'iniziativa non viene ri-rollata (caso normale — è fissa per l'intero combattimento), il bonus non viene mai applicato né rimosso. Visivamente, non cambia nulla.

Per RAW (CRB p.166): Improve Initiative dà +Effect all'iniziativa della nave **per il round successivo**. Questo significa che il GM deve potere ri-ordinare il turno della nave per un solo round, poi torna all'ordine normale.

### Soluzione

Cambiare il meccanismo: invece di aspettare il prossimo `rollAllInitiative`, applicare il bonus direttamente all'`initiative` della nave e segnare che è temporaneo.

**Store:** aggiungere `initiativeTemporaryBonus: 0` all'istanza nave. `applyInitiativeBonus` lo setta. `buildNextRoundState` lo scala di 1 round e lo sottrae all'initiative quando scade:

```js
// in buildNextRoundState, per ogni nave:
const tempBonus = sh.initiativeTemporaryBonus ?? 0
const newBonus = Math.max(0, tempBonus - 1)  // scade dopo 1 round
return {
  ...sh,
  initiative: tempBonus > 0 && newBonus === 0
    ? sh.initiative - tempBonus  // rimuovi quando scade
    : sh.initiative,
  initiativeTemporaryBonus: newBonus,
}
```

**`applyInitiativeBonus`:** settare sia `initiativeTemporaryBonus` sia `initiative + bonus` (effetto immediato sull'ordine):

```js
initiative: (sh.initiative ?? 0) + applied,
initiativeTemporaryBonus: applied,
```

**UI:** nel HUD/PhaseTracker, badge amber "↑ini" sulle navi con `initiativeTemporaryBonus > 0`.

---

## FIX-07 — Ion power display: chiarire il tally

**Priorità:** Bassa  
**Complessità:** Bassa  
**File:** `src/components/ui/ShipDetailModal.jsx`, `src/components/ui/ShipTooltip.jsx`

### Problema

Il display mostra `ionPowerReduction` come valore cumulativo. Se una nave viene colpita da più salve Ion in round diversi, il numero cresce anche se le penalità precedenti sono già scadute (perché `applyIonDamage` stacka). L'utente vede "Power ridotta di 40" anche se si aspettava che la riduzione del round 1 fosse scaduta.

### Chiarimento comportamento attuale

Il comportamento è intenzionale per RAW (stacking): più colpi Ion in un intervallo breve aumentano la penalità totale. La durata è determinata dal `Math.max(ionRoundsLeft, ionRounds)`. La riduzione cumulativa persiste finché `ionRoundsLeft > 0`.

### Fix

Nessuna modifica alla logica. Solo display:
- Mostrare chiaramente: `Power: {currentPower}/{maxPower} (⚡ −{ionPowerReduction} · {ionRoundsLeft}r remaining)`
- Rendere ovvio che la penalità è temporanea e i round rimanenti sono visibili.

---

## FIX-08 — Hardened: per-sistema (DIFFERITO)

**Priorità:** Bassa  
**Complessità:** Alta  
**File:** `src/data/defaultProfiles.js`, `src/components/forms/ShipProfileForm.jsx`, `src/store/battleStore.js`, `src/components/modals/AttackModal.jsx`

### Problema

`hardened: boolean` è un toggle ship-wide. Per RAW, `/fib` protegge solo il computer, non l'M-Drive o il Power Plant.

### Decisione

**Differire a v1.24+.** Il refactor richiede:
- Cambiare il tipo di `hardened` da `boolean` a `{ computer, mDrive, powerPlant, sensors }` in tutti i profili (breaking change al JSON)
- UI per selezionare quali sistemi sono hardened
- Logica Ion: verificare quale sistema è colpito, applicare hardening solo se quel sistema è protetto

Per ora, documentare il limite nel tooltip del campo HARDENED: *"Simplified: protects all systems. RAW: only systems explicitly hardened are immune."*

---

## Ordine di implementazione

| # | Fix | Versione target |
| --- | --- | --- |
| FIX-01 | Critical hits manual banner | v1.23.0 |
| FIX-02 | Repair difficulty dinamica | v1.23.0 |
| FIX-03 | Scegliere quale critico riparare | v1.23.0 |
| FIX-04 | Missile PD aggiorna count salvo | v1.23.0 |
| FIX-05 | Ion power blocca armi/sensori | v1.23.0 |
| FIX-06 | Leadership durata 1 round | v1.23.0 |
| FIX-07 | Ion display tally | v1.23.0 |
| FIX-08 | Hardened per-sistema | v1.24.0 |
