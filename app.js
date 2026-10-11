// Riferimenti agli elementi della pagina
const langBtn = document.getElementById('lang-btn');
const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const browseBtn = document.getElementById('browse-btn');
const selection = document.getElementById('selection');
const selectionLabel = document.getElementById('selection-label');
const changeBtn = document.getElementById('change-btn');
const formatField = document.getElementById('format-field');
const formatGroup = document.getElementById('format');
const sizeField = document.getElementById('size-field');
const sizeGroup = document.getElementById('size');
const weightField = document.getElementById('weight-field');
const weightGroup = document.getElementById('weight');
const convertBtn = document.getElementById('convert-btn');
const convertLabel = document.getElementById('convert-label');
const convertArrow = document.getElementById('convert-arrow');
const reconvertBtn = document.getElementById('reconvert-btn');
const downloadLink = document.getElementById('download-link');
const downloadLabel = document.getElementById('download-label');
const progress = document.getElementById('progress');
const progressLabel = document.getElementById('progress-label');
const progressPct = document.getElementById('progress-pct');
const progressFill = document.getElementById('progress-fill');
const message = document.getElementById('message');
const rejectedBox = document.getElementById('rejected');
const rejectedCount = document.getElementById('rejected-count');
const rejectedNames = document.getElementById('rejected-names');
const grid = document.getElementById('grid');

// Formati in cui si può convertire, e formati che si possono aprire (anche le foto iPhone)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const HEIC_TYPES = ['image/heic', 'image/heif'];
const INPUT_TYPES = [...ALLOWED_TYPES, ...HEIC_TYPES];
// Nome leggibile di ogni formato, da mostrare all'utente.
const FORMAT_LABELS = {'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP', 'image/heic': 'HEIC', 'image/heif': 'HEIF'};
// Estensione del file per ogni formato.
const FORMAT_EXTENSIONS = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp'};
// Formati che questo browser sa creare.
const OUTPUT_TYPES = ALLOWED_TYPES.filter(canEncode);
// Formato proposto quando non c'è ancora una scelta dell'utente
const DEFAULT_FORMAT = 'image/webp';

// Lato lungo massimo in pixel (0 = dimensioni originali). Le immagini non vengono mai ingrandite.
const SIZE_OPTIONS = [
    { value: 0, labelKey: 'sizeOriginal' },
    { value: 2560, label: '2560' },
    { value: 1920, label: '1920' },
    { value: 1280, label: '1280' },
    { value: 800, label: '800' }
];
// Peso massimo in byte (0 = nessun limite). Unità decimali (1 MB = 1.000.000 byte):
// sono più severe di quelle binarie (1 MB = 1.048.576 byte), quindi rispettano entrambe.
const WEIGHT_OPTIONS = [
    { value: 0, labelKey: 'weightNone' },
    { value: 2000000, label: '2 MB' },
    { value: 1000000, label: '1 MB' },
    { value: 500000, label: '500 KB' },
    { value: 200000, label: '200 KB' }
];
// Qualità di JPG e WebP: quella normale e la minima accettabile prima di ridurre i lati
const DEFAULT_QUALITY = 0.9;
const MIN_QUALITY = 0.5;
// Se a qualità minima il file è ancora troppo pesante, i lati si riducono di questo fattore
const SHRINK_STEP = 0.85;

// Icone Lucide (tratto 1.5) usate nelle righe di stato
const ICONS = {
    done: '<path d="M20 6 9 17l-5-5"></path>',
    run: '<path d="M21 12a9 9 0 1 1-6.219-8.56"></path>',
    wait: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    skip: '<path d="M5 12h14"></path>',
    fail: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
    pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path><circle cx="12" cy="10" r="3"></circle>',
    info: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path>',
    warn: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>'
};

// Immagini valide scelte dall'utente: per ognuna il file, la sua scheda nella griglia
// e (dopo la conversione) l'indirizzo temporaneo del file convertito
let items = [];
// Stato attuale della macchina a stati: 'empty' | 'ready' | 'run' | 'done'
let phase = 'empty';
// Quanti trascinamenti sono "dentro" la pagina: dragenter e dragleave arrivano
// anche passando da un elemento figlio all'altro, quindi non basta un booleano
let dragDepth = 0;
// Worker che decodifica le foto HEIC (creato solo alla prima foto HEIC) e richieste in attesa
let heicWorker = null;
const heicRequests = new Map();
let heicNextId = 1;
// Dati degli ultimi testi mostrati (riepiloghi, avanzamento, download): servono a
// riscriverli nella nuova lingua quando l'utente la cambia, senza rifare la conversione
const view = { selection: null, progress: null, summary: null, download: null, rejected: [], canDownload: false };

