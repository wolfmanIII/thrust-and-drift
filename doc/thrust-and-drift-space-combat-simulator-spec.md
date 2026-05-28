# Thrust & Drift - Space Combat Simulator — Documento di Specifica

> Specifica completa per lo sviluppo con Claude Code.
> Sistema di riferimento: Mongoose Traveller 2e — Core Rulebook + Combattimento Spaziale Vettoriale (Traveller Companion Update 2024, pp.169–186)

---

## 1. Panoramica del Progetto

### 1.1 Descrizione

Applicazione web locale per la gestione di battaglie spaziali nel gioco di ruolo Traveller (Mongoose 2e). Funziona come un **VTT lite** (Virtual Tabletop) pensato per sessioni in presenza con schermo condiviso: il Game Master opera l'interfaccia, muove le navi degli NPC e quelle dei giocatori su loro indicazione.

Il simulatore implementa le **regole base di combattimento spaziale** del Core Rulebook integrate con il **sistema di combattimento vettoriale** del Traveller Companion, che sostituisce le semplici bande di distanza con una mappa fisica e vettori di velocità persistenti.

### 1.2 Principi di Design

- **Mappa dominante:** l'area di combattimento occupa ~90% dello schermo
- **UI minimale:** nessun pannello fisso ingombrante; tutto accessibile tramite menu contestuali (tasto destro) e modali
- **Completamente locale:** nessun backend, nessuna rete, nessun account
- **Guidato ma non rigido:** il sistema guida le fasi del round ma il GM può intervenire liberamente

---

## 2. Stack Tecnologico

| Layer | Tecnologia | Motivazione |
| --- | --- | --- |
| Framework | **React 19 + Vite 8** | Component UI + build tool moderno |
| Rendering mappa | **Canvas API** (nativo) | Performance, controllo totale, pan/zoom fluido |
| Gestione stato | **Zustand 5** | Leggero, scalabile, ideale per stato di gioco complesso |
| Styling | **Tailwind CSS v4** | UI pulita, dark mode, `@theme` tokens in CSS — nessun `tailwind.config.js` |
| Matematica hex | **Custom (utils/hex.js)** | ~30 righe, zero dipendenze esterne |
| File I/O | **Browser File API** | Import/export JSON nativo, zero dipendenze |

### 2.1 Dipendenze

```json
{
  "dependencies": {
    "react": "^19.x",
    "react-dom": "^19.x",
    "zustand": "^5.x",
    "uuid": "^14.x"
  },
  "devDependencies": {
    "vite": "^8.x",
    "@vitejs/plugin-react": "^6.x",
    "@tailwindcss/vite": "^4.x",
    "tailwindcss": "^4.x",
    "eslint": "^10.x",
    "eslint-plugin-react-hooks": "^7.x",
    "eslint-plugin-react-refresh": "^0.5.x",
    "vitest": "^4.x",
    "@vitest/coverage-v8": "^4.x",
    "@testing-library/react": "^16.x",
    "@testing-library/user-event": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "jsdom": "^29.x"
  }
}
```

---

## 3. Struttura del Progetto

```text
thrust-and-drift/
├── index.html
├── vite.config.js            ← Tailwind v4 via @tailwindcss/vite plugin + Vitest config
├── eslint.config.js
├── public/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css              ← Tailwind directives + @theme tokens
    ├── App.css                ← Global styles (logo shimmer animation, ecc.)
    ├── test-setup.js          ← Vitest setup: @testing-library/jest-dom
    ├── components/
    │   ├── dashboard/
    │   │   ├── Dashboard.jsx          ← Pre-battle lobby (layout 2 colonne)
    │   │   ├── CatalogPanel.jsx       ← Catalogo HG 2022 (sola lettura, filtri)
    │   │   └── useProfileImport.js    ← Hook import profili da file
    │   ├── map/
    │   │   ├── BattleMap.jsx          ← Canvas principale (modalità vettoriale)
    │   │   ├── BasicBattleView.jsx    ← Vista semplificata (modalità base)
    │   │   ├── useCanvasRenderer.js   ← Hook rendering hex + token
    │   │   ├── useMapInteraction.js   ← Hook pan, zoom, click, right-click
    │   │   └── tokenRenderers.js      ← Funzioni draw per navi e missili
    │   ├── modals/
    │   │   ├── Modal.jsx              ← Wrapper modale generico
    │   │   ├── ShipProfileModal.jsx   ← Crea/modifica profilo nave (modale)
    │   │   ├── AddShipModal.jsx       ← Sceglie profilo da aggiungere in battaglia
    │   │   ├── ThrustModal.jsx        ← Applica Thrust con preview mappa
    │   │   ├── EvasiveModal.jsx       ← Dichiara thrust evasivo
    │   │   ├── AttackModal.jsx        ← Risolve attacco con calcolo DM
    │   │   ├── MissileLaunchModal.jsx ← Lancia salvo missili
    │   │   ├── ShipDetailModal.jsx    ← Scheda completa nave
    │   │   ├── ActionModal.jsx        ← Azioni fase Actions (engineer, ecc.)
    │   │   ├── InitiativeModal.jsx    ← Tiro iniziativa inizio round
    │   │   └── useAttackSetup.js      ← Hook derivazione DM attacco
    │   ├── ui/
    │   │   ├── ContextMenu.jsx        ← Menu tasto destro
    │   │   ├── HUD.jsx                ← Overlay minimo + modale conferma uscita
    │   │   ├── BattleLog.jsx          ← Log eventi collassabile
    │   │   ├── PhaseTracker.jsx       ← Indicatore fase corrente
    │   │   └── Tooltip.jsx            ← Tooltip via React portal
    │   └── forms/
    │       └── ShipProfileForm.jsx    ← Form completo profilo nave
    ├── store/
    │   ├── profilesStore.js           ← Profili nave (CRUD + import/export)
    │   ├── battleStore.js             ← Stato battaglia corrente
    │   └── uiStore.js                 ← Stato UI (modal aperto, nave selezionata, ecc.)
    ├── utils/
    │   ├── hex.js                     ← Matematica esagonale (flat-top)
    │   ├── combat.js                  ← Calcoli combattimento (DM, danni, range band)
    │   ├── io.js                      ← Import/export JSON via File API
    │   └── dice.js                    ← Lancio dadi e formattazione risultati
    └── data/
        ├── weapons.js                 ← Tabelle armi, tratti, danni
        ├── rangeBands.js              ← Soglie bande di distanza
        ├── crewActions.js             ← Definizioni azioni equipaggio fase Actions
        ├── factions.js                ← Fazioni disponibili
        ├── shipCatalog.js             ← Catalogo ufficiale navi HG 2022 (sola lettura)
        └── defaultProfiles.js         ← Profili nave preimpostati (Scout, Free Trader, ecc.)
```

