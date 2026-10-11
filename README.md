# image-converter

🌐 **[Prova l'app](https://image-converter.dataentry291.workers.dev/)**

Applicazione web gratuita che permette di convertire, comprimere e ridimensionare immagini direttamente dal browser.

## Requisiti

### Funzionali

- Convertire una o più immagini tra i formati JPG, PNG e WebP
- Ridimensionare le immagini entro un lato lungo massimo, senza mai ingrandirle
- Comprimere le immagini entro un peso massimo (es. per moduli e portali che accettano file fino a 1 MB)
- Scaricare i risultati singolarmente o in un unico archivio ZIP

### Non funzionali

- Utenti: chiunque su internet, gratuita
- Le immagini dell'utente non lasceranno mai il suo dispositivo (app client-side, nessuna richiesta verso altri server, garantito dalla Content Security Policy)
- Deve funzionare da computer e da smartphone

## Roadmap

- v0.1: una immagine, JPG <> PNG ✅
- v0.2: piu' formati (WebP) ✅
- v0.3: piu' immagini insieme, download ZIP ✅
- v0.4: compressione e ridimensionamento ✅
- v0.5: rimozione esplicita dei metadati (EXIF, posizione GPS) e funzionamento offline (PWA)
- v0.6: conversione delle foto iPhone (HEIC → JPG)
