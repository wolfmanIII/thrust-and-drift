# Thrust & Drift — Bug Tracker

Documento di analisi e tracciamento bug segnalati dalla community (Reddit, CotI, playtest).

---

## BUG-001 — Ion Cannon: danno non applicato correttamente

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Alta

### Comportamento attuale

Il danno Ion viene calcolato come `2D6` e sottratto dal Thrust disponibile, il che garantisce quasi sempre Thrust = 0. Inoltre, anche quando il calcolo è errato, la riduzione **non viene applicata** alla nave bersaglio nel round successivo.

### Comportamento atteso (RAW)

- **MgT2e High Guard p.28** — Ion: l'arma Ion infligge penalità temporanea al Thrust.
- Il danno Ion è `Danno − Armatura`, e il risultato viene sottratto al **Thrust disponibile** per un numero di round pari all'Effect dell'attacco (minimo 1).
- Non riduce il Thrust permanente della nave (non è un danno strutturale).
- La penalità deve essere **temporanea** e scadere automaticamente.

### Stato attuale nel codice

- `src/store/battleStore.js` — `ionRoundsLeft` e `ionPenalty` esistono già come campi sullo ship.
- `buildNextRoundState()` (riga ~160) decrementa `ionRoundsLeft` correttamente e azzera `ionPenalty` quando scade.
- **Problema 1**: Il calcolo del danno Ion in `AttackModal.jsx` o nella logica di applicazione usa probabilmente `2D6` invece di `Danno − Armatura`.
- **Problema 2**: L'`ionPenalty` calcolato non viene scritto sullo ship al momento dell'applicazione, oppure `thrustRemaining` non lo considera.

### File da esaminare

- `src/components/modals/AttackModal.jsx` — logica di applicazione danno Ion
- `src/store/battleStore.js` — `applyIonDamage` o equivalente
- `src/utils/combat.js` — eventuale funzione di calcolo danno Ion

### Fix pianificato

- [ ] Verificare formula di calcolo Ion damage
- [ ] Verificare che `ionPenalty` venga scritto su `ship.ionPenalty` al momento del colpo
- [ ] Verificare che `thrustRemaining` al reset del round consideri `ionPenalty`

---

## BUG-002 — Engineer Repair: ripristino statistiche non applicato

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Alta

### Comportamento attuale

Quando l'Engineer ripara un critical hit, il critico viene rimosso dalla lista (`criticalHits[]`), ma l'**effetto permanente** già applicato (es. riduzione Armatura da Armour critical) rimane in vigore.

### Comportamento atteso (RAW)

- **MgT2e CRB p.167** — Repair System: una riparazione riuscita rimuove il critical hit **e ripristina** il sistema al suo stato precedente.
- Per un Armour critical (Sev. 1 o 2), l'armatura ridotta deve tornare al valore base del profilo.
- Per un M-Drive critical, `thrustPenalty` viene già ricalcolato correttamente (vedi riga 1304).

### Stato attuale nel codice

- `repairCritical()` in `battleStore.js` (riga 1297) rimuove il crit e ricalcola `thrustPenalty` da M-Drive. Funziona per M-Drive.
- **Problema**: Per i critical di tipo Armour, non ripristina `profile.armor` al valore originale.
- Il valore originale dell'armatura è `ship.profile.armor` (già ridotto dal critico) — serve un campo separato per tracciare il valore base o un lookup dal profilo originale.

### File da esaminare

- `src/store/battleStore.js` — `repairCritical()` e `reduceArmour()`
- `src/data/criticalHits.js` — effetti per tipo di sistema

### Fix pianificato

- [ ] Identificare tutti i sistemi con effetti persistenti che `repairCritical` non ripristina (Armour, Bridge, Turrets?)
- [ ] Aggiungere campo `baseArmor` sullo ship instance (copia al momento dell'addShip) oppure lookup da `defaultProfiles`
- [ ] In `repairCritical()`: se il sistema rimosso è Armour, ripristinare `profile.armor` al valore base
- [ ] Verificare gli altri sistemi (Bridge, Power Plant, ecc.)

---

## BUG-003 — Captain Leadership: bonus iniziativa non applicato

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Media

### Comportamento attuale

L'azione Captain "Improve Initiative" (Leadership check) accredita il bonus su `initiativeBonusNextRound`, ma l'iniziativa della nave **non cambia** nel round successivo.

### Comportamento atteso (RAW)

- **MgT2e CRB p.166** — Captain Action: successo di un check Leadership (o Tactics) aumenta l'iniziativa della nave del prossimo round dell'Effect del tiro.
- `initiativeBonusNextRound` viene consumato in `rollAllInitiative()` al round successivo.

### Stato attuale nel codice

- `applyInitiativeBonus()` (riga 1327): scrive su `initiativeBonusNextRound`. Sembra corretto.
- `rollAllInitiative()` (riga 475): legge `initiativeBonusNextRound` e lo passa a `rollInitiative()`. Sembra corretto.
- **Ipotesi**: L'azione in `ActionModal.jsx` potrebbe chiamare `applyInitiativeBonus` con il valore sbagliato (Effect = 0 invece di Effect del roll), oppure la UI non mostra l'aggiornamento.
- **Ipotesi alternativa**: Il bonus viene applicato ma l'ordine di iniziativa non viene aggiornato visivamente finché non si fa il roll del round successivo (comportamento corretto, ma non chiaro per l'utente).

### File da esaminare

- `src/components/modals/ActionModal.jsx` — logica Captain action
- `src/store/battleStore.js` — `applyInitiativeBonus()`, `rollAllInitiative()`

### Fix pianificato

- [ ] Leggere `ActionModal.jsx` per verificare il valore passato a `applyInitiativeBonus`
- [ ] Verificare che `rollAllInitiative` consumi correttamente `initiativeBonusNextRound`
- [ ] Se il comportamento è corretto ma non chiaro: aggiungere feedback visivo nel log / HUD

---

## FEAT-001 — Target missili in volo durante fase Attack

**Segnalato da:** Reddit (u/...), giugno 2026
**Priorità:** Media

### Descrizione

Permettere di selezionare un salvo missili in volo come bersaglio durante la fase Attack (Point Defence), non solo come reazione al lancio. Questo riflette le regole RAW per l'intercettazione.

### Stato attuale

- I missili in volo sono entità nel campo `missiles[]` dello store.
- La Point Defence attuale funziona solo come reazione immediata al lancio.
- `AttackModal.jsx` lista solo navi come bersagli.

### Fix pianificato

- [ ] Aggiungere i missili in volo come target selezionabili in `AttackModal.jsx`
- [ ] Definire la logica di attacco contro missili (solo armi PD? tutte?)
- [ ] Definire la risoluzione: hit = salvo distrutto o ridotto
- [ ] Aggiornare `BattleLog` con il risultato

---

## Note generali

- Tutti i fix devono matchare **MgT2e RAW**. Citare sempre la fonte nella riga di commento.
- Ogni fix è un commit separato.
- Aggiornare `CHANGELOG.md` e la documentazione al termine di ogni bugfix.
