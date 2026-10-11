# Changelog

## [0.6] - 2026-10-11

### Aggiunto

- Conversione delle foto iPhone (**HEIC/HEIF**) in JPG, PNG o WebP, con ridimensionamento e peso massimo come per gli altri formati
  - Decodifica con il browser se ne è capace (Safari), altrimenti con libheif in WebAssembly, in un worker separato per non bloccare la pagina
  - Il decoder (2 MB) si scarica solo alla prima foto HEIC e poi resta disponibile anche offline
  - La rotazione salvata nel file viene applicata, quindi le foto verticali restano dritte
  - I file `.heic`/`.heif` vengono riconosciuti anche quando il browser non ne indica il tipo (Chrome su Windows)
  - Con sole foto HEIC il formato proposto è JPG
  - Avviso "Contiene la posizione GPS" anche per le foto HEIC; dopo la conversione i metadati non ci sono più
- Riquadro con il nome del formato al posto della miniatura quando il browser non sa mostrare l'originale; dopo la conversione compare l'immagine convertita

## [0.5] - 2026-10-11

### Aggiunto

- Rimozione dei metadati: EXIF (modello, data, **posizione GPS**), XMP, IPTC, commenti e testi incorporati
  - Ogni scheda indica se l'originale contiene la posizione GPS o altri metadati, e poi "Metadati rimossi"
  - Scegliendo lo stesso formato senza limiti, JPG, PNG e WebP vengono ripuliti direttamente nei byte, **senza ricodifica**: pixel identici, nessuna perdita di qualità
  - Le foto ruotate dall'EXIF vengono ricodificate applicando la rotazione ai pixel, così restano dritte
  - Dai JPG vengono tolte anche le immagini aggiuntive in coda (anteprime, mappe HDR), che possono contenere metadati propri
  - Il riepilogo indica a quante immagini sono stati tolti i metadati
- Funzionamento offline e installazione come app (PWA): manifest, icone e service worker che conserva i file dell'app nel browser

### Modificato

- Le immagini nello stesso formato senza metadati vengono saltate ("Già in JPG e senza metadati")
- Content Security Policy aggiornata per manifest e service worker

## [0.4] - 2026-10-11

### Aggiunto

- Ridimensionamento: lato lungo massimo di 2560, 1920, 1280 o 800 pixel, mantenendo le proporzioni; le immagini più piccole non vengono mai ingrandite
- Compressione con peso massimo di 2 MB, 1 MB, 500 KB o 200 KB: per JPG e WebP si cerca la qualità più alta che rientra nel limite, poi se serve si riducono i lati; per il PNG si riducono solo i lati
- Ogni scheda mostra dimensioni finali, peso e risparmio rispetto all'originale; il riepilogo mostra il peso totale prima e dopo
- Avviso nella scheda se un'immagine resta oltre il peso massimo
- Interfaccia in inglese, con pulsante IT/EN per cambiare lingua in qualsiasi momento (anche dopo una conversione, senza perdere i risultati); la lingua iniziale è quella del browser e la scelta viene ricordata
- Numeri con il separatore decimale della lingua ("4,2 MB" in italiano, "4.2 MB" in inglese)
- Descrizione della pagina per i motori di ricerca

### Modificato

- Nuovo nome: **PIC – Private Image Converter**
- Il formato di partenza si può scegliere anche come destinazione, per ridimensionare o comprimere senza convertire
- Le immagini che rispettano già formato, dimensioni e peso vengono saltate senza essere ricodificate
- Qualità di JPG e WebP fissata a 0,9 (prima dipendeva dal browser)

## [0.3.1] - 2026-10-11

### Modificato

- Nuova interfaccia basata sul design system Industry (direzione "Banco di lavoro"): titoli Barlow Condensed, accento acciaio, riquadri con crocini di registro
- La scelta del formato è un controllo segmentato (JPG · PNG · WebP) al posto del menu a tendina
- Stato e avanzamento con icone al posto delle emoji; barra di avanzamento complessiva durante la conversione
- Pulsante "Riconverti" dopo la conversione e "Cambia selezione" per scegliere altre immagini
- I file scartati sono elencati in un avviso dedicato
- Il badge in alto parla esplicitamente delle immagini: "Immagini mai caricate online" su smartphone, "Le tue immagini non lasciano il dispositivo" da 640px in su

### Aggiunto

- Trascinamento delle immagini nella pagina (drag & drop), oltre al pulsante "Sfoglia…"
- Content Security Policy: il browser blocca qualunque richiesta verso altri server

### Corretto

- I font Barlow sono ospitati insieme all'app invece che caricati da Google Fonts: aprire la pagina non invia più l'indirizzo IP del visitatore a Google, e torna valido il requisito "nessuna richiesta di rete"

## [0.3] - 2026-10-11

### Aggiunto

- Selezione di più immagini insieme
- Griglia di miniature con nome, peso e stato della conversione di ogni immagine
- Download di tutte le immagini convertite singolarmente o in un unico archivio ZIP, creato senza librerie esterne
- Gestione dei nomi duplicati nello ZIP ("foto.webp", "foto (2).webp")
- Sfondo a scacchiera nelle miniature per rendere visibili le zone trasparenti
- Link "Scarica" in ogni scheda per scaricare solo alcune immagini convertite
- Download diretto del file, senza ZIP, quando l'immagine convertita è una sola

### Modificato

- I file non validi vengono scartati singolarmente, con il nome indicato nel messaggio
- Le immagini già nel formato scelto vengono saltate e segnalate
- Un'immagine che non si riesce a convertire non blocca le altre

## [0.2] - 2026-10-11

### Aggiunto

- Supporto del formato WebP, sia in ingresso sia in uscita
- Menu a tendina per scegliere il formato di destinazione, senza il formato di partenza
- Rilevamento automatico dei formati che il browser sa creare (feature detection)

### Modificato

- Il messaggio di conversione indica il formato ottenuto
- Le zone trasparenti restano trasparenti nelle conversioni verso PNG e WebP

### Rimosso

- Regola "sempre l'altro formato" della v0.1

## [0.1] - 2026-10-11

### Aggiunto

- Conversione di una singola immagine JPG ⇄ PNG nel browser
- Anteprima dell'immagine e informazioni sul file
- Validazione del formato con messaggio d'errore
- Sfondo bianco per le zone trasparenti nella conversione PNG → JPG
- Download con il nome originale e la nuova estensione
