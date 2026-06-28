# Feedback Reddit — 2026-06-28

## Messaggio originale

> Spent some time laying out and playing through a battle. Overall, really nice interface.
>
> Here's some more detailed feedback:
>
> Most important, this is awesome. Love the clean look and what you can do with it. I'm currently placing ships on a hex grid in Fantasy Grounds, but there's not a clean way to even capture each ship's vector, let alone automatically apply it. I'm looking forward to moving over to using Thrust & Drift.
>
> As a Referee, I'd like to be able to manually override vectors. Not all combat starts with ships stationary relative to one another...in fact, in my experience, that's the minority of situations.
>
> I'd like to have the ship whose turn it is have some identifying visual aid, perhaps its circle glows and/or blinks. That way, when I've quickly added 5 light fighters to a combat, I know which light fighter to right click on to take their turn.
>
> As a Referee, I'd like to be able to quickly edit the name of a ship, so my players can keep track of that one light fighter pilot who was talking smack about them.
>
> I'd like an option to center on the ship whose turn it is. Maybe the ship record in the initiative list could be a link that centers on that ship.
>
> I'd love to know the size of the hexes. I assumed they were each 1k kilometers, but the ranges don't seem to quite align with that. E.g. Medium range should be 10k kilometers, but it looks like it's 15 hexes to Medium range.
>
> You might consider putting together a Discord, if you haven't already, and inviting users to it to provide feedback, etc.
>
> I'll likely have more feedback later. 😄

---

## Traduzione italiana

Ha passato del tempo a impostare e giocare una battaglia. Nell'insieme, un'interfaccia davvero bella.

Ecco del feedback più dettagliato:

La cosa più importante: è fantastico. Adoro l'aspetto pulito e quello che si può fare. Al momento sto piazzando le navi su una griglia hex in Fantasy Grounds, ma non c'è un modo pulito nemmeno per registrare il vettore di ogni nave, figuriamoci applicarlo automaticamente. Non vedo l'ora di passare a usare Thrust & Drift.

Come Arbitro, mi piacerebbe poter sovrascrivere manualmente i vettori. Non tutti i combattimenti iniziano con le navi ferme l'una rispetto all'altra — anzi, nella mia esperienza, è la minoranza delle situazioni.

Mi piacerebbe che la nave di cui è il turno avesse un qualche aiuto visivo identificativo — magari il suo cerchio si illumina e/o lampeggia. Così, quando ho aggiunto rapidamente 5 caccia leggeri a un combattimento, so su quale fare clic destro per il suo turno.

Come Arbitro, mi piacerebbe poter modificare rapidamente il nome di una nave, così i miei giocatori possono tenere traccia di quel pilota di caccia leggero che li stava sfidando.

Mi piacerebbe un'opzione per centrare la mappa sulla nave di cui è il turno. Magari il record della nave nella lista iniziativa potrebbe essere un link che centra la mappa su quella nave.

Mi piacerebbe sapere la dimensione degli hex. Ho supposto che fossero 1.000 km ciascuno, ma le distanze non sembrano allinearsi del tutto. Per esempio, la distanza Media dovrebbe essere 10.000 km, ma sembra essere di 15 hex fino alla banda Media.

Potreste considerare di creare un Discord, se non l'avete già fatto, e invitare gli utenti per raccogliere feedback, ecc.

Avrò probabilmente altro feedback in seguito. 😄

---

## Analisi delle richieste

### REQ-01 — Override manuale dei vettori *(priorità: alta)*

**Cosa vuole:** poter impostare il vettore iniziale di una nave a qualsiasi valore, non solo da zero. Scenario tipico: le navi entrano in combattimento già in movimento (velocità di crociera, approccio, fuga).

**Stato attuale:** `addShip` inizializza sempre il vettore a `{q:0, r:0}`. Non esiste UI per modificarlo dopo il placement.