### 3.1 Test

Suite Vitest collocata accanto ai file sorgente (`*.test.js` / `*.test.jsx`):

| File | Coverage |
| ---- | -------- |
| `utils/hex.test.js` | `hex.js` — coordinate, distanza, pixel↔hex, range band |
| `utils/combat.test.js` | `combat.js` — DM, danni, iniziativa, attacco |
| `utils/dice.test.js` | `dice.js` — rollDice, formatDiceResults, formatCheckResult |
| `store/battleStore.test.js` | battleStore — tutte le azioni, export/import |
| `store/profilesStore.test.js` | profilesStore — CRUD, import/export |
| `store/uiStore.test.js` | uiStore — screen, modal, selection, contextMenu |
| `components/ui/Tooltip.test.jsx` | Tooltip — show/hide, portal, posizione |
| `components/ui/HUD.test.jsx` | HUD — round/fase, controllo attore |
| `components/ui/BattleLog.test.jsx` | BattleLog — entries, collapse, clear |
| `components/ui/ContextMenu.test.jsx` | ContextMenu — tutti i tipi, outside click |

```bash
npm test               # esegui tutti i test
npm run test:watch     # watch mode
npx vitest --coverage  # report copertura (v8)
```

---

## 4. Modelli Dati

### 4.1 Profilo Nave (ShipProfile)

Dati statici che descrivono la nave. Salvati e caricati come JSON.

```typescript
interface ShipProfile {
  // Metadati
  id: string                    // UUID generato automaticamente
  createdAt: string             // ISO timestamp
  
  // IDENTITÀ — solo name obbligatorio
  name: string                  // ★ OBBLIGATORIO
  shipClass?: string            // es. "Free Trader", "Scout/Courier"
  description?: string
  cost?: number                 // in MCr

  // STRUTTURA — hull, armor, thrust obbligatori
  tonnage?: number
  hull: number                  // ★ Hull points massimi
  armor: number                 // ★ Valore armatura (0 se non corazzata)

  // PROPULSIONE — thrust obbligatorio
  thrust: number                // ★ Rating M-Drive
  jump?: number                 // Rating J-Drive (0 se assente)
  powerPlant?: number           // Rating generatore

  // ARMI
  turrets?: TurretSlot[]
  bays?: BaySlot[]

  // ELETTRONICA
  computer?: number             // Computer/bis rating
  sensors?: "Civilian" | "Military" | "Advanced"
  software?: string[]           // es. ["Fire Control/1", "Auto-Repair/1"]

  // EQUIPAGGIO — pilot e gunner obbligatori se ha armi
  crew: {
    pilot: number               // ★ Skill level Pilot
    captain?: number            // Skill level Tactics(naval)
    engineer?: number           // Skill level Engineer
    gunner?: number             // ★ Skill level Gunner (obbligatorio se ha armi)
    sensors?: number            // Skill level Electronics(sensors)
    marines?: {
      count: number
      skill: number             // Skill level Gun Combat
    }
  }

  // LOGISTICA
  fuel?: number                 // Tonnellate carburante
  cargo?: number                // Tonnellate carico
  passengers?: number
}

interface TurretSlot {
  slot: number                  // 1, 2, 3...
  weapons: WeaponType[]         // Max 3 armi per torretta
}

interface BaySlot {
  type: string                  // "Missile Bay", "Particle Bay", ecc.
  size: 50 | 100
}

type WeaponType =
  | "Pulse Laser"
  | "Beam Laser"
  | "Missile Rack"
  | "Sandcaster"
  | "Particle Beam"
  | "Railgun"
```

