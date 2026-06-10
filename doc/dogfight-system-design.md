# Dogfight System Design — Thrust & Drift

> Specifica implementativa per la gestione del Dogfighting in-app.  
> Regole di riferimento: MgT2e CRB p.138 (combattimento veicoli) + sezione 9 Combattimento Spaziale + sezione 9 Combattimento Vettoriale.

---

## 1. Panoramica

Il Dogfighting è un sotto-sistema che si attiva quando due o più navi terminano la fase Movimento nella stessa casella hex. I round diventano da **6 secondi** (invece di 6 minuti), le fasi standard vengono sospese per le navi coinvolte, e si usano check Pilot contrapposti per determinare vantaggio tattico.

La sfida implementativa è che il dogfight può coesistere con il combattimento standard: alcune navi sono ingaggiate, altre no. L'app deve gestire i due flussi in parallelo senza cambiare schermata.

---

## 2. Condizioni di Innesco

### 2.1 Combattimento Vettoriale

Rilevamento automatico al termine della fase Movimento:

```text
per ogni coppia (nave_A, nave_B) in ships dove nave_A.faction ≠ nave_B.faction:
  se nave_A.inBoarding !== null o nave_B.inBoarding !== null → escludi (fisicamente ancorata)
  se hexDistance(nave_A.position, nave_B.position) === 0:
    → possibile dogfight
```

**Tre casi:**

| Situazione | Risultato |
| ----------- | ----------- |
| Entrambe vogliono il dogfight | Ingaggio automatico |
| Nessuna vuole | Trattate come Short range (distanza 1) |
| Una insegue, l'altra evade | Check Pilot contrapposto (vedi §3.1) |

> Il GM decide l'intenzione di ogni nave tramite modale di notifica prima che il dogfight venga formalizzato.

### 2.2 Combattimento Base

Quando la distanza scende a **Close o Adjacent** (≤ 1 band) tra navi ostili. Stesso flusso di notifica.

---

## 3. Flusso di Ingaggio

### 3.1 Check di Inseguimento (solo se una parte vuole evitare)

```text
// MgT2e CRB p.138 + Traveller Companion p.172
inseguitore: 2D6 + Pilot(DEX) + thrustLibero (thrust non speso in questo round)
fuggitivo:   2D6 + Pilot(DEX) + thrustLibero

se inseguitore.totale > fuggitivo.totale → dogfight attivo
altrimenti → navi a Short range, nessun dogfight
```

`thrustLibero = profile.thrust - thrustUsedThisRound`

### 3.2 Formazione del Gruppo

Un dogfight può coinvolgere più di due navi (es. 2 caccia vs 1 corvetta). Tutte le navi nella stessa casella che vogliono ingaggiarsi entrano nel medesimo gruppo dogfight.

---

## 4. Struttura Dati

### 4.1 DogfightGroup (nuovo slice store)

```javascript
// Aggiunto a battleStore
{
  dogfights: [
    {
      id: string,                  // uuid gruppo
      shipIds: string[],           // id ShipInstance coinvolte
      microRound: number,          // tick interno 1–6 (un round standard = 6 micro-round)
      roundWinnerId: string|null,  // chi ha vinto il check Pilot questo micro-round
      roundWinnerMargin: number,   // differenza check → DM prossimo round
      active: boolean,
    }
  ]
}
```

### 4.2 Modifica a ShipInstance

```javascript
// Campo aggiunto
inDogfight: string|null   // id del DogfightGroup, null se fuori
```

---

## 5. Modifiche al Flusso Round

### 5.1 Fase Movimento — post-processing

Dopo che tutte le navi si sono mosse, prima di avanzare alla fase Attacco:

1. Rilevamento collisioni (§2.1)
2. Se rilevate: apertura `DogfightNotificationModal` per ogni gruppo potenziale
3. Risoluzione check inseguimento se necessario
4. Creazione `DogfightGroup` nello store per ogni gruppo confermato
5. Le navi coinvolte ricevono `inDogfight = groupId`

### 5.2 Fasi Accelerazione / Attacco / Azioni

Le navi con `inDogfight !== null` **saltano** il normale flusso di fase. L'iniziative order le esclude.

Il HUD mostra un tracker separato per ogni dogfight attivo (vedi §7).

### 5.3 Risoluzione Micro-Round

Per ogni `DogfightGroup` attivo, prima della fase Attacco standard:

```text
per ogni micro-round (1 → 6):
  1. Check Pilot contrapposto (§6)
  2. Risoluzione attacchi dogfight (§6.3)
  3. microRound++
fine → dogfight del round standard completato
```

Il GM scorre i 6 micro-round tramite `DogfightRoundModal`. Poi il flusso standard riprende per le navi esterne.

---

## 6. Meccaniche in-game

### 6.1 Check Pilot Contrapposto

```javascript
// MgT2e CRB p.138
function rollDogfightPilot(ship, dogfightGroup) {
  const tonnageDM = getTonnageDM(ship.profile.tonnage)
  const extraEnemyDM = -(dogfightGroup.shipIds.filter(id => isEnemy(id, ship)).length - 1)
  const thrustDM = ship.thrustUsedThisRound   // thrust dedicato al dogfight
  const roll = rollDice(2, 6)
  return {
    roll,
    total: roll + ship.profile.crew.pilot + tonnageDM + extraEnemyDM + thrustDM,
    breakdown: { roll, pilot: ship.profile.crew.pilot, tonnageDM, extraEnemyDM, thrustDM }
  }
}

function getTonnageDM(tonnage) {
  if (!tonnage || tonnage < 50) return 0
  if (tonnage < 100) return -1
  return -2 - Math.floor((tonnage - 100) / 100)  // -1 per ogni 100t oltre le 100
}
```