**Possibile implementazione:** campo vettore (Δq / Δr) nel modale AddShip o ShipDetailModal; oppure voce di context menu "Edit vector" sempre disponibile (non solo in Acceleration).

---

### REQ-02 — Indicatore visivo sulla nave di turno *(priorità: alta)*

**Cosa vuole:** riconoscere a colpo d'occhio sulla mappa quale token è il current actor — utile con molte navi simili (5 caccia identici).

**Stato attuale:** il PhaseTracker evidenzia il nome nella lista HUD, ma sul canvas il token del current actor non ha nessun highlight dedicato.

**Possibile implementazione:** anello pulsante o glow cyan sul token del current actor in `tokenRenderers.js` / `useCanvasRenderer.js`, simile all'anello amber del dogfight.

---

### REQ-03 — Rinomina rapida della nave *(priorità: media)*

**Cosa vuole:** cambiare il nome di un'istanza nave in battaglia senza uscire dalla sessione — per distinguere unità identiche ("Fighter 1", "Fighter 2 — Bravado").

**Stato attuale:** il nome è quello del profilo; modificarlo richiederebbe di aprire ShipDetailModal o andare al profilo. Non esiste una rinomina inline per l'istanza.

**Possibile implementazione:** voce "Rename" nel context menu → inline edit o prompt modal; la rinomina agisce sull'istanza (`ship.name`), non sul profilo.

---

### REQ-04 — Centra mappa sulla nave di turno *(priorità: bassa-media)*

**Cosa vuole:** cliccare sulla nave nel PhaseTracker e centrare la vista su quel token — utile su mappe grandi.

**Stato attuale:** `doubleClick` centra la mappa su un hex, ma il PhaseTracker non è interattivo a livello di navigazione.

**Possibile implementazione:** il nome della nave nel PhaseTracker diventa un `<button>` che chiama `centerOnHex(ship.pos)` su uiStore/mapInteraction.

---

### REQ-05 — Scala degli hex *(chiarimento, non è un bug)*

**Cosa chiede:** qual è la dimensione in km di un hex? Ha assunto 1.000 km ma le bande di distanza non tornano (15 hex = Medium invece dei 10.000 km previsti da RAW).

**Risposta:** la scala degli hex non corrisponde a una distanza fisica fissa. Le bande di portata (Short 2 / Medium 15 / Long 38 / Very Long 77 hex) derivano direttamente dalla Traveller Companion p.171, che definisce le soglie in numero di hex — non in km. Il hex è un'unità astratta di movimento, non una misura metrica. Da chiarire nel field manual e nella risposta.

---

### REQ-06 — Discord *(fuori scope tecnico)*

**Cosa vuole:** un server Discord per la community e il feedback.

**Valutazione:** decisione organizzativa, non tecnica. Da valutare separatamente.

---

## Secondo messaggio (completo) — 2026-06-28

> In the crew manifest, are the skill values intended to include attribute modifiers? I would assume so, as I haven't seen any place for those. That said, I'd suggest the skill values allow negative values, as sometimes a character is forced into a position where they have to use an untrained skill (DM -3) or simply have a low attribute, possibly due to being wounded. Note that untrained is different from having a skill of 0.
>
> Is there a reason a single-person fighter doesn't have the option of attempting a sensor lock or pretty much any other action? I've assigned that one crewperson to all roles and am unaware of a rule that would prevent them from attempting a sensor lock, e.g. in a round while they are outside of weapons range, or electronic warfare to break a sensor lock.
>
> Regarding crew assignments, I suggest having all roles filled with whatever crew are available, even if there is only one crew member. Otherwise, I find myself having to manually fill those roles.
>
> Wrecks should probably be removed from the acceleration, attack, and action phases, as well as from the list of potential targets.
>
> Does this support double and triple turrets? I know you can add two of the same kind of weapon, but I don't see a way to group weapons into double/triple turrets.
>
> Point defence and evasion for missiles should probably not be resolved until just before the missile strikes, rather than when it is fired. And it is at the point it strikes that the decision should be made as to whether or not to apply point defence or evade, if either options are available in that round.
>
> Minor nit, but the initiative phase can/should probably be removed from all rounds after the first if no new ships have been added to the combat.

