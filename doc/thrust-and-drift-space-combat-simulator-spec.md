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
    "jsdom": "^29.x",
    "fake-indexeddb": "^6.x"
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
    │   │   ├── useShipHover.js        ← Hook hover detection + timer 200ms
    │   │   ├── ShipTooltip.jsx        ← Pannello tooltip nave (React portal)
    │   │   └── tokenRenderers.js      ← Funzioni draw per navi e missili
    │   ├── modals/
    │   │   ├── Modal.jsx              ← Wrapper modale generico
    │   │   ├── ShipProfileModal.jsx   ← Crea/modifica profilo nave (modale)
    │   │   ├── AddShipModal.jsx       ← Sceglie profilo da aggiungere in battaglia
    │   │   ├── ThrustModal.jsx        ← Applica Thrust con preview mappa
    │   │   ├── AttackModal.jsx        ← Risolve attacco con calcolo DM (+ pannello Reactions)
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
    │   │   ├── Tooltip.jsx            ← Tooltip via React portal
    │   │   └── ErrorBoundary.jsx      ← Error boundary globale con UI recovery
    │   └── forms/
    │       ├── ShipProfileForm.jsx    ← Form completo profilo nave
    │       └── DiceInput.jsx          ← Input manuale 2D6 per dadi fisici giocatori
    ├── hooks/
    │   └── useAutosave.js             ← Autosave IndexedDB + restore al mount
    ├── store/
    │   ├── profilesStore.js           ← Profili nave (CRUD + import/export)
    │   ├── battleStore.js             ← Stato battaglia corrente
    │   └── uiStore.js                 ← Stato UI (modal aperto, nave selezionata, ecc.)
    ├── utils/
    │   ├── hex.js                     ← Matematica esagonale (flat-top)
    │   ├── combat.js                  ← Calcoli combattimento (DM, danni, range band)
    │   ├── crew.js                    ← Helper equipaggio array (getCrewSkill, getEffectiveSkill, getAssignedSkill, buildDefaultAssignments, migrateCrew, blankCrewMember)
    │   ├── io.js                      ← Import/export JSON via File API
    │   ├── dice.js                    ← Lancio dadi e formattazione risultati
    │   └── db.js                      ← Wrapper IndexedDB (openDB, dbGet, dbPut, dbDelete)
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
| `utils/crew.test.js` | `crew.js` — getCrewSkill, getEffectiveSkill, getAssignedSkill, buildDefaultAssignments, migrateCrew, blankCrewMember |
| `store/battleStore.test.js` | battleStore — tutte le azioni, export/import |
| `store/profilesStore.test.js` | profilesStore — CRUD, import/export |
| `store/uiStore.test.js` | uiStore — screen, modal, selection, contextMenu |
| `components/ui/Tooltip.test.jsx` | Tooltip — show/hide, portal, posizione |
| `components/ui/HUD.test.jsx` | HUD — round/fase, controllo attore |
| `components/ui/BattleLog.test.jsx` | BattleLog — entries, collapse, clear |
| `components/ui/ContextMenu.test.jsx` | ContextMenu — tutti i tipi, outside click |
| `components/ui/ErrorBoundary.test.jsx` | ErrorBoundary — render normale, catch errore, reload |
| `hooks/useAutosave.test.js` | useAutosave — restore mount, autosave su cambio significativo |
| `utils/db.test.js` | db.js — dbGet/dbPut/dbDelete, store isolati, fake-indexeddb |
| `utils/io.test.js` | io.js — importProfiles, importBattle: file valido, JSON malformato, tipo errato, campi mancanti, file.text() rejection |

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

  // EQUIPAGGIO — array di membri nominati con skill multiple per membro
  // Retrocompatibile: getCrewSkill() gestisce anche il vecchio formato {pilot:N,...}
  crew: CrewMember[]

