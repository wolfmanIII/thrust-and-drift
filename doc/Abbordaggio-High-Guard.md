# Abbordaggio (Boarding Actions)

Sistema dettagliato per l'abbordaggio di navi spaziali. Sostituisce o integra le regole base del Core Rulebook (p.175). Le due versioni non si escludono: il Referee può usare questo sistema per abbordaggi narrativamente rilevanti e le regole astratte del CR per quelli di routine.

> **Fonte:** High Guard Update 2022, pp.125–135.

---

## 1. Struttura in Fasi

Ogni abbordaggio si svolge in quattro fasi sequenziali:

```text
APPROCCIO → CONTATTO → CONFLITTO → SICUREZZA
```

---

## 2. Fase 1 — Approccio

L'abbordaggio può essere **volontario** (ispezione di routine) o **forzato** (pirati, marines, forze dell'ordine).

### 2.1 Abbordaggio Volontario

La nave bersaglio accetta di essere ispezionata. Si procede direttamente alla Fase 2 — Contatto.

**Composizione tipica della squadra di ispezione:**

| Tonnellaggio nave | Squadra |
|---|---|
| 100–1.000 ton | 4–12 persone |
| Con budget militare | 2–4 marines in vacc suit da abbordaggio + robot opzionali |
| Con budget limitato | Equipaggio meno armato/corazzato |

### 2.2 Ispezione di Routine — Modificatori Difficoltà

Il Referee usa questi DM per determinare quanto è rigorosa/probabile un'ispezione:

| Condizione | DM |
|---|---|
| Popolazione 5 o meno | −2 |
| Law Level 0–2 | −2 |
| Law Level 3–5 | −1 |
| Law Level 6–9 | 0 |
| Law Level A+ | +2 |
| Governo 7 o A+ | +1 |
| Base navale presente | +1 |
| Zona Ambra | +2 |
| Zona Rossa | +4 |
| Altri fattori (guerra, pandemia, ecc.) | +1 |

**Check sociali durante l'ispezione:**

| Situazione | Check |
|---|---|
| Impedire l'ispezione con autorità | Difficult (10+) Diplomat (EDU) oppure Average (8+) Diplomat (SOC), 1D minuti |
| Coprire una storia poco convincente | Persuade o Diplomat (SOC) contrapposto a Leadership (SOC) del capitano ispettore |
| Nascondere qualcosa di sospetto | Deception (DEX/INT/SOC) contrapposto a Recon (INT) dell'ispettore |

### 2.3 Abbordaggio Forzato

Richiede che l'aggressore abbia **Thrust uguale o superiore** al bersaglio.

Se il bersaglio tenta di fuggire, si applica la fase di Approccio del combattimento spaziale (Core Rulebook). Se il bersaglio è sconfitto o immobilizzato, si procede alla Fase 2.

> **Microjump o fuga riuscita:** Termina immediatamente la fase di Approccio — l'abbordaggio fallisce.

---

## 3. Fase 2 — Contatto

Le navi si agganciano e viene creato un punto di ingresso. Esistono tre metodi principali.

### 3.1 Aggancio ad Airlock

Metodo più semplice. Le due navi maneggiano gli airlock di prua/fiancata. Se la nave bersaglio coopera, si entra liberamente. Se non coopera, la porta va forzata.

**Forzare un airlock con attrezzi meccanici:**

- **Formidable (14+) Mechanic** (STR), 2D round
- Dopo il check: ulteriori 1D round per aprire completamente lo sportello

**Forzare un portello di manutenzione o portellone di carico:**

- **Very Difficult (12+) Mechanic** (STR), 2D round
- Più facile dell'airlock ma rischio di **decompressione esplosiva** se il compartimento non è stato evacuato

> ⚠️ **Booby trap:** Un capitano che prevede l'abbordaggio può preparare trappole sull'airlock (vedi High Guard p.85).

### 3.2 Tubo da Breccia (Breaching Tube)

Crea un passaggio sigillato direttamente nello scafo nemico. Nessun rischio di decompressione. Tempo di taglio: **meno di 2 minuti** su scafi non corazzati — spesso prima che l'equipaggio nemico riesca a reagire e posizionarsi.

Se il punto di entrata è in una zona disabitata, la squadra può essere già a bordo prima che l'equipaggio nemico sappia dove sia avvenuta la breccia.

### 3.3 Forced Linkage Apparatus

Dispositivo specializzato che aggancia meccanicamente le due navi. Previene manovre evasive della nave bersaglio e fornisce **DM**[^1] **+2** a tutti i check successivi della Fase di Contatto.

**Agganciare un airlock con forced linkage:**

- **Average (8+) Pilot** (DEX)

### 3.4 Navi in Rotazione (Tumbling Ships)