### Traduzione

Nel manifesto equipaggio, i valori di skill sono intesi a includere i modificatori di attributo? Lo assumo così, dato che non ho visto nessun posto per quelli. Detto ciò, suggerirei di permettere valori negativi, dato che a volte un personaggio è costretto a usare una skill non addestrata (DM −3) o semplicemente ha un attributo basso, magari perché ferito. Nota: non addestrato è diverso da avere skill 0.

C'è un motivo per cui un caccia monoposto non ha l'opzione di tentare un sensor lock o quasi qualsiasi altra azione? Ho assegnato quell'unico membro dell'equipaggio a tutti i ruoli e non sono a conoscenza di una regola che impedirebbe di tentare un sensor lock, ad esempio in un round in cui si è fuori dalla portata delle armi, o electronic warfare per rompere un sensor lock.

Riguardo alle assegnazioni dell'equipaggio, suggerirei di riempire automaticamente tutti i ruoli con i membri disponibili, anche se ce n'è solo uno. Altrimenti mi ritrovo a dover riempire quei ruoli manualmente.

I relitti dovrebbero probabilmente essere rimossi dalle fasi di accelerazione, attacco e azioni, così come dalla lista dei bersagli potenziali.

Supporta le torrette doppie e triple? So che si possono aggiungere due armi dello stesso tipo, ma non vedo un modo per raggruppare le armi in torrette doppie/triple.

La difesa a punti e l'evasione per i missili probabilmente non dovrebbero essere risolte fino a poco prima che il missile colpisca, piuttosto che quando viene sparato. Ed è nel momento in cui colpisce che la decisione dovrebbe essere presa su se applicare la difesa a punti o l'evasione, se una di queste opzioni è disponibile in quel round.

Nota minore, ma la fase iniziativa potrebbe/dovrebbe probabilmente essere rimossa da tutti i round successivi al primo se non sono state aggiunte nuove navi al combattimento.

---

### REQ-09 — Skill values: modificatori attributo + valori negativi *(design clarification + fix UX)*

**Cosa chiede:** (a) conferma che i valori skill includano già i modificatori di attributo; (b) permettere valori negativi per skill non addestrate (DM −3) o attributi bassi/feriti.

**Stato attuale:** i campi skill in `ShipProfileForm` accettano interi ≥ 0. Non esiste campo separato per i modificatori di attributo — by design, il valore inserito è il DM totale da usare nel roll. Un personaggio non addestrato (DM −3) non può essere rappresentato.

**Analisi RAW:** in MgT2e, Skill 0 = addestrato senza livello (nessun DM dalla skill); Untrained = DM −3. Attributo basso o danno fisico possono ridurre ulteriormente. Il DM totale può essere negativo. Questo è un gap reale.

**Fix necessario:** rimuovere il `min="0"` dai campi skill in `ShipProfileForm`; permettere interi negativi (ragionevole floor: −3). Impatto minimo — i valori negativi si propagano già correttamente nei calcoli DM.

**Risposta:** sì, il valore inserito è il DM totale (skill + modificatore attributo). I valori negativi saranno supportati.

---

### REQ-10 — Monoposto: impossibile eseguire sensor lock e crew actions *(bug)*

**Cosa chiede:** un caccia con un solo pilota assegnato a tutti i ruoli dovrebbe poter fare sensor lock, EW e qualsiasi crew action.

**Stato attuale:** da verificare nel codice. Probabile causa: `ActionModal` controlla se il membro assegnato al ruolo `sensors` è diverso dal pilota, o la logica di `advanceActor` / `canPerformAction` blocca azioni quando la stessa persona è già "usata" in altro ruolo nello stesso round.

