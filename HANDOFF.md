# HANDOFF — Thrust & Drift

> Da leggere all'inizio di una nuova sessione per riprendere il lavoro.
> Dopo aver letto questo file, leggi anche `CLAUDE.md`.

---

## Stato corrente

| Campo | Valore |
| --- | --- |
| **Versione** | 1.12.0 |
| **Branch** | main (clean) |
| **Test** | 674 passing |
| **Ultimo commit** | `fd00a36` feat(HUD): add audio mute toggle; wire useAudioEngine into BattleMap |

---

## Cosa è stato fatto nelle ultime sessioni

### Sessione precedente — isDestroyed + ship data corrections + QoL (v1.11.0)

1. **`feat(battleStore): add isDestroyed flag`** (`a675101`) — `isDestroyed: false` all'init; rilevato quando `hullCurrent === 0`; log DESTROYED; `advanceActor()` skippa navi distrutte.
2. **`feat(ContextMenu): block all actions on destroyed ships`** (`2c841b6`) — tutte le azioni combat bloccate su navi distrutte; label "WRECK — no actions available"; "Remove Wreck" al posto di "Remove from battle".
3. **`feat(tokenRenderers): render destroyed ships at 35% opacity with ☠ badge`** (`2a49e15`) — `globalAlpha = 0.35` su tutto il token; badge ☠ disegnato a full opacity sopra.
4. **`fix(defaultProfiles): correct hull formula`** (`26b5c08`) — hull corretto a `tonnage / 2.5` (RAW) per tutti i 5 profili default.
5. **`fix(shipCatalog): correct cargo, fuel, sourcePage refs`** (`90cabaa`) — sourcePage corretti; cargo/fuel corretti per Empress Marava, A2 Hero, Beowulf, SDB TL15.
6. **`feat(AttackModal): add inline 🎲 for player damage dice`** (`0e13f56`) — `AttackDamageStep` e `AttackCriticalStep` (extra damage).
7. **`fix(BasicBattleView): render destroyed ships at 40% opacity with ☠ WRECK badge`** (`81394ce`).

### Sessione corrente — Bugfix UX + Missile Guidance + Audio (v1.12.0)

1. **`fix(ContextMenu): always show Attack option`** (`7e3522a`) — voce Attack sempre visibile durante la fase di attacco; se tutti i turret hanno sparato (es. usati per PD/Sand — comportamento RAW corretto), appare come `MenuItemDisabled` con reason `All turrets fired`.
2. **`fix(ActionModal): reset full selection on ANOTHER ACTION`** (`f74a58b`) — `selectedMemberId`, `selectedAction`, `manualDice`, `skillOverride` vengono azzerati; il membro appena usato non restava nell'`availableCrew` ma era ancora selezionato via `crewArray`.
3. **`feat(battleStore): missile guidance in resolveMovement`** (`a910a5b`) — `computeMissileGuidance`: punta alla posizione predetta del target (`target.pos + target.vector`), applica fino a `MISSILE_GUIDANCE_THRUST = 3` hex/round di delta-v; senza thrust residuo → deriva senza correzione. +2 test.
4. **`feat(effectQueue): subscribeEffects`** (`8bd1e50`) — listener pattern parallelo a `drainEffects`; `emitEffect` notifica i subscriber sincrono.
5. **`feat(audio): procedural sound effects via Web Audio API`** (`6a5c3f3`) — `audioSynth.js` (sintesi per laser, impact, critical, missile launch, thrust plume), `useAudioEngine.js` (singleton AudioContext + subscriber), `uiStore.audioEnabled` + `toggleAudio`.
6. **`feat(HUD): audio mute toggle + BattleMap wiring`** (`fd00a36`) — 🔊/🔇 nella toolbar utility; `useAudioEngine` montato in `BattleMap.jsx`.

---

## Prossimo task

Nessun task pianificato. La sessione è conclusa con 674 test passing e branch main pulito.

Possibili aree di sviluppo future:

- **Obstacles system** — vedi `doc/obstacles-system-design.md` per spec completa
- **Animazione lancio missili** — analoga al movimento navi (il token appare istantaneamente)
- **Configurabilità MISSILE_GUIDANCE_THRUST** — esporre nelle impostazioni GM
- **Configurabilità durata animazione** — esporre `MOVEMENT_ANIM_DURATION_MS` nelle impostazioni GM
- **Verifica sourcePage rimanenti** — altri entry del catalogo non ancora verificati contro PDF HG 2022

---

## Riferimenti utili

- `CLAUDE.md` — regole di progetto, stack, struttura
- `doc/field-manual.md` — manuale di gioco (italiano)
- `doc/obstacles-system-design.md` — spec completa sistema ostacoli (prossima feature major)
- `src/store/battleStore.js` — `isDestroyed`, `applyDamage()`, `advanceActor()`, `computeMissileGuidance()`
- `src/store/uiStore.js` — `movementAnimation`, `audioEnabled`, `toggleAudio`
- `src/utils/audioSynth.js` — sintesi suoni (laser, impact, critical, missile, thrust)
- `src/hooks/useAudioEngine.js` — AudioContext singleton, subscriber effectQueue
- `src/utils/effectQueue.js` — `emitEffect`, `drainEffects`, `subscribeEffects`
- `src/components/ui/ContextMenu.jsx` — `MenuItemDisabled`, logica blocco azioni
- `src/components/map/tokenRenderers.js` — rendering wreck semitrasparente + badge ☠