Una nave può deliberatamente mettersi in rotazione per rendere difficile l'abbordaggio.

**Entrare/mantenere la rotazione:**

- **Routine (6+) Pilot** (DEX), D3 round
- Durante la rotazione la nave **non può manovrare**
- L'abbordaggio è ancora possibile ma con **DM −1** a tutti i check di Contatto

**Correggere la rotazione (dalla nave bersaglio):**

- **Average (8+) Pilot** (DEX) con DM negativo pari alla gravità della rotazione
- Se fallisce: il valore dell'Effetto negativo diventa la nuova gravità della rotazione

**Fermare la rotazione con speronamento controllato (nave assalitrice):**

- **Difficult (10+) Pilot** (DEX)
- Se fallisce: **3D danni** a entrambe le navi (dado = 2 + Effetto negativo come positivo)

### 3.5 Taglio dello Scafo

Usare uno strumento da taglio per creare una breccia nello scafo o in una porta.

**Check:** Average (8+) Mechanic (DEX)

Ogni round, lo strumento riduce la **Resilienza** del componente bersaglio di:

> **Cut Rate + Effetto del check**

**Tabella Strumenti da Taglio:**

| Strumento | TL | Cut Rate | Costo |
|---|---|---|---|
| Emergency Cutter | 10 | 1 | Cr 1.000 |
| Rescue Cutter | 9 | 3 | Cr 3.000 |
| Heavy-Duty Cutter | 11 | 6 | Cr 5.000 |
| Assault Cutter | 12 | 8 | Cr 6.000 |
| Versione avanzata (+2 TL) | — | +2 | +25% costo |

**Tabella Resilienza Componenti Nave:**

| Componente | Resilienza (bloccare accesso) | Resilienza (breccia praticabile) |
|---|---|---|
| Portello, nave non corazzata | 4 | 15 |
| Airlock, nave non corazzata | 6 | 25 |
| Portello, nave corazzata | 6 + 1/punto Armatura | 25 + 1/punto Armatura |
| Airlock, nave corazzata | 10 + 1/punto Armatura | 35 + 1/punto Armatura |
| Scafo, nave non corazzata | 50 | 250 |
| Scafo, nave corazzata | 100 + 10/punto Armatura | 400 + 20/punto Armatura |

**Breccia nello scafo con armi:**

| Arma | Difficoltà | Note |
|---|---|---|
| Arma a energia | Routine (6+) Gun Combat(energy) (DEX) | Short o Close range |
| Arma a proiettile | Average (8+) Gun Combat(slug) (DEX) | Short o Close range, bersaglio piccolo |

> ⚠️ **Decompressione:** Tagliare uno scafo o un portello senza che il compartimento sia stato evacuato può causare **decompressione esplosiva**. Le navi militari evacuano i comparti prima dell'azione; le navi civili spesso no.

---

## 4. Fase 3 — Conflitto

Una volta a bordo, la squadra di abbordaggio deve combattere o intimidire l'equipaggio per raggiungere gli obiettivi.

### 4.1 Combattere su una Nave

Il combattimento in interni stretti ha caratteristiche uniche:

**Armi:**

- **Pistola snub / laser pistol:** Preferite (tratto Zero-G, nessun rinculo, danno limitato ai sistemi)
- **Fucile di assalto / fucili standard:** DM −2 in spazi stretti
- **Armi pesanti:** DM −4 (praticamente inutilizzabili)
- **Granate:** Legali ma imprevedibili — usano automaticamente la soglia danni 6D+

**Armatura:**

- **Vacc suit da abbordaggio:** Preferita (buona Protezione, movimento libero)
- **Combat environment suit:** Alternativa accettabile (tiene 1D3+1 minuti in vuoto totale)
- **Combat armour:** DM −1 a tutte le azioni fisiche in spazi stretti
- **Battle dress:** DM −2 a tutte le azioni fisiche in spazi stretti

### 4.2 Stacking — Ordine in Coda

Nei corridoi e nei passaggi stretti, i combattenti si trovano inevitabilmente in fila. Il primo della fila è il bersaglio predefinito di tutti gli attacchi.

**Per mirare a un bersaglio che non è il primo della fila:** Roll 2D ≥ 10, altrimenti il primo della fila diventa il bersaglio (poi si tira normalmente per colpirlo).

### 4.3 Colpi Mancati — Dove Finisce il Proiettile

Ogni attacco che **manca** il bersaglio non scompare nel vuoto. Tira 2D:

| 2D | Risultato |
|---|---|
| 1–3 | Il proiettile rimbalza e colpisce un membro casuale della **squadra attaccante** con un tiro di 8+ |
| 4–5 | Il proiettile rimbalza e colpisce un membro casuale della **squadra difendente** con un tiro di 8+ |
| 6–8 | Sistema minore danneggiato (luci, controlli porta, ecc.) |
| 9–10 | Il proiettile si conficca in un elemento non critico (mobili, pannello in legno, ecc.) |
| 11–12 | **Sistema critico danneggiato** (controllo airlock, tubazione carburante, consolle di comando, ecc.) |

