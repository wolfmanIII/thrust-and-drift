# Risoluzione Conflitti Logici — Thrust & Drift

> Piano implementativo derivato dall'analisi dei conflitti strutturali emersi dalla review tecnica
> del 2026-06-10. Tre aree di intervento in ordine di priorità: bug confermato su stato
> `inBoarding`, guard difensivo su `resolveMovement` in basic mode, chiarimento spec
> temporale dogfight × ostacoli, e migrazione UX modali abbordaggio.

---

## 1. Panoramica e Priorità

| # | Conflitto | Stato | Priorità |
| --- | ----------- | ------- | ---------- |
| A | `inBoarding` non filtra dogfight detection | Bug confermato in codice | **Alta** |
| B | `resolveMovement` senza guard basic mode | Falso positivo — protezione indiretta fragile | Bassa |
| C | Collisione temporale dogfight × ostacoli | Spec-level — ostacoli non ancora implementati | Media (pre-implementazione ostacoli) |
| D | Modali abbordaggio bloccano la visione GM | Debito UX architetturale | Media |

---

## 2. Fix A — Guard `inBoarding` nel sistema dogfight

### 2.1 Descrizione del bug

Una nave con `inBoarding !== null` (marines stanno tagliando il portellone) può essere:

1. Rilevata da `detectDogfightGroups` come candidata al dogfight
2. Avere `startDogfight` invocato su di essa
3. Ricevere `inDogfight = groupId` mentre è fisicamente ancorata a un'altra nave

Fisicamente impossibile: una nave in abbordaggio forzato non può manovrare.
Meccanicamente: lo stato `inDogfight` altera il flusso di fase e i calcoli di micro-round.

Il loop `passingEncounters` in `resolveMovement` filtra già `inDogfight` (`battleStore.js:493`)
ma non `inBoarding` — una nave ancorata viene inclusa nei calcoli di incrocio vettoriale.

### 2.2 File coinvolti

```text
src/components/map/useDogfightDetection.js   ← detectDogfightGroups
src/store/battleStore.js                      ← startDogfight guard + passingEncounters loop
src/store/battleStore.test.js                 ← nuovi test
src/components/map/useDogfightDetection.test.js ← nuovi test
```

### 2.3 Implementazione

#### `useDogfightDetection.js` — `detectDogfightGroups`

```js
// Prima (riga 20)
const active = ships.filter((s) => !s.inDogfight)

// Dopo
const active = ships.filter((s) => !s.inDogfight && !s.inBoarding)
```

Motivazione: una nave in abbordaggio è fisicamente vincolata. Non può occupare
lo stesso hex per manovra tattica nel senso dogfight. `inBoarding` è un ID stringa
(`null` se libera), quindi `!s.inBoarding` è sufficiente.

#### `battleStore.js` — `startDogfight` guard

```js
// Prima (riga 1027)
startDogfight: wh((shipIds) => shipIds.length >= 2, (shipIds) => {

// Dopo
startDogfight: wh(
  (shipIds) => {
    if (shipIds.length < 2) return false
    const { ships } = get()
    // Una nave in abbordaggio non può ingaggiare un dogfight
    return !ships.some((s) => shipIds.includes(s.id) && s.inBoarding !== null)
  },
  (shipIds) => {
```

Il guard nella funzione `wh` predicate previene l'invocazione anche se il modal
di notifica viene mostrato per errore (doppia protezione).

#### `battleStore.js` — `passingEncounters` loop

```js
// Prima (riga 493)
if (a.inDogfight || b.inDogfight) continue

// Dopo
if (a.inDogfight || b.inDogfight) continue
if (a.inBoarding || b.inBoarding) continue
```

Una nave ancorata in abbordaggio ha vettore effettivamente nullo (o coincidente con
quello della nave bersaglio). Includerla nei calcoli `segmentMinDistance` produce
false positive.

### 2.4 Test da aggiungere

**`useDogfightDetection.test.js`:**

