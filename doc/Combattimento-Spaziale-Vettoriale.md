# Combattimento Spaziale Vettoriale

Sistema alternativo al combattimento a bande di distanza del Core Rulebook. Usa mappe fisiche o VTT con griglia quadrata o esagonale. Richiede più preparazione ma offre realismo fisico e tattica di manovra molto più ricchi.

> **Fonte:** Traveller Companion Update 2024, pp.169–186.

---

## 1. Premessa e Semplificazioni

Il combattimento spaziale del Core Rulebook assume che il Thrust sia una velocità massima per round, non un'accelerazione accumulabile. Questo sistema corregge quel limite: ogni punto di Thrust applicato modifica il **vettore** della nave, che persiste e si accumula tra i round.

**Semplificazioni mantenute per giocabilità:**

- Combattimento in 2D (tutte le navi sullo stesso piano, Z-axis opzionale)
- Pivot istantaneo: una nave può cambiare orientamento senza costo di Thrust
- Nessun effetto gravitazionale (Traveller assume che solo navi Thrust 1 si muovano liberamente in gravità)
- Missili semplificati (non tracciati individualmente salvo eccezioni)

---

## 2. Setup della Mappa

### 2.1 Mappa Fisica vs. VTT

**Mappa fisica:** Ideale per gioco in presenza. Limite: le battaglie ad alta accelerazione possono richiedere aree molto grandi.

**VTT (es. Roll20, Foundry):** Consigliato. Permette zoom a qualsiasi scala, tracking automatico di vettori e distanze, token identificativi per ogni nave e salva di missili.

> **Impostazione consigliata per VTT:** Scala mappa = 648 km per casella. Usare la misurazione euclidea (distanza in linea retta) invece del conteggio casella-per-casella.

### 2.2 Griglia Quadrata vs. Esagonale

Entrambe funzionano. La differenza è solo nel modo in cui si esprime il vettore:

- **Quadrata:** vettore espresso come coppia (X, Y) su assi cartesiani
- **Esagonale:** vettore espresso come coppia (X, Y) con Y orientato su asse nord-est/sud-est

### 2.3 Scala Base

**1 casella = 648 km** — equivale alla distanza percorsa da un'accelerazione di 1G per 6 minuti (durata di un round di combattimento spaziale).

Ogni punto di Thrust applicato in una direzione = +1 alla componente vettoriale in quella direzione.

---

## 3. Struttura del Round

Ogni round dura **6 minuti** di gioco (come da combattimento spaziale standard).

| Fase | Ordine | Descrizione |
|---|---|---|
| **1. Accelerazione** | Iniziativa **inversa** | Ogni nave dichiara e applica il Thrust al proprio vettore |
| **2. Movimento** | Simultaneo | Tutte le navi si muovono del proprio vettore attuale |
| **3. Attacco e Azioni** | Come da CR | Attacchi, EW, riparazioni, ecc. |

> **Perché ordine inverso in Accelerazione?** Chi agisce per ultimo nella fase di accelerazione ha più informazioni sulle manovre nemiche — è un vantaggio tattico che bilancia l'iniziativa più bassa.

---

## 4. Movimento Vettoriale

### 4.1 Il Vettore

Ogni nave ha un **vettore corrente** che indica velocità e direzione. Si registra come coppia di numeri:

- **(3, -2)** = velocità 3 verso Est, velocità 2 verso Sud

Il vettore non si azzera tra i round: **persiste e si accumula**. Una nave ferma che accelera di Thrust 4 verso Est ha vettore (4, 0). Nel round successivo, se non accelera, si muove comunque di 4 caselle verso Est.

### 4.1.1 Thrust come Accelerazione, non Velocità

Questa è la differenza fondamentale rispetto al sistema Core Rulebook:

- **CR:** Thrust = velocità massima per round. Ogni round la nave si muove fino a Thrust spazi, poi riparte da zero.
- **Sistema vettoriale:** Thrust = **accelerazione massima per round**. Ogni round il Thrust modifica il vettore corrente. Il vettore accumulato non si azzera mai.

**Esempio:** nave con Thrust 2 che accelera verso Est per 2 round, poi mantiene la velocità, poi frena.

| Round | Thrust applicato | Vettore risultante | Spazi percorsi quel round |
|---|---|---|---|
| 1 | +2 Est | (2, 0) | 2 |
| 2 | +2 Est | (4, 0) | 4 |
| 3 | nessuno | (4, 0) | 4 |
| 4 | nessuno | (4, 0) | 4 |
| 5 | −2 Est (frenata) | (2, 0) | 2 |
| 6 | −2 Est (frenata) | (0, 0) | 0 — ferma |

