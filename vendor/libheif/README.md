# libheif (WebAssembly)

Decoder delle foto HEIC/HEIF (il formato delle foto iPhone), usato da `heic-worker.js`.

| | |
|---|---|
| Pacchetto | [libheif-js](https://github.com/catdad-experiments/libheif-js) 1.23.5 (npm), file `libheif-wasm/libheif-bundle.js` non modificato |
| Libreria | [libheif](https://github.com/strukturag/libheif) 1.23, con il decoder HEVC [libde265](https://github.com/strukturag/libde265) |
| Licenza | GNU LGPL 3.0 (testo completo in `LICENSE`) |
| SHA-256 | `074b2b55ef3de477ba9f794ca381f3f0324c1cba8c91b4af07395f39c22d54cc` |

Il file è la versione "bundle": il codice WebAssembly è incorporato nel JavaScript, quindi
non serve nessuna richiesta di rete per caricarlo (la Content Security Policy resta `connect-src 'none'`).

Come richiesto dalla LGPL, la libreria è distribuita come file separato e non modificato:
chiunque può sostituirlo con un'altra build compatibile. Il codice sorgente è disponibile ai
collegamenti indicati sopra.