// Testi fissi della pagina nella lingua iniziale
translatePage();

// Pulsante della lingua: passa all'altra lingua e riscrive tutti i testi
langBtn.addEventListener('click', function () {
    setLanguage(language === 'it' ? 'en' : 'it');
    refreshTexts();
});

// Controlli di dimensioni e peso: creati una volta sola, la scelta resta tra una selezione e l'altra
fillSegment(sizeGroup, 'size', SIZE_OPTIONS, 0);
fillSegment(weightGroup, 'weight', WEIGHT_OPTIONS, 0);

// Stato iniziale della macchina a stati: VUOTO (non ci fidiamo dell'HTML:
// alcuni browser ripristinano lo stato dopo un ricaricamento).
// Codice eseguito una volta sola, al caricamento.
setEmptyState();

// Funzionamento offline: il service worker conserva i file dell'app nel browser.
// Fallisce, senza conseguenze, se la pagina è aperta come file locale (file://).
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

// "Sfoglia…" e "Cambia selezione" aprono il selettore di file nascosto
browseBtn.addEventListener('click', () => fileInput.click());
changeBtn.addEventListener('click', () => fileInput.click());

// GESTORE DI EVENTO 'change': eseguito ogni volta che l'utente sceglie dei file.
fileInput.addEventListener('change', function () {
    const files = Array.from(fileInput.files);
    // Svuotato subito: così scegliere di nuovo gli stessi file genera ancora 'change'
    fileInput.value = '';
    // Annulla: resta la selezione precedente
    if (files.length > 0) handleFiles(files);
});

// TRASCINAMENTO: i file si possono lasciare in qualunque punto della pagina.
// Senza preventDefault il browser aprirebbe l'immagine al posto dell'app.
document.addEventListener('dragenter', function (event) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth++;
    dropzone.classList.add('dragover');
});

document.addEventListener('dragover', function (event) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    // Durante la conversione non si accettano nuovi file
    event.dataTransfer.dropEffect = phase === 'run' ? 'none' : 'copy';
});

document.addEventListener('dragleave', function (event) {
    if (!hasFiles(event)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) dropzone.classList.remove('dragover');
});

document.addEventListener('drop', function (event) {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth = 0;
    dropzone.classList.remove('dragover');
    if (phase === 'run') return;
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) handleFiles(files);
});

// GESTORE DI EVENTO 'click': eseguito quando l'utente preme "Converti tutto" o "Riconverti".
convertBtn.addEventListener('click', convertAll);
reconvertBtn.addEventListener('click', convertAll);

// GESTORE DI EVENTO 'change' di formato, dimensioni e peso: una nuova scelta rende vecchio
// lo ZIP precedente e i file convertiti nelle singole schede, quindi si torna allo stato PRONTO
for (const group of [formatGroup, sizeGroup, weightGroup]) {
    group.addEventListener('change', function () {
        if (phase === 'done') {
            clearResults();
            setPhase('ready');
        }
    });
}

/**
 * Separa i file validi da quelli non validi e costruisce la griglia di schede.
 * @param {File[]} files - file scelti o trascinati dall'utente
 */
function handleFiles(files) {
    files = files.map(withDetectedType);
    const valid = files.filter(file => INPUT_TYPES.includes(file.type));
    const rejected = files.filter(file => !INPUT_TYPES.includes(file.type));

    setEmptyState();
    showRejected(rejected);

    // Nessun file valido (solo file non ammessi): resta in stato VUOTO
    if (valid.length === 0) return;

    items = valid.map(file => ({
        file: file,
        card: createCard(file),
        status: { kind: '', key: '', values: {} },
        metadata: inspectMetadata(file),   // Promise: la lettura dei metadati continua in sottofondo
        metadataInfo: null,                // risultato della lettura, quando è pronto
        cleaned: false                     // true se l'ultima elaborazione ha tolto dei metadati
    }));
    for (const item of items) {
        grid.appendChild(item.card);
        item.metadata.then(function (info) {
            item.metadataInfo = info;
            renderMetadataTag(item);
        });
    }

    view.selection = { count: valid.length, bytes: valid.reduce((sum, file) => sum + file.size, 0) };
    renderSelection();

    fillFormatOptions(new Set(valid.map(file => file.type)));
    setPhase('ready');
}

/**
 * Elabora le immagini una alla volta (formato, dimensioni, peso) e prepara lo ZIP con i risultati.
 */
