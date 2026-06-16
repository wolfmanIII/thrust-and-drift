# Basic Battle View — Bento Card Design

## Thrust & Drift v1.18+

> Specifica implementativa per il redesign delle ship card in `BasicBattleView`.
> Obiettivo: trasformare le card minimaliste attuali in pannelli tattici completi ("bento"),
> mostrando a colpo d'occhio tutti gli stati rilevanti di ogni nave durante il combattimento.

---

## 1. Motivazione

Le card attuali mostrano solo hull bar, Hull N/M e Initiative. In una sessione reale il GM deve
consultare più fonti per sapere se una nave è sotto sensor lock, se ha missili in arrivo, se è
in dogfight. L'obiettivo è consolidare tutto nella card stessa, eliminando la necessità di aprire
modali per ricavare informazioni di stato.

---

## 2. Anatomia della Card

```text
┌─────────────────────────────────────────────────────────┐
│  ZONA A — Header                                        │
│  ● SHIP NAME                    [badge] [badge] [badge] │
├─────────────────────────────────────────────────────────┤
│  ZONA B — Hull                                          │
│  ██████████████░░░░░░   Hull 12/16   Ini 8              │
├─────────────────────────────────────────────────────────┤
│  ZONA C — Status (condizionale — nascosta se vuota)     │
│  🎯 Lock → Tigress-II                                   │
│  🔒 Locked by Patrol-7                                  │
│  ⚡ 2× Standard inbound (from Patrol-7)                  │
│  🚀 1× salvo away → Patrol-7                            │
│  ↺  1 turret reloading                                  │
│  ⚠  M-Drive Sev.2 · Hull Sev.1                          │
└─────────────────────────────────────────────────────────┘
```

Le tre zone sono sempre presenti tranne Zona C, che si renderizza solo se almeno una riga
ha contenuto.

---

## 3. Zona A — Header

### Layout — Header

```text
[dot colore] [nome nave]          [badges inline]
```

### Badges inline (header, destra)

I badge sono pill compatte `font-mono text-[10px] px-1.5 py-0.5 rounded`.
Appaiono solo se la condizione è vera. Ordine fisso da sinistra a destra:

| Badge | Condizione | Colore |
| ------ | ---------- | ------------------------------ |
| `☠ WRECK` | `ship.isDestroyed` | `text-red-400 border-red-800` |
| `DOGFIGHT` | `ship.inDogfight !== null` | `text-yellow-400 border-yellow-700` |
| `BOARDING` | `ship.inBoarding !== null` | `text-orange-400 border-orange-700` |
| `EVA {n}` | `ship.evasiveThrust > 0` | `text-sky-400 border-sky-700` |
| `LOCKED` | `ship.sensorLockedBy !== null` | `text-red-300 border-red-700` |

Il badge `LOCKED` segnala che questa nave è il bersaglio di un sensor lock attivo — stato
particolarmente critico per il GM (DM negativo ai check del bersaglio).

---

## 4. Zona B — Hull

### Layout — Hull

```text
[hull bar full-width]
Hull {hullCurrent}/{profile.hull}      Ini {initiative}
```

La hull bar usa la stessa logica di colore dell'implementazione attuale:

- `> 60%` hull → `#22c55e` (verde)
- `> 30%` hull → `#eab308` (giallo)
- `≤ 30%` hull → `#ef4444` (rosso)

Hull e Initiative sono su una sola riga `flex justify-between`.

---

## 5. Zona C — Righe di Stato

La zona appare solo se almeno una riga ha contenuto. Ogni riga è condizionale
e indipendente dalle altre.

### 5.1 Sensor Lock Attivo (questa nave ha lockato qualcuno)

**Condizione:** `ship.sensorLockOn !== null`

**Display:**

```text
🎯 Lock → {targetName}   DM +{ship.sensorLockDM}
```

`targetName` = `ships.find(s => s.id === ship.sensorLockOn)?.profile.name ?? '?'`

Colore: `text-(--neon-cyan)` per l'icona e il nome target.