interface CrewMember {
  id: string                    // UUID membro
  name: string                  // Nome del membro (es. "Zhukov", "Chief Engineer")
  skills: {
    pilot?: number              // Skill level Pilot (0–5)
    captain?: number            // Skill level Tactics(naval) (0–5)
    engineer?: number           // Skill level Engineer (0–5)
    gunner?: number             // Skill level Gunner (0–5)
    sensors?: number            // Skill level Electronics(sensors) (0–5)
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
  evasiveDM,      // negativo: - (pilot skill) fisso — 1 thrust speso per attacco (CRB p.171)
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
│ 🎲 Tira iniziativa (tutti)   │  ← solo fase: initiative
│ ─────────────────────────── │
│ 🔄 Fase successiva           │
└──────────────────────────────┘
```

### 7.6 Context Menu — Token Nave

Appare al right-click su un token nave. Le azioni visibili dipendono dalla **fase corrente**.

```text
┌──────────────────────────────┐
│ [Nome Nave] — Hull: 18/22    │  ← sempre visibile
│ ─────────────────────────── │
│ 🚀 Applica Thrust            │  ← solo fase: acceleration (vectorial)
│ ─────────────────────────── │
│ 🎯 Attacca...                │  ← solo fase: attack
│ 🚀 Lancia Missili...         │  ← solo fase: attack + ha Missile Rack
│ ─────────────────────────── │
│ ⚡ Azione equipaggio...      │  ← solo fase: actions
│ ─────────────────────────── │
│ 📊 Scheda nave               │  ← sempre visibile
│ ─────────────────────────── │
│ 🗑️  Rimuovi dalla battaglia  │  ← sempre visibile
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
- ✅ Autosave IndexedDB — persist dopo ogni azione significativa, restore al mount
- ✅ Pulsante "Riprendi Autosalvataggio" in Dashboard con round/fase/navi/timestamp
- ✅ Error boundary globale — cattura crash render, mostra UI recovery con pulsante ricarica
- ✅ `utils/db.js` — wrapper IndexedDB testato con fake-indexeddb (285 test totali)
- ✅ `utils/io.js` — import/export JSON testato con mock File (644 test totali)

### 13.2 Versione 1.1 — Persistenza e Resilienza ✅ COMPLETATA

**Autosave su IndexedDB** — implementato:

- `utils/db.js`: wrapper IndexedDB (openDB, dbGet, dbPut, dbDelete) — due object store: `battle` e `profiles`
- `hooks/useAutosave.js`: subscriber Zustand → IndexedDB dopo ogni cambio significativo (ships, missiles, round, phase, log, initiativeOrder); restore al mount solo se `saved.ships.length > 0` e store vuoto
- Dashboard: pulsante `↺ RIPRENDI AUTOSALVATAGGIO` visibile solo se IndexedDB ha sessione con navi; mostra round, fase, contatore navi, timestamp
- `↓ RIPRENDI DA FILE` (JSON) sovrascrive IndexedDB al caricamento — sorgente di verità unica: lo store Zustand
- `savedAt: ISO string` aggiunto al payload export JSON

**Error boundary globale** — implementato:

- `ErrorBoundary` class component in `components/ui/ErrorBoundary.jsx`
- Wrappa `<App />` in `main.jsx`
- Mostra messaggio errore leggibile + pulsante "RICARICA PAGINA"
- `componentDidCatch` logga stack in console

### 13.3 Versione 1.2 — HUD Contestuale ✅ COMPLETATA

**Tooltip hover nave** — implementato:

- `useShipHover.js`: hook SRP — rileva via `pixelToHex` quale ship è sotto il cursore, arma un timer da 200ms prima di mostrare il tooltip; resetta il timer ad ogni mousemove (nessun flickering durante il pan); cancella immediatamente su mousedown, mouseleave, cella vuota
- `ShipTooltip.jsx`: pannello HTML via `createPortal` — mostra nome, fazione (colore), barra hull colorata (verde/giallo/rosso), vettore + magnitudine, thrust disponibile, evasione (se attiva), iniziativa, sensor lock (se attivo), lista critical hits con severità; si posiziona automaticamente accanto al cursore con flip verso il centro del viewport se il cursore è oltre il 65% del bordo
- `uiStore`: stato `hoveredShip { shipId, x, y }` + `setHoveredShip` / `clearHoveredShip`
- Si nasconde automaticamente all'apertura del context menu
- `BattleMap.jsx`: combina `onMouseMove` e `onMouseDown` da entrambi i hook; aggiunge `onMouseLeave`

**Phase-gating context menu** — implementato:

- `ContextMenu.jsx` / `ShipContextMenu`: legge `phase` da battleStore, mostra solo le azioni valide per la fase corrente (acceleration → thrust/evasione; attack → attacca/missili; actions → azione equipaggio)
- `EmptyContextMenu`: "Tira iniziativa" visibile solo in fase `initiative`

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

### 13.3b Versione 1.3.1 — Localizzazione UI ✅ COMPLETATA

- Tutte le stringhe visibili tradotte in inglese (22 file); documentazione `doc/` invariata
- Brand watermark (logo + "THRUST & DRIFT") in basso a destra sul canvas di battaglia
- Battle Log collassato per impostazione predefinita

### 13.3c Versione 1.3.2 — Undo ✅ COMPLETATA

**Undo snapshot-based** — implementato:

- `battleStore`: `undoStack[]` (max 20 entry), `pushHistory()`, `undoLastAction()` — tutte le 19 azioni user-facing chiamano `pushHistory` prima della mutazione
- Flag `_skipHistory` su `addCriticalHit` e `_skipThreshold` su `applyDamage` impediscono doppio push nelle chiamate ricorsive interne
- `resetBattle` e `importBattleState` azzerano lo stack
- `HUD`: pulsante `⟲` (disabilitato/opaco se stack vuoto) + shortcut `Ctrl+Z` / `Cmd+Z` globale
- 370 test (da 355) — nuove suite: comportamento core, cap 20, pulizia stack, flag di soppressione, invariante `advancePhase→startNextRound`, pulsante HUD

### 13.3e Versione 1.3.4 — wh() wrapper + Redo ✅ COMPLETATA

**Wrapper `wh()` e redo stack:**

- `wh(fn)` / `wh(guard, fn)` — funzione definita dentro `create()`; `pushHistory()` automatico su tutte le azioni user-facing; la forma con guard impedisce push su chiamate no-op
- `applyDamage` e `addCriticalHit` mantengono push condizionale manuale (flag `_skipThreshold` / `_skipHistory`)
- `redoStack[]` in state; `pushHistory()` lo azzera ad ogni nuova azione
- `undoLastAction()` salva stato corrente su `redoStack`; `redoLastAction()` ripristina e appende `↷ Redo` nel log
- `resetBattle` e `importBattleState` azzerano entrambi gli stack
- HUD: bottone `↷` + `Ctrl+Y` / `Cmd+Shift+Z`
- 386 test (da 373)

### 13.3d Versione 1.3.3 — Undo refactor ✅ COMPLETATA

**Contract esplicito e log append-only:**

- `buildNextRoundState(s)` — funzione pura estratta fuori dallo store; condivisa da `startNextRound` e `advancePhase`; elimina l'invariante implicita "startNextRound non deve mai essere chiamata standalone"
- `startNextRound` pubblico ora chiama `pushHistory()` autonomamente — sicuro da invocare direttamente
- `advancePhase` usa `buildNextRoundState` direttamente al posto di delegare a `startNextRound` — nessun doppio push
- Log escluso dagli snapshot undo; `undoLastAction` appende entry `↩ Undo — restored to Round N, PHASE` invece di rollback
- 373 test (da 370)

### 13.4 Versione 1.3 — Effetti Visivi Canvas

Animazioni non bloccanti su Canvas (layer sopra i token, `requestAnimationFrame`).  
Tutti gli effetti sono puramente decorativi — non bloccano input, non modificano stato di gioco, si esauriscono in autonomia.

**Effetti trigger-based** (one-shot, si attivano su evento e svaniscono):

| Effetto | Trigger | Descrizione | Fonte regola |
| ------- | ------- | ----------- | ------------ |
| **Raggio laser** | Attacco confermato (Beam/Pulse Laser) | Linea animata da torretta a bersaglio, fade-out ~0.3 s; colore differenziato per tipo arma | CRB p.167 |
| **Scia missile** | Ogni tick di movimento missile (fase Movement) | Trail di particelle lungo la traiettoria percorsa nel round | TC p.175 |
| **Impatto** | Hit confermato (Effect ≥ 0) | Burst di scintille radiali sul token colpito, fade-out ~0.5 s | CRB p.167 |
| **Chaff** | Sandcaster intercetta salvo (tiro difesa 3+) | Lampo istantaneo di polvere/frammenti intorno alla torretta del sandcaster al momento della risoluzione impatto; durata ~0.2 s | CRB p.162 — Close-in defence |
| **Thrust plume** | Applicazione thrust confermata (fase Acceleration) | Pennacchio nella direzione opposta al delta-v applicato, fade-out ~0.4 s | TC p.170 |
| **Critical hit flash** | Critical hit inflitto | Lampo rosso non-bloccante sul token colpito, con icona sistema danneggiato (M-Drive, Sensors, ecc.) | CRB p.167 — Critical Hits table |
| **Dogfight entry** | Due navi terminano il movimento nella stessa cella | Avviso "DOGFIGHT" sulla mappa con linea di collegamento tra i due token; persiste fino a risoluzione | CRB p.162 |

**Effetti persistenti** (overlay sul token, durano finché la condizione è attiva):

| Effetto | Condizione | Descrizione | Fonte regola |
| ------- | ---------- | ----------- | ------------ |
| **Sensor lock ring** | Nave ha sensor lock attivo su bersaglio (`sensorLockOn ≠ null`) | Linea tratteggiata ciano dalla nave al bersaglio; piccolo anello sul token bersaglio | TC p.182 — Sensor Lock action |
| **Evasive aura** | `evasiveThrust > 0` dichiarato (fase Acceleration) | Alone giallo semi-trasparente attorno al token; scompare a fine round | TC p.170 — Evasive Action |
| **Missile esaurito** | `thrustRemaining === 0` prima dell'impatto | Token missile sbiadito/grigio, traccia intermittente — segnala che non raggiungerà il bersaglio | TC p.175 |

> **Nota:** L'effetto "Jamming signal / Electronic Warfare" è stato rimosso perché non corrisponde a una meccanica discreta del combattimento ufficiale MgT2e. L'EW offensiva non è un'azione separata nelle regole di combattimento spaziale (CRB pp.160–168, TC pp.169–186). Il Sensor Lock (TC p.182) è l'azione elettronica con effetti meccanici più vicina — ed è rappresentata dall'effetto **Sensor lock ring** qui sopra.

### 13.3f Versione 1.3.5 — Modello Equipaggio Array ✅ COMPLETATA

**Crew array con skill multiple per membro:**

- `crew` su `ShipProfile` cambiato da oggetto piatto `{pilot:N,...}` ad array `[{id, name, skills:{...}}]`; ogni membro può avere più skill (es. pilota/artigliere su fighter singolo posto)
- `src/utils/crew.js`: `getCrewSkill(crew, skill)` retrocompatibile (gestisce entrambi i formati), `migrateCrew(legacy)` (converte vecchio formato), `blankCrewMember()`
- `ShipProfileForm`: sezione Crew ricostruita — aggiungi/rimuovi membri nominati; ogni riga ha campo nome + input skill compatti (PLT/CPT/ENG/GNR/SEN 0–5); `initForm` migra automaticamente formato legacy
- `ActionModal`: nuova selezione membro equipaggio prima dell'azione; solo azioni coerenti con skill del membro selezionato
- `ShipDetailModal`: sezione Crew mostra nome + skill per membro
- `battleStore`, `EvasiveModal`, `useAttackSetup`: tutti gli accessi `crew.pilot`/`crew.gunner` sostituiti con `getCrewSkill`
- 403 test (da 386)

### 13.3g Versione 1.3.6 — Dadi Fisici Giocatori ✅ COMPLETATA

**Player manual dice entry:**

- Navi con `faction === 'players'` entrano nei modal di tiro con input 2D6 vuoti — il giocatore inserisce il risultato dei dadi fisici
- `DiceInput` (`src/components/forms/DiceInput.jsx`): due input 1–6 che partono vuoti; emette `null` finché entrambi i dadi non sono validi; totale mostra `?` finché incompleto; pulsante 🎲 per auto-roll digitale opt-in
- `InitiativeModal`: navi player mostrano `DiceInput` (vuoto all'apertura); CONFIRM disabilitato finché tutte le navi player non hanno inserito i dadi; navi NPC auto-rollate al CONFIRM; REROLL azzera tutti gli input
- `AttackModal`: `AttackRollStep` mostra `DiceInput` + "CONFIRM ROLL" per attaccanti player (disabilitato finché dadi incompleti); NPC mantengono auto-roll
- `ActionModal`: `DiceInput` per navi player su azioni non-auto; azzerato ad ogni cambio azione
- `rollInitiative` / `rollAttack` in `combat.js`: accettano `diceOverride` opzionale (retrocompatibile)
- `rollAllInitiative` in `battleStore`: accetta `diceOverrides: { [shipId]: {results, total} }` map

### 13.3h Versione 1.3.7 — Skill DM Override ✅ COMPLETATA

**Override skill level per azione:**

- `ActionModal`: quando si seleziona un'azione non-auto, compare input numerico con il valore base dello skill del membro selezionato
- Il GM può sovrascrivere per specializzazioni (es. Engineer(M-Drive) 3 invece del generico Engineer 2 del profilo)
- Pulsante `↺` ripristina il valore base; il tiro usa il valore override come DM

### 13.5 Versione 1.4 — Dogfighting

- Rilevamento automatico navi nella stessa cella → transizione a round da 6 secondi
- Check Pilot contrapposto; DM tonnaggio/thrust; gestione più gruppi in parallelo
- Flusso micro-round (6 tick) prima della fase Attacco standard; navi esterne non bloccate
- Fuga dal dogfight con check inseguimento
- Electronic warfare (jamming), evasive action avanzata
- Vedi `dogfight-system-design.md`

### 13.6 Versione 1.4.2 — Ships That Pass in the Night

Durante la fase Movimento, per ogni coppia di navi ostili si verifica se le traiettorie si avvicinano a distanza ≤ Short (≤ 2 hex) in qualche punto del percorso — anche se le posizioni finali sono distanti.

**Meccanica** (spec §10.2, Traveller Companion p.172):

- Calcolo della distanza minima tra i segmenti di traiettoria di due navi (posizione iniziale → posizione finale per ogni nave)
- Se `minDistance ≤ 2` e le navi sono di fazioni ostili → finestra di fuoco temporanea
- Il GM viene notificato via modal; può risolvere un attacco rapido (senza spostarsi dalla fase Movimento) oppure ignorare
- L'attacco usa le normali regole AttackModal ma con range band calcolata sulla distanza minima, non sulla posizione finale
- Le navi completano comunque il movimento dopo la risoluzione

**Scope tecnico:**

- `utils/hex.js` — `segmentMinDistance(a0, a1, b0, b1)`: distanza minima tra due traiettorie lineari simultanee; ricerca analitica O(1) sui breakpoint dei componenti cube (dq, dr, ds)
- `battleStore` — `resolveMovement` rileva le coppie ostili in transito prima di aggiornare le posizioni; risultati in `passingEncounters[]` (escluse: stessa fazione, navi in dogfight, navi che finiscono nello stesso hex); `dismissPassingEncounter(id)` rimuove l'entry dopo la risoluzione
- `PassingAttackModal` — mostra gli incontri uno alla volta; per ogni coppia il GM sceglie quale nave spara (apre `AttackModal` pre-configurato con `shipId`) oppure passa; il `rangeBand` visualizzato è quello della distanza minima
- `passingEncounters` non è incluso negli snapshot undo/redo — è stato transitorio di UI

### 13.7 Versione 1.5 — Abbordaggio ✅ COMPLETATA

4 fasi complete: Approccio → Contatto → Conflitto → Sicurezza (HG 2022 pp.125–135).

**Scope tecnico implementato:**

- `utils/boarding.js` — `ENTRY_METHODS`, `CUT_TOOLS`, `getHullResilience(component, armor, armored)`, `cuttingDamage(toolKey, effect)`, `rollStackingCheck()`, `rollMissedShot(armoredBulkhead)`, `getContactDM(boarding)`, `getWeaponSpaceDM(weaponClass)`
- `battleStore` — slice `boardings[]` incluso negli snapshot undo/redo; `inBoarding: null` su ShipInstance; 7 azioni: `startBoarding`, `advanceBoardingPhase`, `setContactMethod`, `toggleDefenderRotation`, `toggleForcedLinkage`, `setObjective`, `resolveBoarding`; `updateShipFaction`; export/import
- `BoardingSetupModal` — selezione bersaglio con guard (distanza ≤ 1, thrust ≥ bersaglio o M-Drive disabilitato)
- `BoardingContactModal` — picker metodo ingresso, toggle rotazione/forced-linkage, checker dadi per metodi con check, hull-cut tracker con resilienza per componente e armatura
- `BoardingConflictModal` — 3 checkbox obiettivi tattici, roll stacking, missed-shot table con toggle paratia corazzata, reminder DM armi
- `BoardingOutcomeModal` — picker esito, trasferimento fazione opzionale su attacker_wins
- `ContextMenu` — voce "⚔ Board [target]…" condizionata a regole §2 boarding-system-design.md
- `HUD` — badge ⚔ BOARDING per ogni boarding attivo, con link diretto alla fase corrente
- Tutta la UI in inglese — nessuna stringa italiana nell'interfaccia

**Scope escluso da v1.5:** abstract mode (CRB p.175) — rimandato a versione successiva.

### 13.8 Versione 1.6 — Range Massimo Armi ✅ COMPLETATA

**Problema:** le armi sparavano a qualsiasi distanza. CRB p.167 specifica esplicitamente che ogni arma ha un range massimo oltre il quale non può sparare.

**Scope tecnico implementato:**

- `data/weapons.js` — campo `maxRange` su ogni arma (CRB p.167–168, HG p.28); fix dati errati: Missile Rack 2D→4D, Railgun 4D→2D, Railgun traits `['AP']`→`['AP 4']`, Particle Beam traits rimosso `'AP'` erroneo (solo la barbette ha AP)
- `utils/combat.js` — `RANGE_ORDER` array, `isOutOfRange(maxRange, rangeBand)` funzione pura
- `useAttackSetup.js` — espone `outOfRange: boolean`
- `AttackModal` — badge `OUT OF RANGE` per arma; messaggio esplicativo range/distanza; ROLL ATTACK disabilitato se fuori portata
- 606 test (da 596) — +10 test `isOutOfRange`/`RANGE_ORDER`

### 13.10 Versione 2.0 — Future

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

L'Evasive Action è una **Reaction** dichiarata durante la Fase di Attacco, non pre-dichiarata in Accelerazione *(CRB p.171)*.

```text
Costo:   1 thrust point per attacco schivato
DM:      -(pilot_skill)  — fisso, non moltiplicato per il thrust
Fonte:   thrust non usato per il movimento in questo round
Reset:   evasiveThrust si azzera a inizio round successivo
```

Il pannello Reactions appare in AttackModal (Step 1 Config) non appena arma e bersaglio sono selezionati. Il difensore usa un toggle (non uno stepper): o spende 1 thrust per schivare quell'attacco, o non lo fa. Più attacchi nello stesso round possono essere schivati spendendo 1 thrust ciascuno, fino ad esaurimento.

### 14.4 Missili — Meccanica

Al lancio il missile eredita il vettore attuale della nave. Ogni round, nella fase movimento, il missile:

1. Spende fino al suo Thrust rating verso il bersaglio (aggiornando il proprio vettore)
2. Si muove del proprio vettore
3. Scala `thrustRemaining` di 1

Se `thrustRemaining` raggiunge 0 prima dell'impatto, il salvo manca. Se raggiunge la casella del bersaglio (o adiacente), si risolve l'impatto.