async function convertAll() {
    const format = selectedFormat();
    const maxSide = selectedValue(sizeGroup);
    const maxBytes = selectedValue(weightGroup);
    const converted = [];               // file da mettere nello ZIP: {name, blob}
    const usedNames = new Set();        // nomi già usati nello ZIP (CA-19)
    let bytesBefore = 0;                // peso degli originali delle immagini elaborate
    let skipped = 0;
    let failed = 0;
    let overLimit = 0;
    let cleaned = 0;                    // immagini a cui sono stati tolti dei metadati

    // Stato IN CORSO: niente doppi clic né cambi di opzioni durante l'elaborazione
    clearResults();
    setPhase('run');
    for (const item of items) setStatus(item, 'wait', 'statusWait');

    for (const [index, item] of items.entries()) {
        showProgress(index, items.length);
        setStatus(item, 'run', 'statusRun');
        try {
            const info = await item.metadata;
            const result = await processImage(item.file, format, maxSide, maxBytes, info);
            if (!result) {
                if (item.file.type === format && !maxSide && !maxBytes) {
                    setStatus(item, 'skip', 'statusSkipSame', { format: FORMAT_LABELS[format] });
                } else {
                    setStatus(item, 'skip', 'statusSkipLimits');
                }
                skipped++;
                continue;
            }
            const name = uniqueName(baseName(item.file.name) + FORMAT_EXTENSIONS[format], usedNames);
            converted.push({ name: name, blob: result.blob });
            bytesBefore += item.file.size;
            const values = { name: name, width: result.width, height: result.height,
                bytes: result.blob.size, before: item.file.size, limit: maxBytes };
            // Ogni file prodotto è senza metadati: ricodificato dal canvas, che non li copia,
            // oppure ripulito direttamente nei byte (result.lossless)
            if (info.hasMetadata || !info.parsed) {
                item.cleaned = true;
                cleaned++;
                renderMetadataTag(item);
            }
            if (result.lossless) {
                setStatus(item, 'done', 'statusClean', values);
            } else if (result.fits) {
                setStatus(item, 'done', 'statusDone', values);
            } else {
                setStatus(item, 'warn', 'statusOver', values);
                overLimit++;
            }
            showCardDownload(item, result.blob, name);
        } catch (error) {
            setStatus(item, 'fail', 'statusFail');
            failed++;
        }
    }
    showProgress(items.length, items.length);

    view.summary = {
        converted: converted.length, format: FORMAT_LABELS[format], before: bytesBefore,
        after: converted.reduce((sum, file) => sum + file.blob.size, 0),
        skipped: skipped, overLimit: overLimit, failed: failed, limit: maxBytes, cleaned: cleaned
    };
    renderSummary();

    // Un solo file: si scarica direttamente. Più file: un unico ZIP.
    if (converted.length > 0) {
        const single = converted.length === 1;
        const blob = single ? converted[0].blob : await createZip(converted);
        if (downloadLink.href) URL.revokeObjectURL(downloadLink.href);
        downloadLink.href = URL.createObjectURL(blob);
        view.download = single ? { name: converted[0].name } : { bytes: blob.size };
        renderDownload();
    }

    // Stato CONVERTITO: si può cambiare opzioni e riconvertire
    setPhase('done', converted.length > 0);
}

/**
 * Mostra e nasconde le parti dell'interfaccia in base allo stato della macchina a stati.
 * VUOTO → PRONTO → IN CORSO → CONVERTITO (e da CONVERTITO di nuovo PRONTO o IN CORSO).
 * @param {'empty'|'ready'|'run'|'done'} newPhase - stato in cui entrare
 * @param {boolean} [canDownload=false] - nello stato CONVERTITO: c'è qualcosa da scaricare?
 */
function setPhase(newPhase, canDownload = false) {
    phase = newPhase;
    view.canDownload = canDownload;
    const locked = phase === 'empty' || phase === 'run';

    dropzone.hidden = phase !== 'empty';
    selection.hidden = phase === 'empty';
    changeBtn.disabled = phase === 'run';

    for (const field of [formatField, sizeField, weightField]) {
        field.classList.toggle('locked', locked);
        for (const input of field.querySelectorAll('input')) input.disabled = locked;
    }

    convertBtn.hidden = phase === 'done';
    convertBtn.disabled = phase !== 'ready';
    convertLabel.textContent = t(phase === 'run' ? 'convertRunning' : 'convertAll');
    convertArrow.hidden = phase !== 'ready';
    reconvertBtn.hidden = phase !== 'done';
    downloadLink.hidden = !(phase === 'done' && canDownload);

    progress.hidden = phase !== 'run';
    message.hidden = phase !== 'done';
}

/**
 * Porta l'interfaccia nello stato VUOTO: nessuna immagine, controlli disabilitati.
 * Libera anche la memoria occupata dalle miniature precedenti.
 */
