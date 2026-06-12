# HANDOFF — Thrust & Drift

> Da leggere all'inizio di una nuova sessione per riprendere il lavoro.
> Dopo aver letto questo file, leggi anche `CLAUDE.md`.

---

## Stato corrente

| Campo | Valore |
| --- | --- |
| **Versione** | 1.13.1 |
| **Branch** | main (clean) |
| **Test** | 686 passing |
| **Ultimo commit** | `v1.13.1` docs: markdown formatting + version bump |

---

## Cosa è stato fatto nelle ultime sessioni

### Due sessioni fa — In-App Testing Bugfixes (v1.12.2)

1. **`fix(PassingAttackModal): allow both ships to fire in a passing encounter`** (`91a071f`) — `firedA`/`firedB` flags; `markPassingEncounterFired` store action; auto-dismiss solo su entrambi fired; pulsante `✓ FIRED` disabilitato. +2 test.
2. **`fix(audio): await ctx.resume() before scheduling sounds`** (`62b47ea`) — subscriber async; `await ctx.resume()` prima di `playEffectSound`; previene silent-drop su browser autoplay suspension (~30 s).
3. **`fix(missiles): set MISSILE_GUIDANCE_THRUST to 10 per MgT2e CRB p.162`** (`2200e7f`) — corretto da 3 a 10; allineato a RAW (missile standard Thrust 10). Test guidance aggiornato (target q:20).
4. **`fix(undo): include rangeBands in pushHistory snapshots`** (`c6db4f0`) — `rangeBands` mancava dai 3 siti di snapshot; undo in basic mode ripristinava il thrust ma lasciava le range band invariate. +1 test.

### Sessione corrente — Token Shapes + Missile Tooltip + UI Fixes (v1.13.0)

1. **`feat(tokenShapes): add 6 ship silhouettes with per-placement selector in AddShipModal`** (`391462f`) — `shipTokenShapes.js`: 6 tracers (delta, needle, freighter, gunship, cruiser, capital); `SHIP_SHAPES` map + `getShapeTracer`; `AddShipModal`: griglia 6-colonne con mini-canvas preview live, `tokenShape` state per-instance, salvato in `ship.profile.tokenShape`.
2. **`feat(tokenShapes): add per-shape bridge/cockpit details for all 6 silhouettes`** (`aa9cf54`) — 5 nuove funzioni detail (capital già esisteva): `drawDeltaDetail`, `drawNeedleDetail`, `drawFreighterDetail`, `drawGunshipDetail`, `drawCruiserDetail`; `SHIP_DETAILS` map + `getDetailDrawer`; chiamate da `drawShipToken` dopo fill+stroke.
3. **`feat(missiles): hover tooltip with launcher/target/thrust + larger token radius`** (`d24c28b`) — `MISSILE_RADIUS` 8 → 11; `useMissileHover` hook (150 ms debounce); `MissileTooltip` component (portal, flip logic, thrust bar cyan→yellow→red); `hoveredMissile` state + setters in `uiStore`; wired in `BattleMap`.
4. **`fix(effects): pin effects canvas to z-index 1 to guarantee render above ship tokens`** (`f5f9b7d`) — `effectsCanvasRef` ottiene `style={{ zIndex: 1 }}`; risolve `impact_burst`/`critical_flash`/`missile_launch`/`evasive_aura` che apparivano sotto i token nave.
5. **`feat(footer): add Mongoose Publishing link to legal footer`** (`36edee6`) — testo "Mongoose Publishing" nel footer diventa `<a href="https://www.mongoosepublishing.com/" target="_blank">`.
6. **`fix(ui): narrow battle log to left panel + restore footer border`** → poi **`fix(ui): battle log width 1/3 of viewport`** (`d384a5a`) — `BattleLog` da `left-0 right-0` a `left-0 w-1/3`; footer `border-t border-slate-800` ripristinato.
7. **`fix(hud): add phase advance guards`** (`df6210c`) — `NEXT PHASE ⟶` bloccato in setup (nessuna nave), acceleration/attack/actions (non tutti gli attori hanno agito); amber warning su click bloccato; `cursor-not-allowed`; auto-clear warning quando condizione soddisfatta. +3 test.
8. **`fix(hud): block phase advance in initiative until initiative is rolled`** (`1713424`) — fase `initiative` non coperta dai guard iniziali: `canAdvancePhase` ora include `if (phase === 'initiative') return initiativeOrder.length > 0`; blocco con messaggio `Roll initiative before advancing.` +1 test.

---

## Prossimo task

Nessun task pianificato. Test in app + pubblicazione previsti a breve.

> **Nota doc**: CHANGELOG/README/HANDOFF aggiornati a `1713424` (686 test). Prossimo bump di versione sarà v1.14.0.

Possibili aree di sviluppo future:

- **Obstacles system** — vedi `doc/obstacles-system-design.md` per spec completa; §14 documenta già l'interazione dogfight × ostacoli
- **BoardingPanel side panel** — vedi `doc/conflict-resolution-implementation.md` §5 (UX D); sostituisce i 3 boarding modal con pannello laterale persistente accanto alla mappa
- **Animazione lancio missili** — token appare istantaneamente, manca slide-in analoga al movimento navi
- **Configurabilità `MISSILE_GUIDANCE_THRUST`** — esporre nelle impostazioni GM (attualmente hardcoded a 10 per RAW; Smart missiles TC p.176 hanno Thrust 15)
- **Verifica sourcePage rimanenti** — altri entry del catalogo non verificati contro PDF HG 2022
- **tokenShape in profili** — attualmente `tokenShape` è per-instance (scelta al placement); valutare se aggiungere un default al profilo per navi con una forma canonica (es. capital ship sempre `capital`)

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
