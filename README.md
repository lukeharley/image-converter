# PIC – Private Image Converter

🌐 **[Prova l'app](https://image-converter.dataentry291.workers.dev/)**

Il convertitore di immagini privato: converte, ridimensiona e comprime immagini direttamente nel browser, anche più file insieme e anche offline. Toglie dalle foto la posizione GPS e gli altri metadati. Le immagini non vengono mai caricate online.

*Private image converter: convert, resize and compress images right in your browser, even many files at once and even offline. Removes GPS location and other metadata. Your images are never uploaded.*

## Requisiti

### Funzionali

- Convertire una o più immagini tra i formati JPG, PNG e WebP
- Ridimensionare le immagini entro un lato lungo massimo, senza mai ingrandirle
- Comprimere le immagini entro un peso massimo (es. per moduli e portali che accettano file fino a 1 MB)
- Scaricare i risultati singolarmente o in un unico archivio ZIP
- Interfaccia in italiano e in inglese, con cambio di lingua in qualsiasi momento
- Rimuovere dalle immagini i metadati (EXIF, posizione GPS, XMP, IPTC, commenti), quando possibile senza ricodificarle
- Funzionare anche senza connessione ed essere installabile come app (PWA)

### Non funzionali

- Utenti: chiunque su internet, gratuita
- Le immagini dell'utente non lasceranno mai il suo dispositivo (app client-side, nessuna richiesta verso altri server, garantito dalla Content Security Policy)
- Deve funzionare da computer e da smartphone

## Roadmap

- v0.1: una immagine, JPG <> PNG ✅
- v0.2: piu' formati (WebP) ✅
- v0.3: piu' immagini insieme, download ZIP ✅
- v0.4: compressione e ridimensionamento ✅
- v0.5: rimozione esplicita dei metadati (EXIF, posizione GPS) e funzionamento offline (PWA) ✅
- v0.6: conversione delle foto iPhone (HEIC → JPG)

## Note per i rilasci

- A ogni nuova versione va aggiornata la costante `CACHE` in `sw.js` (es. `pic-v0.6`): così i browser che hanno installato l'app scaricano i file nuovi e cancellano quelli vecchi.
- Ogni file nuovo dell'app va aggiunto anche all'elenco `FILES` di `sw.js`, altrimenti offline non sarà disponibile.
