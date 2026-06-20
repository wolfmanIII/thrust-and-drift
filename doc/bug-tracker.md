# Thrust & Drift — Bug Tracker

Documento di analisi e tracciamento bug segnalati dalla community (Reddit, CotI, playtest).

---

## BUG-001 — Ion Cannon: danno non applicato correttamente ✅ RISOLTO (v1.21.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Alta
**Commit:** `08f3174`

### Comportamento attuale

Il danno Ion viene calcolato come `2D6` e sottratto dal Thrust disponibile, il che garantisce quasi sempre Thrust = 0. Inoltre, anche quando il calcolo è errato, la riduzione **non viene applicata** alla nave bersaglio nel round successivo.

### Comportamento atteso (RAW)

- **MgT2e High Guard p.28** — Ion: l'arma Ion infligge penalità temporanea al Thrust.
- Il danno Ion è `Danno − Armatura`, e il risultato viene sottratto al **Thrust disponibile** per un numero di round pari all'Effect dell'attacco (minimo 1).
- Non riduce il Thrust permanente della nave (non è un danno strutturale).
- La penalità deve essere **temporanea** e scadere automaticamente.

### Causa radice

Il meccanismo di calcolo era corretto (2D6 roll → `ionPenalty`, durata 1 round o D3 se Effect ≥ 6). Il bug era in `buildNextRoundState`: la penalità veniva mantenuta controllando `ionNext > 0` (post-decrement) invece di `ionCurrent > 0` (pre-decrement). Con `ionRoundsLeft = 1`, `ionNext = 0` immediatamente, azzerando la penalità un round prima del dovuto.

### Fix applicato

`battleStore.js` — `buildNextRoundState`:

```js
const ionCurrent = sh.ionRoundsLeft ?? 0
const ionNext    = Math.max(0, ionCurrent - 1)
return {
  ...sh,
  ionRoundsLeft: ionNext,
  ionPenalty: ionCurrent > 0 ? (sh.ionPenalty ?? 0) : 0,
}
```

### Fix checklist

- [x] Verificare formula di calcolo Ion damage
- [x] Verificare che `ionPenalty` venga scritto su `ship.ionPenalty` al momento del colpo
- [x] Verificare che `thrustRemaining` al reset del round consideri `ionPenalty`

---

## BUG-002 — Engineer Repair: ripristino statistiche non applicato ✅ RISOLTO (v1.21.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Alta
**Commit:** `08f3174`

### Comportamento attuale

Quando l'Engineer ripara un critical hit, il critico viene rimosso dalla lista (`criticalHits[]`), ma l'**effetto permanente** già applicato (es. riduzione Armatura da Armour critical) rimane in vigore.

### Comportamento atteso (RAW)

- **MgT2e CRB p.167** — Repair System: una riparazione riuscita rimuove il critical hit **e ripristina** il sistema al suo stato precedente.
- Per un Armour critical (Sev. 1 o 2), l'armatura ridotta deve tornare al valore base del profilo.
- Per un M-Drive critical, `thrustPenalty` viene già ricalcolato correttamente.

### Causa radice

`repairCritical()` ricalcolava `thrustPenalty` sommando le penalità M-Drive rimanenti, ma non ripristinava `profile.armor` quando il critico rimosso era di tipo Armour. `profile.armor` era già stato ridotto da `reduceArmour()`, e non c'era un riferimento al valore originale.

### Fix applicato

`addShip` in `battleStore.js` — aggiunto `baseArmor: profile.armor ?? 0` all'istanza nave.

`repairCritical()` in `battleStore.js` — dopo la rimozione del critico:

```js
const restoredArmor = removed.system === 'Armour'
  ? (ship.baseArmor ?? ship.profile.armor ?? 0)
  : null
// ...
return restoredArmor !== null
  ? { ...base, profile: { ...sh.profile, armor: restoredArmor } }
  : base
```

### Fix checklist

