# HANDOFF — Thrust & Drift

> Da leggere all'inizio di una nuova sessione per riprendere il lavoro.
> Dopo aver letto questo file, leggi anche `CLAUDE.md`.

---

## Stato corrente

| Campo | Valore |
| --- | --- |
| **Versione** | 1.10.0 |
| **Branch** | main (clean) |
| **Test** | 672 passing |
| **Ultimo commit** | `90cabaa` fix(shipCatalog): correct cargo, fuel, sourcePage refs per CRB/HG RAW |

---

## Cosa è stato fatto nelle ultime sessioni

### Sessione precedente — Movement Animation (v1.10.0)

1. **`feat(uiStore): add movementAnimation state and actions`** (`8236f87`) — `MOVEMENT_ANIM_DURATION_MS = 600`, stato `movementAnimation: null`, azioni `startMovementAnimation` e `clearMovementAnimation`.
2. **`feat(battleStore): capture start positions before resolveMovement`** (`ba62f03`) — in `resolveMovement()`: cattura `startPositions` e chiama `startMovementAnimation` prima del `set()`.
3. **`feat(renderer): interpolate ship and missile positions during movement animation`** (`22c33aa`) — `easeInOut` + `lerpHex`; rAF loop esteso; `clearMovementAnimation()` a fine animazione.
4. **`feat(map): disable pointer events on canvas during movement animation`** (`fa45f83`) — `pointerEvents: 'none'` durante animazione.
5. **`test(uiStore): cover startMovementAnimation and clearMovementAnimation`** (`69a9ee3`) — 4 nuovi test.
6. **Docs + version bump v1.10.0** (`e917027`, `8ef3bf8`).

### Sessione corrente — isDestroyed + ship data corrections + QoL

1. **`feat(battleStore): add isDestroyed flag`** (`a675101`) — `isDestroyed: false` all'init; rilevato quando `hullCurrent === 0`; log DESTROYED; `advanceActor()` skippa navi distrutte.
2. **`feat(ContextMenu): block all actions on destroyed ships`** (`2c841b6`) — tutte le azioni combat bloccate su navi distrutte; label "WRECK — no actions available"; "Remove Wreck" al posto di "Remove from battle".
3. **`feat(tokenRenderers): render destroyed ships at 35% opacity with ☠ badge`** (`2a49e15`) — `globalAlpha = 0.35` su tutto il token; badge ☠ disegnato a full opacity sopra.
4. **`fix(defaultProfiles): correct hull formula`** (`26b5c08`) — hull corretto a `tonnage / 2.5` (RAW) per tutti i 5 profili default; armor, jump, sensors, cargo allineati a CRB/HG.
5. **`fix(shipCatalog): correct cargo, fuel, sourcePage refs`** (`90cabaa`) — sourcePage corretti per tutti i small craft (pp.139–144 HG 2022); cargo/fuel corretti per Empress Marava, A2 Hero, Beowulf, SDB TL15; descrizione SDB "240-missile" → "144-missile".
6. **`feat(AttackModal): add inline 🎲 auto-roll button for player damage dice`** (`0e13f56`) — `AttackDamageStep` e `AttackCriticalStep` (extra damage): aggiunto `🎲` inline accanto al numero input. Pre-compila il valore e abilita CONFIRM, stesso pattern di `DiceInput`. Tutti gli altri tiri usavano già `DiceInput` con `🎲` built-in.
7. **`fix(BasicBattleView): render destroyed ships at 40% opacity with ☠ WRECK badge`** (`81394ce`) — `ShipCard` ora mostra `opacity-40`, bordo `red-900/50`, badge `☠ WRECK` e nasconde i critical hits quando `isDestroyed`. Le azioni erano già bloccate dal `ContextMenu.jsx` condiviso.

---

## Prossimo task

Nessun task pianificato. La sessione è conclusa con 672 test passing e branch main pulito.

Possibili aree di sviluppo future:

- **Animazione lancio missili** — analoga al movimento navi (attualmente il token appare istantaneamente)
- **Configurabilità durata animazione** — esporre `MOVEMENT_ANIM_DURATION_MS` nelle impostazioni GM
- **Test renderer** — `easeInOut` e `lerpHex` sono funzioni pure isolabili in un util testabile
- **Verifica sourcePage rimanenti** — altri entry del catalogo non ancora verificati contro PDF HG 2022

---

## Riferimenti utili

- `CLAUDE.md` — regole di progetto, stack, struttura
- `doc/field-manual.md` — manuale di gioco (italiano)
- `src/store/battleStore.js` — `isDestroyed` flag, `applyDamage()`, `advanceActor()`
- `src/store/uiStore.js` — `movementAnimation` state
- `src/components/ui/ContextMenu.jsx` — logica blocco azioni su wreck
- `src/components/map/tokenRenderers.js` — rendering wreck semitrasparente + badge ☠
- `src/data/defaultProfiles.js` — profili base corretti (hull, armor, sensors, cargo)
- `src/data/shipCatalog.js` — catalogo completo corretto (cargo, fuel, sourcePage)
