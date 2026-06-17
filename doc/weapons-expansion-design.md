# Thrust & Drift — Weapons Expansion Design

> Documento di implementazione per l'aggiunta di nuove armi da High Guard 2022 e CRB.
> Versione di riferimento: **v1.18.1**

---

## Sommario

| Tier | Armi | Complessità | Nuove meccaniche |
| ------ | ------ | ------------- | ------------------ |
| 1 | Fusion Gun, Plasma Gun | Bassa | Nessuna — solo dati |
| 2 | 7 Barbette standard | Media | `damageMultiple` post-armatura |
| 3a | Missile Barbette | Media | Salva fissa da 5, ammo separato |
| 3b | Torpedo (Barbette) | Media | Nuovo tipo missile (Torpedo) |
| 4 | Ion Cannon | Alta | Nuovo stato `powerStunRounds` |

---

## Stato corrente dell'architettura

### `src/data/weapons.js`

Struttura di ogni weapon entry:

```js
{
  id:           string,      // chiave univoca (WeaponType)
  label:        string,      // display name
  attackDM:     number,      // DM intrinseco al tiro di attacco
  damageDice:   number,      // numero di d6 per il danno
  damageBonus:  number,      // bonus piatto (Effect è gestito separatamente)
  maxRange:     string,      // band cap — 'Special' = nessun cap
  traits:       string[],    // ['AP 4', 'Radiation', 'Smart', …] — informativo
  turretOnly:   boolean,
  bayOnly:      boolean,
  notes:        string,
}
```

**Nota**: il trait `AP` è attualmente solo informativo — il calcolo del danno in `AttackDamageStep` usa sempre l'armatura piena dalla scheda. AP non riduce meccanicamente l'armatura. Questa è una limitazione pre-esistente, non in scope qui.

### `src/components/modals/AttackModal.jsx`

Costanti rilevanti (linee 22–24):

```js
const BEAM_WEAPONS = ['Pulse Laser', 'Beam Laser', 'Particle Beam', 'Railgun']
const LASER_TYPES  = ['Pulse Laser', 'Beam Laser']
```

- `BEAM_WEAPONS` → riceve effetto canvas `laser_ray` a fine attacco
- `LASER_TYPES` → abilita la reazione Disperse Sand nel pannello Reactions

Formula danno in `AttackDamageStep` (linea ~601):

```js
const total = Math.max(0, roll.total + effectBonus - armor)
```

### `src/components/map/tokenRenderers.js`

La funzione `drawLaserRay(ctx, from, to, weaponType, t)` ha uno switch sul `weaponType` per scegliere il colore del raggio. Va aggiornata per ogni nuova arma in `BEAM_WEAPONS`.

---

## Tier 1 — Fusion Gun & Plasma Gun (turret)

**Fonte**: HG p.28 — Turret Weapons table

### Dati RAW

| Weapon | TL | Range | Damage | Traits |
| -------- | ---- | ------- | -------- | -------- |
| Fusion Gun | 14 | Medium | 4D | Radiation |
| Plasma Gun | 11 | Medium | 3D | — |

AttackDM: non listato nella colonna Bonuses del CRB p.167 → `0` (come Particle Beam).

### Modifiche richieste

#### `src/data/weapons.js`

Aggiungere dopo `'Particle Beam'`:

```js
'Fusion Gun': {
  id: 'Fusion Gun',
  label: 'Fusion Gun',
  attackDM: 0,
  damageDice: 4,
  damageBonus: 0,
  maxRange: 'Medium',   // HG p.28
  traits: ['Radiation'],
  turretOnly: false,
  bayOnly: false,
  notes: 'Radiation trait: crew damage on critical hits. Power-hungry.',
},
'Plasma Gun': {
  id: 'Plasma Gun',
  label: 'Plasma Gun',
  attackDM: 0,
  damageDice: 3,
  damageBonus: 0,
  maxRange: 'Medium',   // HG p.28
  traits: [],
  turretOnly: false,
  bayOnly: false,
  notes: 'High energy plasma stream. Good balance of power and cost.',
},
```

Aggiornare il JSDoc `@typedef`:

```js
/** @typedef {'Pulse Laser'|'Beam Laser'|'Missile Rack'|'Sandcaster'|'Particle Beam'|'Railgun'|'Fusion Gun'|'Plasma Gun'} WeaponType */
```

#### `src/components/modals/AttackModal.jsx`

