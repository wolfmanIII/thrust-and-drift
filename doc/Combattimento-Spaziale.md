# Space Combat

---

## 1. Crew Duties

Prima di ingaggiare un combattimento tra navi spaziali è fondamentale stabilire i ruoli dell'equipaggio. **Una sola persona può ricoprire il ruolo di pilota e una sola può ricoprire il ruolo di capitano.** Gli altri ruoli possono essere ricoperti da più membri dell'equipaggio. I membri possono cambiare ruolo durante il combattimento (vedi sezione **Reassignment**).

- **Pilot** → responsabile dello spostamento e delle manovre della nave
- **Captain** → comanda la nave; usa **Tactics(naval)** per il DM all'iniziativa e **Leadership** per la Improve Initiative action
- **Engineer** → responsabile dei motori (J-Drive, M-Drive), del generatore di potenza (Power Plant) e della gestione dei danni
- **Sensor Operator** → responsabile dei dispositivi di guerra elettronica e della tracciatura delle navi nemiche
- **Turret Gunner** → operatore delle armi sulle torrette; ogni torretta richiede il suo gunner
- **Bay Gunner** → operatore delle armi nelle bay; ogni bay richiede il suo gunner
- **Marine** → difende la nave dagli assaltatori o conduce azioni di abbordaggio su navi nemiche
- **Passenger** → nessun ruolo; rimane passivo durante il combattimento

### 1.1 Ruoli Automatizzati

Il computer di bordo, se dotato dei software appropriati, può coprire alcuni ruoli automaticamente:

- **Fire Control** → può agire come gunner o assistere i gunner
- **Auto-Repair** + repair drones → può eseguire damage control
- **Intellect + Expert(engineer – j-drive / m-drive / power)** → può agire come ingegnere
- **Intellect + Expert(pilot)** → può agire come pilota
- **Intellect + Expert(electronics – sensors)** → può agire come sensor operator

---

## 2. Range Bands

Prima di entrare in combattimento è necessario stabilire la distanza tra le navi coinvolte.

| Range Band | Distanza |
| --- | --- |
| Adjacent | 1 km o meno |
| Close | 1–10 km |
| Short | 11–1.250 km |
| Medium | 1.251–10.000 km |
| Long | 10.001–25.000 km |
| Very Long | 25.001–50.000 km |
| Distant | Oltre 50.000 km |

> La maggior parte degli incontri nello spazio inizia a distanza Very Long o Distant, quando i combattenti si individuano per la prima volta.

---

## 3. Round di Combattimento

Il combattimento spaziale usa round da **6 minuti** (non 6 secondi come nel combattimento a terra).

Ogni round si articola in tre fasi, eseguite **in ordine di iniziativa**:

1. **Fase di Manovra** — ogni nave alloca il proprio Thrust al movimento e alle manovre di combattimento
2. **Fase di Attacco** — ogni nave può lanciare attacchi con le proprie armi o condurre azioni di abbordaggio
3. **Fase Azioni** — l'equipaggio esegue azioni speciali (riparazioni, sensori, guerra elettronica, ecc.)

> **Eccezione — Dogfighting:** Quando due navi si trovano a distanza Close o Adjacent (10 km o meno), si usano le regole speciali di Dogfighting con round da **6 secondi** (vedi sezione 9).

---

## 4. Iniziativa

### 4.1 Tactics(Naval) check

Il capitano può eseguire un check **Tactics(Naval)** all'inizio del combattimento. L'effetto del check (positivo o negativo) si aggiunge all'iniziativa della nave.

### 4.2 Initiative check

Formula: **2D6 + Pilot skill + Ship Thrust [+ effetto Tactics(Naval)]**

Chi ha il punteggio più alto agisce per primo. In caso di parità, va prima la nave con il **Thrust più alto**.

### 4.3 Sorpresa

Nello spazio la sorpresa è rarissima. Se però accade, la nave sorpresa **non può compiere nessuna azione nel primo round**.

