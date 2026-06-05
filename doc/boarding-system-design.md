# Boarding System Design — Thrust & Drift

> Specifica implementativa per la gestione dell'Abbordaggio in-app.  
> Regole di riferimento: High Guard Update 2022 pp.125–135 + MgT2e CRB p.175.

---

## 1. Panoramica

L'abbordaggio è un sotto-sistema che si attiva quando una nave aggressore entra in contatto fisico con un bersaglio. Il combattimento si sposta dall'esterno (hex map, armi nave) all'interno della nave bersaglio (corridoi, compartimenti, obiettivi tattici).

Si svolge in **4 fasi sequenziali**: Approccio → Contatto → Conflitto → Sicurezza.

Il GM può usare il sistema completo per abbordaggi narrativamente rilevanti, o risolvere quelli di routine in modo astratto (CR p.175).

---

## 2. Condizioni di Innesco

L'abbordaggio richiede che l'aggressore abbia **Thrust ≥ Thrust del bersaglio** (o che il bersaglio sia immobilizzato).

Può essere avviato dal context menu della nave aggressore quando:

```
distanza(aggressore, bersaglio) <= 1   // Adjacent o Close
aggressore.profile.thrust >= bersaglio.profile.thrust
oppure
bersaglio ha M-Drive critico disabilitato
```

---

## 3. Fasi e Flusso

### 3.1 Fase 1 — Approccio

Due modalità:

**Volontario** — bersaglio coopera → passa direttamente al Contatto.

**Forzato** — bersaglio tenta di fuggire → check Pilot (già gestito dal sistema di movimento/dogfight). Se bersaglio immobilizzato o sconfitto → Contatto.

> Questa fase è già parzialmente gestita dal combattimento standard. Non serve UI dedicata — il GM dichiara l'abbordaggio quando le condizioni sono soddisfatte.

### 3.2 Fase 2 — Contatto

Il GM sceglie il metodo di ingresso tramite `BoardingContactModal`:

| Metodo | Check | Tempo | Note |
|--------|-------|-------|------|
| Airlock (cooperativo) | — | istantaneo | solo abbordaggio volontario |
| Airlock (forzato) | Formidable (14+) Mechanic (STR) | 2D round | +1D round per aprire |
| Portellone/manutenzione | Very Difficult (12+) Mechanic (STR) | 2D round | rischio decompressione |
| Breaching tube | — | < 2 min | nessun rischio decompressione, posizione sconosciuta |
| Forced linkage apparatus | Average (8+) Pilot (DEX) | — | DM +2 ai check Contatto successivi |
| Taglio scafo | Average (8+) Mechanic (DEX) | per round | Cut Rate + Effetto vs Resilienza |

**Resilienza scafo per taglio:**

```javascript
function getHullResilience(component, armor) {
  const base = {
    'portello':      { block: 4,   breach: 15  },
    'portello_arm':  { block: 6  + armor, breach: 25  + armor },
    'airlock':       { block: 6,   breach: 25  },
    'airlock_arm':   { block: 10 + armor, breach: 35  + armor },
    'scafo':         { block: 50,  breach: 250 },
    'scafo_arm':     { block: 100 + armor * 10, breach: 400 + armor * 20 },
  }
  return base[component]
}
```

**Rotazione nave bersaglio** (contromisura): DM −1 a tutti i check di Contatto. Attivabile dal GM nel context menu della nave difensore.

### 3.3 Fase 3 — Conflitto

Combattimento interno su obiettivi tattici. Gestito tramite `BoardingConflictModal`.

**Obiettivi tattici** (il GM spunta quelli conquistati):

1. **Ponte** — disabilita controllo remoto di tutti i sistemi
2. **Engineering** — propulsione, reattore, supporto vitale
3. **Torrette** — sistemi d'arma

La nave è **presa** quando tutti e 3 gli obiettivi sono conquistati.

**Meccaniche speciali:**

- Stacking in corridoio: 2D ≥ 10 per mirare a bersaglio non-primo della fila
- Colpi mancati → tabella 2D (danno amico / sistemi minori / sistemi critici)
- DM armi in spazio stretto: fucili −2, armi pesanti −4
- Esplosione carburante: 8D Blast(10) se compartimento depressurizzato, 3DD con atmosfera

### 3.4 Fase 4 — Sicurezza

Risoluzione: chi controlla la nave. Aggiornamento stato `ShipInstance`:

- Nave catturata → fazione cambia, equipaggio nemico rimosso
- Nave difesa → squadra boarder eliminata/respinta
- Nave immobilizzata → rimane sul campo come relitto

---

## 4. Struttura Dati

### 4.1 BoardingAction (nuovo slice store)