```js
const BEAM_WEAPONS = ['Pulse Laser', 'Beam Laser', 'Particle Beam', 'Railgun', 'Fusion Gun', 'Plasma Gun']
```

Fusion Gun e Plasma Gun **non** sono laser → non aggiungere a `LASER_TYPES` (nessuna Disperse Sand).

#### `src/components/map/tokenRenderers.js`

Nel `switch(weaponType)` di `drawLaserRay`, aggiungere:

```js
case 'Fusion Gun':
  color = '#f97316'   // arancio intenso (orange-500)
  glowColor = '#ea580c'
  break
case 'Plasma Gun':
  color = '#4ade80'   // verde plasma (green-400)
  glowColor = '#16a34a'
  break
```

Nessuna altra modifica.

---

## Tier 2 — Barbette standard (damageMultiple: 3)

**Fonte**: HG p.29–30

### Meccanica Damage Multiple

> "After a hit is scored, roll damage, subtracting armour and other countermeasures from the total. Multiply the remaining damage by the Damage Multiple for the final damage." — HG p.29

Formula:

```text
finalDamage = max(0, rawDiceRoll + attackEffect - effectiveArmour) × damageMultiple
```

Il moltiplicatore si applica **dopo** l'armatura, non prima.

### Dati RAW — Barbettes (HG p.30)

| Weapon | TL | Range | Damage | Traits | DM |
| -------- | ---- | ------- | -------- | -------- | ---- |
| Beam Laser Barbette | 10 | Medium | 2D | — | +4 |
| Fusion Barbette | 12 | Medium | 5D | AP 3, Radiation | 0 |
| Particle Barbette | 11 | Very Long | 4D | Radiation | 0 |
| Plasma Barbette | 11 | Medium | 4D | AP 2 | 0 |
| Pulse Laser Barbette | 9 | Long | 3D | — | +2 |
| Railgun Barbette | 10 | Medium | 3D | AP 5 | 0 |

*Ion Cannon e Missile/Torpedo Barbette trattati separatamente (Tier 3a, 3b, 4).*

### Modifiche richieste

#### `src/data/weapons.js`

1. Aggiungere campo `damageMultiple` a **tutte** le entry esistenti (default `1`):

```js
'Pulse Laser': {
  …
  damageMultiple: 1,   // turret — no multiplier
  …
},
// ripetere per Beam Laser, Missile Rack, Sandcaster, Particle Beam, Railgun,
// Fusion Gun, Plasma Gun
```

1. Aggiungere le 6 barbette standard:

```js
'Beam Laser Barbette': {
  id: 'Beam Laser Barbette',
  label: 'Beam Laser Barbette',
  attackDM: 4,            // HG p.30 — DM+4 to attack rolls
  damageDice: 2,
  damageBonus: 0,
  maxRange: 'Medium',
  damageMultiple: 3,      // HG p.29 — Barbette Damage Multiple
  traits: [],
  turretOnly: false,
  bayOnly: false,
  notes: 'Barbette: (2D + Effect − Armour) × 3. Cannot be used for Point Defence.',
},
'Particle Barbette': {
  id: 'Particle Barbette',
  label: 'Particle Barbette',
  attackDM: 0,
  damageDice: 4,
  damageBonus: 0,
  maxRange: 'Very Long',
  damageMultiple: 3,
  traits: ['Radiation'],
  turretOnly: false,
  bayOnly: false,
  notes: 'Barbette: (4D + Effect − Armour) × 3. Radiation trait.',
},
'Pulse Laser Barbette': {
  id: 'Pulse Laser Barbette',
  label: 'Pulse Laser Barbette',
  attackDM: 2,            // HG p.31 — DM+2 to attack rolls
  damageDice: 3,
  damageBonus: 0,
  maxRange: 'Long',
  damageMultiple: 3,
  traits: [],
  turretOnly: false,
  bayOnly: false,
  notes: 'Barbette: (3D + Effect − Armour) × 3. Cannot be used for Point Defence.',
},
'Fusion Barbette': {
  id: 'Fusion Barbette',
  label: 'Fusion Barbette',
  attackDM: 0,
  damageDice: 5,
  damageBonus: 0,
  maxRange: 'Medium',
  damageMultiple: 3,
  traits: ['AP 3', 'Radiation'],
  turretOnly: false,
  bayOnly: false,
  notes: 'Barbette: (5D + Effect − Armour) × 3. AP 3 (informativo), Radiation.',
},
'Plasma Barbette': {
  id: 'Plasma Barbette',
  label: 'Plasma Barbette',
  attackDM: 0,
  damageDice: 4,
  damageBonus: 0,
  maxRange: 'Medium',
  damageMultiple: 3,
  traits: ['AP 2'],
  turretOnly: false,
  bayOnly: false,
  notes: 'Barbette: (4D + Effect − Armour) × 3. AP 2 (informativo).',
},
'Railgun Barbette': {
  id: 'Railgun Barbette',
  label: 'Railgun Barbette',
  attackDM: 0,
  damageDice: 3,
  damageBonus: 0,
  maxRange: 'Medium',
  damageMultiple: 3,
  traits: ['AP 5'],
  turretOnly: false,
  bayOnly: false,
  notes: 'Barbette: (3D + Effect − Armour) × 3. AP 5 (informativo). Kinetic.',
},
```