---

## 5. Fase di Manovra

In ordine di iniziativa, ogni nave alloca il proprio **Thrust** tra movimento e manovre di combattimento.

### 5.1 Movimento

Il pilota decide se avvicinarsi o allontanarsi da navi nemiche. La tabella indica il Thrust necessario per scalare di **un** range band:

| Range Band | Distanza | Thrust Richiesto | Esempio |
| --- | --- | --- | --- |
| Adjacent | 1 km o meno | 1 | Navi agganciate |
| Close | 1–10 km | 1 | Navi vicine / dogfight |
| Short | 11–1.250 km | 2 | Stessa orbita |
| Medium | 1.251–10.000 km | 5 | Superficie → orbita |
| Long | 10.001–25.000 km | 10 | Vicino a un pianeta |
| Very Long | 25.001–50.000 km | 25 | Entro il jump limit |
| Distant | Oltre 50.000 km | 50 | Navi lontane |

- **Avvicinamento reciproco**: i Thrust dedicati al movimento si sommano
- **Fuga**: al Thrust maggiore si sottrae quello minore — la nave più veloce vince

Una nave può spendere Thrust su più round per scalare distanze maggiori.

> Se le navi entrano a distanza Close o Adjacent, si attivano immediatamente le regole di **Dogfighting** (sezione 9).

### 5.2 Manovre di Combattimento

Il Thrust non usato per il movimento può essere usato per le manovre seguenti. Ogni manovra può essere tentata **una sola volta per round**.

#### 5.2.1 Aid Gunners

Il pilota si posiziona lungo un vettore di attacco ottimale per assistere i gunner. Esegue un **Pilot check** per avviare una task chain con i propri gunner.

#### Task Chain

| Risultato del check precedente | DM al check successivo |
| --- | --- |
| Fallito con Effetto −6 o peggio | −3 |
| Fallito con Effetto −2 a −5 | −2 |
| Fallito con Effetto −1 | −1 |
| Riuscito con Effetto 0 | +0 |
| Riuscito con Effetto 1–5 | +1 |
| Riuscito con Effetto 6 o più | +2 |

#### 5.2.2 Docking

Il pilota esegue un **Pilot check**. Se la nave nemica non vuole essere attraccata, i due piloti eseguono check contrapposti — la nave che tenta l'attracco subisce **DM −2**. Se l'attracco va a buon fine, sono possibili azioni di abbordaggio.

---

## 6. Fase di Attacco

Terminata la fase di manovra, in ordine di iniziativa ogni nave può lanciare attacchi. Le armi richiedono un operatore con la skill **Gunner(specializzazione)**.

> **Il pilota** può fare fuoco sulle armi di **una singola torretta** subendo **DM −2** al tiro di attacco. Non può usare armi in bay.

### 6.1 Tiro di Attacco

Formula: **2D6 + Gunner(specializzazione) + DM DEX + DM Aid Gunners + DM Range + DM Arma + DM Dimensione Bersaglio − DM Evasive Action**

#### Modificatori Comuni

| Bonus | DM | Penalità | DM |
| --- | --- | --- | --- |
| Short Range | +1 | Long Range | −2 |
| Pulse Laser | +2 | Very Long Range | −4 |
| Beam Laser | +4 | Distant Range | −6 |
| Per ogni 1.000 ton del bersaglio | +1 (max +6) | — | — |

> Il modificatore dimensione si applica solo contro bersagli di scala spacecraft. Una nave da 6.000+ tonnellate vale DM +6.

### 6.2 Spacecraft Damage Scale

| Attaccante → Bersaglio | DM per colpire | Danno |
| --- | --- | --- |
| Arma Ground → Ground target | +0 | ×1 |
| Arma Ground → Spacecraft target | +2 | ÷10 |
| Arma Spacecraft → Ground target | −2 | ×10 |
| Arma Spacecraft → Spacecraft target | +0 | ×1 |