function setEmptyState() {
    grid.innerHTML = '';   // prima si tolgono le schede, così clearResults non ricarica le miniature
    clearResults();
    for (const item of items) URL.revokeObjectURL(item.card.dataset.thumb);
    items = [];
    view.selection = null;
    renderSelection();
    showRejected([]);
    fillFormatOptions(new Set());
    setPhase('empty');
}

/**
 * Crea la scheda di un'immagine: miniatura, nome, formato e peso, più una riga per lo stato.
 * @param {File} file - immagine scelta dall'utente
 * @returns {HTMLLIElement} la scheda, da inserire nella griglia
 */
function createCard(file) {
    const card = document.createElement('li');
    card.className = 'file-card blueprint';
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
        const mark = document.createElement('i');
        mark.className = 'corner ' + corner;
        card.appendChild(mark);
    }

    const img = document.createElement('img');
    card.dataset.thumb = URL.createObjectURL(file);
    img.src = card.dataset.thumb;
    img.alt = file.name;
    // Il browser non sa mostrare questa immagine (es. HEIC su Chrome): al suo posto un riquadro
    // con il nome del formato, finché non c'è l'immagine convertita da mostrare
    img.addEventListener('error', function () {
        if (img.src === card.dataset.thumb) card.dataset.native = 'no';   // il browser non sa aprire l'originale
        card.classList.add('no-preview');
    });
    img.addEventListener('load', () => card.classList.remove('no-preview'));
    const placeholder = document.createElement('div');
    placeholder.className = 'thumb-placeholder';
    placeholder.textContent = FORMAT_LABELS[file.type];

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name;

    const meta = document.createElement('div');
    meta.className = 'file-meta text-muted';

    // Avviso sui metadati dell'originale (posizione GPS, EXIF), poi "Metadati rimossi"
    const metadataTag = document.createElement('div');
    metadataTag.className = 'metadata-tag';
    metadataTag.hidden = true;

    const status = document.createElement('div');
    status.className = 'status';

    // Barra animata, visibile solo mentre questa immagine è in conversione
    const bar = document.createElement('div');
    bar.className = 'card-bar';
    bar.hidden = true;

    const link = document.createElement('a');
    link.className = 'card-download btn btn-ghost';
    const linkText = document.createElement('span');
    linkText.dataset.i18n = 'download';
    linkText.textContent = t('download');
    link.append(icon('download', 13), linkText);
    link.hidden = true;

    card.append(img, placeholder, name, meta, metadataTag, status, bar, link);
    renderMeta(card, file);
    return card;
}

/**
 * Scrive formato e peso dell'immagine originale nella sua scheda ("JPG · 3,2 MB").
 * @param {HTMLLIElement} card - scheda dell'immagine
 * @param {File} file - immagine originale
 */
function renderMeta(card, file) {
    card.querySelector('.file-meta').textContent = `${FORMAT_LABELS[file.type]} · ${formatBytes(file.size)}`;
}

/**
 * Mostra nella scheda cosa si sa dei metadati dell'immagine: "Contiene la posizione GPS",
 * "Contiene metadati" oppure, dopo l'elaborazione, "Metadati rimossi".
 * @param {{card: HTMLLIElement, metadataInfo: object, cleaned: boolean}} item
 */
function renderMetadataTag(item) {
    const tag = item.card.querySelector('.metadata-tag');
    const info = item.metadataInfo;
    const kind = item.cleaned ? 'removed'
        : info && info.hasGps ? 'gps'
        : info && info.hasMetadata ? 'metadata'
        : '';
    tag.hidden = !kind;
    tag.className = kind ? 'metadata-tag ' + kind : 'metadata-tag';
    tag.replaceChildren();
    if (!kind) return;
    const iconName = { removed: 'shield', gps: 'pin', metadata: 'info' }[kind];
    const key = { removed: 'tagRemoved', gps: 'tagGps', metadata: 'tagMetadata' }[kind];
    tag.append(icon(iconName, 13), t(key));
}

/**
 * Mostra nella scheda il link per scaricare solo quell'immagine convertita.
 * @param {{card: HTMLLIElement, downloadUrl: string}} item - immagine convertita
 * @param {Blob} blob - file convertito
 * @param {string} name - nome con cui scaricarlo
 */
function showCardDownload(item, blob, name) {
    item.downloadUrl = URL.createObjectURL(blob);
    const link = item.card.querySelector('.card-download');
    link.href = item.downloadUrl;
    link.download = name;
    link.hidden = false;
    // Se l'originale non si poteva mostrare, la miniatura diventa l'immagine convertita
    if (item.card.dataset.native === 'no') item.card.querySelector('img').src = item.downloadUrl;
}