1. Aggiornare il JSDoc `@typedef` con tutti i nuovi tipi.

#### `src/components/modals/AttackModal.jsx`

**`AttackDamageStep`** — aggiungere prop `damageMultiple` e modificare il calcolo:

```jsx
function AttackDamageStep({ damageDice, damageMultiple = 1, effectBonus, armor, … }) {

  const handleAutoRoll = () => {
    const roll = rollDice(damageDice, 6)
    const netBeforeMultiple = Math.max(0, roll.total + effectBonus - armor)
    const total = netBeforeMultiple * damageMultiple
    setDamageResult({ roll, netBeforeMultiple, total, effectBonus, armor, damageMultiple })
  }

  const handleManualConfirm = () => {
    const raw = Number(manualRaw)
    if (!raw && raw !== 0) return
    const netBeforeMultiple = Math.max(0, raw + effectBonus - armor)
    const total = netBeforeMultiple * damageMultiple
    setDamageResult({ roll: { results: [], total: raw }, netBeforeMultiple, total, effectBonus, armor, damageMultiple })
  }

  // Header label:
  // damageMultiple > 1
  //   ? `(${damageDice}D + Effect (${effectBonus}) − Armour (${armor})) × ${damageMultiple}`
  //   : `${damageDice}D + Effect (${effectBonus}) − Armour (${armor})`

  // Result display (quando damageResult !== null):
  // damageMultiple > 1:
  //   "[dice] + effect − armor = {netBeforeMultiple} × {damageMultiple} = {total}"
  // altrimenti rimane invariato
}
```

**Root `AttackModal`** — passare `damageMultiple` a `AttackDamageStep`:

```jsx
<AttackDamageStep
  damageDice={weapon?.damageDice ?? 1}
  damageMultiple={weapon?.damageMultiple ?? 1}
  …
/>
```

**Log string** in `handleApplyDamage`:

```js
const multStr = (weapon?.damageMultiple ?? 1) > 1 ? ` (×${weapon.damageMultiple})` : ''
applyDamage(target.id, damageResult.total, `${weaponKey}${multStr} from ${attacker.profile.name}`)
```

#### `src/components/modals/AttackModal.jsx` — BEAM_WEAPONS

Le barbette laser/particle emettono il raggio visivo:

```js
const BEAM_WEAPONS = [
  'Pulse Laser', 'Beam Laser', 'Particle Beam', 'Railgun',
  'Fusion Gun', 'Plasma Gun',
  'Beam Laser Barbette', 'Particle Barbette', 'Pulse Laser Barbette',
  'Fusion Barbette', 'Plasma Barbette', 'Railgun Barbette',
]
```

Railgun Barbette è cinetico ma emette comunque un raggio visivo (proiettile tracer).

#### `src/components/map/tokenRenderers.js` — colori raggio

```js
case 'Beam Laser Barbette':
  color = '#38bdf8'; glowColor = '#0284c7'; break   // sky-400 (stesso Beam Laser, più potente)
case 'Pulse Laser Barbette':
  color = '#7dd3fc'; glowColor = '#0ea5e9'; break   // sky-300 (stesso Pulse Laser)
case 'Particle Barbette':
  color = '#c084fc'; glowColor = '#9333ea'; break   // purple-400 (stesso Particle Beam)
case 'Fusion Barbette':
  color = '#fb923c'; glowColor = '#ea580c'; break   // orange-400
case 'Plasma Barbette':
  color = '#86efac'; glowColor = '#22c55e'; break   // green-300
case 'Railgun Barbette':
  color = '#fdba74'; glowColor = '#f97316'; break   // orange-300 (cinético, come Railgun)
```