```js
it('ignora navi con inBoarding nel rilevamento dogfight', () => {
  const ships = [
    makeShip({ id: 'a', faction: 'players', position: { q: 0, r: 0 }, inBoarding: 'boarding-1' }),
    makeShip({ id: 'b', faction: 'npc',     position: { q: 0, r: 0 }, inBoarding: null }),
  ]
  expect(detectDogfightGroups(ships)).toEqual([])
})

it('rileva dogfight solo tra navi libere nella stessa casella', () => {
  const ships = [
    makeShip({ id: 'a', faction: 'players', position: { q: 0, r: 0 }, inBoarding: null }),
    makeShip({ id: 'b', faction: 'npc',     position: { q: 0, r: 0 }, inBoarding: null }),
    makeShip({ id: 'c', faction: 'npc',     position: { q: 0, r: 0 }, inBoarding: 'boarding-2' }),
  ]
  // Solo a e b formano un gruppo — c viene esclusa
  const groups = detectDogfightGroups(ships)
  expect(groups).toHaveLength(1)
  expect(groups[0].shipIds).toEqual(expect.arrayContaining(['a', 'b']))
  expect(groups[0].shipIds).not.toContain('c')
})
```

**`battleStore.test.js`:**

```js
it('startDogfight viene bloccato se una delle navi è in abbordaggio', () => {
  // Setup: due navi ostili, una in inBoarding
  useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
  useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 0, r: 0 }, 'npc',     '#f00')
  // Simula abbordaggio attivo sulla nave p1
  useBattleStore.setState({
    ships: useBattleStore.getState().ships.map((s) =>
      s.id === 'p1' ? { ...s, inBoarding: 'boarding-99' } : s
    ),
    boardings: [{ id: 'boarding-99', attackerId: 'p1', defenderId: 'p2', phase: 'contact', outcome: null }],
  })
  const before = useBattleStore.getState().dogfights.length
  useBattleStore.getState().startDogfight(['p1', 'p2'])
  expect(useBattleStore.getState().dogfights.length).toBe(before)
})

it('passingEncounters esclude navi in abbordaggio', () => {
  useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
  useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 3, r: 0 }, 'npc',     '#f00')
  useBattleStore.setState({
    ships: useBattleStore.getState().ships.map((s) =>
      s.id === 'p1' ? { ...s, vector: { q: 3, r: 0 }, inBoarding: 'boarding-99' } : s
    ),
  })
  useBattleStore.getState().resolveMovement()
  expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
})
```

---

## 3. Fix B — Guard esplicito `resolveMovement` in basic mode

### 3.1 Descrizione

In basic mode, `advancePhase` salta il `movement` phase (`battleStore.js:712`) quindi
`resolveMovement` non viene mai invocato attraverso il flusso normale.
La protezione è però **indiretta**: se `resolveMovement` venisse chiamata direttamente
(test di integrazione, refactor futuro, import di battle state con stato inconsistente),
eseguirebbe `segmentMinDistance` su coordinate hex che in basic mode non vengono
mai aggiornate — le posizioni restano quelle iniziali e producono false encounter.

### 3.2 Implementazione

```js
// battleStore.js — inizio di resolveMovement, prima riga dopo wh(
resolveMovement: wh(() => {
  const { ships, missiles, round, combatMode } = get()

  // Basic mode ha no hex map — il movimento è gestito tramite range bands in advancePhase.
  if (combatMode === 'basic') return

  // ... resto invariato
```

Nessun impatto funzionale sul path normale. Rende il contratto della funzione esplicito
e protegge da regressioni future.

### 3.3 Test da aggiungere

```js
it('resolveMovement è no-op in basic mode', () => {
  useBattleStore.setState({ combatMode: 'basic' })
  useBattleStore.getState().addShip(makeProfile({ id: 'p1' }), { q: 0, r: 0 }, 'players', '#fff')
  useBattleStore.getState().addShip(makeProfile({ id: 'p2' }), { q: 2, r: 0 }, 'npc',     '#f00')
  useBattleStore.setState({
    ships: useBattleStore.getState().ships.map((s) =>
      s.id === 'p1' ? { ...s, vector: { q: 2, r: 0 } } : s
    ),
  })
  const posBefore = useBattleStore.getState().ships.find((s) => s.id === 'p1').position
  useBattleStore.getState().resolveMovement()
  const posAfter = useBattleStore.getState().ships.find((s) => s.id === 'p1').position
  expect(posAfter).toEqual(posBefore)
  expect(useBattleStore.getState().passingEncounters).toHaveLength(0)
})
```

---

## 4. Spec C — Chiarimento temporale Dogfight × Ostacoli

### 4.1 Contesto

Il sistema ostacoli è interamente documentato in `doc/obstacles-system-design.md` ma
**non ancora implementato** nel codice (`battleStore.js` non ha `obstacles: []` né azioni
correlate). Il conflitto esiste a livello di spec: la sequenza di `resolveMovement` nel
design doc (§4.2) non specifica il comportamento quando una nave in dogfight (micro-round
da 6 secondi) entra in contatto con un ostacolo che applica danno round-based.

