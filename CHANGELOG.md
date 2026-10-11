# Changelog

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
