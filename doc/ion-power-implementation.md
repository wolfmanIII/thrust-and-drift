# Thrust & Drift — Ion Cannon: Implementazione Power RAW

> Documento di design per l'implementazione del sistema Power come da HG p.30 + FAQ HG 2022.
> Versione di riferimento: **v1.22.0** (patch successiva alla v1.21.0)

---

## 1. Motivazione e riferimenti RAW

La nostra implementazione attuale di Ion Cannon è **non conforme** a RAW su tre punti:

| Punto | Attuale (errato) | RAW (HG p.30) |
| ----- | --------------- | -------------- |
| Montaggio | Turret (qualsiasi) | **Barbette only** |
| Stat bersaglio | Thrust | **Power** |
| Formula danno | 2D6 grezzo = penalità thrust | **2D × 10, ignorando armatura** |

**FAQ HG 2022 p.1 — errata su Weapon Trait: Ion (p.30):**
> "At the end of the third paragraph, add: Deduct the same amount of damage from the computer bandwidth. Hardened computers (those with the /fib designation) are immune to Ion weapons."

---

## 2. Testo RAW completo (HG p.30)

> Ion weapons overload power systems, temporarily disrupting critical systems on board a ship without causing permanent damage. […] When an Ion weapon successfully hits a target, roll for its damage but **ignore any armour** the target possesses. Instead of applying damage to the target's hull, it is instead **temporarily deducted from the target's Power**, representing the disabling effects as they spread throughout the ship […] This reduction in Power lasts until the target completes its next set of actions, in either the **current round or the next**. If the Effect of the attack roll is **6 or more**, the reduction in Power lasts for **D3 rounds**.

**Tabella Barbette (HG p.30):**

| Weapon | TL | Range | Power | Damage | Traits |
| ------ | -- | ----- | ----- | ------ | ------ |
| Ion Cannon | 12 | Medium | 10 | **2D × 10** | Ion |

---

## 3. Decisioni di design per T&D

### 3.1 Ion Cannon → Barbette only

Ion Cannon non compare nella tabella Turret Weapons (HG p.28). Non è un'arma da torretta. In T&D va rimossa dai weapon picker dei turret slot.

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

### 3.3 Formula danno Ion

```text
ionDamage = roll_2D × 10   (ignora armatura — HG p.30)
currentPower = max(0, ship.currentPower − ionDamage)
```

Il `damageDice` in `weapons.js` resta 2 (`damageDice: 2`). Il `damageMultiple` diventa 10 per rappresentare il ×10 dalla tabella. Armatura ignorata (flag `ignoresArmour: true` o logica implicita nel modal Ion).

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

### 3.7 Computer bandwidth (FAQ)

La FAQ aggiunge: detrarre la stessa quantità anche dalla **computer bandwidth**. T&D non traccia bandwidth — fuori scope. Documentato nel field-manual come nota.

### 3.8 Hardened systems (/fib)

La FAQ specifica che i computer con designazione `/fib` sono immuni ai colpi Ion. T&D semplifica: nessun campo `hardened` implementato in v1.22.0. Il GM gestisce narrativamente. Documentato nel field-manual.

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

**Ion Cannon** — cambiamenti:

- `damageDice: 2` — invariato (roll 2D)
- `damageMultiple: 10` — **cambia** da 1 a 10 (il ×10 dalla tabella HG p.30)
- Aggiungere campo `barbetteOnly: true` — **nuovo**
- Aggiungere campo `ignoresArmour: true` — **nuovo** (Ion bypassa armatura)
- Aggiornare `notes`: citare HG p.30 + FAQ correttamente
- `attackDM: 0` — invariato
- `maxRange: 'Medium'` — invariato

Aggiungere al `@typedef WeaponType`:
nessuna modifica — Ion Cannon è già presente.

Aggiungere ai `WEAPON_DEFS` un campo strutturale per filtrare:

```js
'Ion Cannon': {
  id: 'Ion Cannon',
  label: 'Ion Cannon',
  attackDM: 0,
  damageDice: 2,
  damageBonus: 0,
  maxRange: 'Medium',
  damageMultiple: 10,      // 2D × 10 — HG p.30
  traits: ['Ion'],
  barbetteOnly: true,      // HG p.30 — solo slot barbetta
  ignoresArmour: true,     // Ion ignora armatura — HG p.30
  notes: 'No hull damage. Roll 2D×10 ignoring armour; deduct from target Power. Duration: 1 round (D3 if Effect ≥ 6). // HG p.30, FAQ HG 2022 p.1',
},
```

Aggiornare `DEFENSIVE_WEAPON_IDS` se Ion Cannon vi è incluso (non dovrebbe, ma verificare).

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

2. Nel weapon picker dei turret slot: escludere le armi con `barbetteOnly: true`.
   - Usare il flag `WEAPON_DEFS[weaponId].barbetteOnly` nel filtro.

3. Aggiornare `initialForm` e il merge `profile → form` per includere `maxPower`.

### 5.4 `src/store/battleStore.js`

#### `addShip`

Aggiungere all'istanza nave:

```js
basePower:         profile.maxPower ?? 100,
currentPower:      profile.maxPower ?? 100,
ionPowerReduction: 0,
// rimuovere: ionPenalty (non più usato)
```

#### `buildNextRoundState` (funzione pura, riga ~119)

Sostituire la logica `ionPenalty`:

```js
const ionCurrent = sh.ionRoundsLeft ?? 0
const ionNext    = Math.max(0, ionCurrent - 1)
const ionReduction = ionCurrent > 0 ? (sh.ionPowerReduction ?? 0) : 0
const restoredPower = sh.basePower ?? sh.profile.maxPower ?? 100
return {
  ...sh,
  ionRoundsLeft:     ionNext,
  ionPowerReduction: ionNext > 0 ? ionReduction : 0,
  currentPower:      ionNext > 0
    ? Math.max(0, restoredPower - ionReduction)
    : restoredPower,
}
```

#### `applyIonDamage` (riga ~920)

Nuova firma: `applyIonDamage(targetId, ionDamage, ionRounds)` — `ionDamage` è il risultato `2D × 10`.

```js
applyIonDamage: (targetId, ionDamage, ionRounds) => {
  // ...wh guard...
  set((s) => ({
    ships: s.ships.map((sh) => {
      if (sh.id !== targetId) return sh
      const basePower       = sh.basePower ?? sh.profile.maxPower ?? 100
      const prevReduction   = sh.ionPowerReduction ?? 0
      const newReduction    = prevReduction + ionDamage          // stacking
      const newRoundsLeft   = Math.max(sh.ionRoundsLeft ?? 0, ionRounds)
      const newCurrentPower = Math.max(0, basePower - newReduction)
      return { ...sh, ionPowerReduction: newReduction, currentPower: newCurrentPower, ionRoundsLeft: newRoundsLeft }
    }),
  }))
},
```

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

- Label roll: `"2D × 10 ion power:"` (non `"2D6 ion power:"`)
- Formula: `ionDamage = ionRoll * 10` (moltiplicare il risultato grezzo per 10)
- Display risultato: `−${ionDamage} Power` e mostrare Power rimanente stimato
- `onApply(ionDamage, ionRounds)` — parametro è il danno Power (non la penalità thrust)
- Note: "Ion bypassa armatura — HG p.30"

Nel body `AttackModal` (riga ~1552):