### 4.2 Il conflitto

**Scenario:** nave A è in dogfight (micro-round attivo, `inDogfight !== null`).
Il suo vettore la porta dentro un campo asteroidi o il raggio di un gravity well.

**Problema:** il danno da ostacolo viene calcolato in `resolveMovement` (round macroscopico
da 6 minuti). Se applicato alla scala del dogfight, la nave subirebbe il danno ogni
micro-round (×6), risultato non intenzionale e non RAW.

### 4.3 Risoluzione proposta

Il gravity well è già classificato come **zona proibita statica** senza pull gravitazionale
attivo (obstacles-system-design.md §3.3, §13 Scope Escluso). Il danno da impatto
atmosferico ha senso solo se la nave **termina** il proprio round macroscopico nel raggio —
non per ogni micro-round di manovra interna al dogfight.

**Regola da documentare in `obstacles-system-design.md`:**

```text
## 14. Interazione con il Dogfight

### 14.1 Danno da ostacoli durante il dogfight

Il danno da collisione asteroid/debris e il danno da impatto gravity well vengono
calcolati UNA SOLA VOLTA al termine del round macroscopico (6 minuti), indipendentemente
dal numero di micro-round completati in quel round.

Motivazione: i micro-round del dogfight sono un'astrazione per la risoluzione dei
check Pilot contrapposti. Il vettore effettivo della nave cambia alla fine del round
standard, non ogni 6 secondi.

Implementazione: in resolveMovement, il controllo collisioni ostacoli viene eseguito
sulle posizioni post-movimento FINALI. Ships con inDogfight !== null vengono incluse
nel controllo (la posizione finale è reale) ma non ricevono danno moltiplicato.

### 14.2 Piazzamento ostacoli durante un dogfight attivo

Il GM può piazzare ostacoli in qualsiasi momento. Se un ostacolo viene piazzato su
una casella occupata da una nave in dogfight, l'effetto si applica al prossimo
resolveMovement, non retroattivamente.

### 14.3 Gravity well — navi in dogfight

Una nave in dogfight non può "scegliere" di entrare nel raggio di un gravity well
tramite manovra volontaria (ThrustModal è disabilitato durante un dogfight). L'unico
modo in cui ci entra è per vettore ereditato che la trascinasse dentro.

In questo caso:
- resolveMovement applica il danno da impatto atmosferico (4D6, ignora Armor)
  come da §3.3 — UNA SOLA VOLTA per round macroscopico
- Il dogfight viene terminato automaticamente (endDogfight) — la nave è in
  emergenza atmosferica, non può manovrare
- Log entry: "[nave] trascina fuori dal dogfight per impatto con [label]"
```

### 4.4 Modifiche codice necessarie (da implementare con gli ostacoli)

Aggiungere a `resolveMovement`, dopo il blocco `movedShips` e **prima** del blocco
`passingEncounters`, la sequenza di controllo ostacoli:

```js
// Pseudo-codice — da implementare quando obstacles è nello store
const { obstacles } = get()

// 1. Collisioni asteroid/debris
for (const sh of movedShips) {
  if (sh.isDestroyed) continue
  const hit = getObstacleAt(obstacles, sh.position)
  if (!hit || hit.type === 'gravity_well' || hit.type === 'nebula') continue
  if (sh.paidFieldCost) continue
  const dice = hit.type === 'debris_field' || hit.density === 'dense' ? 2 : 1
  get().applyDamage(sh.id, rollNDice(dice, 6), `${hit.label ?? hit.type} collision`, true)
}

// 2. Gravity well — impatto atmosferico (una sola volta per round — include navi in dogfight)
for (const sh of movedShips) {
  if (sh.isDestroyed) continue
  const gw = obstacles.find((o) => o.type === 'gravity_well' && hexDistance(o.position, sh.position) <= o.radius)
  if (!gw) continue
  get().applyDamage(sh.id, rollNDice(4, 6), `atmospheric entry — ${gw.label ?? 'gravity well'}`, true)
  // Termina il dogfight se attivo
  if (sh.inDogfight) get().endDogfight(sh.inDogfight)
}

// 3. Nebula — rimuovi sensor lock
for (const sh of movedShips) {
  const inNebula = obstacles.some((o) => o.type === 'nebula' && hexDistance(o.position, sh.position) <= o.radius)
  if (inNebula && sh.sensorLockOn) {
    get().updateShip(sh.id, { sensorLockOn: null })
    get().updateShip(sh.sensorLockOn, { sensorLockedBy: null, sensorLockDM: 0 })
  }
}
```