> **Paratie corazzate** (vedi High Guard p.43): DM −1 ai tiri sulla tabella dei colpi mancati.

### 4.4 Soglie di Danno ai Sistemi

Il tipo di arma determina la gravità del danno ai sistemi colpiti:

| Danno Arma | Effetto sui sistemi |
|---|---|
| 1–3D | Sistemi minori danneggiati ma riparabili: Average (8+) Mechanic (EDU), 2D minuti, con ricambi. Sistemi critici superficialmente danneggiati ma funzionanti. |
| 4–5D | Sistemi minori distrutti (sostituzione necessaria). Sistemi critici danneggiati ma riparabili: Average (8+) Mechanic (EDU), 1D×10 minuti, con ricambi. |
| 6D+ | Sistemi minori distrutti. Sistemi critici gravemente compromessi, causano problemi aggiuntivi (perdita carburante, scafo violato, controlli offline). Richiedono sostituzione completa. |

> Le granate e le armi con il tratto **Blast** contano automaticamente come 6D+.

### 4.5 Obiettivi Tattici

**Presa completa della nave:** Occorre controllare:

1. **Il Ponte** — da qui si possono disabilitare tutti gli altri sistemi
2. **Sala Macchine (Engineering)** — propulsione, reattore, supporto vitale
3. **Torrette / Fire Control** — sistemi d'arma

**Override locale dei sistemi:**

Una volta che il ponte è in mano alla squadra di abbordaggio, l'equipaggio nemico in altre sezioni può tentare di riprendere il controllo locale:

- **Formidable (14+) Electronics(computers)** (EDU), 1D minuti
- Successo: la sezione riacquista il controllo locale dei propri sistemi (solo quelli di quella sezione — Engineering non controlla le torrette e viceversa)

**Sistemi di sicurezza del ponte:**

- Serrature biometriche, password (bassa TL)
- Intrusion software (Central Supply Catalogue) usato da un operatore con Electronics(computers): DM +1 per ogni livello di TL dell'arma superiore al computer della nave bersaglio

**Obiettivi limitati:** Se lo scopo è recuperare un carico specifico, liberare un prigioniero, o catturare una persona, il ponte non è necessario — ma l'equipaggio nemico può usare i controlli contro la squadra (disattivare la gravità in un compartimento, chiudere porte, ecc.).

### 4.6 Rischio Carburante

Il carburante di idrogeno liquido occupa enorme volume sulle navi. Una tubazione colpita può causare un'esplosione:

**Esplosione in compartimento depressurizzato:** 8D danni, Blast (10), consuma l'intero compartimento (navi < 1.000 ton). L'armatura non sigillata non protegge; l'armatura sigillata nel vuoto protegge completamente.

**Esplosione in compartimento con atmosfera:** **3DD** danni — può porre fine all'abbordaggio eliminando entrambe le squadre.

---

## 5. Fase 4 — Sicurezza

Il conflitto è terminato. Una delle due parti controlla la nave.

**Se vince la squadra di abbordaggio:**

- Raccogliere e identificare i superstiti nemici
- Rimuovere booby trap
- Rimettere in funzione i sistemi critici danneggiati
- La fase termina quando una parte ha pieno controllo della nave

**Se vince l'equipaggio difensore:**

- La fase termina quando tutti i boarder sono stati eliminati, neutralizzati, catturati o respinti

**Nave immobilizzata:** Se la propulsione era già stata disabilitata nella fase di Approccio, l'aggressore sconfitto deve decidere: lasciare la nave alla deriva, distruggerla, o negoziare.

---

## 6. Integrazione con il Core Rulebook

Queste regole **si sovrappongono** alle regole base di abbordaggio del CR (p.175), non le sostituiscono obbligatoriamente. Possibili approcci:

| Situazione | Sistema consigliato |
|---|---|
| Abbordaggio narrativamente rilevante | Questo documento (fasi complete) |
| Abbordaggio di routine/secondario | Regole astratte CR p.175 |
| Ispezione navale con tensione sociale | Fase 1 di questo documento + CR per eventuale conflitto |

---

[^1]: **DM** (*Dice Modifier*) è un modificatore che si somma o sottrae al risultato dei dadi. Può essere fisso (es. DM +2) oppure derivato da una caratteristica del personaggio. Il **DM di una caratteristica** dipende dal suo valore: 0 → DM −3 · 1–2 → DM −2 · 3–5 → DM −1 · 6–8 → DM 0 · 9–11 → DM +1 · 12–14 → DM +2 · 15+ → DM +3.
