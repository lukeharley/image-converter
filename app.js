// Riferimenti agli elementi della pagina
const fileInput = document.getElementById('file-input');
const dropzone = document.getElementById('dropzone');
const browseBtn = document.getElementById('browse-btn');
const selection = document.getElementById('selection');
const selectionLabel = document.getElementById('selection-label');
const changeBtn = document.getElementById('change-btn');
const formatField = document.getElementById('format-field');
const formatGroup = document.getElementById('format');
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

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Nome leggibile di ogni formato, da mostrare all'utente.
const FORMAT_LABELS = {'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP'};
// Estensione del file per ogni formato.
const FORMAT_EXTENSIONS = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp'};
// Formati che questo browser sa creare.
const OUTPUT_TYPES = ALLOWED_TYPES.filter(canEncode);
// Formato proposto quando non c'è ancora una scelta dell'utente
const DEFAULT_FORMAT = 'image/webp';

// Icone Lucide (tratto 1.5) usate nelle righe di stato
const ICONS = {
    done: '<path d="M20 6 9 17l-5-5"></path>',
    run: '<path d="M21 12a9 9 0 1 1-6.219-8.56"></path>',
    wait: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
    skip: '<path d="M5 12h14"></path>',
    fail: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
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

// Stato iniziale della macchina a stati: VUOTO (non ci fidiamo dell'HTML:
// alcuni browser ripristinano lo stato dopo un ricaricamento).
// Codice eseguito una volta sola, al caricamento.
setEmptyState();

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

// GESTORE DI EVENTO 'change' dei formati: un nuovo formato rende vecchio lo ZIP precedente
// e i file convertiti nelle singole schede, quindi si torna allo stato PRONTO
formatGroup.addEventListener('change', function () {
    if (phase === 'done') {
        clearResults();
        setPhase('ready');
    }
});

/**
 * Separa i file validi da quelli non validi e costruisce la griglia di schede.
 * @param {File[]} files - file scelti o trascinati dall'utente
 */
function handleFiles(files) {
    const valid = files.filter(file => ALLOWED_TYPES.includes(file.type));
    const rejected = files.filter(file => !ALLOWED_TYPES.includes(file.type));

    setEmptyState();
    showRejected(rejected);

    // Nessun file valido (solo file non ammessi): resta in stato VUOTO
    if (valid.length === 0) return;

    items = valid.map(file => ({ file: file, card: createCard(file) }));
    for (const item of items) grid.appendChild(item.card);

    const totalKB = Math.round(valid.reduce((sum, file) => sum + file.size, 0) / 1024);
    selectionLabel.textContent = `${plural(valid.length, 'immagine', 'immagini')} · ${totalKB} KB`;

    fillFormatOptions(new Set(valid.map(file => file.type)));
    setPhase('ready');
}

/**
 * Converte le immagini una alla volta e prepara lo ZIP con i risultati.
 */
async function convertAll() {
    const format = selectedFormat();
    const converted = [];               // file da mettere nello ZIP: {name, blob}
    const usedNames = new Set();        // nomi già usati nello ZIP (CA-19)
    const toConvert = items.filter(item => item.file.type !== format);
    let skipped = 0;
    let failed = 0;

    // Stato IN CORSO: niente doppi clic né cambi di formato durante la conversione
    clearResults();
    setPhase('run');
    for (const item of items) {
        if (item.file.type === format) {
            setStatus(item, 'skip', `Già in ${FORMAT_LABELS[format]}, saltata`);
            skipped++;
        } else {
            setStatus(item, 'wait', 'In attesa');
        }
    }

    for (const [index, item] of toConvert.entries()) {
        showProgress(index, toConvert.length);
        setStatus(item, 'run', 'Conversione…');
        try {
            const blob = await convertImage(item.file, format);
            const name = uniqueName(baseName(item.file.name) + FORMAT_EXTENSIONS[format], usedNames);
            converted.push({ name: name, blob: blob });
            setStatus(item, 'done', `${name} · ${Math.round(blob.size / 1024)} KB`);
            showCardDownload(item, blob, name);
        } catch (error) {
            setStatus(item, 'fail', 'Conversione non riuscita');
            failed++;
        }
    }
    showProgress(toConvert.length, toConvert.length);

    let text = `${plural(converted.length, 'convertita', 'convertite')} in ${FORMAT_LABELS[format]}`;
    if (skipped > 0) text += ` · ${plural(skipped, 'saltata', 'saltate')}`;
    if (failed > 0) text += ` · ${plural(failed, 'non riuscita', 'non riuscite')}`;
    message.replaceChildren(icon(converted.length > 0 ? 'done' : 'fail', 16), text);

    // Un solo file: si scarica direttamente. Più file: un unico ZIP.
    if (converted.length > 0) {
        const single = converted.length === 1;
        const blob = single ? converted[0].blob : await createZip(converted);
        if (downloadLink.href) URL.revokeObjectURL(downloadLink.href);
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = single ? converted[0].name : 'immagini-convertite.zip';
        downloadLabel.textContent = single
            ? `Scarica ${converted[0].name}`
            : `Scarica tutto (ZIP · ${Math.round(blob.size / 1024)} KB)`;
    }

    // Stato CONVERTITO: si può cambiare formato e riconvertire
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
    const locked = phase === 'empty' || phase === 'run';

    dropzone.hidden = phase !== 'empty';
    selection.hidden = phase === 'empty';
    changeBtn.disabled = phase === 'run';

    formatField.classList.toggle('locked', locked);
    for (const input of formatGroup.querySelectorAll('input')) input.disabled = locked;

    convertBtn.hidden = phase === 'done';
    convertBtn.disabled = phase !== 'ready';
    convertLabel.textContent = phase === 'run' ? 'Conversione in corso…' : 'Converti tutto';
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
    clearResults();
    for (const item of items) URL.revokeObjectURL(item.card.querySelector('img').src);
    items = [];
    grid.innerHTML = '';
    selectionLabel.textContent = '';
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
    img.src = URL.createObjectURL(file);
    img.alt = file.name;

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name;

    const meta = document.createElement('div');
    meta.className = 'file-meta text-muted';
    meta.textContent = `${FORMAT_LABELS[file.type]} · ${Math.round(file.size / 1024)} KB`;

    const status = document.createElement('div');
    status.className = 'status';

    // Barra animata, visibile solo mentre questa immagine è in conversione
    const bar = document.createElement('div');
    bar.className = 'card-bar';
    bar.hidden = true;

    const link = document.createElement('a');
    link.className = 'card-download btn btn-ghost';
    link.append(icon('download', 13), 'Scarica');
    link.hidden = true;

    card.append(img, name, meta, status, bar, link);
    return card;
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
}

/**
 * Cancella i risultati della conversione precedente: stati, link delle schede
 * e memoria occupata dai file convertiti.
 */
function clearResults() {
    for (const item of items) {
        setStatus(item, '', '');
        item.card.querySelector('.card-download').hidden = true;
        if (item.downloadUrl) URL.revokeObjectURL(item.downloadUrl);
        item.downloadUrl = null;
    }
}

/**
 * Scrive lo stato della conversione nella scheda di un'immagine, con la sua icona.
 * @param {{card: HTMLLIElement}} item - immagine da aggiornare
 * @param {''|'wait'|'run'|'done'|'skip'|'fail'} kind - tipo di stato ('' = nessuno)
 * @param {string} text - testo da mostrare
 */
function setStatus(item, kind, text) {
    const status = item.card.querySelector('.status');
    status.className = kind ? 'status ' + kind : 'status';
    status.replaceChildren();
    if (kind) status.append(icon(kind, 13), text);
    item.card.querySelector('.card-bar').hidden = kind !== 'run';
}

/**
 * Aggiorna la barra di avanzamento complessiva ("Conversione 2 di 3…").
 * @param {number} done - immagini già elaborate
 * @param {number} total - immagini da convertire
 */
function showProgress(done, total) {
    const pct = total === 0 ? 100 : Math.round(done / total * 100);
    progressLabel.textContent = `Conversione ${Math.min(done + 1, total)} di ${total}…`;
    progressPct.textContent = pct + '%';
    progressFill.style.width = pct + '%';
}

/**
 * Mostra (o nasconde, se la lista è vuota) l'avviso con i file scartati.
 * @param {File[]} rejected - file non validi
 */
function showRejected(rejected) {
    rejectedBox.hidden = rejected.length === 0;
    rejectedCount.textContent = plural(rejected.length, 'file scartato', 'file scartati');
    rejectedNames.textContent = (rejected.length === 1 ? 'non è' : 'non sono')
        + ' JPG, PNG o WebP: ' + rejected.map(file => file.name).join(', ');
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
 * Crea i pulsanti dei formati di destinazione possibili (controllo segmentato).
 * Se tutte le immagini hanno lo stesso formato, quel formato viene escluso;
 * con formati misti compaiono tutti (le immagini già nel formato scelto saranno saltate).
 * Resta scelto il formato precedente, se è ancora disponibile.
 * @param {Set<string>} sourceTypes - formati delle immagini scelte
 */
function fillFormatOptions(sourceTypes) {
    const previous = selectedFormat() || DEFAULT_FORMAT;
    const types = OUTPUT_TYPES.filter(type => !(sourceTypes.size === 1 && sourceTypes.has(type)));
    const chosen = types.includes(previous) ? previous : types[0];

    formatGroup.replaceChildren();
    for (const type of types) {
        const option = document.createElement('label');
        option.className = 'seg-opt';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'format';
        input.value = type;
        input.checked = type === chosen;
        option.append(input, FORMAT_LABELS[type]);
        formatGroup.appendChild(option);
    }
}

/**
 * Converte un'immagine nel formato indicato.
 * Decodifica il file, lo ridisegna su un canvas e lo ricodifica.
 * @param {File} file - immagine originale
 * @param {string} format - tipo MIME di destinazione
 * @returns {Promise<Blob>} l'immagine convertita
 */
async function convertImage(file, format) {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;

    const ctx = canvas.getContext('2d');
    // Il JPG non supporta la trasparenza: senza sfondo bianco diventerebbe nera
    if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();   // libera subito la memoria dell'immagine decodificata

    const blob = await new Promise(resolve => canvas.toBlob(resolve, format));
    if (!blob) throw new Error('Conversione non riuscita');
    return blob;
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
 * Scrive un numero seguito dalla parola al singolare o al plurale ("1 immagine", "3 immagini").
 * @param {number} n - quantità
 * @param {string} singular - parola al singolare
 * @param {string} pluralWord - parola al plurale
 * @returns {string}
 */
function plural(n, singular, pluralWord) {
    return `${n} ${n === 1 ? singular : pluralWord}`;
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