> La moltiplicazione/divisione avviene **dopo** aver applicato tutti gli altri modificatori al danno, inclusi Effetto dell'attacco e il tratto Destructive. Le armi spacecraft che colpiscono target a terra si considerano con il tratto **Blast 10**.

### 6.3 Armi Spacecraft

Le navi montano **torrette semoventi** o **fisse**. Ogni torretta richiede un Turret Gunner dedicato.

#### 6.3.1 Double e Triple Turrets

Se una torretta monta **2 o 3 armi dello stesso tipo**, tutte sparano insieme con **un solo tiro di attacco**. Per ogni arma aggiuntiva si aggiunge **+1 al danno per ogni dado del profilo dell'arma**.

Esempio: 3 Pulse Laser (2D ciascuno) → 1 tiro, danno **2D+4** (due armi extra × +2 ciascuna).

I Sandcaster funzionano allo stesso modo: **+1 al danno negato per laser** per ogni sandcaster aggiuntivo.

I Missili **non** beneficiano di questo bonus (vedi sezione 8).

#### 6.3.2 Spacecraft Scale Weapons

| Arma | TL | Gittata | Danno | Ton | Costo | Tratti |
| --- | --- | --- | --- | --- | --- | --- |
| Beam Laser | 10 | Medium | 1D | — | MCr0.5 | — |
| Missile Rack | 7 | Special | 4D | — | MCr0.75 | Smart |
| Missile (nucleare) | — | Special | 1DD | — | — | Radiation, Smart |
| Particle Barbette | 11 | Very Long | 4D* | 5 | MCr8 | Radiation |
| Pulse Laser | 9 | Long | 2D | — | MCr1 | — |
| Sandcaster | 9 | Special | Special | — | MCr0.25 | — |

*Dopo aver sottratto l'armatura, moltiplica tutto il danno della Particle Barbette per 3.

> I missili nucleari sono altamente illegali in molte zone dello spazio. Ogni torretta con missile rack tiene 12 missili (Cr250.000 per rifornire; Cr450.000 per i nucleari).

### 6.4 Applicare il Danno

Aggiungi l'**Effetto** dell'attacco al danno tirato, poi sottrai l'**Armatura** della nave bersaglio. Il danno rimanente si sottrae allo **Hull**.

Quando lo Hull raggiunge 0, la nave è **inattiva**: nessuna energia, nessun supporto vitale.

### 6.5 Colpi Critici (Critical Hits)

Un attacco che va a segno con **Effetto 6 o più** e causa danno infligge un **colpo critico** a un sistema vitale.

Severity = Effetto dell'attacco − 5 (Effetto 6 → Severity 1; Effetto 7 → Severity 2; ecc.)

Tira **2D** per determinare il sistema colpito:

#### Critical Hit Location

| 2D | Sistema |
| --- | --- |
| 2 | Sensors |
| 3 | Power Plant |
| 4 | Fuel |
| 5 | Weapon |
| 6 | Armour |
| 7 | Hull |
| 8 | Manoeuvre Drive |
| 9 | Cargo |
| 10 | Jump Drive |
| 11 | Crew |
| 12 | Bridge |

> Se il sistema estratto non è presente sulla nave, ritira il dado.