### 4.2 Istanza Nave in Battaglia (ShipInstance)

Stato dinamico durante la battaglia. Non viene salvato nel file dei profili.

```typescript
interface ShipInstance {
  id: string                    // UUID istanza (diverso dal profilo)
  profileId: string             // Riferimento al profilo
  profile: ShipProfile          // Copia del profilo al momento dell'aggiunta
  faction: "players" | "npc" | "neutral"
  color: string                 // Colore token (hex CSS)

  // POSIZIONE E MOVIMENTO
  position: HexCoord            // Posizione sulla griglia { q, r }
  vector: HexCoord              // Vettore corrente { q, r }

  // STATO COMBATTIMENTO
  hullCurrent: number           // Hull points rimanenti
  thrustUsedThisRound: number   // Thrust già speso nel round corrente
  thrustBonusThisRound: number  // Thrust extra da Overload Drive (reset ogni round)
  criticalHits: CriticalHit[]

  // STATO ROUND
  initiative: number            // Valore iniziativa estratto
  initiativeBonusNextRound: number // Bonus iniziativa da azione Captain (reset dopo uso)
  hasActedThisPhase: boolean    // Ha già agito nella fase corrente
  evasiveThrust: number         // Thrust riservato per evasione
  turretsNeedingReload: number  // Numero torrette che richiedono ricarica (Missile Rack)

  // GUERRA ELETTRONICA
  sensorLockOn: string | null   // id nave su cui ha sensor lock attivo
  sensorLockedBy: string | null // id nave che ha sensor lock su di essa
  sensorLockDM: number          // DM attacco bonus da sensor lock (effetto del tiro)

  // MISSILI
  // I missili sono token separati (vedi MissileToken)
}

interface HexCoord {
  q: number
  r: number
}

interface CriticalHit {
  system: CriticalSystem
  severity: number              // 1, 2, 3...
  repairRoundsApplied: number   // DM cumulativo riparazione
}

type CriticalSystem =
  | "M-Drive"
  | "J-Drive"
  | "Power Plant"
  | "Fuel"
  | "Sensors"
  | "Weapons"
  | "Bridge"
  | "Hull"
  | "Crew"
```

### 4.3 Token Missile (MissileToken)

```typescript
interface MissileToken {
  id: string
  launchedBy: string            // id ShipInstance lanciante
  target: string                // id ShipInstance bersaglio
  count: number                 // Numero missili nel salvo
  position: HexCoord
  vector: HexCoord              // Vettore corrente del salvo
  thrustRemaining: number       // Thrust rimanente (parte da 10)
  type: "Standard" | "Smart" | "Nuclear" | "Ortillery"
}
```

### 4.4 Stato Battaglia (BattleState)

```typescript
interface BattleState {
  id: string
  name: string                  // Nome opzionale dello scenario
  round: number                 // Round corrente (parte da 1)
  phase: BattlePhase
  initiativeOrder: string[]     // Array di id ShipInstance, ordine iniziativa
  currentActorIndex: number     // Indice in initiativeOrder di chi agisce ora
  
  ships: ShipInstance[]
  missiles: MissileToken[]
  
  log: LogEntry[]
  
  mapSettings: {
    scale: number               // Moltiplicatore scala (1 = 648km/casella)
  }
}

type BattlePhase =
  | "setup"                     // Prima dell'inizio
  | "initiative"                // Tiro iniziativa
  | "acceleration"              // Fase accelerazione (ordine INVERSO)
  | "movement"                  // Movimento simultaneo
  | "attack"                    // Fase attacco
  | "actions"                   // Fase azioni equipaggio
  | "end"                       // Fine round, prep round successivo

interface LogEntry {
  id: string
  round: number
  phase: BattlePhase
  timestamp: string
  type: "move" | "attack" | "damage" | "action" | "system" | "info"
  shipId?: string
  message: string               // Testo leggibile in italiano
  details?: object              // Dati tecnici (DM, tiri, effetti)
}
```

---

## 5. Matematica Esagonale (utils/hex.js)

Griglia **flat-top** con coordinate assiali (q, r). Il lato piatto è in alto (ore 12).

