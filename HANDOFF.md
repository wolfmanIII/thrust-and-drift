# HANDOFF — Thrust & Drift

> Da leggere all'inizio di una nuova sessione per riprendere il lavoro.
> Dopo aver letto questo file, leggi anche `CLAUDE.md`.

---

## Stato corrente

| Campo | Valore |
| --- | --- |
| **Versione** | 1.18.1 |
| **Branch** | main (clean) |
| **Test** | 709 passing |
| **Ultimo commit** | fix(acceleration): advanceActor uses reversed order in acceleration phase |

---

## Cosa è stato fatto nelle ultime sessioni

### Sessione corrente — Acceleration Phase Actor Order Fix (v1.18.1)

1. **`fix(acceleration): advanceActor uses reversed order in acceleration phase`** (`b3752ce`) — `advanceActor` iterava `initiativeOrder` in avanti, ma HUD e ContextMenu usano `[...initiativeOrder].reverse()` nella fase di accelerazione. Stessa fase, stesso indice, navi diverse: la nave distrutta appariva come attore corrente mentre la nave viva veniva saltata silenziosamente, lasciando solo NEXT PHASE disponibile. Fix: `advanceActor` legge `phase` dallo store e applica la stessa inversione.

### Sessione precedente — BasicBattleView Bento + Contrast + Manoeuvre fix (v1.18.0)

1. **`fix(a11y): WCAG AA contrast`** (`ee19143`) — testo secondario `text-slate-500`/`text-slate-600` sotto il rapporto 4.5:1 su sfondi scuri. Alzato a `text-slate-400` (label/secondario) in 32 file componenti. `text-slate-600` mantenuto solo per stati disabled/placeholder.
2. **`feat(tooltip): sensor-locked-by + inbound missiles`** (`030bcbd`) — `ShipTooltip.jsx` in modalità vettoriale ora mostra: "Sensor Lock → [nome]" con DM, "Locked by [nome]" se il sensore è puntato su questa nave, "⚡ N× missile inbound" se missili sono in volo verso di essa.
3. **`refactor(combat): countMissileRacks estratto a utils/combat.js`** (`e0dbe0f`) — funzione privata in `battleStore.js` spostata come named export; condivisa tra store e `BasicBattleView` senza dipendenza circolare.
4. **`feat(basic): ShipBentoCard sostituisce ShipCard`** (`b66ac42`) — layout a tre zone: Header (nome + badge), Hull (barra + hull/max + ini), Status (zona condizionale con sensor lock, locked-by, missili inbound per launcher, missili lanciati per target, torrette in ricarica, critical hits, ammo). Grid `1→2→3 colonne` responsiva.
5. **`test(basic): 10 test suite BasicBattleView`** (`d414d8e`) — coprono tutte le zone status, badge, ammo, caso senza status.
6. **`fix(autosave): rangeBands trigger`** (`5ccb8f0`) — `hasSignificantChange` in `useAutosave.js` non confrontava `rangeBands`; cambio di banda in basic mode non scriveva su IndexedDB. Aggiunto `prev.rangeBands !== next.rangeBands`.
7. **`refactor(basic-mode): manovra per-nave indipendente`** (`620dd2f`) — rimosso slider "target contribuisce thrust". Ogni nave spende solo il proprio thrust nel suo turno. `applyBasicMovement` semplificato: parametro `targetThrust` rimosso. Test bidirectionality rimosso.
8. **`docs(help): aggiornato HelpScreen §Manoeuvre`** (`930975b`) — spiega manovra per-nave, quando usare GM SET (navi piccole a Very Long), nota su costi alti per grandi navi.

### Sessione precedente — Canvas getState Fix (v1.17.2)

1. **`fix(canvas): read battle state via getState() in rAF loop`** (`652d93f`) — `shipsRef.current` era stale nella finestra tra `set()` Zustand (sincrono) e il commit React + `useLayoutEffect`. Il sensor lock ring persisteva sulla mappa anche dopo la distruzione della nave target perché il loop rAF leggeva lo stato vecchio. Fix: `useBattleStore.getState()` dentro `frame()` — stesso pattern già in uso in `useCanvasRenderer`. Rimossi `shipsRef`/`missilesRef` e i relativi `useLayoutEffect`.
2. **null guards in `renderOneshotEffect`** — `impact_burst`, `laser_ray`, `thrust_plume`, `critical_flash`, `missile_trail`, `missile_launch`, `chaff` ora controllano che hex/fromHex/toHex siano definiti prima di chiamare `hpx()`; eliminata TypeError su navi non ancora posizionate sulla mappa.

### Sessione precedente — Panel Modals + PAM Fixes (v1.17.1)