Se un sistema subisce un secondo colpo critico alla stessa posizione, la nuova Severity è pari al **massimo tra** la Severity del nuovo colpo **e** quella precedente **+1**, applicando immediatamente i nuovi effetti. Una posizione a Severity 6 non può più subire colpi critici: ogni nuovo colpo critico su quella posizione infligge invece **6D danni extra** allo Hull (ignorando l'Armatura).

#### Critical Hit Effects

| Posizione | Severity 1 | Severity 2 | Severity 3 | Severity 4 | Severity 5 | Severity 6 |
| --- | --- | --- | --- | --- | --- | --- |
| Sensors | Tutti i check sui sensori subiscono DM−2 | Sensori inattivi oltre Medium range | Sensori inattivi oltre Short range | Sensori inattivi oltre Close range | Sensori inattivi oltre Adjacent range | Sensori disabilitati |
| Power Plant | Potenza ridotta del 10% | Potenza ridotta del 10% | Potenza ridotta del 50% | Potenza ridotta a 0 | Hull Severity +1. Potenza ridotta a 0 | Hull Severity +1D. Potenza ridotta a 0 |
| Fuel | Perdita 1D ton/ora | Perdita 1D ton/round | Perdita 1D×10% del carburante | Serbatoio distrutto | Serbatoio distrutto, Hull Severity +1 | Serbatoio distrutto, Hull Severity +1D |
| Weapon | Arma casuale subisce DM−1 quando usata | Arma casuale disabilitata | Armi casuali distrutte | Arma casuale esplode, Hull Severity +1 | D3 armi casuali esplodono, Hull Severity +1 | 1D armi casuali esplodono, Hull Severity +1 |
| Armour | Armatura −1 | Armatura −D3 | Armatura −1D | Armatura −1D | Armatura −2D, Hull Severity +1 | Armatura −2D, Hull Severity +1 |
| Hull | Nave subisce 1D danni | Nave subisce 2D danni | Nave subisce 3D danni | Nave subisce 4D danni | Nave subisce 5D danni | Nave subisce 6D danni |
| M-Drive | Check controllo nave DM−1 | Check controllo nave DM−1, Thrust −1 | Check controllo nave DM−1, Thrust −1 | Check controllo nave DM−1, Thrust −1 | Thrust ridotto a 0 | Thrust ridotto a 0, Hull Severity +1 |
| Cargo | 10% del carico distrutto | 1D×10% del carico distrutto | 2D×10% del carico distrutto | Tutto il carico distrutto | Tutto il carico distrutto, Hull Severity +1 | Tutto il carico distrutto, Hull Severity +1 |
| J-Drive | Check per jump drive DM−2 | Jump drive disabilitato | Jump drive distrutto | Jump drive distrutto, Hull Severity +1 | Jump drive distrutto, Hull Severity +1 | Jump drive distrutto, Hull Severity +1 |
| Crew | Occupante casuale subisce 1D danni | Supporto vitale in avaria tra 1D ore | 1D occupanti subiscono 2D danni | Supporto vitale in avaria tra 1D round | Tutti gli occupanti subiscono 3D danni | Supporto vitale in avaria immediata |
| Bridge | Postazione casuale sul bridge disabilitata | Il computer si riavvia; tutto il software inattivo questo round e il prossimo | Computer danneggiato. Bandwidth ridotta del 50% | Postazione casuale distrutta. L'occupante subisce 1D×1D danni | Computer distrutto | Postazione casuale distrutta. L'occupante subisce 1D×1D danni. Hull Severity +1 |

> Il danno extra causato dagli effetti dei colpi critici **ignora l'Armatura** della nave.

### 6.6 Sustained Damage

Ogni volta che la nave perde il **10% del suo Hull iniziale**, subisce automaticamente un colpo critico con **Severity 1** (posizione tirata normalmente).

### 6.7 Called Shots

Una nave a distanza **Short o inferiore** può tentare un colpo mirato con armi a tiro diretto (non missili o siluri).

1. Il tiratore **nomina il sistema bersaglio** prima di effettuare il tiro
2. Il tiro di attacco subisce **DM −2**
3. Se l'attacco ha successo **e** infligge un colpo critico, il tiratore **sceglie** la posizione colpita anziché tirarla a caso

---

## 7. Reactions

Le reazioni si dichiarano **durante la Fase di Attacco**, in risposta a un attacco in arrivo. Possono essere eseguite solo dai membri dell'equipaggio nel ruolo specifico. *(MgT2e CRB p.171)*

### 7.1 Evasive Action (Pilot)

Il pilota dedica **1 punto di Thrust inutilizzato** (non speso nel movimento) per schivare **un** attacco in arrivo. Quell'attacco subisce un **DM negativo pari al livello di Pilot skill del pilota** (fisso — non si moltiplica per il Thrust speso).

- Costa sempre **1 thrust** per attacco schivato
- Ogni punto di Thrust non usato nel movimento può essere usato una volta per schivare un attacco separato
- Il Thrust speso per evasione si accumula sul token: si azzera all'inizio del round successivo

> Esempio: pilota con Pilot 2 e 3 Thrust disponibili → può schivare fino a 3 attacchi separati (1 thrust ciascuno); ogni attaccante colpisce con DM −2.

### 7.3 Point Defence (Gunner)

Un gunner con una torretta a laser (Pulse o Beam) può intercettare missili in arrivo. L'arma usata per Point Defence **non può attaccare** nello stesso round (e viceversa).

Il Point Defence si può tentare **una volta per round**, solo quando una salva sta per effettuare il proprio tiro di attacco.

Il gunner esegue un check **Gunner(turret)** (Average 8+):

Formula: **2D6 + Gunner(turret) + DM DEX [+ DM torretta]**

- Torretta con 2 laser dello stesso tipo: **DM +1**
- Torretta con 3 laser dello stesso tipo: **DM +2**

**L'Effetto del check** indica il numero di missili eliminati dalla salva.

### 7.4 Disperse Sand (Gunner)

Un gunner con una torretta che monta sandcaster può bloccare attacchi laser. Ogni uso del Disperse Sand **consuma un canister di sand**.

Il gunner esegue un check **Gunner(turret)** (Average 8+):

Formula: **2D6 + Gunner(turret) + DM DEX**

Se il check ha successo, per quell'attacco laser l'armatura della nave aumenta di **1D + Effetto del check** [+ 1 per ogni sandcaster aggiuntivo].

> I sandcaster possono essere usati anche contro gruppi di abbordaggio in arrivo: se il check ha successo, ogni membro del gruppo subisce **8D danni** (scala Ground — non moltiplicare per 10).

---

## 8. Missile Combat

I missili non colpiscono istantaneamente: possono richiedere diversi round per raggiungere il bersaglio, ma infliggono danni enormi all'impatto.

### 8.1 Lanciare Missili

I missili usati contro bersagli a distanza **Adjacent o Close** perdono il tratto **Smart** (tempo insufficiente per i sistemi di guida avanzata).

I missili vengono lanciati in **salve**: tutti i missili di una nave contro un singolo bersaglio nello stesso round formano una salva. Thrust effettivo della salva: **10**.

#### Missile Flight

| Distanza | Round all'impatto |
| --- | --- |
| Medium o inferiore | Immediato |
| Long | 1 |
| Very Long | 4 |
| Distant | 10 |

Se la salva non raggiunge il bersaglio entro **10 round**, il carburante si esaurisce e diventa inattiva.

> Le salve lanciate a distanza Distant subiscono **DM −2** al tiro di attacco (carburante quasi esaurito).

### 8.2 Rilevamento del Lancio

Quando una nave lancia missili, le navi nelle vicinanze possono tentare di rilevarli **immediatamente** con un check **Routine (6+) Electronics(sensors)**.

- Se la nave attaccante **non è ancora stata rilevata**, il check diventa **Average (8+)**
- **DM +1** per ogni 10 missili nella salva (max DM +6)

Missili non rilevati possono essere individuati all'inizio di ogni round con un check **Average (8+) Electronics(sensors)**.

### 8.3 Contromisure

Contro una salva di missili in arrivo sono disponibili tre contromisure:

- **Electronic Warfare** (Sensor Operator) — durante la Fase Azioni
- **Flee** (Pilot) — durante la Fase di Manovra
- **Point Defence** (Gunner) — durante la Fase di Attacco, quando la salva sta per colpire

#### 8.3.1 Electronic Warfare (Sensor Operator)

**Durante la Fase Azioni**, il sensor operator può neutralizzare i missili in arrivo verso la propria nave o verso qualsiasi nave entro distanza Close.

Check **Difficult (10+) Electronics(comms)**:

Formula: **2D6 + Electronics(comms) + DM INT**

**L'Effetto del check** indica il numero di missili eliminati dalla salva.

- Può essere tentato più volte su più round (effetti **cumulativi**)
- Una salva può subire Electronic Warfare solo **una volta per round**, indipendentemente da quanti sensor operator sono disponibili

#### 8.3.2 Flee (Pilot)

Il pilota può tentare di aumentare la distanza dalla salva, scalando un range band. Funziona solo se la nave è significativamente più veloce della salva (Thrust 10).

#### 8.3.3 Point Defence (Gunner)

Vedi sezione 7.3.

### 8.4 Missili e Bersagli

Quando la salva raggiunge il bersaglio, esegue il tiro di attacco. Non si usano la Gunner skill né i modificatori di distanza standard:

Formula: **2D6 + [numero di missili nella salva] [− 2 se lanciati da Distant]**

- Il bersaglio può dichiarare **Evasive Action** normalmente
- I missili hanno quasi sempre il tratto **Smart**: si usa il TL del missile o della nave che spara, il maggiore dei due

### 8.5 Impatto

Se il tiro di attacco ha successo, tira il danno di **un singolo missile** (4D) e sottrai l'Armatura. **Non aggiungere l'Effetto al danno.** Moltiplica invece il risultato per l'Effetto del tiro di attacco.

Formula: **Danno finale = max(0, 4D − Armatura) × min(Effetto, missili rimasti)**

- `max(0, …)` impedisce che l'armatura generi danni negativi
- `min(Effetto, missili rimasti)` limita il moltiplicatore al numero di missili ancora nella salva

> Effetto 0 = 0 danni (RAW confermato da CRB Update 2022 FAQ, agosto 2024 — nessuna errata).

---

## 9. Dogfighting

Quando due navi si trovano a distanza **Close o Adjacent** (10 km o meno), si usano le regole di **Dogfighting** invece di quelle standard.

### 9.1 Round e Struttura

I round di dogfighting durano **6 secondi** (come il combattimento a terra). Si usano le normali regole di combattimento tra veicoli (Core Rulebook p. 138), tenendo conto delle differenze di scala danno. Le tre fasi standard del combattimento spaziale (Manovra / Attacco / Azioni) **non si usano** in dogfighting.

Il dogfighting è **automatico** se due navi ostili si trovano a distanza Close o Adjacent e vogliono ingaggiarsi.

### 9.2 Check di Pilotaggio Contrapposto

All'inizio di ogni round, i piloti di entrambe le navi eseguono **Pilot check contrapposti** con i seguenti modificatori:

#### Dogfighting Modifiers

| Condizione | Modificatore |
| --- | --- |
| Nave da 50 ton o più | −1 |
| Nave da 100 ton o più | −2 |
| Per ogni 100 ton oltre le 100 ton | −1 aggiuntivo |
| Per ogni nemico aggiuntivo nel dogfight (dopo il primo) | −1 |
| Thrust della nave dedicato al dogfighting | +1 per punto di Thrust |
| Dogfighting contro veicoli (non navi) | −2 aggiuntivo |

### 9.3 Risultato del Check

**Vittoria**: il vincitore ottiene **DM +2** a tutti i tiri di attacco del round; il perdente subisce **DM −2**. Il vincitore può anche scegliere in quale arco di fuoco posizionare la nave nemica (e in quale dei propri archi si trova rispetto al nemico).

**Parità**: nessuna delle due navi può attaccare l'altra con **armi fisse**. Le armi in torretta possono sparare normalmente.

**Continuazione**: se il dogfight prosegue al round successivo, il vincitore del round precedente applica la **differenza tra i check Pilot** come **DM positivo** al prossimo check contrapposto.

### 9.4 Fuga dal Dogfight

Per fuggire è necessario avere un **Thrust maggiore** del nemico, oppure che il nemico accetti di non inseguire. Se nessuna delle due condizioni è vera, l'unica via d'uscita è vincere il dogfight.

### 9.5 Isolamento del Dogfight

- Navi **nel** dogfight non possono attaccare bersagli **fuori** dal dogfight
- Navi **fuori** dal dogfight non possono attaccare quelle **dentro** (rischio fuoco amico; il Referee può randomizzare i target se i giocatori non si preoccupano di questo)

---

## 10. Fase Azioni (Action Step)

Risolti tutti gli attacchi, i membri dell'equipaggio possono compiere azioni in ordine di iniziativa. Ogni membro può compiere **1 azione** per round, determinata dal proprio ruolo.

Azioni disponibili:

- Improve Initiative (Captain)
- Jump (Engineer)
- Offline System (Engineer)
- Overload Drive (Engineer)
- Overload Plant (Engineer)
- Repair System (Engineer)
- Reload Turret (Gunner)
- Sensor Lock (Sensor Operator)
- Electronic Warfare (Sensor Operator)
- EW — Counter Missile (Sensor Operator)
- Boarding Action (Marine)
- Reassignment (Any)

> **Thrust & Drift — azioni implementate:** Improve Initiative, Overload Drive, Repair System, Reload Turret, Sensor Lock, Electronic Warfare, EW — Counter Missile. Le azioni Jump, Offline System, Overload Plant, Boarding Action e Reassignment sono descritte nel CRB ma non sono implementate nell'app — vanno gestite dal GM fuori sistema.

### 10.1 Improve Initiative (Captain)

Il capitano esegue un **Leadership check**. L'effetto (positivo o negativo) si aggiunge all'iniziativa della nave **solo per il round successivo**.

### 10.2 Jump (Engineer)

Il salto in combattimento segue le regole normali (Core Rulebook p. 157), ma i calcoli di astrogazione devono essere eseguiti in fretta: la difficoltà dei check di Astrogation e Engineer(j-drive) aumenta di un livello per ridurre il tempo a 1D minuti (entro un round di combattimento).

### 10.3 Offline System (Engineer)

L'ingegnere porta fuori linea alcuni sistemi per liberare energia ad altri. Check **Engineer(power)** (1 round, EDU):

Formula: **2D6 + Engineer(power) + DM EDU**

Se il check ha successo, l'ingegnere può spegnere qualsiasi numero di sistemi, liberando la loro quota di alimentazione. Riportarli online richiede un round aggiuntivo.

### 10.4 Overload Drive (Engineer)

Sovraccaricando il motore di manovra, l'ingegnere guadagna Thrust extra. Check **Difficult (10+) Engineer(m-drive)** (1 round, INT):

Formula: **2D6 + Engineer(m-drive) + DM INT**

- Successo: Thrust della nave **+1** per il round successivo
- Effetto −6 o peggio: il motore di manovra subisce un **colpo critico con Severity 1**
- DM **cumulativo −2** per ogni tentativo successivo al primo; rimovibile con manutenzione: Engineer(m-drive) + 1D ore

### 10.5 Overload Plant (Engineer)

Sovraccaricando il generatore di energia, l'ingegnere aumenta la potenza disponibile. Check **Difficult (10+) Engineer(power)** (1 round, INT):

Formula: **2D6 + Engineer(power) + DM INT**

- Successo: Power della nave **+10%** per il round successivo
- Effetto −6 o peggio: il generatore subisce un **colpo critico con Severity 1**
- DM **cumulativo −2** per ogni tentativo successivo al primo; rimovibile con manutenzione: Engineer(power) + 1D ore

### 10.6 Repair System (Engineer)

L'ingegnere tenta una riparazione rapida di un sistema colpito da un colpo critico. Check **Average (8+) Engineer(sistema colpito)** (1 round, INT o EDU):

Formula: **2D6 + Engineer(sistema colpito) + DM INT o EDU − Severity del sistema**

- DM **cumulativo +1** per ogni round consecutivo dedicato alla stessa riparazione
- Se il sistema subisce un **nuovo colpo critico** alla stessa posizione durante la riparazione, si ricomincia da capo (DM accumulato azzerato)
- La riparazione rimuove solo gli **effetti** del colpo critico — non ripristina Hull distrutto o armi distrutte
- La riparazione è temporanea: dura **1D ore**, dopodiché sarà necessaria una riparazione completa fuori combattimento

### 10.7 Reload Turret (Gunner)

Ricarica una torretta con missile rack o sandcaster (1 round). Una torretta in ricarica **non può attaccare** in quel round.

### 10.8 Sensor Lock (Sensor Operator)

Il sensor operator ottiene un aggancio migliorato su un bersaglio nemico. Check **Electronics(sensors)** (Average 8+, INT):

Formula: **2D6 + Electronics(sensors) + DM INT**

Se il check ha successo, tutti gli attacchi della nave contro quel bersaglio ottengono **DM +2** finché il sensor lock non viene interrotto (vedi Electronic Warfare).

### 10.9 Electronic Warfare (Sensor Operator)

Il sensor operator può tentare due tipi di guerra elettronica:

**Disturbo Comunicazioni (Jamming):** check contrapposto **Electronics(comms)** contro il sensor operator della nave nemica.

Formula: **2D6 + Electronics(comms) + DM INT**

Se vince, le comunicazioni della nave nemica vengono disturbate.

**Rompere un Sensor Lock:** check contrapposto **Electronics(sensors)** contro il sensor operator della nave nemica.

Formula: **2D6 + Electronics(sensors) + DM INT**

Se vince, il sensor lock attivo sul bersaglio viene interrotto.

### 10.10 Boarding Action (Marine)

Le azioni di abbordaggio sono possibili solo a distanza **Adjacent** (1 km o meno). Il marine guida un gruppo di assalto verso la nave nemica.

Per maggiori dettagli vedi Core Rulebook p. 175.

### 10.11 Reassignment (Any)

Qualsiasi membro dell'equipaggio può cambiare ruolo, perdendo tutte le proprie azioni di questo round. Il nuovo ruolo è attivo dal round successivo.

---

## 11. Sensori

### 11.1 Sensor Target

| Range | Visual | Thermal | EM | Active Radar/Lidar | Passive Radar/Lidar | NAS | Densitometer |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Adjacent | Full | Full | Full | Full | Limited | Full | Full |
| Close | Full | Full | Full | Full | Limited | Limited | Full |
| Short | Full | Full | Full | Limited | Minimal | Minimal | Limited |
| Medium | Limited | Limited | Limited | Limited | Minimal | None | Minimal |
| Long | Limited | Limited | Minimal | Minimal | None | None | None |
| Very Long | Minimal | Minimal | Minimal | Minimal | None | None | None |
| Distant | Minimal | Minimal | None | None | None | None | None |

### 11.2 Sensor Detail

| Dettaglio | Visual | Thermal | EM | Active Radar/Lidar | NAS | Densitometer |
| --- | --- | --- | --- | --- | --- | --- |
| Full | Dettagli fini | Gradienti di temperatura fini, sorgenti di calore individuali sull'esterno | Sistemi individuali | Dettagli fini | Attività cerebrale individuale | Dettagli fini |
| Limited | Forma e struttura | Zone calde/fredde | Sorgenti EM potenti | Forma e struttura | Livello di attività | Struttura interna |
| Minimal | Profilo di base | Caldo/freddo generale | Presenza o assenza di attività | Profilo di base | Presenza o assenza di attività | Struttura esterna |

---
