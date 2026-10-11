// Service worker di PIC: conserva nel browser i file dell'app, così funziona anche offline.
// Vede solo le richieste dei file dell'app (HTML, CSS, JavaScript, font, icone):
// le immagini dell'utente non vengono mai richieste a un server, quindi non passano di qui.

// Va cambiata a ogni rilascio: il browser installa la nuova versione e cancella la vecchia
const CACHE = 'pic-v0.7';

// File dell'app da scaricare subito, alla prima visita. Il decoder HEIC (vendor/libheif, 2 MB)
// non è nell'elenco: si scarica solo alla prima foto HEIC e da lì resta salvato (vedi "RICHIESTE")
const FILES = [
    './',
    'index.html',
    'industry.css',
    'style.css',
    'i18n.js',
    'zip.js',
    'metadata.js',
    'app.js',
    'heic-worker.js',
    'manifest.webmanifest',
    'fonts/fonts.css',
    'fonts/barlow-400-latin.woff2',
    'fonts/barlow-400-latin-ext.woff2',
    'fonts/barlow-500-latin.woff2',
    'fonts/barlow-500-latin-ext.woff2',
    'fonts/barlow-700-latin.woff2',
    'fonts/barlow-700-latin-ext.woff2',
    'fonts/barlow-condensed-400-latin.woff2',
    'fonts/barlow-condensed-400-latin-ext.woff2',
    'fonts/barlow-condensed-600-latin.woff2',
    'fonts/barlow-condensed-600-latin-ext.woff2',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/maskable-512.png',
    'icons/apple-touch-icon.png',
    'icons/favicon-32.png'
];

// INSTALLAZIONE: scarica tutti i file dell'app. cache: 'reload' evita di copiare versioni
// vecchie dalla cache HTTP del browser.
self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(FILES.map(file => new Request(file, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

// ATTIVAZIONE: cancella le copie delle versioni precedenti e prende subito il controllo della pagina
self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// RICHIESTE: risponde subito con la copia salvata (funziona anche offline) e intanto,
// se c'è rete, scarica la versione aggiornata per la visita successiva
// (strategia "stale-while-revalidate").
self.addEventListener('fetch', function (event) {
    const request = event.request;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    const fromNetwork = fetch(request).then(function (response) {
        if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
        }
        return response;
    });
    // Offline la richiesta di rete fallisce: va bene, si usa la copia salvata
    event.waitUntil(fromNetwork.catch(() => {}));

    event.respondWith(
        caches.match(request, { ignoreSearch: true }).then(cached => cached || fromNetwork)
    );
});