#### `src/components/ui/HelpScreen.jsx` e `doc/field-manual.md`

Aggiungere sezione **Barbettes** nell'Attack Phase (§9 / Attack section):

```text
Barbette weapons occupy one Hardpoint (like a turret) but consume 5 tons of internal
space and use the Gunner skill. Damage is calculated as:
  finalDamage = max(0, rawDice + Effect − Armour) × 3
The multiplier applies AFTER armour subtraction.
Barbettes cannot be used for Point Defence reactions.
```

---

## Tier 3a — Missile Barbette

**Fonte**: HG p.30–31

> "A missile barbette fires five missiles at a time and holds enough missiles for five full salvos (a total of 25 missiles)."

### Differenze da Missile Rack

| Missile Rack | Missile Barbette |
| -- | -- | -- |
| Salvo | 1–N (player-chosen) | Fisso: 5 |
| Ammo totale | 12 per rack | 25 per barbette |
| Damage per missile | 4D | 4D |
| Range | Special | Special |
| Traits | Smart | Smart |

### Modifiche richieste

#### `src/data/weapons.js`

```js
'Missile Barbette': {
  id: 'Missile Barbette',
  label: 'Missile Barbette',
  attackDM: 0,
  damageDice: 4,
  damageBonus: 0,
  maxRange: 'Special',
  damageMultiple: 1,   // missile damage non usa il multiplier barbette
  traits: ['Smart'],
  turretOnly: false,
  bayOnly: false,
  notes: 'Fires fixed salvo of 5 missiles. Holds 25 total (5 salvos). Same guided mechanic as Missile Rack.',
},
```

#### `src/utils/combat.js`

Aggiornare `countMissileRacks` → sostituire o affiancare con una funzione generica:

```js
/**
 * Count total missile ammo capacity across all turrets.
 * Missile Rack: 12 per weapon slot. Missile Barbette: 25 per weapon slot.
 * // MgT2e CRB p.162, HG p.31
 * @param {{ turrets?: Array<{ weapons: string[] }> }} profile
 * @returns {number}
 */
export function countMissileAmmoCapacity(profile) {
  const turrets = profile.turrets ?? []
  const racks     = turrets.flatMap((t) => t.weapons).filter((w) => w === 'Missile Rack').length
  const barbettes = turrets.flatMap((t) => t.weapons).filter((w) => w === 'Missile Barbette').length
  return racks * 12 + barbettes * 25
}

// Mantenere countMissileRacks per backward-compat o rimuoverlo se non usato altrove.
```

Aggiornare tutti i callsite di `countMissileRacks` → `countMissileAmmoCapacity`.

#### `src/components/modals/AttackModal.jsx`

```js
const isMissile = weaponKey === 'Missile Rack' || weaponKey === 'Missile Barbette'
```

Per `Missile Barbette` la salva è fissa a 5 — nascondere lo stepper e mostrare solo il count:

```jsx
{isMissile && weaponKey === 'Missile Barbette' && (
  <p className="font-mono text-xs text-(--neon-cyan)">
    SALVO FISSO: 5 missiles · Ammo: <span>{ammoLeft}</span>
  </p>
)}
{isMissile && weaponKey === 'Missile Rack' && (
  // stepper esistente invariato
)}
```

In `handleLaunchMissile`:

```js
const salvoSize = weaponKey === 'Missile Barbette' ? 5 : missileCount
launchMissile(attacker.id, target.id, salvoSize, attacker.position, attacker.vector, 'Standard')
```

#### `src/store/battleStore.js`

Qualunque callsite di `countMissileRacks` → `countMissileAmmoCapacity` (da `combat.js`).

---

## Tier 3b — Torpedo (Torpedo Barbette)

**Fonte**: HG p.30–31

> "A torpedo is a heavy anti-ship missile. Each torpedo barbette holds three torpedoes."
> Damage: 6D. Traits: Smart.

### Approccio

Torpedo funziona identicamente ai missili (Smart/guidato, stesso sistema di movimento) ma con:

- Ammo: 3 per barbette (1 salva da 3, no ricarica in battaglia)
- Danno: 6D per torpedo
- Il token sul canvas può essere distinto (colore diverso) o riusare il missile token

