# HANDOFF — Thrust & Drift

> Da leggere all'inizio di una nuova sessione per riprendere il lavoro.
> Dopo aver letto questo file, leggi anche `CLAUDE.md`.

---

## Stato corrente

| Campo | Valore |
| --- | --- |
| **Versione** | 1.12.2 |
| **Branch** | main (clean) |
| **Test** | 681 passing |
| **Ultimo commit** | `915c6cd` docs(field-manual): update passing encounter and missile guidance sections |

---

## Cosa è stato fatto nelle ultime sessioni

### Due sessioni fa — Conflict Resolution Fixes (v1.12.1)

1. **`fix(dogfight): guard inBoarding across detection, store, and boarding setup`** (`6fac28b`) — `detectDogfightGroups` esclude `inBoarding !== null`; `passingEncounters` salta coppie in abbordaggio; `startDogfight` predicate rifiuta partecipanti in abbordaggio; `BoardingSetupModal.canBoard` esclude bersagli `inDogfight !== null`.
2. **`test(dogfight): add inBoarding guard tests + resolveMovement basic mode guard tests`** (`7443dec`) — +5 test (679 totali).
3. **`docs(obstacles): add §14 dogfight interaction rules`** (`43dd272`) — §14 interazione ostacoli × dogfight; aggiornati §3.3 e §4.2.
4. **`chore: version bump to v1.12.1; update docs`** — versione ovunque, CHANGELOG, README, spec, dogfight-system-design, HANDOFF.

### Sessione corrente — In-App Testing Bugfixes (v1.12.2)

1. **`fix(PassingAttackModal): allow both ships to fire in a passing encounter`** (`91a071f`) — `firedA`/`firedB` flags; `markPassingEncounterFired` store action; auto-dismiss solo su entrambi fired; pulsante `✓ FIRED` disabilitato. +2 test.
2. **`fix(audio): await ctx.resume() before scheduling sounds`** (`62b47ea`) — subscriber async; `await ctx.resume()` prima di `playEffectSound`; previene silent-drop su browser autoplay suspension (~30 s).
3. **`fix(missiles): set MISSILE_GUIDANCE_THRUST to 10 per MgT2e CRB p.162`** (`2200e7f`) — corretto da 3 a 10; allineato a RAW (missile standard Thrust 10). Test guidance aggiornato (target q:20).
4. **`docs(field-manual): update passing encounter and missile guidance sections`** (`915c6cd`) — field-manual.md e HelpScreen.jsx allineati ai fix.

---

## Prossimo task

Nessun task pianificato. Test in app + pubblicazione previsti a breve.

Possibili aree di sviluppo future:

- **Obstacles system** — vedi `doc/obstacles-system-design.md` per spec completa; §14 documenta già l'interazione dogfight × ostacoli
- **BoardingPanel side panel** — vedi `doc/conflict-resolution-implementation.md` §5 (UX D); sostituisce i 3 boarding modal con pannello laterale persistente accanto alla mappa
- **Animazione lancio missili** — token appare istantaneamente, manca slide-in analoga al movimento navi
- **Configurabilità `MISSILE_GUIDANCE_THRUST`** — esporre nelle impostazioni GM (attualmente hardcoded a 10 per RAW; Smart missiles TC p.176 hanno Thrust 15)
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
