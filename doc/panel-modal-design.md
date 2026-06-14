# Panel Modal — Design Document

> Spostare le modali di combattimento dal centro dello schermo
> a un pannello ancorato in basso a destra, senza backdrop,
> in modo che la mappa rimanga sempre visibile e panbile.

---

## Motivazione

Il GM opera su uno schermo condiviso. La mappa deve rimanere sempre leggibile
durante la risoluzione di attacchi, impatti missili e passing encounter.
Il backdrop full-screen attuale (`fixed inset-0`) blocca completamente la mappa
e cattura tutti gli eventi mouse, impedendo il pan durante la risoluzione.

---

## Stato attuale degli overlay

| Elemento | Posizione | z-index | Note |
|---|---|---|---|
| HUD | `absolute top-3 left-3` | 10 | |
| PhaseTracker | `absolute top-10 right-3` | 10 | |
| LegendButton | `absolute top-3 right-3` | 10 | |
| BattleLog | `absolute bottom-7 left-0 w-1/3` | 10 | collassabile |
| Tutte le modali | `fixed inset-0` backdrop + centrato | 50 | blocca mappa |

Il bottom-right è **completamente libero** — nessun conflitto con BattleLog (bottom-left)
né con PhaseTracker (top-right).

---

## Soluzione: variante `panel` in `Modal.jsx`

Aggiungere una prop `variant: 'dialog' | 'panel'` (default `'dialog'`).

### `variant="dialog"` (comportamento attuale — invariato)
```
fixed inset-0 z-50
flex items-center justify-center
bg-black/60 backdrop-blur-sm
pointer-events-auto
```
Focus trap, backdrop click chiude, Escape chiude.

### `variant="panel"` (nuovo)
```
fixed bottom-[calc(1.75rem+0.75rem)] right-4 z-50
pointer-events-auto
```
- Nessun backdrop → mappa visibile e panbile
- Nessun overlay scuro
- Pannello ancorato bottom-right, al di sopra del legal footer (1.75rem)
- Escape chiude (identico a dialog)
- Nessun focus trap (inutile senza backdrop)
- `width` controllato da prop `width` come ora (default `max-w-lg`)

---

## Classificazione delle modali

### → `panel` (combat-context, mappa utile)

| Modale | Motivo |
|---|---|
| `PassingAttackModal` | appare dopo il movement, la posizione relativa conta |
| `MissileImpactModal` | appare dopo il movement, il target è sulla mappa |
| `AttackModal` | range band e posizione token visibili durante la risoluzione |
| `ActionModal` | crew action, mappa utile per contesto |
| `ShipDetailModal` | reference sheet, non blocca azioni |
| `InitiativeModal` | breve, non richiede focus esclusivo |
| `BasicManoeuvreModal` | movimento basic mode, mappa non c'è ma è coerente |

### → `dialog` (flow complessi, focus esclusivo)

| Modale | Motivo |
|---|---|
| `DogfightRoundModal` | 6 micro-round, 619 righe, richiede attenzione totale |
| `BoardingSetupModal` | configurazione boarding |
| `BoardingContactModal` | 4 fasi boarding, multi-step |
| `BoardingConflictModal` | round per round, multi-step |
| `BoardingOutcomeModal` | esito finale boarding |
| `AddShipModal` | setup pre-combattimento |
| `ShipProfileModal` | editor profilo, non usato durante il combattimento |
| `CrewAssignmentModal` | assegnazione crew, setup |
| `LegendModal` | riferimento visivo, nessuna urgenza |

---

## Questione aperta: altezza di `AttackModal`

`AttackModal` ha 4 step sequenziali:
1. Configurazione (arma, bersaglio, reazioni)
2. Tiro dado 2D6
3. Danno
4. Critico (opzionale)

In `panel` mode l'altezza disponibile è circa `100vh - 1.75rem - 0.75rem - top_margin`.
Su uno schermo 1080p equivale a ~950px — sufficiente per tutti e 4 gli step.
Su schermi più piccoli (es. 768px) il pannello diventerebbe scrollabile.

### Opzioni

**A — Panel con scroll interno (proposta base)**
Il body del panel è già `overflow-y-auto`. Il pannello usa `max-h-[calc(100vh-4rem)]`.
Su schermi grandi tutto visibile; su schermi piccoli scroll.
*Rischio*: il GM potrebbe non accorgersi del contenuto sotto la piega.

**B — Panel condensato per AttackModal**
Ridisegnare i 4 step in formato più compatto (font più piccolo, meno padding)
specificamente per la variant `panel`. Più lavoro, non garantisce di eliminare
il problema su tutti gli schermi.

**C — AttackModal rimane `dialog` (centrato con backdrop)**
È la modale più usata e più complessa. Tenerla centrata garantisce visibilità
completa del contenuto. Il GM perde la mappa durante l'attacco, ma la perdeva già.
Tutte le altre modali diventano panel.
*Vantaggio*: zero rischi su schermi piccoli; zero refactoring di AttackModal.
*Svantaggio*: incoerenza UX (alcune modali bloccano la mappa, altre no).

**D — Stacked panels**
Se più panel sono aperti contemporaneamente (es. PassingAttackModal apre AttackModal),
il secondo panel si sovrappone al primo. Questo è il comportamento naturale con z-50
e non richiede logica aggiuntiva.

> **Decisione pendente**: scegliere tra A, C o D prima di implementare.
> B è da escludere — troppo lavoro per un vantaggio marginale.

---

## File da modificare

| File | Modifica |
|---|---|
| `src/components/modals/Modal.jsx` | aggiungere prop `variant`, branching JSX |
| `src/components/modals/AttackModal.jsx` | aggiungere `variant="panel"` (o lasciare `dialog`) |
| `src/components/modals/ActionModal.jsx` | aggiungere `variant="panel"` |
| `src/components/modals/ShipDetailModal.jsx` | aggiungere `variant="panel"` |
| `src/components/modals/InitiativeModal.jsx` | aggiungere `variant="panel"` |
| `src/components/modals/BasicManoeuvreModal.jsx` | aggiungere `variant="panel"` |
| `src/components/modals/PassingAttackModal.jsx` | già self-contained, aggiornare wrapper interno |
| `src/components/modals/MissileImpactModal.jsx` | già self-contained, aggiornare wrapper interno |

`PassingAttackModal` e `MissileImpactModal` non usano `Modal.jsx` ma hanno
un proprio wrapper `fixed inset-0` — vanno aggiornati direttamente.

---

## Implementazione a step

1. **`Modal.jsx`** — aggiungere `variant` prop; estrarre JSX condizionale
2. **Modali `panel` semplici** — `ActionModal`, `ShipDetailModal`, `InitiativeModal`, `BasicManoeuvreModal`
3. **`PassingAttackModal`** — aggiornare wrapper interno
4. **`MissileImpactModal`** — aggiornare wrapper interno
5. **`AttackModal`** — implementare in base alla decisione aperta (A, C o D)
6. **Test** — verificare che Escape, close button, e scroll funzionino correttamente in panel mode

---

## Vincoli

- Il pan della mappa (`useMapInteraction`) non è bloccato da z-index ma da `pointer-events`.
  Rimuovendo il backdrop `pointer-events-auto` full-screen, il canvas riceve tutti gli eventi → pan funziona.
- Il canvas degli effetti (`effectsCanvas`) è `z-index: 1` — rimane sotto il panel (`z-50`). Corretto.
- Il ContextMenu è assoluto e dinamico — nessuna modifica necessaria.
- `LegalFooter` è `1.75rem` di altezza — il panel si posiziona sopra con `bottom-[calc(1.75rem+0.75rem)]`.