### 5.2 Sensor Lock Ricevuto (qualcuno ha lockato questa nave)

**Condizione:** `ship.sensorLockedBy !== null`

**Display:**

```text
🔒 Locked by {lockerName}
```

`lockerName` = `ships.find(s => s.id === ship.sensorLockedBy)?.profile.name ?? '?'`

Colore: `text-red-300` — situazione tattica sfavorevole visibile immediatamente.

### 5.3 Missili in Arrivo

**Condizione:** `missiles.filter(m => m.target === ship.id).length > 0`

**Display (una riga per salvo distinto — raggruppati per launchedBy):**

```text
⚡ {count}× {type} inbound  ←  {launcherName}
```

Se più salve dallo stesso lanciatore: mostrare come `{count1+count2}× inbound`.
Se salve da più lanciatori: una riga per lanciatore.

Colore: `text-amber-400` per l'icona e il count.

**Nota:** in basic mode i missili non hanno position/vector significativi, ma
`missiles[]` viene comunque popolato da `launchMissile`. La riga appare finché
il missile è nello store (nessuna rimozione automatica in basic — il GM usa
MISS/DISMISS nel log o attende che vengano resolti).

### 5.4 Missili Lanciati

**Condizione:** `missiles.filter(m => m.launchedBy === ship.id).length > 0`

**Display (una riga per salvo distinto — raggruppati per target):**

```text
🚀 {count}× {type}  →  {targetName}
```

Colore: `text-slate-300`.

### 5.5 Torrette in Ricarica

**Condizione:** `ship.turretsNeedingReload > 0`

**Display:**

```text
↺ {n} turret{n > 1 ? 's' : ''} reloading
```

Colore: `text-slate-400`.

### 5.6 Colpi Critici

**Condizione:** `ship.criticalHits?.length > 0 && !ship.isDestroyed`

**Display:** tutti i critici attivi su una sola riga separati da ` · `:

```text
⚠ M-Drive Sev.2 · Hull Sev.1
```

Formato per ogni critico: `{system} Sev.{severity}`

Colore: `text-red-400` per `⚠`, `text-red-300` per i nomi dei sistemi.

### 5.7 Munizioni Missile (solo se la nave ha Missile Rack)

**Condizione:** `countMissileRacks(ship.profile) > 0`

**Display:**

```text
🚀 Ammo {missileAmmoTotal}/{maxAmmo}
```

`maxAmmo` = `countMissileRacks(ship.profile) * 12`

Colore: ammo a 0 → `text-red-400`; ≤ 25% → `text-yellow-400`; normale → `text-slate-300`.

Questa riga è sempre visibile per le navi con Missile Rack (anche a piena dotazione),
così il GM non deve aprire AttackModal per verificare lo stock.

---

## 6. Struttura Componenti

### 6.1 Albero

```text
BasicBattleView
└── ShipBentoCard          ← sostituisce ShipCard
    ├── CardHeader         ← Zona A
    ├── HullBar            ← già esistente, invariato
    ├── HullFooter         ← Hull N/M + Ini N
    └── StatusZone         ← Zona C (condizionale)
        ├── SensorLockRow
        ├── SensorLockedRow
        ├── InboundMissilesRow
        ├── LaunchedMissilesRow
        ├── ReloadingRow
        ├── CriticalRow
        └── AmmoRow
```

### 6.2 Props di ShipBentoCard

```javascript
// ShipBentoCard({ ship, ships, missiles, onContextMenu })
// - ship: oggetto nave corrente
// - ships: array completo (per risolvere nomi da ID)
// - missiles: array completo (per filtrare inbound/launched)
// - onContextMenu: handler per right-click (invariato)
```

`ships` e `missiles` vengono passati dal parent `BasicBattleView` che già li
legge dallo store — evita N selector duplicati nelle card figlie.

### 6.3 Memoization

`StatusZone` usa `useMemo` per i calcoli dei missili:

```javascript
const inbound  = useMemo(() => missiles.filter(m => m.target    === ship.id), [missiles, ship.id])
const launched = useMemo(() => missiles.filter(m => m.launchedBy === ship.id), [missiles, ship.id])
```

`countMissileRacks` è una funzione pura già presente in `battleStore.js` — va
estratta in `utils/combat.js` o `utils/crew.js` per essere importabile dalla card
senza dipendere dallo store.

---

## 7. Sizing e Layout Grid

La grid attuale in `BasicBattleView` è:

```text
grid-cols-2 md:grid-cols-3 lg:grid-cols-4
```

Le card bento sono più alte delle card attuali. Considerare di passare a:

```text
grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

Le card non hanno altezza fissa — crescono con il contenuto della Zona C.
Il GM su schermo condiviso tipicamente usa un monitor 1080p orizzontale;
3 colonne sono sufficienti per sessioni standard (4–6 navi).

---

## 8. Stile Visivo

### Colori per zona

| Elemento | Classe |
| -------- | ------ |
| Card border default | `border-slate-700` |
| Card border destroyed | `border-red-900/50 opacity-40` |
| Card bg | `bg-slate-900` |
| Separator Zona B / C | `border-t border-slate-800` |
| Zona C bg | `bg-slate-950/40` (leggermente più scuro) |
| Riga status font | `font-mono text-xs` |
| Icone stato | `shrink-0 w-3` (larghezza fissa per allineamento) |

### Badge header

```jsx
<span className="font-mono text-[10px] px-1.5 py-0.5 rounded border {colorClasses}">
  {label}
</span>
```

### Separator Zona C

La Zona C è separata dalla Zona B da un `border-t border-slate-800 mt-2 pt-2`.
Se la Zona C è vuota, il separator non viene renderizzato.

---

## 9. Comportamento Context Menu

Invariato rispetto all'implementazione attuale — right-click sulla card apre il
context menu standard. Il click target è l'intera card (`onContextMenu` sul div root).

---

## 10. File da Modificare / Creare

| File | Tipo modifica |
| ---- | ------------- |
| `src/components/map/BasicBattleView.jsx` | Refactor: sostituisce `ShipCard` con `ShipBentoCard`; aggiunge selector `missiles`; aggiorna grid |
| `src/utils/combat.js` | Aggiunta: esporta `countMissileRacks(profile)` (estrazione da `battleStore.js`) |
| `src/store/battleStore.js` | Refactor: usa `countMissileRacks` importata da `utils/combat.js` invece di funzione locale |

Nessun nuovo file — la card è inline in `BasicBattleView.jsx` come `ShipCard` attualmente.

---

## 11. Test Coverage

| File | Suite |
| ---- | ----- |
| `src/components/map/BasicBattleView.test.jsx` (nuovo) | Render card con tutti i campi a default; badge DOGFIGHT visibile se `inDogfight`; badge LOCKED visibile se `sensorLockedBy`; riga inbound visibile se missile con target corrispondente; riga critici visibile con testo corretto; Zona C assente se nessuno stato attivo; ammo row assente per nave senza Missile Rack |

---

## 12. Scope Escluso

- **Thrust residuo per round** — in basic mode il thrust viene speso nella BasicManoeuvreModal;
  non ha senso mostrarlo nella card (il GM lo vede nel modal al momento dell'azione)
- **Range band nella card** — già visualizzata nella sezione DISTANCES sopra le card; duplicarla
  nella card singola crea ridondanza
- **Animazioni** — le card in basic mode sono statiche; nessuna animazione di transizione
- **Hover expand** — la card mostra già tutto; nessun meccanismo expand/collapse

---

## 13. Riferimenti

- `src/components/map/BasicBattleView.jsx` — implementazione attuale da refactorare
- `src/store/battleStore.js` — tutti i campi ship citati in §5
- `src/data/criticalHits.js` — formato `{ system, severity }` per `ship.criticalHits[]`
- `doc/thrust-and-drift-space-combat-simulator-spec.md` — modello dati nave completo