Al round 2 la nave percorre **4 spazi** pur avendo Thrust 2 — perché ha accumulato 2 round di accelerazione consecutiva.

> ⚠️ **Per fermarsi occorre frenare.** In assenza di attrito nello spazio, una nave che non applica Thrust contrario continua a muoversi indefinitamente al vettore attuale. Ogni round di accelerazione in una direzione richiede un round di Thrust uguale e contrario per essere annullato.

**Implicazioni tattiche:**

- **Fuga:** Una nave che accelera per 4 round raggiunge velocità 8 (con Thrust 2). Fermarla o inseguirla richiede altrettanti round — non basta avere Thrust superiore se il vantaggio di inerzia è già stato costruito.
- **Intercettazione:** Tagliare la strada a una nave veloce richiede di prevedere la traiettoria con anticipo. Non si intercetta dove il nemico è ora, ma dove sarà.
- **Missili:** Hanno 10 round di Thrust disponibili. Se il bersaglio si è già allontanato abbastanza, o accelera lateralmente più velocemente di quanto il missile possa correggere, i 10 round si esauriscono prima dell'impatto — e il salvo manca.
- **Manovra di inversione:** Per invertire completamente la direzione di marcia a velocità 4 con Thrust 2 servono **4 round** (portare il vettore da +4 a 0) più altri **4 round** per raggiungere velocità 4 nella direzione opposta — totale 8 round solo per girarsi.

### 4.2 Applicare il Thrust (Griglia Quadrata)

Il Thrust disponibile si distribuisce **liberamente** tra le due componenti X e Y (positivo o negativo). Esempi per una nave con Thrust 4:

| Manovra | Thrust X | Thrust Y | Vettore finale (da fermo) |
|---|---|---|---|
| Accelerare verso Est | +4 | 0 | (4, 0) |
| Verso Nord-Ovest | −2 | +2 | (−2, +2) |
| Est con deriva Nord | +3 | +1 | (3, 1) |

> Il Thrust non deve essere distribuito in modo uguale tra X e Y. L'unico vincolo: **la somma dei valori assoluti non può superare il Thrust disponibile** (con griglia esagonale si applicano regole di approssimazione vettoriale).

### 4.3 Applicare il Thrust (Griglia Esagonale)

Stesso principio, con Y orientato su asse nord-est/sud-est invece di nord/sud. L'asse X rimane Est/Ovest.

### 4.4 Asse Z (Opzionale — Combattimento 3D)

Se si usa la terza dimensione, il vettore diventa una tripla: **(X, Y, Z)**.

Il Thrust totale disponibile si distribuisce tra tutte e tre le componenti. Il movimento in Z segue le stesse regole di X e Y.

> **Raccomandazione:** L'asse Z aumenta significativamente la complessità. Usarlo solo se il gruppo è a proprio agio con il sistema 2D.

---

## 5. Bande di Distanza

La distanza tra le navi determina le bande di distanza, calcolate in caselle (distanza euclidea).

| Banda | Distanza in Caselle |
|---|---|
| Adjacent / Close | 0 (stessa casella) |
| Short | 1–2 |
| Medium | 3–15 |
| Long | 16–38 |
| Very Long | 39–77 |
| Distant | 78+ |

> Le navi Adjacent/Close occupano la stessa casella sulla mappa. Short range = circa 1.300–1.600 km.

---

## 6. Scale della Mappa

Per scenari che iniziano a grande distanza (100 diametri pianeta, gigante gassoso, ecc.) è impraticabile mantenere la scala 1:1. Si usano scale maggiorate, che allungano anche la durata del round.

| Scala | Larghezza Casella | Durata Round | Uso consigliato |
|---|---|---|---|
| ×1 | 648 km | 6 minuti | Orbita, combattimento ravvicinato |
| ×10 | 6.480 km | 24 minuti | Satellite orbitale, 100 diametri per mondi piccoli |
| ×100 | 64.800 km | 96 minuti | 100 diametri per mondi grandi, navi veloci |
| ×1.000 | 648.000 km | 6,4 ore | Mondo vicino |
| ×10.000 | 6.480.000 km | 25,6 ore | Gigante gassoso vicino o lontano |

### 6.1 Transizione tra Scale

Quando le navi si avvicinano abbastanza da richiedere una scala inferiore, si ricalcolano le posizioni:

- **Da scala maggiore a minore:** Moltiplica tutte le distanze e i vettori per **2,5** (arrotonda per eccesso).
- **Da scala minore a maggiore:** Dividi tutte le distanze e i vettori per **2,5** (arrotonda al numero intero più vicino).