### Modifiche richieste

#### `src/data/weapons.js`

```js
'Torpedo': {
  id: 'Torpedo',
  label: 'Torpedo',
  attackDM: 0,
  damageDice: 6,           // HG p.30 — 6D per torpedo
  damageBonus: 0,
  maxRange: 'Special',
  damageMultiple: 1,
  traits: ['Smart'],
  turretOnly: false,
  bayOnly: false,
  notes: 'Barbette-fired heavy missile. 3 per barbette, no reload. Guided: Thrust 10, 10-round fuel.',
},
```

#### `src/utils/combat.js`

```js
export function countMissileAmmoCapacity(profile) {
  const turrets = profile.turrets ?? []
  const racks      = turrets.flatMap((t) => t.weapons).filter((w) => w === 'Missile Rack').length
  const barbettes  = turrets.flatMap((t) => t.weapons).filter((w) => w === 'Missile Barbette').length
  const torpedoes  = turrets.flatMap((t) => t.weapons).filter((w) => w === 'Torpedo').length
  return racks * 12 + barbettes * 25 + torpedoes * 3
}
```

#### `src/components/modals/AttackModal.jsx`

```js
const isMissile = ['Missile Rack', 'Missile Barbette', 'Torpedo'].includes(weaponKey)
```

Torpedo ha salva variabile (1–3) come Missile Rack ma con max `ammoLeft` (tipicamente 3):

```js
const FIXED_SALVO_WEAPONS = ['Missile Barbette']  // salva fissa da 5
// Torpedo usa lo stepper normale, capped a min(ammoLeft, 3)
```

In `handleLaunchMissile`, passare il tipo di proiettile:

```js
const missileType = weaponKey === 'Torpedo' ? 'Torpedo' : 'Standard'
launchMissile(attacker.id, target.id, salvoSize, attacker.position, attacker.vector, missileType)
```

#### `src/store/battleStore.js` — `launchMissile`

Il tipo `'Torpedo'` viene già salvato nel missile object (`m.type`). Nessuna modifica al movimento necessaria — la guida funziona identica. La differenza è solo nel danno applicato al momento dell'impatto.

#### `src/components/modals/MissileImpactModal.jsx`

Quando `missile.type === 'Torpedo'`, il danno base per unità è 6D (vs 4D per missile Standard). La modal legge `missile.damageDice` dal missile object o lo deriva dal tipo:

```js
const damageDicePerUnit = missile.type === 'Torpedo' ? 6 : 4
```

Verificare che `launchMissile` in `battleStore.js` salvi `damageDice` nel missile object, oppure derivarlo da `missile.type` in `MissileImpactModal`.

---

## Tier 4 — Ion Cannon (Barbette)

**Fonte**: HG p.30

> "Ion weapons overload power systems, temporarily disrupting critical systems on board a ship without causing permanent damage."
> "When an Ion weapon successfully hits a target, roll for its damage but ignore any armour the target possesses. Instead of applying damage to the target's hull, it is instead temporarily deducted from the target's Power."
> "This reduction in Power lasts until the target completes its next set of actions, in either the current round or the next."
> "If the Effect of the attack roll is 6 or more, the reduction in Power lasts for D3 rounds."

Statistiche HG p.30: Damage 2D×10 · Range Medium · Traits: Ion.

### Interpretazione del dato `2D×10`

`2D×10` = `(2D6) × 10` = Power ridotto di (risultato×10). Non è danno all'hull. Il valore ×10 è sulla scala Power interna della nave (non usata nell'app). Per semplicità operativa nel VTT: modellare come **penalità temporanea al thrust disponibile**.

### Approccio VTT semplificato (raccomandato)

**Effetto**: il colpo Ion riduce il `thrustAvailable` del target di `roll2D6()` per N round (dove N = 1, o D3 se Effect ≥ 6). Non causa danno all'hull.

### Nuovo stato in `battleStore.js`

```js
// Nelle ship properties (buildNextRoundState li azzera):
ionPenalty:       0,   // thrust points temporaneamente sottratti
ionRoundsLeft:    0,   // round rimanenti
```

`buildNextRoundState` deve decrementare `ionRoundsLeft` e azzerare `ionPenalty` quando `ionRoundsLeft === 0`.

Nuova action:

```js
applyIonDamage: (targetId, ionPower, rounds) => {
  set((s) => ({
    ships: s.ships.map((sh) => sh.id !== targetId ? sh : {
      ...sh,
      ionPenalty:    ionPower,
      ionRoundsLeft: rounds,
    }),
  }))
},
```

### Calcolo thrust disponibile

Ovunque si calcola `thrustAvailable` (HUD, ThrustModal, useAttackSetup, ContextMenu):

```js
thrustAvailable = profile.thrust
  + (thrustBonusThisRound ?? 0)
  - thrustUsedThisRound
  - (thrustPenalty ?? 0)
  - (ionPenalty ?? 0)       // ← aggiunta
```

### Modifiche ad `AttackModal.jsx`

`Ion Cannon` non è in `BEAM_WEAPONS` (nessun raggio visivo laser). L'attacco roll avviene normalmente. Al posto di `AttackDamageStep`, si salta allo step **Ion** che mostra:

- Roll dado per la potenza Ion: `2D6 × 10` (il ×10 è la scala Power, in pratica mostra solo il valore raw 2D6 come "penalità thrust")
- Durata: 1 round, oppure D3 se Effect ≥ 6
- Pulsante: **APPLY ION DISRUPTION**

Alternativa più semplice: riutilizzare `AttackDamageStep` ma con logica speciale:

```js
// Quando weaponKey === 'Ion Cannon':
// - non sottrarre armatura
// - non applicare applyDamage()
// - chiamare applyIonDamage(targetId, rawRoll, rounds)
// - mostrare testo "ION DISRUPTION — X thrust penalty for N round(s)"
```

### Effetto visivo

Nuovo effetto `'ion_burst'` in `effectQueue.js` → `useCanvasEffects.js`:

- Anello pulsante blu elettrico intorno al target
- Durata: ~1.5 s
- Colore: `#60a5fa` (blue-400)

### `src/data/weapons.js`

```js
'Ion Cannon': {
  id: 'Ion Cannon',
  label: 'Ion Cannon',
  attackDM: 0,
  damageDice: 2,          // 2D6 → moltiplicato ×10 per Power, semplificato a thrust penalty
  damageBonus: 0,
  maxRange: 'Medium',     // HG p.30
  damageMultiple: 1,
  traits: ['Ion'],
  turretOnly: false,
  bayOnly: false,
  notes: 'Does not damage hull. On hit: reduces target thrust by 2D6 for 1 round (D3 rounds if Effect ≥ 6). HG p.30.',
},
```

---

## Ordine di implementazione consigliato

```text
1. Tier 1   — Fusion Gun + Plasma Gun              (30 min)
2. Tier 2   — damageMultiple + 6 Barbette          (2–3 h)
3. Tier 3a  — Missile Barbette                     (1 h)
4. Tier 3b  — Torpedo                              (1–2 h)
5. Tier 4   — Ion Cannon                           (3–4 h)
```

Ogni tier è una feature separata → commit separato per ciascuno.

---

## Checklist per ogni tier

Per ogni nuovo weapon/feature, verificare:

- [ ] Entry in `src/data/weapons.js` con tutti i campi
- [ ] `BEAM_WEAPONS` aggiornato se necessario (effetto `laser_ray`)
- [ ] `LASER_TYPES` aggiornato se difende da Disperse Sand (solo laser)
- [ ] Colore raggio in `tokenRenderers.js`
- [ ] Calcolo danno corretto (moltiplicatore per barbette, logica speciale per Ion)
- [ ] Log string aggiornata in `handleApplyDamage`
- [ ] `countMissileAmmoCapacity` aggiornato (per armi guidate)
- [ ] Field manual §9.5 / HelpScreen Attack aggiornati
- [ ] Test unit per nuove funzioni in `combat.js`
- [ ] Bump versione (patch per bugfix/trait, minor per ogni tier feature)

---

## Note sui Bays (fuori scope)

I Bay Weapons (Small Bay ×10, Medium Bay ×20, Large Bay ×100) sono esclusi dallo scope. Richiedono:

- Slot dedicati (non hardpoint/turret)
- Gunner secondario (Bay Gunner)
- Tons significativi (50/100/500t)
- Regole combattimento grandi navi (HG p.27)

Su navi di tipo Scout/Trader/Gunship (il target primario dell'app) i bay non sono mai presenti. Da rivalutare solo se si aggiunge supporto a capital ships.

---

*Fonte: High Guard Update 2022 pp.28–31, MgT2e CRB pp.167–168.*