1. **`feat(ui): anchor all modals bottom-right as panel`** (`5c76d0f`) — `Modal.jsx` aggiunge `variant="panel"` come default; nessun backdrop, mappa sempre visibile e panbile. `PassingAttackModal` e `MissileImpactModal` ereditano automaticamente. `ABANDON SESSION` in HUD mantiene `variant="dialog"`.
2. **`fix(pam): remove effects-window delay`** (`6a06ca5`) — rimosso `EFFECTS_WINDOW_MS` + hiding logic; con panel non c'è backdrop che oscura il canvas. −2 test obsoleti (700 totali).
3. **`fix(battle-log): disable reopen button while any modal or impact is active`** (`8507cf2`) — ↩ diventa grigio/disabled quando `pendingMissileImpacts.length > 0` o `activeModal !== null`.
4. **`fix(pam): lock action buttons while another modal is open`** (`4c3c6ab`) — `actionsLocked = activeModal !== null`; previene doppio-fire quando i panel si sovrappongono.
5. **`fix(hud): abandon session modal uses variant=dialog`** (`f644d94`) — conferma distruttiva rimane centrata con backdrop.
6. **`docs: clarify Ships That Pass in the Night initiative order per TC p.177`** (`0e80908`) — field manual + HelpScreen: ordine iniziativa, secondo pulsante bloccato, nave distrutta non risponde.
7. **`chore(netlify): disable auto-deploy via ignore script`** (`e172b45`) — `netlify.toml` con `ignore = "exit 0"`; deploy solo manuale.

### Sessione precedente — Audio + Animation + Ghost Fixes + ChangelogScreen (v1.17.0)

1. **`fix(audio): add 10ms lookahead to all synth scheduling`** (`ee78794`) — `ctx.currentTime + 0.01` in tutti e 6 i synth di `audioSynth.js`; previene il drop silenzioso alla prima riproduzione quando `ctx.currentTime` è 0.
2. **`fix(audio): increase lookahead to 50ms and handle closed AudioContext`** (`0ee95c1`) — lookahead alzato a 50ms (sufficiente dopo `AudioContext.resume()`); guard per stato `'closed'` → ricrea context; `console.warn` in DEV su errori scheduling.
3. **`fix(passing-encounter): defer passingEncounters until after movement animation`** (`cfb26cc`) — passing encounter queue emessa nel `setTimeout(animDuration + 100ms)` già usato dai missile impact, evitando apertura modale durante l'animazione.
4. **`fix(attack): move ammoLeft after useAttackSetup — fixes TDZ crash on missile attack`** (`4cecdba`) — `ammoLeft` calcolato prima di `useAttackSetup` causava Temporal Dead Zone crash in `AttackModal`.
5. **`test(attack): add AttackModal missile rack tests; fix ammoLeft prop threading`** (`f30f65b`) — +4 test: `ammoLeft` threading, `AttackConfigStep` ammo prop, launch disabilitato a 0 ammo, colore ammo display. 702 test totali.
6. **`fix(movement): exclude destroyed ships from passing encounter + hide wreck overlays`** (`97b7a67`) — `resolveMovement` loop ora salta navi con `isDestroyed`; Layer 3 (ghost) e Layer 4 (vector arrows) in `useCanvasRenderer` saltano le navi distrutte.
7. **`fix(pam): defer passing encounter until missile impacts are resolved`** (`fbe6c82`) — `PassingAttackModal` si sopprime mentre `pendingMissileImpacts.length > 0`; auto-dismiss per encounter con navi distrutte.
8. **`feat(ui): add in-app ChangelogScreen with parsed CHANGELOG.md`** (`7dbf766`) — `ChangelogScreen.jsx`: import `?raw` a build time, parser `parseChangelog`, render con jump-nav sidebar e badge categoria; bottone `📋 CHANGELOG` in Dashboard + HelpScreen; screen `'changelog'` in `uiStore` e `App.jsx`.
9. **`fix(canvas): read ships/missiles from getState() in render to fix stale-closure animation`** (`3ebfdcf`) — `render` useCallback chiudeva su `ships`/`missiles` al momento della creazione; quando `startMovementAnimation` (uiStore) sparava prima del `battleStore.set()`, il rAF loop iniziava con posizioni pre-movement → `lerpHex(pre, pre, t) = pre` → token fermi. Fix: `useBattleStore.getState()` dentro `render`, stesso pattern di `movementAnimation`.

### Sessione precedente — Passing Encounter + Doc Fixes (v1.15.5)

1. **`fix(passing-encounter): hide modal 1.5s after attack resolves so effects are visible`** (`351ffc3`) — `PassingAttackModal` monitorava `activeModal`; quando transitava da `'attack'` a `null`, il modal si nascondeva per 1500ms via `hiding` state + `setTimeout`, poi riappariva con stato store invariato (firedA/firedB preservati). Stesso pattern del fix MissileImpactModal. +2 test (effects window hide/reappear). 694 test totali.
2. **`docs: update field manual + HelpScreen for v1.15.1–v1.15.4`** (`21aae8b`) — §8.1 aggiornato con 🎲 button, suono impatto, recovery ↩, badge HUD; §4.1 guard missile impact; durata animazione corretta (600ms→2s).