/**
 * Cancella i risultati della conversione precedente: stati, link delle schede
 * e memoria occupata dai file convertiti.
 */
function clearResults() {
    for (const item of items) {
        setStatus(item, '', '');
        item.cleaned = false;
        // Miniatura di nuovo sull'originale (se il browser non sa mostrarlo, torna il riquadro)
        const img = item.card.querySelector('img');
        if (item.card.isConnected && img.src !== item.card.dataset.thumb) img.src = item.card.dataset.thumb;
        renderMetadataTag(item);
        item.card.querySelector('.card-download').hidden = true;
        if (item.downloadUrl) URL.revokeObjectURL(item.downloadUrl);
        item.downloadUrl = null;
    }
}

/**
 * Imposta lo stato della conversione di un'immagine e lo mostra nella sua scheda.
 * Lo stato viene ricordato (chiave del testo e dati), così si può riscrivere in un'altra lingua.
 * @param {{card: HTMLLIElement, status: object}} item - immagine da aggiornare
 * @param {''|'wait'|'run'|'done'|'skip'|'warn'|'fail'} kind - tipo di stato ('' = nessuno)
 * @param {string} key - chiave del testo in TRANSLATIONS ('' = nessun testo)
 * @param {object} [values] - dati da inserire nel testo
 */
function setStatus(item, kind, key, values = {}) {
    item.status = { kind: kind, key: key, values: values };
    renderStatus(item);
}

/**
 * Mostra nella scheda lo stato ricordato dell'immagine, con la sua icona.
 * @param {{card: HTMLLIElement, status: object}} item - immagine da aggiornare
 */
function renderStatus(item) {
    const { kind, key, values } = item.status;
    const status = item.card.querySelector('.status');
    status.className = kind ? 'status ' + kind : 'status';
    status.replaceChildren();
    if (kind) status.append(icon(kind, 13), t(key, values));
    item.card.querySelector('.card-bar').hidden = kind !== 'run';
}

/**
 * Aggiorna la barra di avanzamento complessiva ("Conversione 2 di 3…").
 * @param {number} done - immagini già elaborate
 * @param {number} total - immagini da convertire
 */
function showProgress(done, total) {
    view.progress = { current: Math.min(done + 1, total), total: total };
    renderProgress();
    const pct = total === 0 ? 100 : Math.round(done / total * 100);
    progressPct.textContent = pct + '%';
    progressFill.style.width = pct + '%';
}

/**
 * Mostra (o nasconde, se la lista è vuota) l'avviso con i file scartati.
 * @param {File[]} rejected - file non validi
 */
function showRejected(rejected) {
    view.rejected = rejected.map(file => file.name);
    renderRejected();
}

/**
 * Scrive il riepilogo della selezione ("3 immagini · 4,2 MB"), vuoto se non c'è selezione.
 */
function renderSelection() {
    selectionLabel.textContent = view.selection ? t('selection', view.selection) : '';
}

/**
 * Scrive il testo della barra di avanzamento ("Elaborazione 2 di 3…").
 */
function renderProgress() {
    progressLabel.textContent = view.progress ? t('progress', view.progress) : '';
}

/**
 * Scrive l'esito della conversione, con l'icona di successo o di errore.
 */
function renderSummary() {
    if (!view.summary) return;
    message.replaceChildren(icon(view.summary.converted > 0 ? 'done' : 'fail', 16), t('summary', view.summary));
}

/**
 * Scrive il testo e il nome del file del pulsante di download principale.
 */
function renderDownload() {
    if (!view.download) return;
    const single = Boolean(view.download.name);
    downloadLink.download = single ? view.download.name : t('zipName');
    downloadLabel.textContent = t(single ? 'downloadOne' : 'downloadAll', view.download);
}

/**
 * Mostra (o nasconde, se non ce ne sono) l'avviso con i file scartati.
 */
function renderRejected() {
    const count = view.rejected.length;
    rejectedBox.hidden = count === 0;
    rejectedCount.textContent = t('rejectedCount', { count: count });
    rejectedNames.textContent = t('rejectedNames', { count: count, names: view.rejected.join(', ') });
}

/**
 * Riscrive nella lingua attiva tutti i testi che dipendono dai dati: opzioni,
 * pulsanti, riepiloghi, stati delle schede. I file convertiti e i link restano validi.
 */
