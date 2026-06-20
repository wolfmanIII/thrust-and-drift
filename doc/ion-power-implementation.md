# Thrust & Drift — Ion Cannon: Implementazione Power RAW

> Documento di design per l'implementazione del sistema Power come da HG p.30 + FAQ HG 2022.
> Versione di riferimento: **v1.22.0** (patch successiva alla v1.21.0)

---

## 1. Motivazione e riferimenti RAW

La nostra implementazione attuale di Ion Cannon è **non conforme** a RAW su quattro punti:

| Punto | Attuale (errato) | RAW (HG p.30–33) |
| ----- | --------------- | -------------- |
| Montaggio | Turret (qualsiasi) | **Barbette e Bay** — turret non ha Ion |
| Stat bersaglio | Thrust | **Power** |
| Formula danno | 2D6 grezzo = penalità thrust | **2D × 10** (barbette) / **NbD × multiplo bay** (bay) |
| Armi mancanti | Solo Ion Cannon (barbette) | **Ion Cannon Bay** esiste in 3 taglie (Small/Medium/Large) |

**FAQ HG 2022 p.1 — errata su Weapon Trait: Ion (p.30):**
> "At the end of the third paragraph, add: Deduct the same amount of damage from the computer bandwidth. Hardened computers (those with the /fib designation) are immune to Ion weapons."

---

## 2. Testo RAW completo (HG p.30)

> Ion weapons overload power systems, temporarily disrupting critical systems on board a ship without causing permanent damage. […] When an Ion weapon successfully hits a target, roll for its damage but **ignore any armour** the target possesses. Instead of applying damage to the target's hull, it is instead **temporarily deducted from the target's Power**, representing the disabling effects as they spread throughout the ship […] This reduction in Power lasts until the target completes its next set of actions, in either the **current round or the next**. If the Effect of the attack roll is **6 or more**, the reduction in Power lasts for **D3 rounds**.

**Tabella Barbette (HG p.30):**

| Weapon | TL | Range | Power | Damage | Traits |
| ------ | -- | ----- | ----- | ------ | ------ |
| Ion Cannon | 12 | Medium | 10 | **2D × 10** | Ion |

Il ×10 è esplicito nella colonna Damage e **sovrascrive** il barbette damage multiple ×3 standard (il quale si applica ai danni scafo, non ai danni Power).

**Tabella Small Bay Weapons (HG p.32):**

| Weapon | TL | Range | Power | Damage | Traits |
| ------ | -- | ----- | ----- | ------ | ------ |
| Ion Cannon Bay | 12 | Medium | 20 | **6D** | Ion |

Power ridotto effettivo: 6D × 10 (bay damage multiple Small = 10 — HG p.31).

**Tabella Medium Bay Weapons (HG p.33):**

| Weapon | TL | Range | Power | Damage | Traits |
| ------ | -- | ----- | ----- | ------ | ------ |
| Ion Cannon Bay | 12 | Medium | 30 | **8D** | Ion |

Power ridotto effettivo: 8D × 20 (bay damage multiple Medium = 20 — HG p.31).

**Tabella Large Bay Weapons (HG p.33):**

| Weapon | TL | Range | Power | Damage | Traits |
| ------ | -- | ----- | ----- | ------ | ------ |
| Ion Cannon Bay | 12 | Long | 40 | **10D** | Ion |

Power ridotto effettivo: 10D × 100 (bay damage multiple Large = 100 — HG p.31).

---

## 3. Decisioni di design per T&D

### 3.1 Ion Cannon → Barbette e Bay, mai Turret

Ion Cannon non compare nella tabella Turret Weapons (HG p.28). Esiste solo come:

- **Barbette** (HG p.30) — flag `barbetteOnly: true` in weapons.js
- **Small/Medium/Large Bay** (HG p.32–33) — flag `bayOnly: true`, tre entry separate

In T&D il weapon picker dei turret slot esclude tutte le armi con `barbetteOnly: true` o `bayOnly: true`. Il weapon picker dei barbette slot esclude `bayOnly: true`. I bay slot (se implementati) accettano solo `bayOnly: true`.

### 3.2 Power come nuova stat di battaglia

T&D non traccia Power come stat. L'implementazione aggiunge:

- **`profile.maxPower`** — campo numerico nel profilo, impostato dal GM. Rappresenta la capacità nominale del Power Plant in condizioni operative. Non derivato automaticamente (il calcolo HG dipende da tipo e rating del PP, fuori scope).
- **`ship.currentPower`** — campo runtime sull'istanza di battaglia. Inizializzato a `profile.maxPower` su `addShip`. Ridotto dai colpi Ion. Ripristinato a `profile.maxPower` quando `ionRoundsLeft` scade.
- **`ship.basePower`** — snapshot di `profile.maxPower` al momento dell'`addShip` (analogo a `baseArmor`), usato per il ripristino anche se il profilo viene modificato.

**Valori di default suggeriti** per i preset (da aggiornare in `defaultProfiles.js`):

| Nave | Thrust | maxPower |
| ---- | ------ | -------- |
| Free Trader | 1 | 80 |
| Scout/Courier | 2 | 80 |
| Light Fighter | 6 | 40 |
| Heavy Frigate | 4 | 150 |
| Patrol Corvette | 4 | 120 |
| Type S (Companion) | 2 | 80 |

Valore di default nel form (nuove navi): **100**.

### 3.3 Formula danno Ion per tipo di montaggio

Ogni variante Ion usa la stessa meccanica (ignora armatura, deduce da Power) ma dice e multiplo variano:

| Arma | damageDice | damageMultiple | Formula Power reduction |
| ---- | ---------- | -------------- | ----------------------- |
| Ion Cannon (barbette) | 2 | 10 | 2D × 10 (esplicito HG p.30) |
| Ion Cannon Bay (Small) | 6 | 10 | 6D × 10 (bay multiple HG p.31) |
| Ion Cannon Bay (Medium) | 8 | 20 | 8D × 20 (bay multiple HG p.31) |
| Ion Cannon Bay (Large) | 10 | 100 | 10D × 100 (bay multiple HG p.31) |

```text
ionDamage = rollNbD(weapon.damageDice) × weapon.damageMultiple   (ignora armatura — HG p.30)
currentPower = max(0, ship.currentPower − ionDamage)
```

`IonDamageStep` in AttackModal legge `weapon.damageDice` e `weapon.damageMultiple` dall'entry WEAPONS — nessuna logica hardcoded sul numero di dadi.

### 3.4 Effetti di Power sui sistemi T&D

T&D mappa la riduzione di Power all'unica stat di mobilità rilevante in-combat: il **Thrust**.

Formula:

```js
// src/utils/combat.js
export function computeIonThrustEffect(baseThrust, currentPower, maxPower) {
  if (!maxPower || maxPower <= 0) return baseThrust        // nessun maxPower definito → nessun effetto
  const ratio = Math.max(0, currentPower) / maxPower
  return Math.floor(baseThrust * ratio)                    // arrotonda per difetto
}
```

Esempio: nave con Thrust 4, maxPower 100, colpita da Ion per 70 Power:

- `currentPower = 30`, `ratio = 0.3`, `effectiveThrust = floor(4 × 0.3) = 1`

Tutti i riferimenti al calcolo thrust disponibile sostituiscono `- (ship.ionPenalty ?? 0)` con:

```js
const ionThrustCap = computeIonThrustEffect(ship.profile.thrust, ship.currentPower ?? ship.profile.maxPower, ship.basePower ?? ship.profile.maxPower)
// thrustAvailable = max(0, ionThrustCap + bonusThisRound - thrustUsed - mDrivePenalty - reactionThrust)
```

> **Nota di design:** la formula lineare è una semplificazione T&D. RAW descrive la riduzione di Power come interruzione di "sistemi critici" senza specificare la mappatura verso Thrust. Questo approccio è documentato in field-manual.md come scelta intenzionale.

### 3.5 Stacking colpi multipli

Se la stessa nave riceve più colpi Ion nello stesso round (o in round diversi durante la durata):

```text
ship.ionPowerReduction += newIonDamage         // si sommano
ship.ionRoundsLeft = max(existing, newDuration) // durata = la più lunga
ship.currentPower = max(0, ship.basePower − ship.ionPowerReduction)
```