```javascript
{
  boardings: [
    {
      id: string,
      attackerId: string,          // id ShipInstance aggressore
      defenderId: string,          // id ShipInstance bersaglio
      phase: 'approach' | 'contact' | 'conflict' | 'security',
      contactMethod: string|null,  // 'airlock' | 'breaching_tube' | 'cut' | ecc.
      defenderRotating: boolean,   // contromisura rotazione
      forcedLinkage: boolean,      // DM +2 contatto
      objectives: {
        bridge:      boolean,      // conquistato
        engineering: boolean,
        turrets:     boolean,
      },
      outcome: null | 'attacker_wins' | 'defender_wins',
    }
  ]
}
```

### 4.2 Modifica a ShipInstance

```javascript
inBoarding: string|null   // id BoardingAction, null se fuori
```

---

## 5. UI

### 5.1 Context Menu — Nave Aggressore

Nuova voce nel context menu della nave aggressore (visibile solo se condizioni §2 soddisfatte):

```
⚔ Abborda [nome bersaglio]...
```

Apre `BoardingSetupModal` per selezionare la nave bersaglio (se non già adiacente).

### 5.2 BoardingContactModal

Modale per la Fase 2:

- Selezione metodo ingresso (dropdown con check richiesto e tempo)
- Toggle "Nave in rotazione" (DM −1)
- Toggle "Forced linkage" (se applicabile, DM +2)
- Pulsante "Risolvi check" → DiceRoller integrato → esito (successo/fallimento/round rimanenti per taglio)
- Pulsante "Avanza al Conflitto"

### 5.3 BoardingConflictModal

Modale per la Fase 3:

- Tre checkbox obiettivi (Ponte / Engineering / Torrette) con stato conquistato/conteso/difeso
- Sezione "Combattimento round" con:
  - Tabella stacking (pulsante "Tira stacking" se necessario)
  - Tabella colpi mancati (pulsante "Tira colpo mancato")
  - Log eventi interno all'abbordaggio
- Pulsante "Fine conflitto" → apre `BoardingOutcomeModal`

### 5.4 BoardingOutcomeModal

Risoluzione finale:

- Scelta esito (attaccante vince / difensore vince / negoziazione)
- Se attaccante vince: opzione cambio fazione della nave catturata
- Aggiornamento automatico stato nave (criticals, hull, fazione)

### 5.5 HUD — Indicatore Abbordaggio Attivo

Quando `boardings.length > 0`, il HUD mostra un badge sotto il tracker standard:

```
⚔ ABBORDAGGIO  [Viper → Far Trader]  CONFLITTO
```

Token della nave bersaglio sul canvas: bordo rosso pulsante.

---

## 6. Nuovi Componenti

| Componente | Tipo | Responsabilità |
|-----------|------|----------------|
| `BoardingSetupModal.jsx` | Modal | Selezione bersaglio, avvio abbordaggio |
| `BoardingContactModal.jsx` | Modal | Fase Contatto — metodo ingresso, check, rotazione |
| `BoardingConflictModal.jsx` | Modal | Fase Conflitto — obiettivi, stacking, colpi mancati |
| `BoardingOutcomeModal.jsx` | Modal | Fase Sicurezza — esito, cambio fazione |
| `boarding.js` | Util (`utils/`) | `getHullResilience`, `rollMissedShot`, `getBoardingDM` |

---

## 7. Store — Azioni Necessarie

```javascript
startBoarding(attackerId, defenderId)
advanceBoardingPhase(boardingId)
setContactMethod(boardingId, method)
toggleDefenderRotation(boardingId)
toggleForcedLinkage(boardingId)
setObjective(boardingId, objective, conquered)
resolveBoarding(boardingId, outcome)
// outcome 'attacker_wins' → opzionale: updateShipFaction(defenderId, newFaction)
```

---

## 8. Integrazione con Combattimento Standard

- Navi in abbordaggio (`inBoarding !== null`) non partecipano alla fase Attacco standard
- Il difensore non può usare thrust per manovrare mentre è in Contatto con forced linkage attivo
- Se la nave bersaglio viene distrutta durante il Conflitto (dai danni interni): `resolveBoarding` con esito speciale `'ship_destroyed'`
- L'abbordaggio non sospende i round standard: il GM può avanzare le fasi normali e risolvere l'abbordaggio in parallelo, come per il dogfight

---

## 9. Modalità Astratta (CR p.175)

Per abbordaggi di routine il GM può saltare le fasi e usare la risoluzione rapida:

- Unico check contrapposto: `2D6 + marines.count + marines.skill` vs `2D6 + equipaggio difensore`
- Esito immediato: vince chi supera di più
- Accessibile come toggle "Risoluzione rapida" nel `BoardingSetupModal`

---

## Documenti Correlati

- [thrust-and-drift-space-combat-simulator-spec.md](thrust-and-drift-space-combat-simulator-spec.md) — architettura generale, modelli dati, roadmap (§13.7)
- [dogfight-system-design.md](dogfight-system-design.md) — sistema dogfight (può precedere un abbordaggio)
- [obstacles-system-design.md](obstacles-system-design.md) — ostacoli ambientali (asteroid field, gravity well, nebula)