```javascript
// === COORDINATE ===

// Distanza tra due hex (formula cubica)
function hexDistance(a, b) {
  const dq = Math.abs(a.q - b.q)
  const dr = Math.abs(a.r - b.r)
  const ds = Math.abs((-a.q - a.r) - (-b.q - b.r))
  return Math.max(dq, dr, ds)
}

// Somma vettori
function hexAdd(a, b) {
  return { q: a.q + b.q, r: a.r + b.r }
}

// Scala vettore
function hexScale(v, factor) {
  return { q: v.q * factor, r: v.r * factor }
}

// Magnitudine vettore (lunghezza in caselle)
function hexMagnitude(v) {
  return hexDistance({ q: 0, r: 0 }, v)
}

// === 6 DIREZIONI (flat-top) ===
// // Traveller Companion p.172
const HEX_DIRECTIONS = [
  { q:  1, r:  0 }, // SE
  { q:  1, r: -1 }, // NE
  { q:  0, r: -1 }, // N
  { q: -1, r:  0 }, // NW
  { q: -1, r:  1 }, // SW
  { q:  0, r:  1 }, // S
]

// Vicini di un hex
function hexNeighbors(hex) {
  return HEX_DIRECTIONS.map(d => hexAdd(hex, d))
}

// === CONVERSIONE PIXEL ↔ HEX (flat-top) ===
// size = raggio del hex (pixel)

function hexToPixel(q, r, size, offsetX = 0, offsetY = 0) {
  const x = size * (1.5 * q)
  const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r)
  return { x: x + offsetX, y: y + offsetY }
}

function pixelToHex(px, py, size, offsetX = 0, offsetY = 0) {
  const x = (px - offsetX) / size
  const y = (py - offsetY) / size
  const q = (2 / 3) * x
  const r = -(1 / 3) * x + (Math.sqrt(3) / 3) * y
  return hexRound({ q, r })
}

// Arrotonda a hex intero (necessario per pixelToHex)
function hexRound(hex) {
  const rq = Math.round(hex.q)
  const rr = Math.round(hex.r)
  const rs = Math.round(-hex.q - hex.r)
  const dq = Math.abs(rq - hex.q)
  const dr = Math.abs(rr - hex.r)
  const ds = Math.abs(rs - (-hex.q - hex.r))
  if (dq > dr && dq > ds) return { q: -rr - rs, r: rr }
  if (dr > ds) return { q: rq, r: -rq - rs }
  return { q: rq, r: rr }
}

// === RANGE BANDS ===
function getRangeBand(distance) {
  if (distance <= 0)  return "Adjacent"
  if (distance <= 2)  return "Short"
  if (distance <= 15) return "Medium"
  if (distance <= 38) return "Long"
  if (distance <= 77) return "Very Long"
  return "Distant"
}
```

---

## 6. Calcoli di Combattimento (utils/combat.js)

### 6.1 Iniziativa

```javascript
// 2D6 + Pilot skill + Ship Thrust [+ effetto Tactics(naval)]
function rollInitiative(pilotSkill, thrust, tacticsEffect = 0) {
  const roll = rollDice(2, 6)
  return {
    roll,
    total: roll + pilotSkill + thrust + tacticsEffect,
    breakdown: { roll, pilotSkill, thrust, tacticsEffect }
  }
}
```

### 6.2 Tiro di Attacco

```javascript
// 2D6 + Gunner + DM_DEX + DM_aidGunners + DM_range + DM_size - DM_evasive
// Target: 8+
function rollAttack({
  gunnerSkill,
  dexDM,
  aidGunnersDM,   // da task chain pilota
  rangeDM,        // calcolato da getRangeDM()
  weaponDM,       // Pulse Laser +2, Beam Laser +4, ecc.
  targetSizeDM,   // +1 per ogni 1000 ton bersaglio (max +6)
  evasiveDM,      // negativo: - (pilot skill × thrust evasivo)
}) {
  const roll = rollDice(2, 6)
  const total = roll + gunnerSkill + dexDM + aidGunnersDM
               + rangeDM + weaponDM + targetSizeDM + evasiveDM
  return {
    roll,
    total,
    effect: total - 8,
    hit: total >= 8,
    breakdown: { roll, gunnerSkill, dexDM, aidGunnersDM,
                 rangeDM, weaponDM, targetSizeDM, evasiveDM }
  }
}

function getRangeDM(rangeBand) {
  const table = {
    "Adjacent": 0,
    "Short":    1,
    "Medium":   0,
    "Long":    -2,
    "Very Long": -4,
    "Distant":  -6,
  }
  return table[rangeBand] ?? 0
}

function getTargetSizeDM(tonnage) {
  return Math.min(6, Math.floor(tonnage / 1000))
}
```

### 6.3 DM Caratteristica

```javascript
function getCharDM(value) {
  if (value <= 0)  return -3
  if (value <= 2)  return -2
  if (value <= 5)  return -1
  if (value <= 8)  return  0
  if (value <= 11) return +1
  if (value <= 14) return +2
  return +3
}
```

### 6.4 Validazione Thrust (Griglia Hex)

```javascript
// Su griglia hex il Thrust si distribuisce tra direzioni.
// Vincolo: sum(|Δq|, |Δr|, |Δs|) / 2 ≤ thrustAvailable
// Equivalente a: hexDistance({q:0,r:0}, delta) ≤ thrustAvailable
function isValidThrustDelta(delta, thrustAvailable) {
  return hexDistance({ q: 0, r: 0 }, delta) <= thrustAvailable
}

function applyThrust(currentVector, delta) {
  return hexAdd(currentVector, delta)
}

function applyMovement(currentPosition, currentVector) {
  return hexAdd(currentPosition, currentVector)
}
```

---

## 7. Interfaccia Utente

### 7.1 Layout Dashboard

Layout a 3 colonne:

```text
┌──────────────┬────────────────────────────────────────────┐
│              │  Header: logo + titolo                     │
│  Pannello    ├────────────────────────────────────────────┤
│  Profili     │  [CommandConsole] │ [TacticalDisplay]      │
│  (sinistra)  │  Modalità combat  │  Idle: reticolo        │
│              │  Nuova / Riprendi │  Preview: roster navi  │
└──────────────┴────────────────────────────────────────────┘
```