### 4.5 Modifica spec `obstacles-system-design.md`

La sezione `## 4. Store — Azioni` (§4.2 Integrazione resolveMovement) deve essere
aggiornata con la sequenza corretta e il punto 4.3 sulla gestione dei dogfight.
Il §3.3 Gravity Well deve essere integrato con il comportamento `endDogfight`.

---

## 5. UX D — Migrazione modali abbordaggio a pannelli persistenti

### 5.1 Descrizione del problema

Il flusso di abbordaggio richiede al GM di navigare attraverso 4 modali sovrapposti in
sequenza (`BoardingSetupModal` → `BoardingContactModal` → `BoardingConflictModal` →
`BoardingOutcomeModal`). Ogni modale è bloccante: oscura la mappa hex, impedendo la
situational awareness durante round che durano minuti.

Il problema è strutturale: i modali bloccanti hanno senso per azioni istantanee
(lancio missile, attacco, thrust), ma l'abbordaggio si svolge in più round e richiede
consultazione della mappa tra un check e l'altro.

### 5.2 Approccio proposto — Side Panel persistente

Convertire il flusso di abbordaggio in un pannello laterale scorrevole agganciato al
layout principale, non sovrapposto alla mappa.

**Layout target:**

```text
┌──────────────────────────────────────────────────────────┐
│  HUD  [round 3 / attack]              🔊  [menu]         │
├────────────────────────────────┬─────────────────────────┤
│                                │  ⚔ BOARDING             │
│                                │  Atk: Resolute (A)      │
│     HEX MAP                    │  Def: Serpent (B)       │
│     (visibile sempre)          │  Phase: CONFLICT        │
│                                │  ─────────────────────  │
│                                │  Hull cut: 3/8 rounds   │
│                                │  [🎲 Roll marines]      │
│                                │  [🎲 Roll defenders]    │
│                                │                         │
│                                │  Objectives:            │
│                                │  ☐ Bridge               │
│                                │  ☑ Engineering          │
│                                │  ─────────────────────  │
│                                │  [RESOLVE]  [ABORT]     │
└────────────────────────────────┴─────────────────────────┘
│  Battle Log (collassato)                                  │
└──────────────────────────────────────────────────────────┘
```

### 5.3 Componenti da creare / modificare

#### Nuovo: `src/components/ui/BoardingPanel.jsx`

Pannello laterale persistente, visibile quando `boardings` contiene almeno un abbordaggio
con `outcome === null`. Sostituisce il flusso modale per le fasi `contact`, `conflict`,
`outcome`.

```jsx
// Lettura store
const boardings       = useBattleStore((s) => s.boardings.filter((b) => b.outcome === null))
const ships           = useBattleStore((s) => s.ships)
const openBoardingId  = useUiStore((s) => s.openBoardingId)
```

Il panel mostra un'istanza di abbordaggio alla volta; se ce ne sono più, una tab strip
compatta in cima permette di navigarli.

**Sub-componenti interni al panel:**

| Componente | Fase abbordaggio | Sostituisce |
| ------------ | ----------------- | ------------- |
| `BoardingContactSection` | `contact` | `BoardingContactModal` (parti interattive) |
| `BoardingConflictSection` | `conflict` | `BoardingConflictModal` |
| `BoardingOutcomeSection` | `outcome` | `BoardingOutcomeModal` |

`BoardingSetupModal` **rimane modale** — è un'azione istantanea (il GM dichiara
l'abbordaggio) che non richiede visione continuativa della mappa.

#### Modifiche `uiStore.js`

```js
// Aggiungere
openBoardingId: null,       // ID dell'abbordaggio visualizzato nel panel
setOpenBoardingId: (id) => set({ openBoardingId: id }),
```

Auto-seleziona il primo abbordaggio attivo all'apertura; si aggiorna quando un
abbordaggio viene risolto.

#### Modifiche `BattleMap.jsx`

Aggiungere `BoardingPanel` nel layout accanto alla canvas, condizionato alla presenza
di abbordaggi attivi:

```jsx
<div className="flex h-full">
  <canvas ref={canvasRef} className="flex-1" />
  {hasActiveBoarding && <BoardingPanel />}
</div>
```

`hasActiveBoarding` = `boardings.some((b) => b.outcome === null)`.

#### Deprecazione progressiva modali esistenti

I file `BoardingContactModal.jsx`, `BoardingConflictModal.jsx`, `BoardingOutcomeModal.jsx`
vengono mantenuti durante la transizione (i test esistenti continuano a passare) e rimossi
solo dopo che `BoardingPanel` ha raggiunto parità funzionale verificata.

### 5.4 Implicazioni sui test esistenti

I test dei singoli modal (`BoardingContactModal.test.jsx`, ecc.) rimangono validi finché
i componenti esistono. I nuovi test del panel useranno `@testing-library/react` con
render nel layout completo per verificare che la mappa non venga oscurata.

### 5.5 Scope di questa voce

Questa è la modifica con il maggiore impatto architetturale. Va pianificata come feature
separata dopo che i fix A e B sono in produzione. Non blocca nessun'altra funzionalità.

---

## 6. Matrice di Mutua Esclusione degli Stati

Come suggerito nella review, documentare esplicitamente le incompatibilità tra stati di nave.

### 6.1 Regole di incompatibilità (da enforcare via guard)

| Stato attivo | Blocca | Nota |
| --- | --- | --- |
| `inBoarding !== null` | `startDogfight`, `dogfight detection`, `passingEncounters` | Fix A |
| `inDogfight !== null` | `initBoarding` (BoardingSetupModal non mostra la nave come bersalio valido) | Da verificare — vedi §6.2 |
| `isDestroyed === true` | Tutte le azioni | Già implementato |
| `combatMode === 'basic'` | `resolveMovement`, dogfight detection | Fix B + già esistente |

### 6.2 Verifica guard `inDogfight → initBoarding`

Prima di chiudere il fix A, verificare che `BoardingSetupModal` escluda navi con
`inDogfight !== null` dalla lista dei bersagli validi.

```js
// BoardingSetupModal.jsx — funzione di validità target (riga ~23)
// Aggiungere:
if (target.inDogfight) return false
```

Se la guard manca, aggiungere contestualmente al fix A.

---

## 7. Ordine di Implementazione

```text
1. [Fix A] Guard inBoarding in detectDogfightGroups        ← una riga + test
2. [Fix A] Guard inBoarding in passingEncounters loop      ← una riga + test
3. [Fix A] Guard inBoarding in startDogfight predicate     ← 3 righe + test
4. [Fix A] Verifica guard inDogfight in BoardingSetupModal ← audit + eventuale fix
5. [Fix B] Guard combatMode in resolveMovement             ← una riga + test
6. [Spec C] Aggiornamento obstacles-system-design.md       ← solo documentazione
7. [UX D]  BoardingPanel — pianificazione separata
```

I passi 1–5 sono modifiche chirurgiche e possono stare in un unico commit per area
(es. `fix(dogfight): guard inBoarding state across detection and store`).

---

## 8. File modificati — riepilogo

| File | Tipo modifica | Fix |
| ------ | -------------- | ----- |
| `src/components/map/useDogfightDetection.js` | 1 riga filter | A |
| `src/store/battleStore.js` | Guard in `startDogfight` + `passingEncounters` + `resolveMovement` | A + B |
| `src/components/modals/BoardingSetupModal.jsx` | Guard `inDogfight` su target (se mancante) | A |
| `src/store/battleStore.test.js` | 2 nuovi test | A + B |
| `src/components/map/useDogfightDetection.test.js` | 2 nuovi test | A |
| `doc/obstacles-system-design.md` | Nuova sezione §14 | C |
| `src/components/ui/BoardingPanel.jsx` | Nuovo file | D |
| `src/store/uiStore.js` | `openBoardingId` + `setOpenBoardingId` | D |
| `src/components/map/BattleMap.jsx` | Render condizionale `BoardingPanel` | D |

---

## 9. Documenti Correlati

- [`doc/dogfight-system-design.md`](dogfight-system-design.md) — sistema dogfight, §2 condizioni innesco
- [`doc/boarding-system-design.md`](boarding-system-design.md) — sistema abbordaggio, §2 condizioni innesco
- [`doc/obstacles-system-design.md`](obstacles-system-design.md) — da aggiornare con §14
- [`CHANGELOG.md`](../CHANGELOG.md) — entry da aggiungere dopo ogni fix
