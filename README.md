# TradeNote · Alert to Log

App web in italiano per il log **Trading Sportivo Pro di Santo Cecala**. Pubblicazione su GitHub Pages senza compilazione o servizi aggiuntivi.

## Uso quotidiano

1. Copia l’alert Telegram, incollalo nell’app e premi **Leggi alert**.
2. Controlla squadre e lega, quindi scegli il mercato effettivamente negoziato.
3. Inserisci quote e minuti eseguiti, stake o responsabilità ed esito.
4. Premi **Copia riga Diario**.
5. Nel file Excel incluso apri **Diario**, seleziona la **cella A della prima riga libera**, dalla riga 8, e incolla normalmente nella griglia.

La riga occupa **A:V**, 22 colonne. Dalla W iniziano le formule. Quote e minuto del segnale restano distinti dalle esecuzioni. Gli alert di esempio non contengono una data: nei dettagli viene proposta quella attuale, da correggere per i trade passati.

Per aggiornare un trade riaprilo nello **Storico** e **sostituisci la riga con lo stesso ID** nel Diario. Una campagna deve raccogliere l’intero mercato sullo stesso conto. Il controllo duplicati confronta partita, giorno, mercato e conto delle schede salvate in questo browser.

## Pubblicare su GitHub Pages

1. Estrai lo ZIP.
2. Crea su GitHub un repository, per esempio `tradenote`. Con GitHub Free scegli un repository pubblico.
3. Carica **il contenuto** della cartella nella radice: `index.html` deve essere alla radice del repository, insieme agli altri file. Conserva cartelle, file Excel e `.nojekyll`.
4. Apri **Settings → Pages**.
5. In **Build and deployment** seleziona **Deploy from a branch**, poi **main** e **/(root)** e salva.
6. Apri il link mostrato da GitHub quando la pubblicazione è completata: il formato per il repository di esempio è `https://TUO-UTENTE.github.io/tradenote/`.

Non serve eseguire `npm install`. Il repository contiene l’app e il log vuoto. I trade inseriti dal telefono restano nel suo browser.

**Android/Chrome:** apri il sito pubblicato, premi **Installa app** oppure usa **⋮ → Installa app / Aggiungi a schermata Home**. Il nome del comando può variare. **iPhone:** Safari → Condividi → Aggiungi a Home. Aprire `index.html` direttamente come file locale non offre l’installazione PWA.

## Excel e Google Sheets

La copia usa tabulazioni e una tabella HTML, con date e numeri in formato italiano. Usa lingua/area geografica **Italia** nel foglio. Seleziona la cella nella griglia senza entrare nell’editor del testo. Su telefono tieni premuto sulla cella A e scegli Incolla. Se tutto finisce in una sola cella, ripeti l’incolla nella griglia. Su desktop puoi anche dividere il testo in colonne con separatore tabulazione.

L’app **prepara gli appunti**, poi incolli nel foglio. Non scrive direttamente in Google Sheets e non può confermare l’avvenuto incolla.

Il log incluso aggiunge **Next Goal**, accetta leghe non presenti nell’elenco e analizza le **prime 30 leghe distinte** del Diario. I totali globali includono tutte le leghe. Mantiene 500 campagne, 1.000 esecuzioni e 300 movimenti predisposti.

## Calcoli

- Back: rischio iniziale = stake. Lay: responsabilità = stake × (quota − 1). Inserendo la responsabilità, lo stake viene ricavato e arrotondato ai centesimi.
- **Più ingressi / Split**: fino a 12 ingressi effettivi, ciascuno con quota, stake e minuto; la quota media è ponderata per gli stake.
- La chiusura standard calcola lo stake opposto per distribuire il P/L sui due esiti. Puoi sostituirlo con lo stake di uscita effettivo nei dettagli.
- Il payoff se la selezione vince somma i guadagni Back e le responsabilità Lay con il rispettivo segno; se perde somma gli stake Lay meno gli stake Back.
- Se i payoff di una chiusura standard differiscono di oltre 0,02 €, correggi gli importi oppure inserisci il risultato effettivo.
- La commissione stimata si applica al profitto positivo complessivo del mercato. La percentuale è modificabile. La commissione effettiva sostituisce la stima; zero è ammesso.
- **Lordo effettivo**: viene sottratta la commissione. **Netto effettivo**: il netto viene conservato e devi specificare anche la commissione, eventualmente zero.
- Per mercati asiatici, rimborsi o regolamenti particolari usa il risultato effettivo.

### Freebet

Una Freebet deve avere payoff non negativi in entrambi i casi. Se è **ancora aperta**, il possibile profitto non viene contabilizzato: il Diario riceve stato Aperto e risultato vuoto. Il rischio massimo storico resta memorizzato.

Le note iniziano con `FREEBET:`. Il log compatibile usa questo prefisso per il **rischio residuo zero**. Usalo solo per una copertura che abbia effettivamente eliminato il rischio.

Quando viene regolata, riapri la stessa scheda, scegli se la selezione vince o perde e aggiorna data/ora di chiusura. Nel Diario sostituisci la stessa riga. Un netto zero viene classificato Flat nelle statistiche.

Le altre uscite parziali con rischio residuo vanno gestite nel foglio Esecuzioni. Il pulsante **Copia esecuzioni** è facoltativo: incolla in Esecuzioni, colonna A, dalla riga 8. La riga Diario esportata resta in modalità manuale e usa già il risultato aggregato.

Il testo originale completo dell’alert viene conservato nello storico e nelle note del Diario, in un’unica cella. I dati del canale restano distinti dai risultati del conto.

## Storico e backup

La bozza si salva automaticamente. Copia o **Salva bozza nello storico** conserva la scheda nel browser. Fino a 500 schede.

**Backup JSON** esporta schede, preferenze e bozza. **Ripristina backup JSON** unisce le schede allo storico: a parità di ID conserva quella più recente. Il ripristino non sostituisce preferenze e bozza corrente; questi dati restano consultabili nel file di backup. L’export TSV contiene solo schede complete, senza intestazione.

I dati restano in `localStorage` sul dispositivo, senza sincronizzazione automatica. Esporta un backup prima di cambiare telefono o cancellare i dati del browser. Non servono accessi Telegram o token.

## Offline e aggiornamenti

La modalità offline diventa disponibile dopo un primo caricamento completo online. Se la rete cade durante il primo caricamento, riapri il sito quando torna disponibile.

Per distribuire un aggiornamento aumenta `CACHE` in `sw.js`. La nuova versione diventa attiva dopo la chiusura delle finestre della versione precedente. Lo storico resta salvato.

## Sorgenti e test

`parser.mjs` legge gli alert. `calculator.mjs` calcola i payoff. `log.mjs` prepara le 22 colonne. `app.js` gestisce interfaccia e storico.

Con Node 20 o successivo: `npm test`. I test coprono i due alert reali, Unicode, Back/Lay, Split, commissioni, Freebet aperte e regolate, errori di input ed export.

Installazione effettiva e appunti sul singolo telefono si verificano dopo la pubblicazione HTTPS.

Riferimenti: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [creazione sito](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [PWA installabili](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [appunti e HTTPS](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText).
