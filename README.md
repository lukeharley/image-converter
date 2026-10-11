# PIC – Private Image Converter

🌐 **[Prova l'app](https://image-converter.dataentry291.workers.dev/)**

Il convertitore di immagini privato: converte, ridimensiona e comprime immagini (anche le foto iPhone in HEIC) direttamente nel browser, anche più file insieme e anche offline. Toglie dalle foto la posizione GPS e gli altri metadati. Le immagini non vengono mai caricate online.

*Private image converter: convert, resize and compress images (iPhone HEIC photos too) right in your browser, even many files at once and even offline. Removes GPS location and other metadata. Your images are never uploaded.*

## Requisiti

### Funzionali

- Convertire una o più immagini tra i formati JPG, PNG e WebP, e convertire le foto iPhone (HEIC/HEIF) in questi formati
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
- v0.6: conversione delle foto iPhone (HEIC → JPG) ✅
- v0.7: profili rapidi, impostazioni ricordate, incolla con Ctrl+V, avviso di nuova versione, intestazioni di sicurezza, accessibilità (contrasto WCAG AA) ✅
- v0.8: qualità
  - test automatici nel repository ed esecuzione a ogni pull request (GitHub Actions)
  - limite del canvas su iPhone/Safari (circa 16,7 megapixel): riduzione automatica con avviso per le foto più grandi
- v0.9: nuove funzioni
  - immagini → PDF (un unico documento, senza librerie esterne)
  - confronto prima/dopo con cursore e zoom
  - rinomina in blocco (es. `vacanze-001.jpg`)
- v1.0: pubblicazione
  - pagine dedicate in italiano e inglese per le ricerche più comuni (`hreflang`)
  - dominio proprio
  - pagina "Verifica la privacy" e informativa privacy
  - codice open source con licenza

### Dopo la v1.0

- `app.js` diviso in moduli ES
- Elaborazione in parallelo in più worker (OffscreenCanvas)
- Codec migliori in WebAssembly (MozJPEG, AVIF)
- Ritaglio, rotazione e formati per social e fototessere
- Condivisione (Web Share API) e "Condividi con PIC" dalla galleria (Web Share Target)
- Statistiche d'uso senza tracciamento né cookie
- Proporre al design system Industry le correzioni di contrasto (oggi applicate in `style.css`)

## Note per i rilasci

- A ogni nuova versione va aggiornata la costante `CACHE` in `sw.js` (es. `pic-v0.6`): così i browser che hanno installato l'app scaricano i file nuovi e cancellano quelli vecchi.
- Ogni file nuovo dell'app va aggiunto anche all'elenco `FILES` di `sw.js`, altrimenti offline non sarà disponibile.
- Le intestazioni di sicurezza (CSP, protezione dal clickjacking) sono in `_headers`, letto da Cloudflare. Se si aggiunge una risorsa di un nuovo tipo, va aggiornata la CSP sia lì sia nel `<meta>` di `index.html`.
- Eccezione voluta: il decoder HEIC (`vendor/libheif/`, 2 MB) non è in `FILES`, per non farlo scaricare a chi non lo usa. Viene salvato alla prima foto HEIC aperta online; da quel momento funziona anche offline.

## Componenti di terze parti

| Componente | Uso | Licenza |
|---|---|---|
| [libheif](https://github.com/strukturag/libheif) (build WebAssembly di [libheif-js](https://github.com/catdad-experiments/libheif-js)) | Decodifica delle foto HEIC/HEIF | LGPL 3.0, vedi `vendor/libheif/` |
| [Barlow](https://github.com/jpt/barlow) | Font dell'interfaccia | SIL OFL 1.1, vedi `fonts/OFL.txt` |
