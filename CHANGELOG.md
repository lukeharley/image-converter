# Changelog

## [0.3] - 2026-10-11

### Aggiunto

- Selezione di più immagini insieme
- Griglia di miniature con nome, peso e stato della conversione di ogni immagine
- Download di tutte le immagini convertite in un unico archivio ZIP, creato senza librerie esterne
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