function refreshTexts() {
    fillSegment(sizeGroup, 'size', SIZE_OPTIONS, selectedValue(sizeGroup));
    fillSegment(weightGroup, 'weight', WEIGHT_OPTIONS, selectedValue(weightGroup));
    setPhase(phase, view.canDownload);   // riapplica lo stato ai pulsanti appena ricreati
    renderSelection();
    renderProgress();
    renderSummary();
    renderDownload();
    renderRejected();
    for (const item of items) {
        renderMeta(item.card, item.file);
        renderMetadataTag(item);
        renderStatus(item);
    }
}

/**
 * Crea un'icona SVG del set Lucide.
 * @param {keyof ICONS} name - nome dell'icona
 * @param {number} size - lato in pixel
 * @returns {SVGSVGElement}
 */
function icon(name, size) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = ICONS[name];
    return svg;
}

/**
 * Indica se un evento di trascinamento porta dei file (e non, ad esempio, del testo).
 * @param {DragEvent} event
 * @returns {boolean}
 */
function hasFiles(event) {
    return event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files');
}

/**
 * Restituisce il formato di destinazione scelto.
 * @returns {string} tipo MIME (es. 'image/webp')
 */
function selectedFormat() {
    const checked = formatGroup.querySelector('input:checked');
    return checked ? checked.value : '';
}

/**
 * Restituisce il valore numerico scelto in un controllo segmentato (dimensioni o peso).
 * @param {HTMLElement} group - il controllo segmentato
 * @returns {number} 0 se non c'è limite
 */
function selectedValue(group) {
    const checked = group.querySelector('input:checked');
    return checked ? Number(checked.value) : 0;
}

/**
 * Crea le opzioni di un controllo segmentato (un gruppo di pulsanti radio).
 * @param {HTMLElement} group - contenitore del controllo
 * @param {string} name - nome comune dei pulsanti radio
 * @param {{value: (string|number), label: string, labelKey: string}[]} options - opzioni da mostrare
 *   (labelKey al posto di label per i testi da tradurre)
 * @param {string|number} chosen - valore da selezionare
 */
function fillSegment(group, name, options, chosen) {
    group.replaceChildren();
    for (const option of options) {
        const label = document.createElement('label');
        label.className = 'seg-opt';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = name;
        input.value = option.value;
        input.checked = option.value === chosen;
        label.append(input, option.labelKey ? t(option.labelKey) : option.label);
        group.appendChild(label);
    }
}

/**
 * Crea i pulsanti dei formati di destinazione (controllo segmentato).
 * Compaiono tutti i formati che il browser sa creare (non l'HEIC, che si può solo aprire):
 * anche quello di partenza, perché
 * dalla v0.4 si può ridimensionare o comprimere senza cambiare formato.
 * Resta scelto il formato precedente; se però tutte le immagini sono già in quel formato,
 * se ne propone un altro (scegliere lo stesso formato ha senso solo con dimensioni o peso).
 * @param {Set<string>} sourceTypes - formati delle immagini scelte
 */
function fillFormatOptions(sourceTypes) {
    const previous = selectedFormat() || DEFAULT_FORMAT;
    const allSame = sourceTypes.size === 1 && sourceTypes.has(previous);
    const allHeic = sourceTypes.size > 0 && [...sourceTypes].every(type => HEIC_TYPES.includes(type));
    // Le foto iPhone si convertono quasi sempre in JPG, il formato che si apre ovunque
    const chosen = allHeic ? 'image/jpeg'
        : allSame || !OUTPUT_TYPES.includes(previous)
            ? OUTPUT_TYPES.find(type => !sourceTypes.has(type)) || OUTPUT_TYPES[0]
            : previous;
    fillSegment(formatGroup, 'format', OUTPUT_TYPES.map(type => ({ value: type, label: FORMAT_LABELS[type] })), chosen);
}

/**
 * Elabora un'immagine: la porta nel formato indicato e, se richiesto, entro un lato
 * massimo e un peso massimo.
 * @param {File} file - immagine originale
 * @param {string} format - tipo MIME di destinazione
 * @param {number} maxSide - lato lungo massimo in pixel (0 = nessun limite)
 * @param {number} maxBytes - peso massimo in byte (0 = nessun limite)
 * @param {{hasMetadata: boolean, parsed: boolean, orientation: number}} info - metadati dell'originale
 * @returns {Promise<{blob: Blob, width: number, height: number, fits: boolean, lossless: boolean}|null>}
 *   il risultato (fits = false se il peso massimo non è raggiungibile; lossless = true se
 *   sono stati tolti solo i metadati, senza ricodificare), oppure null se l'immagine
 *   rispetta già tutto, non ha metadati e non serve toccarla
 */
