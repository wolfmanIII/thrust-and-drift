# HANDOFF — Thrust & Drift

> Da leggere all'inizio di una nuova sessione per riprendere il lavoro.
> Dopo aver letto questo file, leggi anche `CLAUDE.md`.

---

## Stato corrente

| Campo | Valore |
| --- | --- |
| **Versione** | 2.7.0 |
| **Branch** | main |
| **Test** | 1331 Vitest + 63 Playwright e2e |
| **Ultimo commit** | fix(save): persist pendingMissileImpacts, pendingObstacleCollisions, shipAddedThisRound (v2.7.0) |

---

## Prossimo task

- **PDF field-manual** — rigenerare con MD2FastPdf/Gotenberg (§9.6 Missile Barbette aggiornata: house-rule 1–5 stepper invece di salvo fisso RAW)
- Valutare se chiudere formalmente le issue GitHub #26/#27 su `main` (rimaste OPEN: i commit di fix non usavano la sintassi `Fixes #N`, quindi GitHub non le ha chiuse in automatico al merge)

---

## Cosa è stato fatto nelle ultime sessioni

### Sessione corrente — Missile Barbette variable salvo (v2.7.0)

Terza segnalazione CotI dallo stesso thread (dopo #26/#27 già rilasciate in v2.6.0): *"lasciare che le missile barbette sparino un numero variabile di missili, da 1 a 5, invece di sparare sempre tutti e 5"*. Il segnalante stesso riconosceva che RAW è un salvo fisso di 5.

Verifica RAW: *High Guard Update 2022, p.30* — *"A missile barbette fires five missiles at a time and holds enough missiles for five full salvos (a total of 25 missiles)"*. Nessuna FAQ/errata la modifica: RAW è salvo fisso 5, quindi la richiesta è esplicitamente una house rule opzionale, non un bug. Aperta issue [#28](https://github.com/wolfmanIII/thrust-and-drift/issues/28). Chiesto all'utente come esporla (nessun toggle rules-system esisteva già in app): scelto uno stepper libero 1–5 sempre attivo, stessa UX di Torpedo/Missile Rack, senza gate opzionale — deviazione RAW dichiarata a design, non nascosta dietro un flag.

1. **`AttackModal.jsx`** — rimosso il ramo JSX "Fixed salvo" per `Missile Barbette`; ora usa lo stesso stepper 1–maxSalvo di Rack/Torpedo. `maxSalvo` per Barbette = `Math.min(5, ammoLeft)`. Default alla selezione dell'arma resta 5 (punch massimo invariato) ma clampato a `ammoLeft` se restano meno di 5 missili in magazzino. Nessuna modifica a `spendMissileAmmo`/`launchMissile`/calcolo danno — già parametrizzati sul count.
2. **Test**: +2 in `AttackModal.test.jsx` (default 5 + stepper giù a 3; cap a ammo residuo quando <5 missili rimasti). Totale 1325 Vitest (+2 da 1323).
3. **Doc sync**: CHANGELOG v2.7.0, field-manual §9.6 Missile Barbette riscritta, HelpScreen sezione "LAUNCHING MISSILES", README riga Missile launch, spec.md (commenti tipo `MissileSalvo`/`WeaponId`). Combattimento-Spaziale.md/Vettoriale.md verificati — nessun riferimento diretto al salvo Barbette, nulla da aggiornare.

Richiesta di follow-up nella stessa sessione: *"controlla se save e autosave sono ok anche con le modifiche precedenti non solo per questa"*. Audit dell'intera catena di persistenza (`useAutosave.js` + `exportBattleState`/`importBattleState` in `battleStore.js`), non solo del diff Missile Barbette:

4. **Campi per-nave/profilo** (`holographicControls`, `hardpoints`, `linkedCount`, il nuovo salvo Barbette) — nessun problema: `ships[]`/`profiles[]` vengono serializzati per intero da autosave e da export/import, senza allowlist interna, quindi ogni nuovo campo dentro quegli oggetti è già al sicuro.
5. **Campi top-level dello `BattleState`** — trovati 3 gap reali (il `git log` di `useAutosave.js` mostra 5+ fix storici dello stesso tipo, è un pattern ricorrente in questa area): `pendingMissileImpacts` (impatti missile in coda per risoluzione danno — mancava sia da autosave **che** da export/import, il gap più grave: un refresh/crash a metà risoluzione cancellava silenziosamente l'impatto in coda), `pendingObstacleCollisions` (mancava solo da autosave — l'export/import manuale ce l'aveva già), `shipAddedThisRound` (flag house-rule per il reroll iniziativa a metà round — mancava da entrambi). `passingEncounters` controllato ma lasciato fuori: è transiente per design, svuotato prima che finisca l'animazione della fase movimento.
6. **Fix**: aggiunti i 3 campi a `extractBattleSnapshot`/`hasSignificantChange`/restore-on-mount in `useAutosave.js` e a `exportBattleState`/`importBattleState` in `battleStore.js`. +6 test (+3 `useAutosave.test.js`, +3 `battleStore.test.js`). Totale 1331 Vitest (+6 da 1325). Tutto tenuto su v2.7.0 (nessun bump aggiuntivo, su richiesta esplicita).
7. Salvata nuova memoria persistente (`feedback-save-autosave-audit.md`): controllare sempre le 3 allowlist di persistenza quando si tocca lo stato di battaglia, non solo il diff della feature del momento.

### Sessione precedente — Missile Rack salvo cap + Holographic Controls (v2.6.0)

Triage di due segnalazioni CotI, entrambe risolte nella stessa sessione e rilasciate insieme come v2.6.0 (nessun deploy intermedio a v2.5.1, quindi versione unica anziché due bump separati):

1. **Fix #26 — Missile Rack salvo non limitato per torretta**: `maxSalvo` in `AttackModal.jsx` per `Missile Rack` usava `ammoLeft` (l'intero magazzino missili della nave) invece di essere limitato al numero di componenti Missile Rack effettivamente montati nella torretta selezionata (`linkedCount`, già calcolato in `useAttackSetup.js` per il bonus danno ma mai usato per il cap). Una torretta tripla mista (Beam Laser / Missile Rack / Sandcaster) permetteva di lanciare l'intero magazzino invece di 1 missile/round; una torretta tripla omogenea di rack non era limitata a 3. Analogo al cap esistente per Torpedo (`min(3, ammoLeft)`). +2 test in `AttackModal.test.jsx` (torretta mista → cap 1, torretta tripla omogenea → cap 3).

2. **Feature #27 — Holographic Controls bridge option**: nuovo campo boolean `holographicControls` sul profilo nave (default `false`), toggle in `ShipProfileForm.jsx` sezione Combat Stats. Quando attivo, `rollAllInitiative` applica **DM+2** al tiro di iniziativa della nave (CRB p.186 / HG Update 2022 p.31) — passato come nuovo parametro `holographicControlsDM` a `rollInitiative` in `combat.js`. Mostrato nel preview live (pre-conferma) e nel breakdown risolto (`+ Holo:2`) di `InitiativeModal.jsx`. Non serviva il concetto di "bridge design option" completo ipotizzato nell'issue: bastava un campo diretto sul profilo, senza introdurre un sotto-sistema bridge (fuori scope, l'app non fa costruzione navi). +3 test (2 `combat.test.js`, 1 `battleStore.test.js`).

Totale +5 test. Doc sync: CHANGELOG v2.6.0 (sezioni Added + Fixed), field-manual §6.1.2 nuova + formula iniziativa + §9.6 Missile Rack, Combattimento-Spaziale.md §4.2.1 nuova, spec.md formula `rollInitiative`, HelpScreen, README, package.json + Dashboard badge.

### Sessione precedente — Ship Roster redesign (v2.5.0)

Redesign incrementale del roster navi nel Tactical Display della Dashboard (autosave + preview pre-import), costruito un pezzo alla volta su richiesta diretta durante la sessione:

1. **Token silhouette** — sostituito il pallino colore piatto con l'icona nave (`useShipTokenIcon`, stessa forma/colore del token sulla mappa e delle bento card), portato da tac-and-lock e poi ingrandito a 40px. Nome/classe impilati in una colonna per liberare lo spazio orizzontale necessario.
2. **THRUST / ARMOUR** — colonna con thrust nominale da profilo e armour corrente (riflette eventuali riduzioni da Ion Cannon).
3. **STATUS** — badge con priorità 💥 DESTROYED (rosso) → ⚔ DOGFIGHT (ambra) → ⚔ BOARDING (rosso); default ○ NEUTRAL (grigio, fazione neutrale) o ● COMBAT (ciano) quando nessuno stato speciale è attivo.
4. **Telemetria** — POS/VEC (posizione esagonale + vettore) in modalità Vectorial; in modalità Basic le navi non hanno posizione/vettore reali (placeholder `{0,0}`), quindi la colonna mostra invece **RANGE**, la banda di distanza dal nemico più vicino calcolata da `rangeBands`.
5. **Doc sync + bump v2.5.0**: CHANGELOG, README (corretto anche un conteggio test stale: 1294→1318 unit, 26→63 e2e — la cifra e2e non rifletteva più `batch1-3-features.spec.js`/`battle-report.spec.js` da sessioni precedenti), field-manual §2.2.1 nuova, HelpScreen, package.json + Dashboard badge.

Nessun nuovo test dedicato: modifica puramente di visualizzazione su dati già presenti nello stato di battaglia (`ship.profile.thrust/armour`, `isDestroyed`, `inDogfight`, `inBoarding`, `faction`, `position`, `vector`, `rangeBands`). La suite esistente (1318 Vitest) resta verde senza modifiche.

### Sessione precedente — Hardpoint budget (v2.4.0)

Follow-up dell'issue [#24](https://github.com/wolfmanIII/thrust-and-drift/issues/24): mentre si fixava il bug torpedo/quad-turret, è emerso che l'app non applicava affatto il budget Hardpoint (CRB p.183: 1 Hardpoint ogni 100 tonnellate scafo intere; navi sotto 100t hanno Firmpoint — 1/2/3 a seconda della fascia; HG p.31: Large Bay costa 5 Hardpoint invece di 1). Aperta issue dedicata [#25](https://github.com/wolfmanIII/thrust-and-drift/issues/25).

1. **`src/utils/hardpoints.js`** (nuovo) — `hardpointBudget(tonnage)`, `slotHardpointCost(turret)`, `totalHardpointsUsed(turrets)`. Verificato contro tutte le 34 navi del catalogo: 0 violazioni (il primo tentativo con `Math.floor(tonnage/100)` dava falsi positivi su tutti i piccoli scafi sotto 100t, perché la regola Firmpoint non era ancora implementata).
2. **`ShipProfileForm.jsx`** — readout live `HARDPOINTS n/n` nell'header sezione Weapons; `addWeapon` blocca l'aggiunta di una nuova arma a uno slot vuoto se sforerebbe il budget. Le navi/profili esistenti non vengono mai invalidati retroattivamente — il check si applica solo alle nuove aggiunte.
3. **Test**: +10 in `hardpoints.test.js`, +6 in `ShipProfileForm.test.jsx`, +6 e2e Playwright (`e2e/hardpoint-budget.spec.js`, autorizzato esplicitamente per questa sessione). Totale 1318 Vitest (+16 da 1302) + 28 e2e (+6 da 22).
4. **Doc aggiornati**: field-manual.md (nuovo §2.3.1), HelpScreen.jsx (stessa sezione), CHANGELOG v2.4.0, package.json + Dashboard badge.
5. Issue [#24](https://github.com/wolfmanIII/thrust-and-drift/issues/24) chiusa (fix già deployati in v2.3.6); [#25](https://github.com/wolfmanIII/thrust-and-drift/issues/25) tracciava questo lavoro.

### Sessione precedente — CotI bug fixes: Torpedo quad turret + PD auto-roll (v2.3.6)

Segnalazione CotI, due bug distinti in `AttackModal.jsx` / `ShipProfileForm.jsx`:

1. **Torpedo (barbette) combinabile in quad turret** — RAW-check su HG p.31 (Torpedo Barbette: "holds three torpedoes" = capacità munizioni di UN barbette, non salvo per-round) e HG p.81 (Quad Turret: esplicitamente un meccanismo solo-turret). Root cause: `ShipProfileForm.jsx` non distingueva `mount: 'turret'` da `mount: 'barbette'/'bay'`, lasciando fino a 4 armi di qualsiasi tipo per slot. Fix: barbette/bay cappate a 1 per slot (dropdown filtrato + guard a livello di stato in `addWeapon`, indipendente dalla UI). `ShipDetailModal.jsx` corretta di conseguenza — uno slot barbette/bay mostra **Barbette**/**Bay**, mai "Turret".
2. **PD contro missili/torpedo senza auto-roll opt-in** — `MissilePdStep` in `AttackModal.jsx` forzava input manuale 2D6 per le navi player, senza il pulsante 🎲 presente invece in `AttackDamageStep` e altri step. Aggiunto lo stesso pattern.
3. **Doc aggiornati**: field-manual.md (§9.5 Ship Detail Weapons, §9.6 Point Defence, §per-slot firing limit), HelpScreen.jsx (stesse sezioni), CHANGELOG v2.3.6.
4. **Test**: +6 in `ShipProfileForm.test.jsx` (barbette/bay single-mount, dropdown filtering), +2 in `ShipDetailModal.test.jsx` (label Barbette/Bay). 1302 test totali (+8 da 1294).
5. **Issue GitHub**: [#24](https://github.com/wolfmanIII/thrust-and-drift/issues/24) — entrambi i bug documentati con root cause analysis.

**Nota metodologica**: l'utente ha esplicitamente richiesto di seguire sempre il RAW su ambiguità di regole, mai proporre house rule come alternativa. Salvato in memoria (`feedback_raw_fidelity`).

### Sessione corrente — v2.0.0: Discrete Zoom + PDF Report + Test Suite

1. **Spec §13.10** (`7149514`, prev session) — §13.10.1 Scale Mappa Discrete documentata come ✅ COMPLETATA; §13.10.2 Resoconto PDF espansa con dati completi (componente, trigger, sorgenti dati, struttura contenuto, meccanismo print). Ora entrambe ✅ COMPLETATE.

2. **BattleReportModal.jsx** (prev session) — Legge `ships`, `log`, `round`, `combatMode` da battleStore; `closeModal` da uiStore. Raggruppa log per round. Pulsante `⎙ Print / Save PDF` → `window.print()`. Sezione `id="battle-report-print"` con attributi semantici `data-print-accent/red/green`. `THRUST &amp; DRIFT` via HTML entity. `variant="dialog"`, `width="max-w-4xl"`.

3. **App.css** (prev session) — Blocco `@media print` aggiunto in cima: body `visibility:hidden`, `#battle-report-print` `position:fixed` white background, override colori semantici via selettori `[data-print-*]`.

4. **App.jsx** (prev session) — Import + entry `battleReport: BattleReportModal` in `MODAL_MAP`; pulsante `⎙ Report` in `TopRightControls`.

5. **Test unitari v2.0** (prev session) — `BattleMap.test.jsx`: zoom buttons C/T/S, stato attivo TACTICAL default, click dispatch verso `animateZoom(2.5/1.0/0.45)`, trasferimento stile attivo, shortcut 1/2/3, guard modale aperto. `BattleReportModal.test.jsx`: header, roster navi (Active/WRECK/critici/faction), log (placeholder, messaggi, header round, raggruppamento, 7 label fase), print button → `window.print()`. Pattern `vi.hoisted()` per mock `animateZoom` ref.

6. **Playwright e2e suite** (prev session) — `playwright.config.js`: Chromium, `reuseExistingServer`, `testDir: './e2e'`. `e2e/helpers.js`: `startNewBattle()` naviga a `/` → clic `NEW SESSION` → attende `Tactical (2)`. `e2e/zoom-levels.spec.js`: 12 test (C/T/S visibili, TACTICAL attivo default, click, ciclaggio, shortcut 1/2/3, guard modale Legend). `e2e/battle-report.spec.js`: 10 test (pulsante visibile, apertura modale, titolo, round, combat mode, empty roster/log, Print visibile, Print chiama `window.print()`, chiusura con ×/ESC/backdrop). Fix: `getByText('Round 1', { exact: true })`, `getByRole('button', { name: 'Close' })`, `getByRole('heading', { name: /Legend/ })`.

7. **Bump versione + doc sync** (questa sessione) — `package.json` 1.24.3 → 2.0.0; CHANGELOG entry v2.0.0; README Features + Running Tests + Tech Stack; CLAUDE.md PROJECT STRUCTURE; HANDOFF; spec §13.10.2 ✅; field-manual §17 Zoom + §17.2 Battle Report; HelpScreen nuove sezioni.

### Sessione precedente — i18n + Playwright e2e (v1.24.3)

1. **i18n — DogfightNotificationModal** (`ba217d2`) — 3 stringhe italiane residue tradotte: "Thrust libero" → "Thrust free", "FUGGITIVO EVADE" → "EVADER ESCAPES".
2. **Playwright dogfight** (`4228196`) — `playwright/test-dogfight.mjs`: headless Chrome, flusso completo DogfightNotificationModal → HUD tracker → DogfightRoundModal → pilot check → probe attack-phase exclusion.
3. **Playwright boarding** (`4228196`, `19ddc9b`) — `playwright/test-boarding.mjs`: ships a (5,3)/(6,3) per evitare canvas center (offset={0,0}); flusso BOARD → BoardingSetupModal → ContactModal → ConflictModal → OutcomeModal; probe re-board assente per navi già in boarding (fix false positive: usa `.absolute.z-50` + regex `^Board ` invece di `body.textContent()`).
4. **Playwright obstacles** (`247c909`) — `playwright/test-obstacles.mjs`: piazzamento via context menu, canvas thrust targeting (start/ESC), movement collision (wait 2500ms per setTimeout), nebula sensor lock in ActionModal, rimozione ostacolo.
   - Finding: `ThrustModal.jsx` è dead code — non nel MODAL_MAP, obstacle path warnings mai mostrate; canvas targeting è il sistema reale.
5. **BattleLog drag fix** (`c10802d`) — aggiunto `isDragging` state; `transition-[height]` disabilitato durante il drag per evitare resize a scatti. Portato da tac-and-lock.

### Sessione precedente — UX polish + Legend carousel (v1.24.1–1.24.2)

1. **Field Manual overlay** (`768b9d7`, `5673892`) — pulsante `?` in `TopRightControls` (App.jsx, accanto a Legend); apre HelpScreen come dialog modale. `HelpScreen` riceve prop `onBack` opzionale per non navigare al dashboard quando aperto in overlay. Rimosso dall'HUD action row (sovrapponeva le ship cards in basic combat con undo/redo visibili).
2. **Obstacle abbreviations** (`9e0c1d6`) — `obstacleRenderers.js`: tutte le zone non-gravity mostrano abbreviazione fissa al centro (`AST`/`AST-D`/`DEB`/`NEB`); label GM affiancato se presente.
3. **Lint** (`bf53aa6`) — rimossi import inutilizzati (`rollDogfightPilot`, `vi`).
4. **Legend — Obstacles section** (`f52c62b`, `53b005f`) — 5 icone SVG per tipo ostacolo in `LegendModal`; fill/stroke/dash identici al canvas renderer; sezione sempre visibile (non condizionata a `obstaclesEnabled`).

### Sessione precedente — Obstacles system (v1.24.0)

Implementazione completa del sistema ostacoli (house-rule, vectorial only, off by default):

1. **`utils/obstacles.js`** (`61ab6b4`) — spatial queries, budget movimento (2pt/field hex), cover DM.
2. **`battleStore.js`** (`7efc32b`) — `addObstacle/removeObstacle/updateObstacle`, `toggleObstaclesEnabled` (phase guard: solo setup), `resolveMovement` obstacle-aware, `pendingObstacleCollisions`, export/import.
3. **Canvas** (`9301fea`) — `obstacleRenderers.js` + layer 1b in `useCanvasRenderer`; spatial hash `useMemo` per O(1) lookup a 60fps.
4. **`ObstacleCollisionModal`** (`95d7356`) — pilot check + danno a due step; 4 tipi/densità.
5. **`PlaceObstacleModal` + `ObstacleContextMenu`** (`3815155`) — add/edit/remove via context menu.
6. **HUD toggle** (`b05a713`) — `obstaclesEnabled` visibile solo in setup/vectorial.
7. **Attack DM** (`08f5dab`) — cover DM da ostacoli in `useAttackSetup`.
8. **ActionModal** (`1a73af6`) — sensor lock disabilitato in nebula.
9. **ThrustModal** (`cd7220b`) — banner path warnings per field e gravity well.
10. **Test** (`80ceab2`, `fbd1a0e`) — 33 test in `obstacles.test.js`, +329 righe in `battleStore.test.js`, 211 in `ObstacleCollisionModal.test.jsx`, 190 in `PlaceObstacleModal.test.jsx`. 1050 test totali.
11. **Doc** — `obstacles-system-design.md` aggiornato (non-RAW, movement budget, armor ruling, gravity well scope); `field-manual.md` §16 aggiunto; CHANGELOG v1.24.0; HelpScreen §Obstacles.

### Sessione precedente — Reddit bug fixes (v1.23.0)

7 fix implementati da segnalazioni Reddit:

1. **FIX-01** (`0376b50`) — Banner `⚠ MANUAL` sui critici descrittivi in AttackModal.
2. **FIX-02** (`0376b50`) — Repair check difficulty scala con severity: Average 8+ (Sev 1–2), Difficult 10+ (3–4), Very Difficult 12+ (5–6).
3. **FIX-03** (`0376b50`) — Selector critico in ActionModal; `repairCritical(shipId, critIndex)` invece di sempre index 0.
4. **FIX-04** (`b5df149`) — `spendMissileAmmo` chiamato in `handleAllIntercepted`; ammo detratta anche quando PD intercetta tutto prima del lancio.
5. **FIX-05** (`4128e56`) — `currentPower ≤ 0` svuota weapon list in `useAttackSetup` e blocca sensori in `ActionModal`. Banner rosso `⚡ POWER OFFLINE` in AttackModal.
6. **FIX-06** (`c447bcc` + `20a0fa7`) — Leadership bonus RAW: attiva all'inizio del round successivo, dura 1 round. `buildNextRoundState` applica `initiativeBonusNextRound`, ri-ordina `initiativeOrder`, imposta `initiativeTemporaryBonus`; boundary dopo rimuove e ri-ordina di nuovo. Badge `↑ini` in PhaseTracker.
7. **FIX-07** (`ff957a0`) — Display ion power mostra round rimanenti e `OFFLINE` quando Power = 0.

FIX-08 (hardened per-sistema) differito a v1.24.0.

### Sessione precedente — Test coverage gaps + doc sync (v1.22.3)

1. **test(dogfight): 16 nuovi test** (`5029962`) — coprono i gap rimasti dopo v1.22.2/v1.22.3: `dexDM` in `rollDogfightPilot` (parametro e `breakdown sums to total`); suite complete per `freeThrust`, `computeShipDMs`, `bestPilot`, `escapeCheckTotals` (estratte da `DogfightRoundModal` in REF-01 ma mai testate). `dogfightDM` verificato in `rollAttack` (combat.test.js).
2. **fix(dogfight): `extraEnemyDM` non ritorna più IEEE-754 `−0`** (stessa commit) — `computeShipDMs` usava `-(Math.max(0, n))` che produce `−0` con un solo nemico; sostituito con ternario esplicito.
3. **docs(release): doc sync** — CHANGELOG v1.22.3 aggiornato (sezione Tests + fix −0); README test count 907 → 933; HANDOFF aggiornato. 933 test, 0 errori.

### Sessione precedente — UX fixes post-code-review (v1.22.3)

1. **fix(ui): Tooltip component su checkbox HARDENED** (`0f22a79`) — `(?)` usava `title` nativo; sostituito con `<Tooltip>` come tutti gli altri tooltip del form.
2. **fix(initiative): Tactics roll dopo main dice** (`2dabf07`) — riga Tactics visibile solo dopo l'inserimento del tiro principale; risolve il bug per cui rollare Tactics prima ignorava l'Effect nel totale preview. Layout corretto con `ml-auto`.

### Sessione precedente — Dogfight/boarding RAW compliance (v1.22.2)

Code review completa su dogfight e boarding → 13 fix implementati in 5 fasi:

**Phase 1 — Production + data integrity (FIX-01…03):**
- FIX-01: `BoardingOutcomeModal` — sostituiti class interpolation dinamici con `OUTCOME_STYLES` lookup map (Tailwind v4 scan).
- FIX-02: Boarding double-initiation bloccata — guard in `startBoarding`, `ContextMenu`, `BoardingSetupModal`.
- FIX-03: `resolveBoarding` ora resetta `inBoarding` su tutti i partecipanti (non solo attacker/defender).

**Phase 2 — Game flow (FIX-04…08):**
- FIX-04: `canAdvancePhase` in HUD blocca NEXT PHASE se ci sono dogfight attivi.
- FIX-05: `advanceActor` salta navi con `inDogfight`.
- FIX-06: Danno hull-cut instradato tramite `applyBoardingCutDamage` (undo stack).
- FIX-07: Tumbling con check Pilot DEX + durata D3; `applyDefenderRotation`/`clearDefenderRotation`; countdown automatico in `buildNextRoundState`.
- FIX-08: Dogfight detection in basic mode tramite `detectDogfightGroupsBasic`.

**Phase 3 — RAW compliance (FIX-09):**
- FIX-09: DEX DM (−3/+3) aggiunto a `rollDogfightPilot`, `computeShipDMs`, `ShipCheckRow`, `checkResults`. Campo "PILOT DEX DM" in `ShipProfileForm` e `defaultProfiles`.

**Phase 4 — AttackModal integration (FIX-10/11):**
- FIX-10: Dogfight attack DM (+2/−2/0) pre-fill automatico in `useAttackSetup` + mostrato in DM Summary.
- FIX-11: Fixed weapons (barbette/bay) bloccate su tie; banner `⚠ Dogfight tie` in AttackModal.

**Phase 5 — Refactor (REF-01…03):**
- REF-01: `computeShipDMs`, `bestPilot`, `freeThrust`, `escapeCheckTotals` estratti da `DogfightRoundModal` a `utils/dogfight.js`.
- REF-02: `endDogfight` wrappato in `wh`.
- REF-03: Payload boarding modali usa `boardingId` invece di `boardingAttackerId + phase`.

**Doc sync parziale** — CHANGELOG v1.22.2, field-manual §14/§15, HelpScreen aggiornati. PDF non ancora rigenerato. **Da pushare.**

### Sessione precedente — BattleLog resizable + doc sync (v1.22.1)

1. **feat(ui): BattleLog resizable** (`7934eb1`) — drag handle in cima al pannello espanso; drag verso l'alto aumenta l'altezza (80 px min, 600 px max, default 160 px). `dragState` ref + `mousemove`/`mouseup` su `window`. Altezza mantenuta per la sessione; collapse/re-expand ripristina la dimensione precedente.

2. **Doc sync** — CHANGELOG v1.22.1 Added section; field-manual §12 e HelpScreen aggiornati con descrizione drag handle.

3. **Nota progettuale** — discusso JSON versioning: pianificata (non implementata) la feature di versione app nel JSON export + modale avviso file obsoleto. Nessun blocco del caricamento, solo warning. Salvato in memory `project-json-versioning.md`.

### Sessione precedente — Verifica Ion Power + doc RAW + bugfix basic mode (v1.22.1)

1. **Verifica Ion Power completa** — confermata implementazione al 100%: `computeIonThrustEffect`, `applyIonDamage`, `buildNextRoundState`, `addShip`, `ShipProfileForm` (MAX POWER / COMPUTER BW / HARDENED), `AttackModal IonDamageStep`, `ThrustModal`, `MissileImpactModal`, `useCanvasRenderer`, `useMapInteraction`, `ShipTooltip`, `BasicBattleView`, `ShipDetailModal`. `ionPenalty` rimosso ovunque. 907 test, 0 errori ESLint.

2. **Bugfix — Ion Power thrust cap mancante in basic mode** (`1d85a45`) — `BasicManoeuvreModal.availableThrust()` non chiamava `computeIonThrustEffect`: nave Ion-debuffata poteva allocare più thrust di quanto consentito dalla Power ridotta. Allineato a `ThrustModal`, `MissileImpactModal`, `battleStore`.

3. **Doc — Ion Cannon vs Ion Barbette RAW disambiguation** (`ae7dbf6`, `fd2b807`) — HG usa nomi e meccaniche diversi per le armi Ion a seconda del capitolo. Standard space combat (HG pp.29–30, 32–33): **Ion Cannon** / **Ion Cannon Bay** con meccanica Power-reduction. Fleet Combat (HG p.112): *Ion Barbette* / *Small·Medium·Large Ion Bay* con formula completamente diversa (effect-per-weapon × count ÷ Hull Points → Ion Damage table; nessun Power stat). Fleet Combat è **out of scope** per T&D. Tabella comparativa aggiunta in field-manual §9.10, note in CHANGELOG v1.22.1 e HelpScreen.

4. **Verifica I/O profili** — save/CRUD, export (`exportAll`), import (`importFromFile`, merge per id), export/import battle state: tutto corretto. No autosave by design (no persistence layer per spec). Nota: import profili skipa (non aggiorna) profili con id già esistente.

### Sessione precedente — Ion Power + Weapon Picker + Label Rename + ESLint (v1.22.0 → v1.22.1)

1. **Ion Weapons Power stat (v1.22.0)** — `maxPower`, `computerBandwidth`, `hardened` nei profili; `currentPower`/`currentBandwidth` nell'istanza; `computeIonThrustEffect`; `applyIonDamage` additiva; `buildNextRoundState` ripristina Power su `ionCurrent > 0` (BUG-001 fix). 25 nuovi test.

2. **Ion Cannon nel weapon picker** (`7d44fa6`) — rimosso `barbetteOnly: true`; Ion Cannon e Ion Cannon Bay S/M/L selezionabili da qualsiasi weapon slot. Mount type (barbette/bay) è regola RAW, non vincolo del picker.

3. **Rename Turret → Weapon** (`bb943ae`) — tutti i label UI: `Weapon {n}`, `W1`/`W2`…, `per-slot firing limit`, `All weapons fired`, `Gunner (W{n})`. Termini RAW invariati (`Gunner (turret)`, `Reload Turret`, `triple turret`).

4. **ESLint cleanup** (`75faa09`, `e671b0b`) — hook condizionali corretti in `ActionModal` e `DogfightNotificationModal`; import/var inutilizzati; eslint-disable stale; `phase` aggiunto ai deps canvas renderer (bugfix canvas); `pendingMissileImpacts` aggiunto ai deps HUD callback.

5. **Doc update + v1.22.1 bump** — CHANGELOG corretto (rimossa claim `barbetteOnly: true` errata), README, field-manual, HelpScreen, spec, HANDOFF sincronizzati.

### Sessione precedente — Reddit Bug Fixes + Point Defence Active Intercept (v1.21.0)

### Sessione precedente — CotI Bug Fix + Range Band Rings (v1.20.9)

1. **`fix(battle): append mid-battle ships to initiativeOrder`** (`8b2591d`) — navi piazzate dopo il roll initiative non ricevevano turni. `addShip` ora appende l'ID a `initiativeOrder` se non è vuoto.

2. **`feat(map): range band rings attorno alla nave selezionata`** (`fe0fd03`) + **`fix(map): visibilità migliorata`** (`1b7524c`) — selezionare una nave sul canvas vettoriale disegna 4 esagoni tratteggiati cyan (SHORT 2 / MEDIUM 15 / LONG 38 / VERY LONG 77 hex) con label su pill scuro. Nascosti durante thrust targeting. `drawRangeBandRings()` in `useCanvasRenderer.js`, Layer 2.

### Sessione precedente — CotI Bug Fixes (v1.20.8)

1. **`fix(critical): apply armour reduction when Armour system is hit`** (`3e0968d`) — tutti gli effetti critici Armour avevano `mechanic: 'descriptive'`, nessuna riduzione automatica. Aggiunti mechanic codes `armour_reduce_fixed/d3/xd` in `criticalHits.js`. Nuova action `reduceArmour` in `battleStore.js`. `AttackCriticalStep` in `AttackModal.jsx` gestisce il roll extra (D3 o XD) e applica la riduzione in armour del target. (CRB p.170)

2. **`fix(attack): allow multiple PD rolls — one per available laser turret`** (`6d517c2`) — dopo il primo roll PD, `pdResult !== null` nascondeva l'intera sezione di roll: le torrette rimanenti non potevano sparare. `handlePdRoll` resettava `pdTurretSlot` al turret corrente invece di `null`. Fix: mostrare il risultato E la sezione di roll insieme quando `pdTurrets.length > 0`; reset slot a `null` dopo ogni roll; `key` su DiceInput per forzare reset tra roll. (CRB p.173)

3. **`fix(ew): EW Counter Missile targets in-flight salvos in missiles array`** (`2938102`) — `applyMissileEW` cercava solo in `pendingMissileImpacts`; missili in volo in `missiles` array non erano targetabili. `ewAppliedThisRound` flag aggiunto ai missili al lancio e resettato in `buildNextRoundState`. `applyMissileEW` ora cerca entrambi gli array. ActionModal salvo selector mostra lista unificata con badge `⚡ impact` per i missili in arrivo nel round corrente. (CRB p.173)

4. **`fix(initiative): show roll breakdown in post-confirm view`** (`b0fd58c`) — il bonus Tactics appariva nel totale ma non era visibile, causando dubbi sulla correttezza del calcolo. `rollAllInitiative` salva `initiativeBreakdown: r.roll.breakdown` per ogni nave. `InitiativeModal` post-confirm mostra riga `2D:{roll} + Pilot:{n} + T{n}` con badge verde `Tac:{effect}` quando il Tactics effect è ≠ 0. (CRB p.160)

5. **`fix(thrust): pre-populate ThrustModal with last applied delta`** (`2bb05fe`) — `ThrustModal` usava `useState({q:0,r:0})` — ogni apertura resettava a zero. `addShip` inizializza `lastThrustDelta: {q:0,r:0}`. `applyShipThrust` salva `lastThrustDelta: {...delta}`. `ThrustModal` lazy-inizializza da `ship.lastThrustDelta`. (TC p.172)

6. **`fix(autosave): basicBandPool missing from IndexedDB snapshot`** (inline nella sessione) — `basicBandPool` era in undo/redo e JSON export/import ma non in `extractBattleSnapshot` né in `hasSignificantChange` di `useAutosave.js`. Tre righe aggiunte.

7. **`test(v1.20.8): add coverage for all bug fixes`** (`40c3435`) — 23 nuovi test in `criticalHits.test.js`, `battleStore.test.js`, `useAutosave.test.js`. Copertura: mechanic codes Armour Sev 1–6, `reduceArmour`, `applyMissileEW` in-flight + double-EW guard + pending impact, `ewAppliedThisRound` init/reset, `lastThrustDelta`, `initiativeBreakdown`, `basicBandPool` restore/snapshot.

### Sessione precedente — Basic Mode Fix (v1.20.7)

1. **`fix(basic): missile impact`** (`c946c92`) — `resolveMovement()` è no-op in basic mode, i missili non si muovevano mai. Aggiunto `advanceBasicMissileOneRound()` in battleStore: ogni round il missile brucia fino a 10 thrust di guida contro la tabella `RANGE_BAND_MOVE_COST` (Short 2, Medium 5, Long 10, Very Long 25, Distant 50), con carry-over eccesso tra bande. Impatto al raggiungimento di Adjacent → `pendingMissileImpacts`. `launchMissile` aggiunge `basicRangeBand` e `basicThrustAccumulated` in basic mode.

2. **`fix(basic): manoeuvre usa tabella costi RAW + accumulo multi-round`** (`dfd68a3`) — v1.20.2 aveva rimpiazzato la tabella con flat-1, errato per CRB p.166. Ripristinata la tabella corretta. Aggiunto `basicBandPool: Record<pairKey, number>` nello store: accumula thrust firmato (positivo = avvicinamento) attraverso round e navi; la banda avanza quando la soglia è superata; GM SET azzera il pool. Incluso in undo/redo, export/import, removeShip. Bottone mostra "ALLOCATE THRUST" se contributo parziale, "APPLY MANOEUVRE" se soglia raggiunta.

3. **`feat(basic): ETA missili su bento card`** (`5af786c`) — Righe "inbound" e "away" in `ShipBentoCard` mostrano `~Xr` stimato a impatto tramite simulazione `estimateRoundsToImpact`.

**Segnalazione CotI:** due bug basic mode confermati e fixati. Il reporter aveva lanciato 5 missili a Distant al round 1 e al round 11 non erano ancora impattati — esattamente confermato: Distant (50÷10=5r) + Very Long (25÷10=3r) + Long (10÷10=1r) + Medium (5÷10 + acc=1r) + Short (2÷10 + acc=1r) = ~11 round totali.

### Sessione precedente — Doc Audit + Rules Corrections (v1.20.5–v1.20.6)

0. **`fix(rules): missile Effect 0 floors multiplier at ×1`** (`2980185`) — CotI community ha correttamente identificato che Effect 0 è un colpo andato a segno, non un miss. `computeMissileImpactDamage` usa ora `max(1, min(effect, count))`. Nota "Effect×0 = 0 RAW" ritrattata. Test aggiornato.

### Sessione corrente — Doc Audit + Rules Corrections (v1.20.5)

1. **`fix(rules): Smart-loss ad Adjacent range`** (`8b36168`) — CRB p.162: missili a `rangeBand === 'Adjacent'` non ricevono DM+2 Smart. `hasSmartGuidance` calcolato al lancio (`launcherTL ≥ 9 && rangeBand !== 'Adjacent'`), salvato sul missile e nel `pendingMissileImpact`. `MissileImpactModal` legge dal flag (fallback `true`). Label mostra `TL< 9` o `Adjacent/Close range`. +2 test.

2. **`fix(rules): Overload Drive Difficult (10+), +1 fisso`** (`8e0f12f`) — CRB p.171: era Average (8+) + +Effect. Corretto a Difficult (10+), +1 Thrust per il round successivo. Avviso GM se Effect ≤ −6. Verificato assente da TC2024, HG2022, FAQ.

3. **`docs: Combattimento-Spaziale.md corretto`** (`946f8cb`) — EW skill `Electronics(comms)` (§8.3.1); formula missili completata (§8.5); nota scope T&D (§10).

4. **`chore(release): v1.20.5`** (`4c46305`).

**Audit doc completato** (v1.20.5): design doc boarding e dogfight allineati al codice (deviazioni minori documentate: `getBoardingDM`→`getContactDM`, `PassingAttackModal` non nel design doc, hull-cut progress local state).

### Sessione precedente — Bug Reports CotI + Rules Fixes (v1.20.3–v1.20.4)

1. **`fix(rules): sensor lock flat DM+2`** (`75677bc`) — CRB p.172 conferma flat +2, non +Effect. `applySensorLock` rimosso parametro `dmBonus`, `sensorLockDM: 2` fisso. Test aggiornati (3 casi).

2. **`fix(rules): reverse initiative Acceleration solo vectorial`** (commit precedente) — TC p.174 è specifico per vectorial. Gating `combatMode === 'vectorial'` in HUD, PhaseTracker, ContextMenu, advanceActor. Citazione CRB p.161 → TC p.174.

3. **`feat(rules): EW — Counter Missile`** (`b3e3b42`) — CRB p.173 COUNTERMEASURES implementata. Nuova crew action `missile_ew` (Difficult 10+, Electronics). Effect (min 1) rimuove missili da salvo selezionato. `ewAppliedThisRound` flag per-salvo, reset in `buildNextRoundState`. Salvo selector in ActionModal.

4. **`feat(rules): Smart DM gating TL ≥ 9`** (commit TL gating) — CRB p.79. `computeMissileAttackDM(count, hasSmart, evasivePilot)`. Profilo nave: `tl: 12` default. `MissileImpactModal` calcola `hasSmart = launcher.profile.tl >= 9`. ShipProfileForm: campo TECH LVL (7–16).

5. **`chore(release): v1.20.3`** (`6cbcf39`) e **`chore(release): v1.20.4`** (`b720ef6`).

**Confermato RAW (CRB p.173 + FAQ Aug 2024):** Effect×0 = 0 danni. Nessuna errata. Working as intended.

### Sessione precedente — Bug Reports CotI (v1.20.2)

1. **`fix(basic): flat cost 1 per band change in BasicManoeuvreModal`** (`4048424`) — `RANGE_BAND_MOVE_COST` usava distanze hex (`Very Long=25`, `Distant=50`) → pulsante APPLY MANOEUVRE sempre grigio per navi con thrust normale. Sostituito con costante `BAND_CHANGE_COST = 1`. Import rimosso da `battleStore.js`.

### Sessione precedente — Missile Impact RAW Fix (v1.20.1)

1. **`fix(missile): two-step impact resolution per CRB p.173`** (`6406e48`) — `MissileImpactModal.jsx` riscritto. Step 1: attack roll 2D6 + DM+1/missile + DM+2 Smart ± Evasive Action vs 8+; Effect < 0 → miss. Step 2: danno `max(0, 4D6 − armour) × min(Effect, count)`. Vecchia formula `max(0, count×4D6 − armour)` era sbagliata per RAW. Stato resettato tra salve consecutive via `useEffect([impact.id])`. Evasive Action spende 1 thrust dal target via `spendReactionThrust`, DM −Pilot applicato a questo roll.

2. **`test(missile): extract formulas + 15 unit tests`** (`53ca20e`) — `computeMissileAttackDM(count, evasivePilot)` e `computeMissileImpactDamage(roll, armour, effect, count)` estratte da modal a `combat.js`. Test: DM salvo, Smart trait, evasione, pilot alto → DM negativo; danno: caso normale, effect cappato da count, count cappato da effect, roll < armour, effect=0→0, torpedo, armour=0.

3. **`docs`** (`bbcb185`) — `doc/field-manual.md` §8.1 riscritto (step 1 attack roll + step 2 damage, Evasive Action, formula RAW). `HelpScreen.jsx` sincronizzato. `README.md` riga missile impact aggiornata.

### Sessione precedente — Weapons Expansion (v1.20.0)

1. **`feat(weapons): barbettes, Ion Cannon, Torpedo, Missile Barbette`** (weapons.js) — 11 nuove armi: Fusion Gun, Plasma Gun, Ion Cannon, Torpedo, Missile Barbette, Pulse/Beam/Particle/Fusion/Plasma/Railgun Barbette. Tutti i barbette hanno `damageMultiple: 3`. Ion Cannon: `traits: ['Ion']`, no hull damage. Torpedo: 6D, Smart trait. Missile Barbette: Smart trait, 25 munizioni.

2. **`feat(combat): AP trait, barbette multiplier, countMissileAmmoCapacity, countSandcasters, applyIonDamage, spendSandAmmo, getApValue`** — `effectiveArmour = max(0, armour − apReduction)`; `netDamage = max(0, roll + Effect − effectiveArmour) × damageMultiple`; `countMissileAmmoCapacity`: racks×12 + barbettes×25 + torpedoes×3; `countSandcasters`: sandcasters×20; `applyIonDamage(shipId, penalty, rounds)` in battleStore; `spendSandAmmo(shipId)` in battleStore; `buildNextRoundState` decrementa `ionRoundsLeft` e azzera `ionPenalty` quando raggiunge 0.

3. **`fix(attack): isMissileBarbette prop threading in AttackConfigStep`** — `isMissileBarbette` era una variabile calcolata in `AttackModal` usata dentro `AttackConfigStep` ma non passata come prop → dangling closure. Aggiunta come prop esplicita. Risolveva 3 test failure pre-esistenti.

4. **`fix(basic): countMissileRacks double-multiply in BasicBattleView`** — `countMissileRacks` è ora alias di `countMissileAmmoCapacity` (ritorna capacità totale); il codice moltiplicava ancora ×12 → doppio conteggio. Rimossa la moltiplicazione.

5. **`feat(ui): weapons expansion state in BasicBattleView, ShipDetailModal, ShipTooltip`** — ION NR badge (blu), riga status ion disruption (⚡ −N thrust / NR), riga sand canisters (🪨 N/max), sezione Ammunition in ShipDetailModal, torpedo separato da missili in ShipTooltip.

6. **`test(weapons): 106 nuovi test`** — `data/weapons.test.js` (nuovo): completezza catalogo, campi obbligatori, barbette ×3, Ion Cannon, Torpedo, Missile Barbette, AP cross-check via `getApValue`, missile maxRange=Special, DEFENSIVE_WEAPONS. `combat.test.js`: `getApValue` (8 casi), `countMissileAmmoCapacity` (8 casi), `countSandcasters` (6 casi). `battleStore.test.js`: `sandcaster ammo init` (3), `spendSandAmmo` (4), `missile ammo init barbette/torpedo` (3), `applyIonDamage` (4), `ion round decrement` (3), `spendReactionThrust + ionPenalty` (2). `BasicBattleView.test.jsx`: Missile Barbette ammo (1), Torpedo ammo (1), sand row (2), ION badge (2), ion status row (1).

7. **`docs + chore`** — `doc/field-manual.md` v1.20.0 (§3.1, §3.2, §9.6 rewrite, §9.8 tabella completa 17 armi, §9.10 nuovo, §16). `HelpScreen.jsx` sincronizzato. `CHANGELOG.md` entry v1.20.0. `package.json` 1.19.0→1.20.0. PDF da rigenerare con MD2FastPdf.

### Sessione precedente — WCAG AA + Emoji Icons (v1.19.0)

1. **`fix(a11y): WCAG AA contrast — definitive floor`** — tre passate: `disabled:opacity` → colori espliciti; `text-slate-500/600` → `text-slate-400`; `text-slate-700` → `text-slate-400`. Affected 28+ file JSX.
2. **`feat(ui): sci-fi emoji icon system`** — sostituiti tutti i glyph non-emoji con emoji tematiche in 26 file JSX e documentazione. ⚠→🚨, ⚔→⚔️, ✓→✅, ↺↻→🔄🌀, ⟲↷→↩️↪️, ⌂→🏠, ✦→✨, ▼▲→⬇⬆, ←→⬅️.

### Sessione precedente — Acceleration Phase Actor Order Fix (v1.18.1)

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

## Riferimenti utili

- `CLAUDE.md` — regole di progetto, stack, struttura
- `doc/field-manual.md` — manuale di gioco (italiano)
- `doc/obstacles-system-design.md` — spec completa sistema ostacoli (implementato, v1.24.0+); §14 interazione dogfight
- `doc/conflict-resolution-implementation.md` — piano implementativo fix A/B/C/D; D (BoardingPanel) ancora da fare
- `src/store/battleStore.js` — `isDestroyed`, `applyDamage()`, `advanceActor()`, `computeMissileGuidance()`, `startDogfight` (guard inBoarding)
- `src/components/map/useDogfightDetection.js` — `detectDogfightGroups` (esclude `inBoarding` e `inDogfight`)
- `src/store/uiStore.js` — `movementAnimation`, `audioEnabled`, `toggleAudio`
- `src/utils/audioSynth.js` — sintesi suoni (laser, impact, critical, missile, thrust)
- `src/hooks/useAudioEngine.js` — AudioContext singleton, subscriber effectQueue
- `src/utils/effectQueue.js` — `emitEffect`, `drainEffects`, `subscribeEffects`
- `src/components/ui/ContextMenu.jsx` — `MenuItemDisabled`, logica blocco azioni
- `src/components/map/tokenRenderers.js` — rendering wreck semitrasparente + badge ☠