- [x] Identificare tutti i sistemi con effetti persistenti che `repairCritical` non ripristina
- [x] Aggiungere campo `baseArmor` sullo ship instance (copia al momento dell'addShip)
- [x] In `repairCritical()`: se il sistema rimosso è Armour, ripristinare `profile.armor` al valore base
- [x] Verificare gli altri sistemi (Bridge, Power Plant — effetti solo descrittivi, nessun campo persistente da ripristinare)

---

## BUG-003 — Captain Leadership: bonus iniziativa non applicato ✅ RISOLTO (v1.21.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Media
**Commit:** `fcc3f2d`

### Comportamento attuale

L'azione Captain "Improve Initiative" (Leadership check) accredita il bonus su `initiativeBonusNextRound`, ma l'iniziativa della nave **non cambia** nel round successivo.

### Comportamento atteso (RAW)

- **MgT2e CRB p.166** — Captain Action: successo di un check Leadership (o Tactics) aumenta l'iniziativa della nave del prossimo round dell'Effect del tiro.
- `initiativeBonusNextRound` viene consumato in `rollAllInitiative()` al round successivo.

### Causa radice

Il bug era **solo nella UI di anteprima**. La logica store era sempre corretta: `applyInitiativeBonus` scriveva correttamente `initiativeBonusNextRound`, e `rollAllInitiative` lo consumava correttamente al round successivo. Il problema: `previewTotal` in `InitiativeModal.jsx` non includeva `initiativeBonusNextRound` nel totale preview pre-conferma, mostrando un totale inferiore all'effettivo.

### Fix applicato

`InitiativeModal.jsx` — `previewTotal`:

```js
const previewTotal = (ship) => {
    const dice = playerDice[ship.id]
    if (!dice) return '?'
    return dice.total
      + getEffectiveSkill(ship.profile.crew, ship.crewAssignments, 'pilot')
      + ship.profile.thrust
      + tacticsEffect(ship)
      + (ship.initiativeBonusNextRound ?? 0)  // ← aggiunto
}
```

### Fix checklist

- [x] Leggere `ActionModal.jsx` per verificare il valore passato a `applyInitiativeBonus` (corretto)
- [x] Verificare che `rollAllInitiative` consumi correttamente `initiativeBonusNextRound` (corretto)
- [x] Fix feedback visivo nel preview `InitiativeModal`

---

## FIX-07 — Display ion power — round rimanenti e OFFLINE ✅ IMPLEMENTATO (v1.23.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Bassa
**Commit:** `ff957a0`

### Descrizione

`ShipDetailModal` e `ShipTooltip` mostravano solo il numero di round residui per l'ion disruption, senza indicare la riduzione di Power né segnalare quando la nave è completamente offline.

### Fix

- Formato aggiornato a `−N PWR · Xr remaining` (Power reduction + round rimanenti).
- Aggiunto suffisso `OFFLINE` quando `currentPower ≤ 0`.

---

## FIX-06 — Leadership bonus dura esattamente 1 round ✅ IMPLEMENTATO (v1.23.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Alta
**Commit:** `c447bcc`

### Descrizione

`applyInitiativeBonus` aggiungeva il bonus a `initiativeBonusNextRound`, consumato una sola volta in `rollAllInitiative` (chiamato all'inizio del combattimento). Il bonus non aveva mai effetto nei round successivi.

### Fix

- `applyInitiativeBonus` applica immediatamente `initiative += applied` e imposta `initiativeTemporaryBonus`.
- `buildNextRoundState` sottrae `initiativeTemporaryBonus` da `initiative` e lo azzera — il bonus dura esattamente 1 round. *(CRB p.166)*
- `PhaseTracker` mostra badge `↑ini` amber sulle navi con bonus attivo.

---

## FIX-05 — Power = 0 blocca armi e sensori ✅ IMPLEMENTATO (v1.23.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Alta
**Commit:** `4128e56`

### Descrizione

Con `currentPower = 0` (per ion disruption), la nave poteva ancora selezionare armi e usare azioni sensore nell'app, violando HG p.30.

### Fix

- `useAttackSetup`: `availableWeaponsFiltered` svuotato quando `currentPower ≤ 0`; restituisce flag `noPower`.
- `AttackModal`: banner rosso `⚡ POWER OFFLINE` quando `noPower`.
- `ActionModal`: sensor actions (Sensor Lock, EW, Counter Missile) disabilitate con label `⚡ power offline` quando `currentPower ≤ 0`. *(HG p.30)*

---

## FIX-04 — Ammo missili non detratta con intercettazione totale PD ✅ IMPLEMENTATO (v1.23.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Media
**Commit:** `b5df149`

### Descrizione

Quando il Point Defence distruggeva tutti i missili prima del lancio (`missileCount === 0`), `handleAllIntercepted` chiudeva il modale senza detrarre ammo dall'attaccante. Il turret veniva segnato come fired ma l'ammo restava intatta.

### Fix

- `AttackModal`: stato `pdDestroyedTotal` accumula i missili intercettati durante `handlePdRoll`; `handleAllIntercepted` chiama `spendMissileAmmo(attacker.id, pdDestroyedTotal)`.
- `battleStore`: nuova action `spendMissileAmmo(shipId, count)` — non wh-wrapped (PD non è azione ship, non undoable).

---

## FIX-03 — Engineer sceglie quale critico riparare ✅ IMPLEMENTATO (v1.23.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Media
**Commit:** `0376b50`

### Descrizione

`repairCritical` rimuoveva sempre il critico all'indice 0. Con più critici attivi, l'ingegnere non poteva scegliere quale riparare.

### Fix

- `ActionModal`: selector dropdown con tutti i critici attivi; `critIndex` passato a `useActionEffects`.
- `battleStore`: `repairCritical(shipId, critIndex = 0)` accetta l'indice; usa `Math.min(critIndex, length - 1)` per sicurezza.

---

## FIX-02 — Repair System scala difficoltà con severity ✅ IMPLEMENTATO (v1.23.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Media
**Commit:** `0376b50`

### Descrizione

`Repair System` usava difficoltà fissa Average (8+) indipendentemente dalla severity del critico, violando CRB p.167.

### Fix

`repairDifficulty(severity)` in `ActionModal`:

| Severity | Difficoltà |
| -------- | ---------- |
| 1–2 | Average (8+) |
| 3–4 | Difficult (10+) |
| 5–6 | Very Difficult (12+) |

---

## FIX-01 — Banner `⚠ MANUAL` per critici descrittivi ✅ IMPLEMENTATO (v1.23.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Alta
**Commit:** `0376b50`

### Descrizione

I critici descrittivi (Sensors, Fuel Tank, Weapons, Bridge, Power Plant) non fornivano alcun feedback visivo che distinguesse effetti automatici da effetti manuali. Il GM poteva perdere l'effetto senza rendersene conto.

### Fix

`AttackModal` mostra un banner amber `⚠ MANUAL — Apply this effect to the ship before closing` quando `effect?.mechanic === 'descriptive'`.

---

## FEAT-001 — Target missili in volo durante fase Attack ✅ IMPLEMENTATO (v1.21.0)

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Media
**Commit:** `cde198d` (feat) + `01fa79e` (test)

### Descrizione

Permettere di selezionare un salvo missili in volo come bersaglio durante la fase Attack (Point Defence), non solo come reazione al lancio. Questo riflette le regole RAW per l'intercettazione.

### Implementazione

- `AttackModal.jsx` — `LASER_PD` spostato a module scope; `AttackConfigStep` filtra `visibleWeapons` per laser se `isMissilePdMode`; sezione missile target (amber styling); pulsante INTERCEPT; nuovo step `missile_pd`.
- `MissilePdStep` — nuovo componente nel flow di `AttackModal`; stessa formula PD reaction (2D6 + Gunner + laser bonus); Effect missili distrutti.
- `battleStore.js` — nuova action `interceptMissileSalvo(missileId, removed)`: riduce count o rimuove il salvo; log entry.
- `inFlightHostileMissiles` — calcolato su launcher faction ≠ attacker faction; arricchito con `launcherName` e `targetName`.
- `targetMissileId` — stato locale in `AttackModal`, mutually exclusive con `targetId`.

### Fix checklist

- [x] Aggiungere i missili in volo come target selezionabili in `AttackModal.jsx`
- [x] Definire la logica di attacco contro missili (solo Pulse/Beam Laser)
- [x] Definire la risoluzione: Effect missili distrutti; salvo rimosso se count ≤ 0
- [x] Aggiornare `BattleLog` con il risultato

---

## Note generali

- Tutti i fix devono matchare **MgT2e RAW**. Citare sempre la fonte nella riga di commento.
- Ogni fix è un commit separato.
- Aggiornare `CHANGELOG.md` e la documentazione al termine di ogni bugfix.