async function processImage(file, format, maxSide, maxBytes, info) {
    const bitmap = await decodeImage(file);
    try {
        const longSide = Math.max(bitmap.width, bitmap.height);
        let scale = maxSide > 0 ? Math.min(1, maxSide / longSide) : 1;

        // Stesso formato, nessun ridimensionamento e peso già nei limiti: ricodificare
        // peggiorerebbe solo la qualità. Se ci sono metadati, si tolgono direttamente dai byte.
        if (format === file.type && scale === 1 && (!maxBytes || file.size <= maxBytes)) {
            if (info.parsed && !info.hasMetadata) return null;
            const clean = await stripMetadata(file, info);
            if (clean) return { blob: clean, width: bitmap.width, height: bitmap.height, fits: true, lossless: true };
            // Non si può fare senza ricodifica (es. foto ruotata dall'EXIF): si prosegue
            // con il canvas, che applica la rotazione ai pixel e non copia i metadati
        }

        let result = null;
        while (true) {
            const width = Math.max(1, Math.round(bitmap.width * scale));
            const height = Math.max(1, Math.round(bitmap.height * scale));
            const canvas = drawImage(bitmap, width, height, format);
            const blob = maxBytes ? await encodeWithin(canvas, format, maxBytes) : await encode(canvas, format, DEFAULT_QUALITY);
            result = { blob: blob, width: width, height: height, fits: !maxBytes || blob.size <= maxBytes, lossless: false };
            // Riuscito, oppure non ha più senso rimpicciolire: ci si ferma
            if (result.fits || Math.max(width, height) <= 64) return result;
            scale *= SHRINK_STEP;
        }
    } finally {
        bitmap.close();   // libera subito la memoria dell'immagine decodificata
    }
}

/**
 * Decodifica un'immagine. JPG, PNG e WebP li decodifica il browser; le foto HEIC le
 * decodifica il browser se ne è capace (Safari), altrimenti libheif in un worker.
 * @param {File} file
 * @returns {Promise<ImageBitmap>} l'immagine, già ruotata come va mostrata
 */
async function decodeImage(file) {
    try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (error) {
        if (!HEIC_TYPES.includes(file.type)) throw error;
        return decodeHeic(file);
    }
}

/**
 * Decodifica una foto HEIC con libheif, nel worker heic-worker.js.
 * Il worker viene creato alla prima foto HEIC: chi non ne usa non scarica la libreria (2 MB).
 * @param {File} file
 * @returns {Promise<ImageBitmap>}
 */
async function decodeHeic(file) {
    if (!heicWorker) {
        heicWorker = new Worker('heic-worker.js');
        heicWorker.addEventListener('message', function (event) {
            const request = heicRequests.get(event.data.id);
            heicRequests.delete(event.data.id);
            if (event.data.error) request.reject(new Error(event.data.error));
            else request.resolve(event.data);
        });
        // Il worker non si è potuto avviare: falliscono le richieste in attesa, alla prossima si riprova
        heicWorker.addEventListener('error', function () {
            for (const request of heicRequests.values()) request.reject(new Error('Decoder HEIC non disponibile'));
            heicRequests.clear();
            heicWorker.terminate();
            heicWorker = null;
        });
    }
    const buffer = await file.arrayBuffer();
    const decoded = await new Promise(function (resolve, reject) {
        const id = heicNextId++;
        heicRequests.set(id, { resolve: resolve, reject: reject });
        heicWorker.postMessage({ id: id, buffer: buffer }, [buffer]);   // byte trasferiti, non copiati
    });
    const pixels = new ImageData(new Uint8ClampedArray(decoded.pixels), decoded.width, decoded.height);
    return createImageBitmap(pixels);
}

/**
 * Disegna l'immagine su un canvas delle dimensioni indicate.
 * @param {ImageBitmap} bitmap - immagine decodificata
 * @param {number} width - larghezza finale
 * @param {number} height - altezza finale
 * @param {string} format - tipo MIME di destinazione
 * @returns {HTMLCanvasElement}
 */
function drawImage(bitmap, width, height, format) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    // Il JPG non supporta la trasparenza: senza sfondo bianco diventerebbe nera
    if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingQuality = 'high';   // rimpicciolimento più nitido
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas;
}

/**
 * Codifica il canvas nel formato indicato.
 * @param {HTMLCanvasElement} canvas
 * @param {string} format - tipo MIME
 * @param {number} quality - qualità da 0 a 1 (ignorata dal PNG, che non perde dati)
 * @returns {Promise<Blob>}
 */
async function encode(canvas, format, quality) {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, format, quality));
    if (!blob) throw new Error('Codifica non riuscita');
    return blob;
}