- **Pannello Profili** (colonna sinistra): lista profili con filtro, azioni ✎ ⧉ ⊗, import/export, accesso catalogo.
- **CommandConsole** (colonna centrale fissa 340 px): selezione modalità, pulsanti Nuova Sessione / Riprendi Sessione.
- **TacticalDisplay** (colonna destra): in stato idle mostra il reticolo di standby; dopo aver selezionato un file di sessione, mostra `SessionPreview` con round, fase, modalità e roster navi — il GM conferma prima di entrare in battaglia.

### 7.2 Layout Battaglia

```text
┌──────────────────────────────────────────────────────────┐
│  HUD overlay (top-left): Round 3 | Fase: Attacco         │
│  PhaseTracker (top-right): ordine iniziativa             │
│  LogToggle (bottom-right): pulsante espandi/collassa log │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                                                          │
│              CANVAS  (hex map)                           │
│                                                          │
│   [token navi con frecce vettore e ghost]                │
│   [token missili con contatore thrust]                   │
│                                                          │
│                                                          │
│  BattleLog (bottom, collassabile, overlay trasparente)   │
└──────────────────────────────────────────────────────────┘
```

### 7.3 HUD (overlay minimo)

```text
Round 3 / ∞     Fase: ATTACCO     [Prossima fase →]
```

Posizionato top-left, sfondo semi-trasparente scuro, testo bianco.

**Pulsante ⌂** — apre modale di conferma "ABBANDONA SESSIONE" prima di tornare alla dashboard. I dati non salvati vengono persi se confermato.

### 7.4 Phase Tracker

Mostra la sequenza delle navi nell'ordine di iniziativa, con evidenziazione della nave che agisce ora. Posizionato top-right, collassabile.

```text
Iniziativa:
● Nora's Revenge  (ini: 14)  ← agisce ora
○ Far Trader      (ini: 11)
○ Fighter-1       (ini:  9)
○ Fighter-2       (ini:  9)
```

### 7.5 Context Menu — Cella Vuota

Appare al right-click su cella vuota della mappa.

```text
┌──────────────────────────────┐
│ ➕ Aggiungi nave qui         │
│ ─────────────────────────── │
│ 📂 Carica profili nave       │
│ 💾 Salva profili nave        │
│ ─────────────────────────── │
│ 📋 Carica battaglia          │
│ 💾 Salva battaglia           │
│ ─────────────────────────── │
│ ⚙️  Impostazioni mappa       │
│ 🔄 Nuovo round               │
│ 🎲 Tira iniziativa           │
└──────────────────────────────┘
```

### 7.6 Context Menu — Token Nave

Appare al right-click su un token nave.

```text
┌──────────────────────────────┐
│ [Nome Nave] — Hull: 18/22    │
│ ─────────────────────────── │
│ 🚀 Applica Thrust            │
│ 🎯 Attacca...                │
│ ⚡ Azione equipaggio...      │
│ ─────────────────────────── │
│ 📊 Scheda nave               │
│ ✏️  Modifica stato           │
│ ─────────────────────────── │
│ 🗑️  Rimuovi dalla battaglia  │
└──────────────────────────────┘
```

### 7.7 Context Menu — Token Missile

```text
┌──────────────────────────────┐
│ Salvo: 3 missili             │
│ Bersaglio: Far Trader        │
│ Thrust rimanente: 7/10       │
│ ─────────────────────────── │
│ ✏️  Modifica salvo           │
│ 💥 Risolvi impatto           │
│ 🗑️  Rimuovi salvo            │
└──────────────────────────────┘
```

---

## 8. Modali

### 8.1 ShipProfileModal

Crea o modifica un profilo nave.

**Sezioni del form:**

1. **Identità** (tutti opzionali tranne nome)
   - Nome nave ★
   - Classe, Descrizione, Costo

2. **Struttura** (hull e armor obbligatori)
   - Tonnellaggio, Hull max ★, Armatura ★

3. **Propulsione** (thrust obbligatorio)
   - Thrust M-Drive ★, Jump Drive, Power Plant

4. **Armi** (slot torrette e bay)
   - Aggiungi/rimuovi torrette
   - Per ogni torretta: scelta armi dal dropdown

5. **Elettronica** (tutto opzionale)
   - Computer rating, Tipo sensori, Software

6. **Equipaggio** (pilot obbligatorio, gunner se ha armi)
   - Slider 0–5 per ogni ruolo

7. **Logistica** (tutto opzionale)
   - Carburante, Carico, Passeggeri

**Azioni:** Salva, Annulla, Duplica, Elimina (se in modifica)

### 8.2 AddShipModal

Seleziona un profilo da aggiungere alla battaglia.

- Lista profili disponibili con filtro per nome
- Preview del profilo selezionato
- Scelta fazione (giocatori / NPC / neutrale)
- Scelta colore token
- Posizione iniziale: "clicca sulla mappa per posizionare"

### 8.3 ThrustModal

Applica Thrust a una nave nel round corrente.

**Layout:**

