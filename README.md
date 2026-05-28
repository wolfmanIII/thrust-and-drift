# THRUST & DRIFT — Space Combat Simulator

> Virtual tabletop tool for **Mongoose Traveller 2e** space combat.  
> GM-operated · browser-only · no installation required.

Implements the core space combat rules (MgT2e CRB pp.160–168) and the
optional **vectorial combat system** (Traveller Companion 2024, pp.169–186).

---

## Features

| Feature | Description |
|---------|-------------|
| **Hex grid map** | Flat-top axial hex grid with pan & zoom |
| **Vectorial movement** | Ships have velocity vectors; thrust modifies them |
| **Ship profiles** | Full CRUD — create, edit, duplicate, delete |
| **Attack resolution** | 3-step flow: weapon/target config → 2D6 roll → damage |
| **Crew actions** | Captain, Engineer, Sensors, Gunner actions with skill checks |
| **Initiative** | 2D6 + Pilota + Thrust, automatically sorted |
| **Phase tracker** | Setup → Initiative → Acceleration → Movement → Attack → Actions → End |
| **Battle log** | Timestamped event log with colour-coded entry types |
| **Session save / resume** | Export session to JSON, reimport to continue later |
| **Profile I/O** | Import/export ship profiles via JSON files |

---

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

For a production build:

```bash
npm run build
npm run preview
```

---

## How to Use

### 1 — Prepare ship profiles

On the **Dashboard**, use the left panel to manage ship profiles:

- **+ Nuovo Profilo** — create a new ship (name, stats, crew skills, turrets)
- **✎** — edit an existing profile
- **⧉** — duplicate a profile
- **⊗** — delete a profile
- **↓ Importa / ↑ Esporta** — exchange profiles as JSON files

A set of default profiles (Far Trader, Type S Scout, etc.) is pre-loaded.

### 2 — Start or resume a session

- **▶ Nuova Sessione** — resets battle state and enters the combat map
- **↺ Riprendi Sessione** — load a `.json` file from a previous session

### 3 — In battle

**Right-click any hex** to open the context menu:
- Empty hex → **Aggiungi Nave** (place a ship)
- Ship hex → actions for that ship (Thrust, Attack, Actions, Detail, Remove)

**Left-click a ship** to select it.

**Double-click** to centre the map on a hex.

**Scroll** to zoom. **Drag** to pan.

#### Phase flow

The HUD (top-left) shows the current round and phase.

| Phase | What to do |
|-------|------------|
| **Setup** | Place ships on the map |
| **Initiative** | Open right-click menu → roll initiative via modal |
| **Acceleration** | Each ship in turn: right-click → Thrust |
| **Movement** | Click **Fase Successiva** — all ships move by their vector |
| **Attack** | Each ship in turn: right-click → Attacco |
| **Actions** | Each ship in turn: right-click → Azioni equipaggio |
| **Fine Round** | Click **Fase Successiva** to start the next round |

#### Saving a session

In the HUD (top-left), click **💾 SALVA** at any time to download the current
session as a `.json` file. Use **↺ Riprendi Sessione** on the Dashboard to
restore it.

Click **⌂** in the HUD to return to the Dashboard (session is not saved
automatically — save first).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19 + Vite 8 |
| State | Zustand 5 |
| Styling | Tailwind CSS v4 |
| Map rendering | Browser Canvas API |
| Persistence | Browser File API (JSON) — no backend |

---

## Project Structure

```
src/
├── components/
│   ├── dashboard/   ← Pre-battle lobby (Dashboard.jsx)
│   ├── forms/       ← ShipProfileForm
│   ├── map/         ← Canvas hex map + hooks
│   ├── modals/      ← All in-battle modals
│   └── ui/          ← HUD, PhaseTracker, BattleLog, ContextMenu
├── data/            ← Static game data (weapons, profiles, factions…)
├── store/           ← Zustand slices (battle, profiles, ui)
└── utils/           ← Pure logic (hex math, combat, dice, I/O)
```

---

## Game Rules Reference

All mechanical calculations implement:

- **MgT2e CRB** — Mongoose Traveller 2nd Edition Core Rulebook  
  Space combat pp.160–168
- **Traveller Companion 2024** — Vectorial Combat System pp.169–186

---

---

## License

For personal/group use at the gaming table.  
Mongoose Traveller is © Mongoose Publishing.