### 6.2 Effetti del Check

| Risultato | Effetto |
| ----------- | ------- |
| Vincitore | DM +2 a tutti gli attacchi del micro-round; sceglie arco di fuoco nemico |
| Perdente | DM −2 a tutti gli attacchi |
| Parità | Armi fisse non possono sparare; torrette OK |
| Round successivo | vincitore applica `(proprioTotale - nemico.Totale)` come DM bonus al prossimo check |

### 6.3 Attacchi nel Dogfight

- Si usano le normali regole di attacco (AttackModal) con i DM dogfight applicati
- Le navi in dogfight **non possono** attaccare bersagli esterni
- Le navi esterne **non possono** attaccare navi in dogfight (rischio fuoco amico)
- Scala danno: invariata (si usano le armi normali della nave)

### 6.4 Fuga dal Dogfight

Condizioni per tentare la fuga (dichiarata dal GM all'inizio del micro-round):

```text
può fuggire se:
  nave.profile.thrust > max(thrust di tutti i nemici nel gruppo)
  oppure
  i nemici scelgono di non inseguire
```

Se tenta la fuga: check Pilot contrapposto con regole §3.1. Se vince: `inDogfight = null`, nave torna nel flusso standard dal round successivo.

---

## 7. UI / UX

### 7.1 Notifica Ingaggio

`DogfightNotificationModal` — appare al termine della fase Movimento se vengono rilevate collisioni:

```text
┌─────────────────────────────────────────────────┐
│  ⚠ CONTATTO RAVVICINATO                         │
│  Viper MkII e Far Trader sono nella stessa cella│
│                                                 │
│  [Viper MkII]  vuole il dogfight?  [SÌ] [NO]   │
│  [Far Trader]  vuole il dogfight?  [SÌ] [NO]   │
│                                                 │
│  → risultato: DOGFIGHT ATTIVO                   │
│               oppure SHORT RANGE                │
│               oppure check inseguimento →       │
└─────────────────────────────────────────────────┘
```

### 7.2 HUD — Tracker Parallelo

Quando almeno un dogfight è attivo, il HUD espande il tracker:

```text
ROUND 4 — ACCELERAZIONE
──────────────────────────────
DOGFIGHT #1  [Viper ↔ Fighter-1]
  Micro-round 3/6  |  vincitore: Viper (+2 DM)
  [PROSSIMO MICRO-ROUND →]
```

I token delle navi in dogfight ricevono un indicatore visivo sul canvas (bordo giallo pulsante o icona ⚔).

### 7.3 DogfightRoundModal

Modale per la risoluzione di ogni micro-round:

1. Mostra i DM applicabili per ogni nave (tonnage, nemici extra, thrust)
2. Pulsante "Lancia check Pilot" per ogni nave → risultato visibile
3. Calcola vincitore e margine
4. Pulsante "Attacchi" → apre AttackModal con DM dogfight pre-applicati
5. Pulsante "Avanza micro-round" → `microRound++`
6. Dopo micro-round 6 → modale si chiude, flusso standard riprende

### 7.4 Token Canvas

Navi in dogfight:

- Bordo token: giallo/arancio pulsante (`animation: dogfight-pulse`)
- Freccia vettore: nascosta (non rilevante durante dogfight)
- Badge: piccola icona ⚔ in alto a destra del token

---

## 8. Store — Azioni Necessarie

```javascript
// Nuove action in battleStore

startDogfight(shipIds)
// Crea DogfightGroup, imposta inDogfight su tutte le navi coinvolte

advanceDogfightMicroRound(groupId)
// microRound++; se microRound > 6 → endDogfight

recordDogfightCheckResult(groupId, winnerId, margin)
// Aggiorna roundWinnerId e roundWinnerMargin

escapeDogfight(shipId, groupId)
// Rimuove shipId dal gruppo; se gruppo.shipIds.length < 2 → endDogfight

endDogfight(groupId)
// active = false; tutte le navi del gruppo → inDogfight = null
// Le navi tornano nel normale flusso dal round successivo
```

---

## 9. Nuovi Componenti

| Componente | Tipo | Responsabilità |
| ----------- | ---- | -------------- |
| `DogfightNotificationModal.jsx` | Modal | Notifica ingaggio, raccoglie intenzioni GM |
| `DogfightRoundModal.jsx` | Modal | Risolve singolo micro-round (check + attacchi) |
| `useDogfightDetection.js` | Hook | Rileva collisioni post-movimento, prepara gruppi |
| `dogfight.js` | Util (`utils/`) | `getTonnageDM`, `rollDogfightPilot`, `canEscape` |

---

## 10. Note Implementative

- `dogfight.js` in `utils/` — pura logica, no React, testabile con Vitest
- La fuga non interrompe il micro-round corrente: si completa, poi la nave esce
- Più dogfight simultanei sono possibili ma indipendenti — il GM li risolve in sequenza
- Nessuna nuova schermata: tutto su mappa + modali + HUD esteso
- I 6 micro-round non sono obbligatori: il GM può chiudere il dogfight prima se una nave viene distrutta o fugge

---

## Documenti Correlati

- [thrust-and-drift-space-combat-simulator-spec.md](thrust-and-drift-space-combat-simulator-spec.md) — architettura generale, modelli dati, roadmap (§13.5)
- [boarding-system-design.md](boarding-system-design.md) — sistema di abbordaggio (fase successiva al dogfight)
- [obstacles-system-design.md](obstacles-system-design.md) — ostacoli ambientali (asteroid field, gravity well, nebula)
