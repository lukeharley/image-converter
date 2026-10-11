// Riferimenti agli elementi della pagina
const fileInput = document.getElementById('file-input');
const message = document.getElementById('message');
const convertBtn = document.getElementById('convert-btn');
const downloadLink = document.getElementById('download-link');
const formatSelect = document.getElementById('format');
const grid = document.getElementById('grid');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Nome leggibile di ogni formato, da mostrare all'utente.
const FORMAT_LABELS = {'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP'};
// Estensione del file per ogni formato.
const FORMAT_EXTENSIONS = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp'};
// Formati che questo browser sa creare.
const OUTPUT_TYPES = ALLOWED_TYPES.filter(canEncode);

// Immagini valide scelte dall'utente: per ognuna il file e la sua scheda nella griglia
let items = [];
// Riepilogo della selezione, da rimostrare quando l'utente cambia formato
let selectionMessage = '';

// Stato iniziale della macchina a stati: VUOTO (non ci fidiamo dell'HTML:
// alcuni browser ripristinano lo stato dopo un ricaricamento).
// Codice eseguito una volta sola, al caricamento.
setEmptyState();

// GESTORE DI EVENTO 'change': eseguito ogni volta che l'utente sceglie (o annulla) dei file.
// Separa i file validi da quelli non validi e costruisce la griglia di miniature.
fileInput.addEventListener('change', function () {
    const files = Array.from(fileInput.files);
    const valid = files.filter(file => ALLOWED_TYPES.includes(file.type));
    const rejected = files.filter(file => !ALLOWED_TYPES.includes(file.type));

    setEmptyState();

    // Nessun file valido (Annulla, oppure solo file non ammessi): resta in stato VUOTO
    if (valid.length === 0) {
        fileInput.value = '';
        message.textContent = rejected.length > 0 ? rejectedMessage(rejected) : '';
        return;
    }

    items = valid.map(file => ({ file: file, card: createCard(file) }));
    for (const item of items) grid.appendChild(item.card);

    const totalKB = Math.round(valid.reduce((sum, file) => sum + file.size, 0) / 1024);
    selectionMessage = `✅ ${plural(valid.length, 'immagine', 'immagini')} · ${totalKB} KB`;
    if (rejected.length > 0) selectionMessage += ' · ' + rejectedMessage(rejected);
    message.textContent = selectionMessage;

    // Stato PRONTO
    fillFormatOptions(new Set(valid.map(file => file.type)));
    formatSelect.disabled = false;
    convertBtn.disabled = false;
});

// GESTORE DI EVENTO 'click': eseguito quando l'utente preme "Converti tutto".
// Converte le immagini una alla volta e prepara lo ZIP con i risultati.
convertBtn.addEventListener('click', async function () {
    const format = formatSelect.value;
    const converted = [];               // file da mettere nello ZIP: {name, blob}
    const usedNames = new Set();        // nomi già usati nello ZIP (CA-19)
    let skipped = 0;
    let failed = 0;

    // Stato IN CORSO: niente doppi clic né cambi di formato durante la conversione
    convertBtn.disabled = true;
    formatSelect.disabled = true;
    downloadLink.hidden = true;

    for (const item of items) {
        if (item.file.type === format) {
            setStatus(item, `⏭️ Già in ${FORMAT_LABELS[format]}, saltata`);
            skipped++;
            continue;
        }
        setStatus(item, '⏳ Conversione...');
        try {
            const blob = await convertImage(item.file, format);
            const name = uniqueName(baseName(item.file.name) + FORMAT_EXTENSIONS[format], usedNames);
            converted.push({ name: name, blob: blob });
            setStatus(item, `✅ ${name} · ${Math.round(blob.size / 1024)} KB`);
        } catch (error) {
            setStatus(item, '❌ Conversione non riuscita');
            failed++;
        }
    }

    message.textContent = `✅ ${plural(converted.length, 'convertita', 'convertite')} in ${FORMAT_LABELS[format]}`;
    if (skipped > 0) message.textContent += ` · ${plural(skipped, 'saltata', 'saltate')}`;
    if (failed > 0) message.textContent += ` · ❌ ${plural(failed, 'non riuscita', 'non riuscite')}`;

    if (converted.length > 0) {
        const zip = await createZip(converted);
        if (downloadLink.href) URL.revokeObjectURL(downloadLink.href);
        downloadLink.href = URL.createObjectURL(zip);
        downloadLink.download = 'immagini-convertite.zip';
        downloadLink.textContent = `Scarica tutto (ZIP · ${Math.round(zip.size / 1024)} KB)`;
        downloadLink.hidden = false;
    }

    // Stato CONVERTITO: si può cambiare formato e riconvertire
    convertBtn.disabled = false;
    formatSelect.disabled = false;
});

// GESTORE DI EVENTO 'change' della select: un nuovo formato rende vecchio lo ZIP precedente
formatSelect.addEventListener('change', function () {
    downloadLink.hidden = true;
    message.textContent = selectionMessage;
    for (const item of items) setStatus(item, '');
});

/**
 * Porta l'interfaccia nello stato VUOTO: nessuna immagine, controlli disabilitati.
 * Libera anche la memoria occupata dalle miniature precedenti.
 */
function setEmptyState() {
    for (const item of items) URL.revokeObjectURL(item.card.querySelector('img').src);
    items = [];
    grid.innerHTML = '';
    message.textContent = '';
    convertBtn.disabled = true;
    formatSelect.disabled = true;
    downloadLink.hidden = true;
}

/**
 * Crea la scheda di un'immagine: miniatura, nome e peso, più una riga per lo stato.
 * @param {File} file - immagine scelta dall'utente
 * @returns {HTMLLIElement} la scheda, da inserire nella griglia
 */
function createCard(file) {
    const card = document.createElement('li');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = file.name;

    const info = document.createElement('p');
    info.textContent = `${file.name} · ${Math.round(file.size / 1024)} KB`;

    const status = document.createElement('p');
    status.className = 'status';

    card.append(img, info, status);
    return card;
}

/**
 * Scrive lo stato della conversione nella scheda di un'immagine.
 * @param {{card: HTMLLIElement}} item - immagine da aggiornare
 * @param {string} text - testo da mostrare
 */
function setStatus(item, text) {
    item.card.querySelector('.status').textContent = text;
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
 * Messaggio con l'elenco dei file scartati perché non sono JPG, PNG o WebP.
 * @param {File[]} rejected - file non validi
 * @returns {string}
 */
function rejectedMessage(rejected) {
    return '❌ Scartati (non JPG, PNG o WebP): ' + rejected.map(file => file.name).join(', ');
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

/**
 * Riempie la select con i formati di destinazione possibili.
 * Se tutte le immagini hanno lo stesso formato, quel formato viene escluso;
 * con formati misti compaiono tutti (le immagini già nel formato scelto saranno saltate).
 * @param {Set<string>} sourceTypes - formati delle immagini scelte
 */
function fillFormatOptions(sourceTypes) {
    formatSelect.innerHTML = '';
    for (const type of OUTPUT_TYPES) {
        if (sourceTypes.size === 1 && sourceTypes.has(type)) continue;
        const option = document.createElement('option');
        option.value = type;
        option.textContent = FORMAT_LABELS[type];
        formatSelect.appendChild(option);
    }
}