- In alto: vettore corrente → freccia → vettore risultante (preview)
- Centro: 6 pulsanti hex per direzione ± (E, NE, NW, W, SW, SE)
- Sotto: input numerici Δq e Δr con validazione in tempo reale
- Barra: Thrust disponibile / usato visivamente

**Logica:**

- Ogni click su un pulsante direzionale applica +1 o -1 nella direzione
- Validazione: hexDistance({q:0,r:0}, delta) ≤ thrustAvailable
- Anteprima sulla mappa: ghost della posizione dopo il movimento con il nuovo vettore

### 8.4 AttackModal

Risolve un attacco arma.

**Step 1 — Configurazione:**

- Seleziona arma (da torretta/bay disponibili)
- Seleziona bersaglio (dropdown navi nemiche)
- Mostra range band calcolata automaticamente
- Mostra tutti i DM applicabili (range, dimensione, sensor lock, ecc.)

**Step 2 — Tiro:**

- Pulsante "Lancia 2D6"
- Mostra il risultato visivo (due dadi animati)
- Calcola totale con tutti i DM
- Mostra: Colpito / Mancato + Effetto

**Step 3 — Danno (se colpisce):**

- Mostra dado danno dell'arma
- Pulsante "Lancia danno"
- Calcola danno finale (incluso Effetto dell'attacco)
- Applica automaticamente i danni allo Hull dell'istanza

### 8.5 ActionModal

Azioni della fase Actions per ogni ruolo equipaggio.

**Opzioni per ruolo:**

- **Captain:** Improve Initiative → roll Leadership
- **Engineer:** Overload Drive / Overload Plant / Repair System / Offline System / Jump
- **Sensor Operator:** Sensor Lock / Electronic Warfare
- **Gunner:** Reload Turret
- **Any:** Reassignment

Ogni azione mostra la difficoltà, il check richiesto, e i DM pertinenti. Il GM tira i dadi e inserisce il risultato, oppure usa il DiceRoller integrato.

### 8.6 ShipDetailModal

Visualizzazione completa della scheda nave (read-only durante la battaglia).
Mostra profilo completo + stato attuale + log delle azioni di quella nave nel round.

---

## 9. Rendering Canvas

### 9.1 Layer di Rendering

Il Canvas viene ridisegnato ogni frame con i seguenti layer nell'ordine:

```text
1. Griglia hex (sfondo)
2. Highlight celle (celle selezionate, range di movimento, ecc.)
3. Ghost positions (posizioni previste semi-trasparenti)
4. Frecce vettore (per ogni nave)
5. Token missili
6. Token navi
7. Label navi (nome + HP bar)
8. UI overlay (anteprima thrust, archi di fuoco)
```

### 9.2 Rendering Token Nave

Ogni token è un cerchio con:

- **Colore** della fazione (impostabile nel AddShipModal)
- **Lettera** identificativa (iniziale nome) al centro
- **HP bar** semicircolare attorno al token (verde→giallo→rosso)
- **Freccia vettore** che parte dal centro, lunghezza = magnitudine vettore, direzione = direzione vettore
- **Ghost** semitrasparente sulla casella dove sarà al prossimo movimento

### 9.3 Pan e Zoom

- **Pan:** drag con tasto sinistro su area vuota (cursore = grab)
- **Zoom:** scroll del mouse (range: 0.3× – 3×)
- **Reset view:** doppio click su area vuota

### 9.4 Selezione e Interazione

- **Single click** su token nave → seleziona nave (evidenzia token)
- **Right-click** → context menu (vedi sezione 7)
- **Hover** su token → tooltip con nome + hull

---

## 10. Flusso del Round

### 10.1 Sequenza Completa

```text
╔══════════════════════════════════════╗
║  INIZIO ROUND                        ║
╠══════════════════════════════════════╣
║  FASE: INIZIATIVA                    ║
║  → Roll per ogni nave                ║
║  → Ordina in InitiativeOrder         ║
╠══════════════════════════════════════╣
║  FASE: ACCELERAZIONE                 ║
║  (ordine INVERSO di iniziativa)      ║
║  Per ogni nave:                      ║
║  → GM apre ThrustModal               ║
║  → Applica delta vettore             ║
║  → Segnala "ha agito"                ║
╠══════════════════════════════════════╣
║  FASE: MOVIMENTO (simultaneo)        ║
║  → Tutte le navi: pos += vector      ║
║  → Tutti i missili: pos += vector    ║
║    + missile spende 1 thrust         ║
║  → Check "ships that pass in the     ║
║    night" (distanza minima percorso) ║
║  → Check dogfighting                 ║
╠══════════════════════════════════════╣
║  FASE: ATTACCO                       ║
║  (ordine DIRETTO di iniziativa)      ║
║  Per ogni nave:                      ║
║  → GM apre AttackModal               ║
║  → Risolve attacchi                  ║
║  → Applica danni                     ║
╠══════════════════════════════════════╣
║  FASE: AZIONI                        ║
║  (ordine DIRETTO di iniziativa)      ║
║  Per ogni nave:                      ║
║  → GM apre ActionModal               ║
║  → Risolve azioni equipaggio         ║
╠══════════════════════════════════════╣
║  FINE ROUND                          ║
║  → Reset thrustUsedThisRound = 0     ║
║  → Reset hasActedThisPhase = false   ║
║  → round++                           ║
║  → Ripeti                            ║
╚══════════════════════════════════════╝
```

### 10.2 Ships That Pass in the Night

Durante la fase Movimento, per ogni coppia di navi nemiche si verifica se il percorso le porta a distanza Short (≤2 hex) in qualche punto della traiettoria. Se sì:

- Il sistema segnala l'evento nel log
- Il GM può aprire una finestra di fuoco temporanea prima di completare il movimento

### 10.3 Dogfighting

Quando due navi terminano il movimento nella stessa casella:

- Il sistema segnala automaticamente la condizione
- Si passa a round da 6 secondi con le regole Dogfight del Core Rulebook
- L'app gestisce il check Pilot contrapposto e i DM dimensione/thrust

---

## 11. Import / Export JSON

### 11.1 Formato File Profili

```json
{
  "version": "1.0",
  "type": "ship-profiles",
  "exportedAt": "2025-01-15T14:30:00Z",
  "profiles": [
    { ...ShipProfile },
    { ...ShipProfile }
  ]
}
```

### 11.2 Formato File Battaglia

```json
{
  "version": "1.0",
  "type": "battle-state",
  "exportedAt": "2025-01-15T14:30:00Z",
  "battle": { ...BattleState }
}
```

### 11.3 Funzioni I/O

```javascript
// Export profili
function exportProfiles(profiles) {
  const data = {
    version: "1.0",
    type: "ship-profiles",
    exportedAt: new Date().toISOString(),
    profiles
  }
  downloadJSON(data, `traveller-profiles-${Date.now()}.json`)
}

// Import profili
async function importProfiles(file) {
  const text = await file.text()
  const data = JSON.parse(text)
  if (data.type !== "ship-profiles") throw new Error("File non valido")
  return data.profiles
}

// Export battaglia
function exportBattle(battle) {
  const data = {
    version: "1.0",
    type: "battle-state",
    exportedAt: new Date().toISOString(),
    battle
  }
  downloadJSON(data, `traveller-battle-round${battle.round}-${Date.now()}.json`)
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

---

## 12. Profili Nave Predefiniti

Includere almeno questi profili come default per test e gioco rapido:

| Nome | Tonnellaggio | Hull | Thrust | Armi | Note |
| --- | --- | --- | --- | --- | --- |
| Free Trader (Beowulf) | 200 ton | 22 | 1 | 1× doppia torretta (pulse+missile) | Mercantile standard |
| Scout/Courier | 100 ton | 11 | 2 | 1× doppia torretta (pulse+missile) | Versatile |
| Fighter Leggero | 10 ton | 2 | 6 | 1× singola torretta (pulse) | Alta manovrabilità |
| Patrol Cruiser | 400 ton | 44 | 4 | 2× triple torrette | Militare medio |
| Far Trader | 200 ton | 22 | 1 | 1× singola torretta (sandcaster) | Mercantile difensivo |

---

## 13. Scope MVP e Roadmap

### 13.1 MVP — Versione 1.0

Funzionalità incluse nella prima versione funzionante:

- ✅ Mappa hex con pan/zoom
- ✅ Token navi con frecce vettore
- ✅ Sistema vettoriale completo (thrust → vettore → movimento)
- ✅ Context menu tasto destro
- ✅ CRUD profili nave con form progressivo
- ✅ Import/export JSON (profili + battaglia)
- ✅ Flusso round guidato (tutte le fasi)
- ✅ Risoluzione attacchi con calcolo DM automatico
- ✅ Danni e critical hits
- ✅ Token missili con thrust proprio
- ✅ Range band calcolate automaticamente
- ✅ Sensor lock
- ✅ Log eventi
- ✅ Profili predefiniti
- ✅ Catalogo navi ufficiale HG 2022 (sola lettura, filtri per categoria)
- ✅ Dashboard layout 2 colonne con preview sessione prima del caricamento
- ✅ Modale conferma eliminazione profilo
- ✅ Modale conferma abbandono sessione (⌂ HUD)
- ✅ Suite di test (Vitest — utils, store, componenti UI)

### 13.2 Versione 1.1 — Persistenza e Resilienza

**Autosave su IndexedDB** — eliminare la dipendenza dal salvataggio manuale:

- Stato battaglia serializzato su IndexedDB dopo ogni azione significativa (fine fase, attacco, thrust applicato)
- Al caricamento dell'app: rilevamento sessione sospesa → banner di ripristino in dashboard
- Il file JSON rimane disponibile per backup esplicito e per trasferire la sessione tra dispositivi; IndexedDB è lo strato di recovery automatico
- Nessun backend, nessuna rete — tutto locale, stesso modello mentale attuale

**Error boundary globale** — gestione errori visibile al GM:

- React `ErrorBoundary` al root dell'app: cattura eccezioni non gestite nel render tree
- Pannello di errore con messaggio leggibile + pulsante "Ricarica" che tenta il ripristino da IndexedDB
- Toast/banner per errori non fatali (import JSON malformato, azione su nave inesistente, ecc.) — attualmente silenti
- Logging errori nel battle log con tipo `"system"` per mantenere traccia durante la sessione

### 13.3 Versione 1.2 — HUD Contestuale

**Tooltip hover nave** — al passaggio del mouse su un token sulla mappa, mostra un pannello informativo minimale (overlay HTML sopra il canvas, non disegnato su Canvas):

| Campo | Valore |
| ----- | ------ |
| Nome nave | `profile.name` |
| Fazione | colore + etichetta (Giocatori / NPC / Neutrali) |
| Hull | barra `hullCurrent / hull` con colore stato (verde/giallo/rosso) |
| Vettore corrente | `(q, r)` + magnitudine in caselle |
| Thrust disponibile | `thrust - thrustUsedThisRound` |
| Evasione dichiarata | thrust evasivo se > 0 |
| Critical hits | lista sistemi colpiti con severità, se presenti |
| Iniziativa | valore estratto nel round corrente |

Il pannello appare con breve delay (~200 ms) per evitare flickering durante il pan, scompare al mouseleave o all'apertura del context menu.

### 13.4 Versione 1.3 — Effetti Visivi Canvas

Animazioni non bloccanti su Canvas (layer sopra i token, `requestAnimationFrame`):

| Effetto | Trigger | Descrizione |
| ------- | ------- | ----------- |
| **Raggio laser** | Risoluzione attacco (Beam/Pulse Laser) | Linea animata da torretta a bersaglio, fade-out in ~0.3 s, colore per tipo arma |
| **Scia missile** | Ogni tick di movimento missile | Trail di particelle lungo la traiettoria percorsa nel round |
| **Impatto** | Hit confermato | Burst di scintille radiali sul token colpito |
| **Chaff** | Sandcaster intercetta missile | Nuvola di punti grigi che si espande attorno al token |
| **Jamming signal** | Electronic warfare attiva | Anello pulsante semi-trasparente attorno alla nave che esegue il jamming |
| **Thrust plume** | Applicazione thrust confermata | Breve pennacchio nella direzione opposta al delta-v applicato |

Tutti gli effetti sono puramente decorativi — non bloccano input, non modificano stato di gioco, si esauriscono in autonomia senza dover essere gestiti dallo store.

### 13.5 Versione 1.4 — Dogfighting

- Rilevamento automatico navi nella stessa cella → transizione a round da 6 secondi
- Check Pilot contrapposto; DM tonnaggio/thrust; gestione più gruppi in parallelo
- Flusso micro-round (6 tick) prima della fase Attacco standard; navi esterne non bloccate
- Fuga dal dogfight con check inseguimento
- Electronic warfare (jamming), evasive action avanzata
- Vedi `dogfight-system-design.md`

### 13.6 Versione 1.5 — Abbordaggio

- 4 fasi: Approccio → Contatto → Conflitto → Sicurezza (HG 2022 pp.125–135)
- Metodi ingresso: airlock, breaching tube, forced linkage, taglio scafo con resilienza per armatura
- Stacking corridoi, colpi mancati (tabella 2D), obiettivi tattici (Ponte / Engineering / Torrette)
- Cambio fazione nave catturata; modalità astratta rapida (CR p.175) per abbordaggi di routine
- Vedi `boarding-system-design.md`

### 13.7 Versione 2.0 — Future

- Scale mappa multiple con transizione
- Asse Z opzionale (3D)
- Ostacoli ambientali (asteroidi, detriti)
- Esporta resoconto battaglia in PDF

---

## 14. Note per lo Sviluppo

### 14.1 Regola Critica: Thrust su Griglia Hex

Su griglia hex, il Thrust si distribuisce tra le 6 direzioni cardinali. Il vincolo corretto è:

```javascript
hexDistance({q:0, r:0}, thrustDelta) <= thrustAvailable
```

**Non** usare `Math.abs(dq) + Math.abs(dr)` (quella è distanza Manhattan, non hex).

### 14.2 Ordine Fasi

- Fase Accelerazione: ordine **INVERSO** all'iniziativa (chi ha iniziativa più bassa agisce per primo)
- Fase Attacco e Azioni: ordine **DIRETTO** (chi ha iniziativa più alta agisce per primo)
- Fase Movimento: **simultanea** (tutte le navi si muovono nello stesso istante)

### 14.3 Evasive Action

Il Thrust riservato all'evasione non viene speso per cambiare vettore. Rimane "in tasca" come DM negativo agli attacchi nemici:

```text
DM evasione = -(pilot_skill) per ogni punto di thrust evasivo dichiarato
```

Il giocatore dichiara quanti thrust riserva all'evasione prima degli attacchi. Non può cambiare il valore dopo che un attacco è stato dichiarato contro di lui.

### 14.4 Missili — Meccanica

Al lancio il missile eredita il vettore attuale della nave. Ogni round, nella fase movimento, il missile:

1. Spende fino al suo Thrust rating verso il bersaglio (aggiornando il proprio vettore)
2. Si muove del proprio vettore
3. Scala `thrustRemaining` di 1

Se `thrustRemaining` raggiunge 0 prima dell'impatto, il salvo manca. Se raggiunge la casella del bersaglio (o adiacente), si risolve l'impatto.
