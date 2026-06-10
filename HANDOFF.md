# HANDOFF — Thrust & Drift

> Da leggere all'inizio di una nuova sessione per riprendere il lavoro.
> Dopo aver letto questo file, leggi anche `CLAUDE.md`.

---

## Stato corrente

| Campo | Valore |
| --- | --- |
| **Versione** | 1.12.1 |
| **Branch** | main (clean) |
| **Test** | 679 passing |
| **Ultimo commit** | `f4b4b7d` docs(obstacles): remove spurious blank line in §3.3 |

---

## Cosa è stato fatto nelle ultime sessioni

### Due sessioni fa — Bugfix UX + Missile Guidance + Audio (v1.12.0)

1. **`fix(ContextMenu): always show Attack option`** (`7e3522a`) — voce Attack sempre visibile; `MenuItemDisabled` con reason `All turrets fired` quando turret esauriti.
2. **`fix(ActionModal): reset full selection on ANOTHER ACTION`** (`f74a58b`) — `selectedMemberId`, `selectedAction`, `manualDice`, `skillOverride` azzerati.
3. **`feat(battleStore): missile guidance in resolveMovement`** (`a910a5b`) — `computeMissileGuidance`, `MISSILE_GUIDANCE_THRUST = 3`. +2 test.
4. **`feat(effectQueue): subscribeEffects`** (`8bd1e50`) — listener pattern parallelo a `drainEffects`.
5. **`feat(audio): procedural sound effects via Web Audio API`** (`6a5c3f3`) — `audioSynth.js`, `useAudioEngine.js`, `uiStore.audioEnabled`.
6. **`feat(HUD): audio mute toggle + BattleMap wiring`** (`fd00a36`) — 🔊/🔇 HUD; `useAudioEngine` in `BattleMap.jsx`.

### Sessione corrente — Conflict Resolution Fixes (v1.12.1)

1. **`fix(dogfight): guard inBoarding across detection, store, and boarding setup`** (`6fac28b`) — `detectDogfightGroups` esclude `inBoarding !== null`; `passingEncounters` salta coppie in abbordaggio; `startDogfight` predicate rifiuta partecipanti in abbordaggio; `BoardingSetupModal.canBoard` esclude bersagli `inDogfight !== null`.
2. **`test(dogfight): add inBoarding guard tests + resolveMovement basic mode guard tests`** (`7443dec`) — +5 test (679 totali).
3. **`docs(obstacles): add §14 dogfight interaction rules`** (`43dd272`) — §14 interazione ostacoli × dogfight; aggiornati §3.3 e §4.2.
4. **`chore: version bump to v1.12.1; update docs`** — versione ovunque, CHANGELOG, README, spec, dogfight-system-design, HANDOFF.

---

## Prossimo task

Nessun task pianificato. Test in app + pubblicazione previsti a breve.

Possibili aree di sviluppo future:

- **Obstacles system** — vedi `doc/obstacles-system-design.md` per spec completa; §14 documenta già l'interazione dogfight × ostacoli
- **BoardingPanel side panel** — vedi `doc/conflict-resolution-implementation.md` §5 (UX D); sostituisce i 3 boarding modal con pannello laterale persistente accanto alla mappa
- **Animazione lancio missili** — token appare istantaneamente, manca slide-in analoga al movimento navi
- **Configurabilità MISSILE_GUIDANCE_THRUST** — esporre nelle impostazioni GM
- **Verifica sourcePage rimanenti** — altri entry del catalogo non verificati contro PDF HG 2022

---

## Riferimenti utili

- `CLAUDE.md` — regole di progetto, stack, struttura
- `doc/field-manual.md` — manuale di gioco (italiano)
- `doc/obstacles-system-design.md` — spec completa sistema ostacoli (prossima feature major); §14 interazione dogfight
- `doc/conflict-resolution-implementation.md` — piano implementativo fix A/B/C/D; D (BoardingPanel) ancora da fare
- `src/store/battleStore.js` — `isDestroyed`, `applyDamage()`, `advanceActor()`, `computeMissileGuidance()`, `startDogfight` (guard inBoarding)
- `src/components/map/useDogfightDetection.js` — `detectDogfightGroups` (esclude `inBoarding` e `inDogfight`)
- `src/store/uiStore.js` — `movementAnimation`, `audioEnabled`, `toggleAudio`
- `src/utils/audioSynth.js` — sintesi suoni (laser, impact, critical, missile, thrust)
- `src/hooks/useAudioEngine.js` — AudioContext singleton, subscriber effectQueue
- `src/utils/effectQueue.js` — `emitEffect`, `drainEffects`, `subscribeEffects`
- `src/components/ui/ContextMenu.jsx` — `MenuItemDisabled`, logica blocco azioni
- `src/components/map/tokenRenderers.js` — rendering wreck semitrasparente + badge ☠