/**
 * Codifica il canvas con la qualità più alta che rientra nel peso massimo (ricerca binaria).
 * Se nemmeno la qualità minima basta, restituisce il file più leggero ottenuto: sarà
 * processImage a ridurre i lati e riprovare.
 * @param {HTMLCanvasElement} canvas
 * @param {string} format - tipo MIME
 * @param {number} maxBytes - peso massimo in byte
 * @returns {Promise<Blob>}
 */
async function encodeWithin(canvas, format, maxBytes) {
    const first = await encode(canvas, format, DEFAULT_QUALITY);
    // Il PNG non ha una qualità da abbassare; lo stesso se il file è già leggero abbastanza
    if (format === 'image/png' || first.size <= maxBytes) return first;

    const lightest = await encode(canvas, format, MIN_QUALITY);
    if (lightest.size > maxBytes) return lightest;

    // Il limite sta tra MIN_QUALITY e DEFAULT_QUALITY: 6 dimezzamenti danno una precisione di circa 0,006
    let best = lightest;
    let low = MIN_QUALITY;
    let high = DEFAULT_QUALITY;
    for (let step = 0; step < 6; step++) {
        const middle = (low + high) / 2;
        const blob = await encode(canvas, format, middle);
        if (blob.size <= maxBytes) {
            best = blob;
            low = middle;
        } else {
            high = middle;
        }
    }
    return best;
}

/**
 * Assegna il tipo giusto ai file HEIC/HEIF. Molti browser non lo riconoscono (su Windows
 * Chrome lascia il tipo vuoto): in quel caso si guarda l'estensione del nome.
 * @param {File} file
 * @returns {File} lo stesso file, oppure una copia con il tipo corretto (i byte non vengono duplicati)
 */
function withDetectedType(file) {
    if (INPUT_TYPES.includes(file.type)) return file;
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension !== 'heic' && extension !== 'heif') return file;
    return new File([file], file.name, { type: 'image/' + extension, lastModified: file.lastModified });
}

/**
 * Restituisce il nome del file senza estensione ("vacanze.2025.jpg" → "vacanze.2025").
 * @param {string} name - nome originale
 * @returns {string}
 */
function baseName(name) {
    const dotIndex = name.lastIndexOf('.');
    return dotIndex > 0 ? name.slice(0, dotIndex) : name;
}

/**
 * Evita due file con lo stesso nome nello ZIP: "foto.webp" diventa "foto (2).webp".
 * @param {string} name - nome desiderato
 * @param {Set<string>} usedNames - nomi già usati (viene aggiornato)
 * @returns {string} un nome non ancora usato
 */
function uniqueName(name, usedNames) {
    let candidate = name;
    let counter = 2;
    while (usedNames.has(candidate.toLowerCase())) {
        const dotIndex = name.lastIndexOf('.');
        candidate = `${name.slice(0, dotIndex)} (${counter})${name.slice(dotIndex)}`;
        counter++;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
}

/**
 * Scrive un peso in modo leggibile, con il separatore decimale della lingua ("3,2 MB" / "3.2 MB").
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${formatNumber(bytes / 1024 / 1024, 1)} MB`;
}

/**
 * Testo del risultato di un'immagine: nome, dimensioni, peso e risparmio
 * ("foto.webp · 1920×1440 · 783 KB · −88%"). Uguale in tutte le lingue.
 * @param {{name: string, width: number, height: number, bytes: number, before: number}} v
 * @returns {string}
 */
function resultText(v) {
    return `${v.name} · ${v.width}×${v.height} · ${formatBytes(v.bytes)}${savingText(v.before, v.bytes)}`;
}

/**
 * Scrive un limite di peso come appare nei pulsanti ("1 MB", "500 KB").
 * @param {number} bytes - uno dei valori di WEIGHT_OPTIONS
 * @returns {string}
 */
function formatLimit(bytes) {
    const option = WEIGHT_OPTIONS.find(o => o.value === bytes);
    return option ? option.label : formatBytes(bytes);
}

/**
 * Testo del risparmio rispetto all'originale (" · −72%"), vuoto se il file non è più leggero.
 * @param {number} before - peso originale in byte
 * @param {number} after - peso finale in byte
 * @returns {string}
 */
function savingText(before, after) {
    const saving = Math.round((1 - after / before) * 100);
    return saving > 0 ? ` · −${saving}%` : '';
}

/**
 * Verifica se il browser sa CREARE immagini nel formato indicato.
 * Se il formato non è supportato, il browser produce un PNG senza segnalare errori:
 * per questo controlliamo il tipo del risultato invece di fidarci.
 * @param {string} type - tipo MIME da verificare (es. 'image/webp')
 * @returns {boolean} true se il formato è supportato in uscita
 */
function canEncode(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL(type).startsWith('data:' + type);
}