**Analisi RAW:** nessuna regola impedisce a un pilota solista di svolgere qualsiasi azione disponibile nel suo turno — semplicemente può fare una sola azione per round come tutti. La restrizione attuale non ha base RAW.

**Fix necessario:** verificare la logica di filtraggio azioni in `ActionModal` e `crewActions.js`; assicurarsi che un membro assegnato a più ruoli non venga bloccato per conflitto di assegnazione.

---

### REQ-11 — Auto-fill crew roles con membri disponibili *(UX)*

**Cosa chiede:** quando si aggiunge equipaggio, i ruoli dovrebbero essere pre-compilati automaticamente con i membri disponibili invece di richiedere assegnazione manuale per ogni ruolo.

**Stato attuale:** l'assegnazione ruoli in `ShipProfileForm` è completamente manuale — ogni ruolo va compilato singolarmente.

**Possibile implementazione:** pulsante "Auto-assign" che distribuisce i membri disponibili ai ruoli vuoti secondo una priorità logica (Pilot → Gunner W1…Wn → Sensors → Engineer → Leadership → Tactics); se c'è un solo membro lo assegna a tutti i ruoli.

---

### REQ-12 — Relitti: escludere da fasi e lista bersagli *(bug parziale)*

**Cosa chiede:** i relitti non dovrebbero essere attori nelle fasi Acceleration/Attack/Actions né bersagli selezionabili nell'AttackModal.

**Stato attuale:**

- `advanceActor` salta già le navi con `isDestroyed` nel cycling dell'iniziativa ✅
- Il token è renderizzato semitrasparente con badge ☠ ✅
- Tutte le azioni sono bloccate con messaggio "WRECK" ✅
- **Gap**: i relitti appaiono ancora come bersagli selezionabili nell'`AttackModal` — da verificare e correggere.

**Fix necessario:** filtrare le navi con `isDestroyed === true` dalla lista target in `useAttackSetup` / `AttackModal`.

---

### REQ-13 — Saltare la fase Initiative dal round 2 in poi *(UX)*

**Cosa chiede:** se non sono state aggiunte nuove navi, la fase Initiative non dovrebbe ripresentarsi ogni round.

**Stato attuale:** il phase tracker cicla sempre Setup → Initiative → Acceleration → … → End per ogni round, richiedendo al GM di avanzare manualmente attraverso Initiative anche quando l'ordine non cambia.

**Analisi RAW:** CRB p.160 — l'iniziativa si tira all'inizio del combattimento, non ogni round. L'ordine rimane fisso salvo eccezioni (Leadership bonus, nuove navi). Saltare Initiative automaticamente dal round 2 è corretto per RAW.

**Possibile implementazione:** in `buildNextRoundState` / `canAdvancePhase`, se `round > 1` e nessuna nave è stata aggiunta nell'ultimo round, saltare automaticamente la fase `initiative` passando direttamente ad `acceleration`. Aggiungere un override GM per forzare un nuovo roll (es. quando entra una nuova nave a metà combattimento).

---

### REQ-07 — Label tipo mount torretta *(UX cosmético — deployato v2.1.0)*

**Cosa chiedeva:** un modo per raggruppare più armi in una singola torretta (doppia o tripla) invece di gestirle come slot separati.

**Stato attuale:** T&D implementa le torrette come slot indipendenti (W1, W2, W3) — fino a 3 per profilo, cap RAW (CRB p.163).

**⚠️ Analisi iniziale parzialmente errata:** la prima risposta a questa richiesta concludeva che sparare ogni slot in modo indipendente fosse RAW-corretto. Questo è sbagliato — v. **REQ-14** per la regola RAW su attacchi combinati nelle torrette doppie/triple (CRB 2022 p.168).