**Esempio:** Due navi su mappa ×10 a 58.320 km di distanza = 9 caselle. Passando a scala ×1: 9 × 2,5 = 23 caselle di distanza; vettori moltiplicati per 2,5.

---

## 7. Missili nel Combattimento Vettoriale

I missili **non usano la Missile Flight Table** del Core Rulebook. Hanno il proprio vettore e si muovono come le navi.

### 7.1 Lancio

Al lancio, il missile eredita il **vettore attuale della nave che lo ha lanciato**. Poi accelera verso il bersaglio usando il proprio Thrust (10 round di Thrust disponibili).

### 7.2 Tracking

Ogni salvo = **1 token** sulla mappa. Il token registra:

- Nome nave lanciante
- Bersaglio
- Numero missili nella salvo
- Tipo di missile (se non standard)
- Vettore corrente
- **Round di Thrust rimanenti** (parte da 10)

### 7.3 Semplificazione

Se il salvo è lontano dal bersaglio, si traccia solo la velocità (senza posizionare fisicamente il token ogni round). La nave lanciante muove il token nella fase di Movimento. Quando il salvo raggiunge la stessa casella (o adiacente) al bersaglio, si applicano le regole di impatto del Core Rulebook.

---

## 8. Ships That Pass in the Night

Durante la fase di Movimento, due navi possono **trovarsi in Short range** per un breve momento anche se partono e finiscono lontane. In questo caso:

1. Il Referee piazza un **token temporaneo** dove le navi saranno più vicine.
2. Le navi si muovono "a rallentatore" fino al punto di massima vicinanza.
3. In quel momento, qualsiasi nave può dichiarare di **aprire il fuoco** (anche se non è ancora il suo turno normale nella fase di Attacco).
4. Chi aspetta e lascia che il nemico spari prima rischia di subire danni prima di poter rispondere — ma chi aspetta troppo perde l'opportunità di range corta.
5. Risolto il fuoco, il movimento continua.

> Se i percorsi delle navi si **incrociano nella stessa casella nello stesso istante**, il Referee può aprire una singola fase di **Dogfighting** (6 secondi, vedi sezione 9).

---

## 9. Dogfighting nel Combattimento Vettoriale

Due navi entrano in Dogfighting quando terminano il Movimento **nella stessa casella con vettori compatibili** (stessa velocità e direzione, o entrambe ferme).

- Se **entrambe vogliono** il dogfight: si applicano le regole di Dogfighting del Core Rulebook (round da 6 secondi, Pilot contrapposti, ecc.).
- Se **nessuna vuole** il dogfight: le navi si trattano come a Short range.
- Se **una vuole inseguire e l'altra vuole evitare**: check **Pilot (DEX) contrapposto**. Il Thrust inutilizzato (dopo il movimento) può essere convertito in bonus al check (vedi Evasive Action del CR). Se l'inseguitore vince, entra in Dogfighting; se perde, le navi sono a Short range.

---

## 10. Tracking delle Navi

Ogni nave ha una scheda (su carta o VTT) che registra:

- **Nome nave**
- **Vettore corrente:** es. (3, −2)
- **Thrust disponibile** per il round
- **Danni e sistemi compromessi**

Per le mappe fisiche si consiglia matita per i vettori (cambiano ogni round). Per i VTT, aggiornare il token con il vettore nel nome o nelle note.

**Gruppi omogenei:** Un singolo token può rappresentare più navi dello stesso tipo (es. "Caccia Leggeri ×5"), con il numero annotato sul token.

---

## 11. Note di Gioco

- **Vantaggio dell'alto Thrust:** Una nave veloce non si limita a muoversi più lontano — accumula inerzia che il nemico non può ignorare. Intercettare una nave veloce in fuga richiede pianificazione di più round.
- **Fuga:** Scappare è genuinamente difficile se il nemico ha Thrust simile e il vantaggio di inerzia iniziale. Al contrario, una nave che ha accumulato velocità nella direzione opposta può essere irraggiungibile.
- **Missili vs. evasione:** Un missile con 10 round di Thrust può correggere la propria traiettoria per molti round. Una nave che accelera lateralmente può tentare di farglielo mancare, ma è una corsa contro il tempo.
- **Transizione da CR:** Questo sistema è **pienamente compatibile** con tutte le altre regole del Combattimento Spaziale (armi, critical hit, riparazioni, EW). Sostituisce solo il sistema di movimento/bande di distanza.

---
