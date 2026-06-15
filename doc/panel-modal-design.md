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
| --- | --- | --- | --- |
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

```text
fixed inset-0 z-50
flex items-center justify-center
bg-black/60 backdrop-blur-sm
pointer-events-auto
```

Focus trap, backdrop click chiude, Escape chiude.

### `variant="panel"` (nuovo)

```text
fixed bottom-[calc(1.75rem+0.75rem)] right-4 z-50
pointer-events-auto
```

- Nessun backdrop → mappa visibile e panbile
- Nessun overlay scuro
- Pannello ancorato bottom-right, al di sopra del legal footer (1.75rem)
- Escape chiude (identico a dialog)
- Nessun focus trap (inutile senza backdrop)
- `width` controllato da prop `width` come ora (default `max-w-lg`)
- Altezza automatica (`h-auto`) fino a `max-h-[calc(100vh-4rem)]`

---

## Classificazione delle modali

**Tutte le modali passano a `panel`.**

Ogni modale — incluse DogfightRoundModal e boarding — mostra **un solo step alla volta**.
Il panel si ridimensiona automaticamente al contenuto dello step corrente.
Non esiste un caso in cui tutti gli step siano visibili simultaneamente,
quindi non c'è rischio di contenuto nascosto.

| Modale | `width` consigliato |
| --- | --- |
| `PassingAttackModal` | `max-w-sm` |
| `MissileImpactModal` | `max-w-sm` |
| `AttackModal` | `max-w-lg` |
| `ActionModal` | `max-w-md` |
| `ShipDetailModal` | `max-w-md` |
| `InitiativeModal` | `max-w-sm` |
| `BasicManoeuvreModal` | `max-w-sm` |
| `DogfightRoundModal` | `max-w-xl` |
| `BoardingSetupModal` | `max-w-md` |
| `BoardingContactModal` | `max-w-lg` |
| `BoardingConflictModal` | `max-w-lg` |
| `BoardingOutcomeModal` | `max-w-md` |
| `AddShipModal` | `max-w-lg` |
| `ShipProfileModal` | `max-w-lg` |
| `CrewAssignmentModal` | `max-w-md` |
| `LegendModal` | `max-w-xl` |

---

## File da modificare

| File | Modifica |
| --- | --- |
| `src/components/modals/Modal.jsx` | aggiungere prop `variant`, branching JSX |
| `src/components/modals/PassingAttackModal.jsx` | self-contained, aggiornare wrapper interno |
| `src/components/modals/MissileImpactModal.jsx` | self-contained, aggiornare wrapper interno |
| Tutte le altre modali | aggiungere `variant="panel"` alla chiamata `<Modal>` |

`PassingAttackModal` e `MissileImpactModal` non usano `Modal.jsx` ma hanno
un proprio wrapper `fixed inset-0` — vanno aggiornati direttamente.

---

## Implementazione a step

1. **`Modal.jsx`** — aggiungere `variant` prop; branching JSX
2. **Modali via `Modal.jsx`** — aggiungere `variant="panel"` a tutte
3. **`PassingAttackModal`** — aggiornare wrapper interno
4. **`MissileImpactModal`** — aggiornare wrapper interno
5. **Test** — Escape, close button, scroll, pan mappa durante modale aperta

---

## Vincoli

- Il pan della mappa (`useMapInteraction`) non è bloccato da z-index ma da `pointer-events`.
  Rimuovendo il backdrop `pointer-events-auto` full-screen, il canvas riceve tutti gli eventi → pan funziona.
- Il canvas degli effetti (`effectsCanvas`) è `z-index: 1` — rimane sotto il panel (`z-50`). Corretto.
- Il ContextMenu è assoluto e dinamico — nessuna modifica necessaria.
- `LegalFooter` è `1.75rem` di altezza — il panel si posiziona sopra con `bottom-[calc(1.75rem+0.75rem)]`.
- Se due panel sono aperti contemporaneamente (es. PassingAttackModal + AttackModal),
  il secondo si sovrappone al primo. Comportamento naturale, nessuna logica aggiuntiva necessaria.