### Sessione corrente — Missile Impact Fixes (v1.15.1 → v1.15.4)

1. **`fix(missiles): defer impact modal via setTimeout`** (`eea2000`) — `MissileImpactModal` compariva durante l'animazione di movimento (cross-store tearing con `useSyncExternalStore`). Fix: `resolveMovement` rimuove `pendingMissileImpacts` dal `set()` sincrono; aggiunge via `setTimeout(animDuration + 100ms)`. Modale elimina guard `movementAnimation` e import `useUiStore`. Test aggiornato con fake timers. 692 test (invariato).
2. **`fix(missiles): keep impacted missiles alive during animation; emit impact sound`** (`ff2ecea`) — i missili impattati venivano rimossi dal `set()` sincrono: il token spariva istantaneamente e nessun suono veniva emesso. Fix: missili impattati inclusi nello store insieme ai sopravvissuti durante l'animazione; il `setTimeout` li rimuove, mostra la modale e chiama `emitEffect('impact_burst')` per ogni salvo. Import `emitEffect` aggiunto a `battleStore.js`. 692 test (invariato).
3. **`feat(missiles): add in-app dice roll button to MissileImpactModal`** (`f6f744f`) — pulsante 🎲 affianco al campo danno; chiama `rollDice(count × 4, 6)` e popola il totale. Input manuale rimane per override con dadi fisici. 692 test (invariato).
4. **`feat(missiles): impact recovery from log + phase advance block`** — log entry impatto include `details.recoverable + impact`; pulsante ↩ amber nel battle log ri-accoda l'impatto via `reopenMissileImpact`; `canAdvancePhase` bloccato se `pendingMissileImpacts.length > 0` con messaggio specifico; badge `⚡ N impacts unresolved` pulsante nell'HUD. 692 test (invariato).

### Sessione precedente — Missile Impact + Animation (v1.15.0)

1. **`feat(missiles): detect impact when salvo reaches target hex`** (`ed214bd`) — `pendingMissileImpacts: []` in store; in `resolveMovement` post-movement hex check (missile pos == target pos); impacted missiles rimossi dall'array attivo e accodati in `pendingMissileImpacts`; log entry per impatto; `dismissMissileImpact(id)` action; test guidance refactored per nuovo comportamento.
2. **`feat(missiles): add MissileImpactModal`** (`6f9a607`) — modal self-contained (pattern PassingAttackModal): mostra launcher/target/salvo count, input danno totale, armour da profilo, net damage live, APPLY DAMAGE / MISS DISMISS; auto-dismiss se target rimosso.
3. **`feat(app): mount MissileImpactModal`** (`e13cc37`) — `<MissileImpactModal />` nel layer overlay accanto a `<PassingAttackModal />`.
4. **`fix(animation): increase movement animation duration 600ms → 2000ms`** (`4e8cbd5`) — `MOVEMENT_ANIM_DURATION_MS` in `uiStore.js`.

### Sessione precedente — Rubber-band Thrust Targeting (v1.14.0)

1. **`feat(hex): add computeClampedDelta`** (`03444e7`) — funzione pura in `hex.js`; calcola delta clamped da `shipPos` verso `targetHex` entro `thrustAvailable`; while-loop di correzione post-round. +4 test.
2. **`feat(uiStore): thrustTargeting state`** (`ccde095`) — `thrustTargeting: { shipId } | null`; `startThrustTargeting` / `cancelThrustTargeting`; `'thrust'` rimosso da `ModalId` typedef. +2 test.
3. **`feat(thrust-targeting): canvas rubber-band`** (`0ed79f4`) — `useMapInteraction` accetta `mouseHexRef`; `onMouseMove` aggiorna hex in targeting mode; `onClick` conferma delta via `applyShipThrust` + `emitEffect`; `BattleMap` crea `mouseHexRef` + ESC keydown; `useCanvasRenderer` Layer 3b `drawThrustTargeting` (linea tratteggiata, dot, ghost, linea inerziale, badge cost/max); ghost default soppresso per la nave in targeting; `ContextMenu` chiama `startThrustTargeting`; `App.jsx` rimuove import/entry `ThrustModal`.
4. **`docs: mark ThrustModal unused`** (`403af7d`) — README nota `⚠ UNUSED`.

### Sessione precedente — Phase Guards + UI Fixes (v1.13.0 / v1.13.1)

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

Rigenerare `public/field-manual.pdf` da `doc/field-manual.md` (aggiornato a v1.18.0).
Fare bump di versione in `package.json` + commit release.
Poi push a origin quando confermato.

Possibili aree di sviluppo future:

- **Eliminare `ThrustModal.jsx`** — file ancora su disco ma non più importato; rimuovere quando confermato stabile il nuovo targeting
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