```js
onApply={(ionDamage, ionRounds) => {
  applyIonDamage(target.id, ionDamage, ionRounds)
  const remaining = Math.max(0, (target.currentPower ?? target.profile.maxPower ?? 100) - ionDamage)
  addLogEntry(`${attacker.profile.name} → ${target.profile.name}: Ion Cannon — −${ionDamage} Power (${remaining} remaining, ${ionRounds}R).`)
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

Le sessioni salvate in formato JSON prima di v1.22.0 non hanno `currentPower`, `basePower`, `ionPowerReduction`, `maxPower`. Il restore deve gestire i valori mancanti:

- `ship.basePower ?? ship.profile.maxPower ?? 100` — fallback ovunque
- `ship.currentPower ?? ship.basePower ?? 100` — fallback ovunque
- `ship.ionPowerReduction ?? 0` — fallback ovunque
- Navi che avevano `ionPenalty` attivo: al restore, il valore viene ignorato (perso). Non critico — la sessione riparte con Power pieno.

Aggiungere `currentPower`, `basePower`, `ionPowerReduction` ai campi inclusi in:

- `extractBattleSnapshot` (useAutosave.js)
- `hasSignificantChange` (useAutosave.js)
- JSON export/import (io.js o battleStore)
- `pushHistory` / snapshot undo-redo

---

## 8. Test da scrivere

### `src/store/battleStore.test.js`

| # | Test | Atteso |
| - | ---- | ------ |
| 1 | `addShip` con profilo `maxPower: 80` | `ship.basePower === 80`, `ship.currentPower === 80` |
| 2 | `addShip` senza `maxPower` | `ship.basePower === 100`, `ship.currentPower === 100` |
| 3 | `applyIonDamage(shipId, 60, 1)` | `ionPowerReduction: 60`, `currentPower: 40`, `ionRoundsLeft: 1` |
| 4 | Ion hit su nave con `currentPower` già ridotto (stacking) | `ionPowerReduction` addizionato, `currentPower` ridotto ulteriormente |
| 5 | `currentPower` non va sotto 0 | `currentPower: 0` se `ionPowerReduction >= basePower` |
| 6 | `buildNextRoundState` con `ionRoundsLeft: 1` | Power ripristinato a `basePower`, `ionPowerReduction: 0` |
| 7 | `buildNextRoundState` con `ionRoundsLeft: 2` | Power ancora ridotto, `ionRoundsLeft: 1` |
| 8 | `buildNextRoundState` con `ionRoundsLeft: 0` | Power invariato (nessun Ion) |
| 9 | Ion con `ionRoundsLeft` maggiore (D3=2 rounds) | `ionRoundsLeft: 2`, Power ridotto per 2 round |

### `src/utils/combat.test.js`

| # | Test | Atteso |
| - | ---- | ------ |
| 10 | `computeIonThrustEffect(4, 100, 100)` | `4` (Power pieno) |
| 11 | `computeIonThrustEffect(4, 50, 100)` | `2` (50% → floor(4×0.5)) |
| 12 | `computeIonThrustEffect(4, 0, 100)` | `0` (Power a 0) |
| 13 | `computeIonThrustEffect(4, 25, 100)` | `1` (25% → floor(4×0.25)) |
| 14 | `computeIonThrustEffect(4, 100, 0)` | `4` (maxPower=0 → nessun effetto) |
| 15 | `computeIonThrustEffect(6, 30, 40)` | `4` (75% → floor(6×0.75)) |

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
2. `src/data/weapons.js` — flag `barbetteOnly`, `ignoresArmour`, `damageMultiple: 10`
3. `src/data/defaultProfiles.js` — aggiungere `maxPower` ai preset
4. `src/components/forms/ShipProfileForm.jsx` — campo MAX POWER + filtro barbette
5. `src/store/battleStore.js` — `addShip`, `buildNextRoundState`, `applyIonDamage`, rimozione `ionPenalty`
6. Tutti i riferimenti a `ionPenalty` negli altri file store (cerca-sostituisci)
7. `src/components/modals/AttackModal.jsx` — `IonDamageStep` + logica chiamata
8. UI displays: `ShipTooltip`, `BasicBattleView`, `ShipDetailModal`, `ThrustModal`, `MissileImpactModal`
9. Canvas: `useCanvasRenderer`, `useMapInteraction`
10. Test suite
11. Doc update

**Commit suggeriti (uno per step logico):**

```text
feat(weapons): Ion Cannon barbette-only, damageMultiple 10, ignoresArmour flag
feat(power): add maxPower field to ship profiles and ShipProfileForm
feat(battle): ship Power stat — addShip, applyIonDamage, buildNextRoundState
feat(combat): computeIonThrustEffect utility function
feat(ui): Ion display — Power bar in tooltip, detail modal, bento card
fix(attack): IonDamageStep rolls 2D×10 deducted from Power
test(power): ion Power stat — applyIonDamage stacking, recovery, thrust effect
chore(release): v1.22.0 docs + version bump
```