Motivazione: due Ion Cannon barbette che colpiscono la stessa nave devono avere effetto cumulativo (questo è il senso fisico e tattico dell'arma).

### 3.6 Recupero Power

`buildNextRoundState` — logica invariata per `ionRoundsLeft` (decrementa ogni round). Quando `ionCurrent === 0` (ultima espirare):

```js
const ionPowerReduction = ionCurrent > 0 ? (sh.ionPowerReduction ?? 0) : 0
const currentPower = ionCurrent > 0
  ? Math.max(0, (sh.basePower ?? sh.profile.maxPower ?? 100) - ionPowerReduction)
  : (sh.basePower ?? sh.profile.maxPower ?? 100)   // ripristino completo
```

### 3.7 Computer bandwidth (FAQ HG 2022 p.1)

La FAQ aggiunge: detrarre la **stessa quantità** di Power anche dalla **computer bandwidth**.

Il bandwidth di un computer in HG è tipicamente un valore piccolo (es. Computer/5 = bandwidth 5). Anche il colpo minimo di un Ion Cannon barbette (2D×10, min 20) azzera quasi sempre il bandwidth. L'effetto è quindi quasi binario: Ion hit → bandwidth esaurito.

**Implementazione T&D:**

Nuovi campi profilo:
- `profile.computerBandwidth` — numero intero (0 = non tracciato). Valore tipico: `5`–`30` per navi militari, `0` per navi civili senza computer avanzato.

Nuovi campi runtime:
- `ship.baseBandwidth` — snapshot di `profile.computerBandwidth` all'`addShip`
- `ship.currentBandwidth` — bandwidth corrente (ridotto da Ion, ripristinato con Power)
- `ship.bandwidthReduction` — riduzione cumulativa (stacking identico a `ionPowerReduction`)

Effetto meccanico: se `ship.currentBandwidth ≤ 0` **e** `ship.baseBandwidth > 0`:
- DM-2 a tutti i tiri attacco (fire control offline)
- Badge visivo `COMMS DOWN` nella bento card / ship tooltip

Recupero: il bandwidth si ripristina contestualmente al Power (fine di `ionRoundsLeft`).

`applyIonDamage` aggiornato:

```js
applyIonDamage: (targetId, ionDamage, ionRounds) => {
  set((s) => ({
    ships: s.ships.map((sh) => {
      if (sh.id !== targetId) return sh
      if (sh.hardened) return sh                              // /fib immune — §3.8
      const basePower          = sh.basePower ?? sh.profile.maxPower ?? 100
      const prevPwrReduction   = sh.ionPowerReduction ?? 0
      const newPwrReduction    = prevPwrReduction + ionDamage
      const newRoundsLeft      = Math.max(sh.ionRoundsLeft ?? 0, ionRounds)
      const newCurrentPower    = Math.max(0, basePower - newPwrReduction)
      // bandwidth
      const baseBandwidth      = sh.baseBandwidth ?? sh.profile.computerBandwidth ?? 0
      const prevBwReduction    = sh.bandwidthReduction ?? 0
      const newBwReduction     = prevBwReduction + ionDamage
      const newCurrentBw       = Math.max(0, baseBandwidth - newBwReduction)
      return {
        ...sh,
        ionPowerReduction:  newPwrReduction,
        currentPower:       newCurrentPower,
        ionRoundsLeft:      newRoundsLeft,
        bandwidthReduction: newBwReduction,
        currentBandwidth:   newCurrentBw,
      }
    }),
  }))
},
```

Se `profile.computerBandwidth === 0` (non tracciato) la riduzione avviene ma `currentBandwidth` rimane 0 — il check `baseBandwidth > 0` impedisce l'applicazione del DM-2 per quelle navi.

### 3.8 Hardened systems (/fib)

La FAQ specifica che i computer con designazione `/fib` sono **immuni** ai colpi Ion.

**Implementazione T&D:**

Nuovo campo profilo: `profile.hardened` — booleano (default `false`).

Nuovo campo runtime: `ship.hardened` — copiato da `profile.hardened` in `addShip`.

Effetto: in `applyIonDamage`, se `sh.hardened === true` il metodo ritorna `sh` invariato e logga `"Ion: no effect (hardened systems)"`.

Nel weapon picker di AttackModal, se il bersaglio ha `hardened: true`, la sezione Ion mostra un avviso `SISTEMI HARDENIZZATI — Ion inefficace` e blocca il pulsante Apply.

Nuovi campi in `addShip`:

```js
hardened:          profile.hardened ?? false,
baseBandwidth:     profile.computerBandwidth ?? 0,
currentBandwidth:  profile.computerBandwidth ?? 0,
bandwidthReduction: 0,
```

---

## 4. Rimozione di `ionPenalty`

Il campo `ionPenalty` (thrust penalty raw) viene **rimosso**. Sostituito da:

| Vecchio campo | Nuovo campo | Note |
| ------------- | ----------- | ---- |
| `ship.ionPenalty` | `ship.ionPowerReduction` | Power ridotto (non thrust diretto) |
| — | `ship.currentPower` | Power corrente (computato da basePower − reduction) |
| — | `ship.basePower` | Snapshot di `profile.maxPower` all'addShip |
| `ship.ionRoundsLeft` | `ship.ionRoundsLeft` | Invariato |

---

## 5. File da modificare

### 5.1 `src/data/weapons.js`

**Ion Cannon (barbette)** — cambiamenti all'entry esistente:

- `damageMultiple: 10` — **cambia** da 1 a 10 (il ×10 dalla tabella HG p.30)
- Aggiungere `barbetteOnly: true` — **nuovo**
- Aggiungere `ignoresArmour: true` — **nuovo**
- Aggiornare `notes`: citare HG p.30 + FAQ
- Tutti gli altri campi invariati

```js
'Ion Cannon': {
  id: 'Ion Cannon',
  label: 'Ion Cannon',
  attackDM: 0,
  damageDice: 2,
  damageBonus: 0,
  maxRange: 'Medium',
  damageMultiple: 10,      // 2D × 10 — HG p.30 (overrides barbette ×3)
  traits: ['Ion'],
  barbetteOnly: true,      // HG p.30 — assente da turret table
  ignoresArmour: true,     // Ion ignora armatura — HG p.30
  notes: 'No hull damage. Roll 2D×10 ignoring armour; deduct from target Power + bandwidth. Duration: 1 round (D3 if Effect ≥ 6). // HG p.30, FAQ HG 2022 p.1',
},
```

**Nuove entry Bay** — aggiungere dopo Ion Cannon:

```js
'Ion Cannon Bay (Small)': {
  id: 'Ion Cannon Bay (Small)',
  label: 'Ion Cannon Bay (S)',
  attackDM: 0,
  damageDice: 6,           // HG p.32
  damageBonus: 0,
  maxRange: 'Medium',      // HG p.32
  damageMultiple: 10,      // Small Bay damage multiple — HG p.31
  traits: ['Ion'],
  bayOnly: true,
  ignoresArmour: true,
  notes: 'No hull damage. Roll 6D×10 ignoring armour; deduct from target Power + bandwidth. // HG p.32, FAQ HG 2022 p.1',
},
'Ion Cannon Bay (Medium)': {
  id: 'Ion Cannon Bay (Medium)',
  label: 'Ion Cannon Bay (M)',
  attackDM: 0,
  damageDice: 8,           // HG p.33
  damageBonus: 0,
  maxRange: 'Medium',      // HG p.33
  damageMultiple: 20,      // Medium Bay damage multiple — HG p.31
  traits: ['Ion'],
  bayOnly: true,
  ignoresArmour: true,
  notes: 'No hull damage. Roll 8D×20 ignoring armour; deduct from target Power + bandwidth. // HG p.33, FAQ HG 2022 p.1',
},
'Ion Cannon Bay (Large)': {
  id: 'Ion Cannon Bay (Large)',
  label: 'Ion Cannon Bay (L)',
  attackDM: 0,
  damageDice: 10,          // HG p.33
  damageBonus: 0,
  maxRange: 'Long',        // HG p.33
  damageMultiple: 100,     // Large Bay damage multiple — HG p.31
  traits: ['Ion'],
  bayOnly: true,
  ignoresArmour: true,
  notes: 'No hull damage. Roll 10D×100 ignoring armour; deduct from target Power + bandwidth. // HG p.33, FAQ HG 2022 p.1',
},
```

**`@typedef WeaponType`** — aggiungere i 3 nuovi ID all'union:

```js
/** @typedef {'Pulse Laser'|...|'Ion Cannon'|'Ion Cannon Bay (Small)'|'Ion Cannon Bay (Medium)'|'Ion Cannon Bay (Large)'} WeaponType */
```

Verificare `DEFENSIVE_WEAPON_IDS` — Ion non deve comparire (nessun trait `'Defensive'`).

### 5.2 `src/data/defaultProfiles.js`

In `makeProfile` defaults, aggiungere:

```js
maxPower: 100,   // default generico
```

Aggiungere `maxPower` a ciascun profilo preset con valori dal §3.2.

### 5.3 `src/components/forms/ShipProfileForm.jsx`

1. Aggiungere `NumField` per `MAX POWER` nella sezione stats principali (accanto a HULL / ARMOUR / THRUST).
   - `min={10}`, `max={9999}`, default `100`
   - Tooltip: "Potenza massima del Power Plant (HG p.30 — rilevante per Ion Cannon)"

2. Aggiungere `NumField` per `COMPUTER BANDWIDTH` nella sezione avanzata (opzionale, default `0` = non tracciato).
   - `min={0}`, `max={999}`, default `0`
   - Tooltip: "Bandwidth del computer di bordo (HG — 0 = non tracciato, immune al DM-2 bandwidth)"

3. Aggiungere `CheckboxField` per `HARDENED SYSTEMS (/fib)`.
   - Tooltip: "Computer con designazione /fib — immune a Ion weapons (FAQ HG 2022 p.1)"

4. Nel weapon picker dei turret slot: escludere le armi con `barbetteOnly: true` **o** `bayOnly: true`.

5. Aggiornare `initialForm` e il merge `profile → form` per includere `maxPower`, `computerBandwidth`, `hardened`.

### 5.4 `src/store/battleStore.js`

#### `addShip`

Aggiungere all'istanza nave:

```js
basePower:          profile.maxPower ?? 100,
currentPower:       profile.maxPower ?? 100,
ionPowerReduction:  0,
baseBandwidth:      profile.computerBandwidth ?? 0,
currentBandwidth:   profile.computerBandwidth ?? 0,
bandwidthReduction: 0,
hardened:           profile.hardened ?? false,
// rimuovere: ionPenalty (non più usato)
```

#### `buildNextRoundState` (funzione pura, riga ~119)

Sostituire la logica `ionPenalty`:

```js
const ionCurrent    = sh.ionRoundsLeft ?? 0
const ionNext       = Math.max(0, ionCurrent - 1)
const ionReduction  = ionCurrent > 0 ? (sh.ionPowerReduction ?? 0) : 0
const restoredPower = sh.basePower ?? sh.profile.maxPower ?? 100
const baseBw        = sh.baseBandwidth ?? sh.profile.computerBandwidth ?? 0
const bwReduction   = ionCurrent > 0 ? (sh.bandwidthReduction ?? 0) : 0
return {
  ...sh,
  ionRoundsLeft:      ionNext,
  ionPowerReduction:  ionNext > 0 ? ionReduction : 0,
  currentPower:       ionNext > 0
    ? Math.max(0, restoredPower - ionReduction)
    : restoredPower,
  bandwidthReduction: ionNext > 0 ? bwReduction : 0,
  currentBandwidth:   ionNext > 0
    ? Math.max(0, baseBw - bwReduction)
    : baseBw,
}
```

#### `applyIonDamage` (riga ~920)

Nuova firma: `applyIonDamage(targetId, ionDamage, ionRounds)` — `ionDamage` è il risultato `NbD × damageMultiple` (già calcolato da IonDamageStep).

Vedi implementazione completa al §3.7 — include Power reduction, bandwidth reduction, guard `/fib` (`sh.hardened`).

#### `spendReactionThrust` e tutti i calcoli thrust (riga ~1160 e simili)

Importare `computeIonThrustEffect` da `utils/combat.js`. Sostituire:

```js
// PRIMA
- (ship.ionPenalty ?? 0)
// DOPO
// niente da sottrarre direttamente — il cap si applica all'inizio:
const ionCap = computeIonThrustEffect(ship.profile.thrust, ship.currentPower ?? basePower, basePower)
// thrustAvailable = min(ionCap, profile.thrust) + bonusThisRound - used - mDrivePenalty - reactionThrust
```

Tutte le occorrenze `ionPenalty` nel file vanno rimosse/sostituite.

### 5.5 `src/utils/combat.js`

Aggiungere funzione esportata:

```js
/**
 * Effective thrust given current Ion Power reduction.
 * Linear scaling: floor(baseThrust × currentPower / maxPower).
 * Returns baseThrust unchanged if maxPower is 0 or undefined.
 * // HG p.30 — Ion reduces Power; T&D maps Power to Thrust proportionally
 * @param {number} baseThrust
 * @param {number} currentPower
 * @param {number} maxPower
 * @returns {number}
 */
export function computeIonThrustEffect(baseThrust, currentPower, maxPower) {
  if (!maxPower || maxPower <= 0) return baseThrust
  return Math.floor(baseThrust * Math.max(0, currentPower) / maxPower)
}
```

### 5.6 `src/components/modals/AttackModal.jsx`

#### `IonDamageStep` (riga ~660)

Generalizzato per supportare qualsiasi arma Ion (barbette e bay):

- Label roll: `"${weapon.damageDice}D × ${weapon.damageMultiple} ion power:"` (dinamico)
- Formula: `ionDamage = ionRoll * weapon.damageMultiple` dove `ionRoll` è la somma di `weapon.damageDice` dadi
- Display risultato: `−${ionDamage} Power` + Power rimanente stimato
- Se bersaglio `hardened`: mostrare banner `SISTEMI HARDENIZZATI — Ion inefficace`, bloccare Apply
- Se `target.profile.computerBandwidth > 0`: mostrare anche `−${ionDamage} Bandwidth (${Math.max(0, currentBw - ionDamage)} remaining)`
- `onApply(ionDamage, ionRounds)` — parametro è il danno Power/bandwidth calcolato
- Note: "Ion bypassa armatura — HG p.30; deducted from Power + bandwidth (FAQ HG 2022 p.1)"

Nel body `AttackModal` (riga ~1552):

```js
onApply={(ionDamage, ionRounds) => {
  applyIonDamage(target.id, ionDamage, ionRounds)
  const remaining = Math.max(0, (target.currentPower ?? target.profile.maxPower ?? 100) - ionDamage)
  addLogEntry(`${attacker.profile.name} → ${target.profile.name}: ${weapon.label} — −${ionDamage} Power (${remaining} remaining, ${ionRounds}R).`)
  emitEffect('ion_burst', { duration: 1500, hex: target.position })
  closeModal()
}}
```

#### `AttackModal` — calcolo thrustAvailable reazione (riga ~1300)

Sostituire `- target.ionPenalty ?? 0` con il calcolo via `computeIonThrustEffect`.

### 5.7 `src/components/map/useCanvasRenderer.js` (riga ~176)

Importare `computeIonThrustEffect`. Sostituire:

```js
// PRIMA
- (ship.ionPenalty ?? 0)
// DOPO
// usa ionThrustCap come ceiling invece di sottrazione
const basePow = ship.basePower ?? ship.profile.maxPower ?? 100
const ionCap  = computeIonThrustEffect(ship.profile.thrust, ship.currentPower ?? basePow, basePow)
const thrustAvail = Math.min(ionCap, Math.max(0,
  ship.profile.thrust + (ship.thrustBonusThisRound ?? 0)
  - ship.thrustUsedThisRound - (ship.thrustPenalty ?? 0)
))
```

### 5.8 `src/components/map/useMapInteraction.js` (riga ~139)

Stessa sostituzione di `5.7`.

### 5.9 `src/components/map/ShipTooltip.jsx`

- Aggiungere riga Power bar (analoga alla hull bar ma colore `text-blue-400`):
  `Power: ${ship.currentPower ?? ship.profile.maxPower} / ${ship.basePower ?? ship.profile.maxPower}`
- Aggiornare riga Ion disruption: mostrare Power ridotto, non thrust ridotto:
  `Ion disruption — ${ship.ionPowerReduction} Power lost (${ship.ionRoundsLeft}R)`
- Aggiornare calcolo `thrustAvail` con `computeIonThrustEffect`.

### 5.10 `src/components/modals/ThrustModal.jsx` (riga ~27)

Sostituire formula thrustAvailable. Importare e usare `computeIonThrustEffect`.

### 5.11 `src/components/modals/MissileImpactModal.jsx` (riga ~76)

Aggiornare calcolo thrust disponibile per Evasive Action.

### 5.12 `src/components/map/BasicBattleView.jsx`

- Aggiornare badge Ion: `ION ${ship.ionRoundsLeft}R — -${ship.ionPowerReduction} PWR`
- Aggiornare status row: mostrare Power corrente e riduzione, non thrust penalty.
- Se la nave ha `maxPower`, mostrare una mini Power bar nel status zone.

### 5.13 `src/components/modals/ShipDetailModal.jsx`

- Aggiungere riga **MAX POWER** nella sezione statistiche base.
- Se Ion attivo: aggiungere riga `CURRENT POWER` con barra colorata (blu/cyan).
- Rimuovere riferimento a `ionPenalty`.

---

## 6. UI — Power bar display

La Power bar segue il pattern della Hull bar ma con palette blu elettrico:

```jsx
// Colore barra in base al Power ratio
ratio >= 0.75 → bg-blue-500
ratio >= 0.50 → bg-blue-600
ratio >= 0.25 → bg-yellow-600
ratio < 0.25  → bg-red-600
```

Mostrata in:

- `ShipTooltip.jsx` — riga compatta con percentuale
- `ShipDetailModal.jsx` — barra completa
- `BasicBattleView.jsx` — status zone (solo quando Ion attivo)

Il badge **ION NR** sulla bento card in basic mode mantiene la stessa visibilità. Il canvas vector continua a mostrare la blue aura su `ionRoundsLeft > 0`.

---

## 7. Backward compatibility — sessioni esistenti

Le sessioni salvate prima di v1.22.0 non hanno i nuovi campi. Il restore gestisce i valori mancanti con fallback:

| Campo mancante | Fallback |
| -------------- | -------- |
| `ship.basePower` | `ship.profile.maxPower ?? 100` |
| `ship.currentPower` | `ship.basePower ?? 100` |
| `ship.ionPowerReduction` | `0` |
| `ship.baseBandwidth` | `ship.profile.computerBandwidth ?? 0` |
| `ship.currentBandwidth` | `ship.baseBandwidth ?? 0` |
| `ship.bandwidthReduction` | `0` |
| `ship.hardened` | `ship.profile.hardened ?? false` |
| `profile.maxPower` | `100` |
| `profile.computerBandwidth` | `0` |
| `profile.hardened` | `false` |

Navi con `ionPenalty` attivo al restore: valore ignorato (perso). Non critico — la sessione riparte con Power pieno.

Aggiungere i nuovi campi ship ai snapshot inclusi in:

- `extractBattleSnapshot` (useAutosave.js)
- `hasSignificantChange` (useAutosave.js) — aggiungere `currentPower`, `currentBandwidth` al check
- JSON export/import (io.js o battleStore)
- `pushHistory` / snapshot undo-redo

---

## 8. Test da scrivere

### `src/store/battleStore.test.js`

| # | Test | Atteso |
| - | ---- | ------ |
| 1 | `addShip` con `maxPower: 80`, `computerBandwidth: 10` | `basePower: 80`, `currentPower: 80`, `baseBandwidth: 10`, `currentBandwidth: 10` |
| 2 | `addShip` senza `maxPower`/`computerBandwidth` | `basePower: 100`, `baseBandwidth: 0` |
| 3 | `applyIonDamage(id, 60, 1)` su nave con `basePower: 100`, `baseBandwidth: 10` | `ionPowerReduction: 60`, `currentPower: 40`, `bandwidthReduction: 60`, `currentBandwidth: 0`, `ionRoundsLeft: 1` |
| 4 | Ion stacking — secondo colpo Ion su nave già ridotta | `ionPowerReduction` addizionato, `currentPower` ridotto ulteriormente |
| 5 | `currentPower` non va sotto 0 | `currentPower: 0` se `ionPowerReduction >= basePower` |
| 6 | `buildNextRoundState` con `ionRoundsLeft: 1` | Power + bandwidth ripristinati, riduzioni azzerate |
| 7 | `buildNextRoundState` con `ionRoundsLeft: 2` | Power ancora ridotto, `ionRoundsLeft: 1` |
| 8 | `buildNextRoundState` con `ionRoundsLeft: 0` | Power/bandwidth invariati |
| 9 | Ion con D3=2 rounds (Effect ≥ 6) | `ionRoundsLeft: 2`, Power ridotto per 2 round |
| 10 | `applyIonDamage` su nave `hardened: true` | Ship invariata, nessun effetto |
| 11 | `applyIonDamage` su nave con `computerBandwidth: 0` | Power ridotto, `currentBandwidth: 0` (no DM-2 applicato) |
| 12 | `ionRoundsLeft` stacking — secondo colpo con durata maggiore | `ionRoundsLeft = max(existing, new)` |

### `src/utils/combat.test.js`

| # | Test | Atteso |
| - | ---- | ------ |
| 13 | `computeIonThrustEffect(4, 100, 100)` | `4` (Power pieno) |
| 14 | `computeIonThrustEffect(4, 50, 100)` | `2` (50% → floor(4×0.5)) |
| 15 | `computeIonThrustEffect(4, 0, 100)` | `0` (Power a 0) |
| 16 | `computeIonThrustEffect(4, 25, 100)` | `1` (25% → floor(4×0.25)) |
| 17 | `computeIonThrustEffect(4, 100, 0)` | `4` (maxPower=0 → nessun effetto) |
| 18 | `computeIonThrustEffect(6, 30, 40)` | `4` (75% → floor(6×0.75)) |

### `src/data/weapons.test.js` (o weapons.spec.js)

| # | Test | Atteso |
| - | ---- | ------ |
| 19 | `WEAPONS['Ion Cannon'].barbetteOnly` | `true` |
| 20 | `WEAPONS['Ion Cannon'].damageMultiple` | `10` |
| 21 | `WEAPONS['Ion Cannon Bay (Small)'].bayOnly` | `true` |
| 22 | `WEAPONS['Ion Cannon Bay (Small)'].damageDice` | `6` |
| 23 | `WEAPONS['Ion Cannon Bay (Medium)'].damageMultiple` | `20` |
| 24 | `WEAPONS['Ion Cannon Bay (Large)'].maxRange` | `'Long'` |
| 25 | Nessuna arma Ion ha trait `'Defensive'` | `DEFENSIVE_WEAPONS` non include ID Ion |

---

## 9. Aggiornamenti documentazione

Dopo l'implementazione (parte del commit `chore(release): v1.22.0`):

- **`doc/field-manual.md` §9.10** — riscrivere sezione Ion Cannon con formula corretta, Power bar, valori di default maxPower. Aggiungere nota su barbette-only.
- **`src/components/help/HelpScreen.jsx`** — sincronizzare con field-manual.
- **`CHANGELOG.md`** — aggiungere `[1.22.0]` con `Fixed` Ion formula e `Added` Power stat.
- **`package.json`** — bump a `1.22.0`.
- **`src/components/dashboard/Dashboard.jsx`** — badge versione.
- **`README.md`** — aggiornare conteggio test.
- **`doc/thrust-and-drift-space-combat-simulator-spec.md`** — §14.20.
- **`HANDOFF.md`** — aggiornare stato.

---

## 10. Ordine di implementazione consigliato

1. `src/utils/combat.js` — `computeIonThrustEffect` (funzione pura, testabile subito)
2. `src/data/weapons.js` — aggiornare Ion Cannon barbette + aggiungere 3 entry Bay; aggiornare typedef
3. `src/data/defaultProfiles.js` — aggiungere `maxPower`, `computerBandwidth`, `hardened` ai preset
4. `src/components/forms/ShipProfileForm.jsx` — campi MAX POWER, COMPUTER BANDWIDTH, HARDENED; filtri mount slot
5. `src/store/battleStore.js` — `addShip`, `buildNextRoundState`, `applyIonDamage` (Power + bandwidth + hardened guard), rimozione `ionPenalty`
6. Tutti i riferimenti a `ionPenalty` negli altri file (grep + sostituisci con `computeIonThrustEffect`)
7. `src/components/modals/AttackModal.jsx` — `IonDamageStep` generalizzato (usa `weapon.damageDice` + `weapon.damageMultiple`); guard hardened; display bandwidth
8. UI displays: `ShipTooltip`, `BasicBattleView`, `ShipDetailModal`, `ThrustModal`, `MissileImpactModal`
9. Canvas: `useCanvasRenderer`, `useMapInteraction`
10. Test suite (25 test cases — §8)
11. Doc update + v1.22.0

**File da modificare (totale):** 14 file come in precedenza + nessuno aggiuntivo (i nuovi campi ricadono sugli stessi file).

**Commit suggeriti (uno per step logico):**

```text
feat(combat): computeIonThrustEffect utility function
feat(weapons): Ion Cannon barbette-only, bay variants (S/M/L), ignoresArmour, damageMultiple
feat(power): maxPower, computerBandwidth, hardened fields — profiles and ShipProfileForm
feat(battle): ship Power + bandwidth stat — addShip, applyIonDamage, buildNextRoundState
refactor(ion): replace ionPenalty references with computeIonThrustEffect across all files
feat(attack): IonDamageStep — NbD×multiple formula, hardened guard, bandwidth display
feat(ui): Ion display — Power/bandwidth bars in tooltip, detail modal, bento card
test(ion): Power stat, bandwidth, hardened, bay weapons — 25 test cases
chore(release): v1.22.0 docs + version bump
```