**Fix deployato v2.1.0:** etichettatura del mount nel profilo ("Single Turret / Double Turret / Triple Turret") in ShipDetailModal — UX cosmética, nessun impatto meccanico. La meccanica di attacco combinato è tracciata separatamente in REQ-14.

---

### REQ-08 — Timing PD ed Evasive Action sui missili *(bug RAW)*

**Cosa chiede:** PD e Evasive Action sui missili dovrebbero essere risolti al momento dell'impatto, non al lancio.

**Stato attuale:** le Reactions (PD, Evasive Action) sono proposte al defender nel pannello Reactions dell'`AttackModal` durante la fase Attack, cioè al momento del lancio. L'`MissileImpactModal` include già l'Evasive Action nell'attack roll al momento dell'impatto — ma il PD è gestito solo al lancio.

**Analisi RAW:** CRB p.173 — "When a missile salvo reaches its target, the target may attempt Point Defence or Evasive Action." La dicitura è chiara: le reactions si dichiarano all'impatto, non al lancio. Il lancio avviene nella fase Attack; l'impatto può avvenire round successivi.

**Problema:** se il PD viene risolto al lancio, il defender deve decidere se usare il laser turret in un round dove non sa ancora se ci sono altri attacchi in arrivo. Meccanicamente scorretto e tatticamente distorto.

**Fix necessario:** rimuovere il pannello PD dall'`AttackModal` per i missili (lasciare solo per attacchi diretti); aggiungere il passo PD nell'`MissileImpactModal` come prima reaction, prima dell'attack roll. Richiede verifica su come PD interagisce con `pendingMissileImpacts` e `spendMissileAmmo`.

**Priorità: alta** — è un bug RAW confermato.

---

### REQ-14 — Torrette doppie/triple: attacco combinato same-type weapons *(bug RAW)*

**Origine:** segnalazione community aggiuntiva, 2026-06-28 — stessa sessione di REQ-01…REQ-13. Collegata a **REQ-07** (che aveva concluso erroneamente che gli slot indipendenti fossero RAW-corretti).

**Cosa chiede:** le armi dello stesso tipo in una torretta doppia o tripla dovrebbero sparare con un unico attacco combinato, non come attacchi indipendenti.

**Riferimento RAW:** CRB 2022 p.168 — *"If all weapons in the turret are of the same type, they fire together as one attack but add +1 per additional weapon to each damage die."* Esempi:

| Configurazione | RAW | Errore attuale |
| -------------- | --- | -------------- |
| Doppia torretta Pulse Laser (2D) | 1 roll → 2D+2 | 2 roll → 2D + 2D |
| Tripla torretta Pulse Laser (2D) | 1 roll → 2D+4 | 3 roll → 2D + 2D + 2D |
| Doppia torretta armi miste | solo un tipo per round | 2 roll indipendenti |

**Regole correlate (CRB 2022 p.168):**

- Sandcaster in torretta multipla: ciascun Sandcaster aggiuntivo aggiunge +1 al numero di damage die negate dal cloud (non +1 per die).
- Missili: **esclusi** dalla meccanica di attacco combinato (p.172 — ogni missile spara individualmente).
- Armi miste in una torretta: solo un tipo può sparare per round (il Gunner sceglie).

**Stato attuale:** ogni slot (W1, W2, W3) genera un attacco indipendente con roll separato. Il danno viene calcolato per ogni slot. Questo produce ~2–3× il danno RAW atteso per torrette same-type.

**Fix necessario:**

1. Rilevare se W1/W2/W3 nella torretta sono dello stesso tipo (confronto `weaponId` o `weaponType`).
2. Se same-type: generare un unico attack roll; sommare `+1` al danno per ogni arma extra rispetto alla prima.
3. Se mixed-type: permettere al Gunner di scegliere quale tipo usare per il round; le armi dell'altro tipo non sparano.
4. Caso Sandcaster doppia/tripla: un unico roll → sand cloud con +1 die negato per Sandcaster aggiuntivo.
5. Missili: nessuna modifica — sparano individualmente come prima.

**Impatto:** `AttackModal.jsx`, `useAttackSetup.js`, `combat.js` (calcolo danno), potenzialmente `battleStore.js` (tracking which weapon slot fired).

**Milestone:** v2.3.0 — Issue GitHub #14.

**Priorità: media-alta** — bug RAW sistematico su tutte le navi con torrette doppie/triple same-type.

---

## Priorità di implementazione suggerita

| # | Feature | Effort | Impatto | Tipo |
| - | ------- | ------ | ------- | ---- |
| REQ-08 | Timing PD/Evasion missili | Alto | Alto | Bug RAW |
| REQ-10 | Monoposto: crew actions bloccate | Basso | Alto | Bug |
| REQ-12 | Relitti come bersagli | Basso | Alto | Bug parziale |
| REQ-09 | Skill values negativi | Basso | Alto | Fix UX + RAW |
| REQ-02 | Highlight current actor sul canvas | Basso | Alto | Feature |
| REQ-13 | Saltare Initiative dal round 2 | Medio | Medio | Feature RAW |
| REQ-04 | Click PhaseTracker → centra mappa | Basso | Medio | Feature |
| REQ-01 | Override vettore iniziale | Medio | Alto | Feature |
| REQ-11 | Auto-fill crew roles | Medio | Medio | Feature UX |
| REQ-03 | Rinomina istanza nave in battaglia | Medio | Medio | Feature |
| REQ-14 | Torrette doppie/triple — attacco combinato | Medio | Alto | Bug RAW |
| REQ-07 | Label mount tipo torretta | Basso | Basso | UX cosmético ✅ v2.1.0 |
| REQ-05 | Documentare scala hex | Basso | Medio | Chiarimento |
| REQ-06 | Discord | — | — | Organizzativo |

---

## Piano deploy — ripartizione in batch

Ogni batch = un deploy Netlify. Minimizzare i deploy per risparmiare crediti.

### Batch 1 — v2.0.1 ✅ DEPLOYATO (2026-06-28)

Bug ad alto impatto + chiarimento doc. Tutti a basso effort, zero rischio regressione.

| REQ | Fix |
| --- | --- |
| REQ-09 | Skill values negativi (min −3) |
| REQ-10 | Monoposto: crew actions con skill 0 se assegnato |
| REQ-12 | Relitti esclusi dalla lista target |
| REQ-05 | Scala hex documentata nel Field Manual e HelpScreen |

---

### Batch 2 — v2.1.0 (prossimo)

Feature canvas + UX leggera. Nessun impatto su store o meccaniche RAW.

| REQ | Feature |
| --- | ------- |
| REQ-02 | Highlight current actor sul canvas (anello pulsante) |
| REQ-04 | Click su PhaseTracker → centra mappa sul token |
| REQ-07 | Label tipo mount torretta (Single/Double/Triple) in ShipDetailModal |

---

### Batch 3 — v2.2.0

Feature con impatto su store/flusso di fase. Richiede test approfonditi.

| REQ | Feature |
| --- | ------- |
| REQ-08 | Timing PD/Evasion missili all'impatto (bug RAW — rimuove PD da AttackModal per missili, aggiunge a MissileImpactModal) |
| REQ-13 | Saltare fase Initiative dal round 2 se nessuna nuova nave |
| REQ-11 | Auto-fill crew roles all'aggiunta della nave |

---

### Batch 4 — v2.3.0

Feature complesse o a basso impatto immediato.

| REQ | Feature |
| --- | ------- |
| REQ-01 | Override vettore iniziale (campo Δq/Δr in AddShipModal o context menu) |
| REQ-03 | Rinomina istanza nave in battaglia (inline edit o mini-modal) |
| REQ-14 | Torrette doppie/triple: attacco combinato same-type (CRB 2022 p.168) — impatto su AttackModal, useAttackSetup, combat.js |
