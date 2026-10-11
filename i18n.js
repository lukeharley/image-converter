// Traduzioni dell'interfaccia (italiano e inglese) e funzioni per usarle.
// Ogni testo è una stringa oppure una funzione che riceve i dati da inserire:
// così ogni lingua gestisce a modo suo plurali e ordine delle parole.

const TRANSLATIONS = {
    it: {
        metaDescription: 'Converti, ridimensiona e comprimi immagini JPG, PNG, WebP e foto iPhone (HEIC) direttamente nel browser, anche offline e più file insieme. Toglie la posizione GPS e gli altri metadati. Le immagini non vengono mai caricate online.',
        langButton: 'EN',
        langButtonLabel: 'Switch to English',
        badgeLong: 'Le tue immagini non lasciano il dispositivo',
        badgeShort: 'Immagini mai caricate online',
        heading: 'Converti le tue immagini',
        intro: 'Converti, ridimensiona e comprimi JPG, PNG, WebP e foto iPhone (HEIC), anche più file insieme. Toglie dalle foto la posizione GPS e gli altri metadati. Tutto avviene nel browser, anche offline: nessun file viene caricato online.',
        dropTitle: 'Trascina qui le immagini',
        browse: 'Sfoglia…',
        dropHint: 'Più file insieme · JPG, PNG, WebP, HEIC',
        changeSelection: 'Cambia selezione',
        formatLabel: 'Converti in',
        sizeLabel: 'Lato lungo massimo (px)',
        weightLabel: 'Peso massimo',
        sizeOriginal: 'Originale',
        weightNone: 'Nessuno',
        convertAll: 'Converti tutto',
        convertRunning: 'Elaborazione in corso…',
        reconvert: 'Riconverti',
        download: 'Scarica',
        downloadOne: v => `Scarica ${v.name}`,
        downloadAll: v => `Scarica tutto (ZIP · ${formatBytes(v.bytes)})`,
        zipName: 'immagini-convertite.zip',
        selection: v => `${v.count} ${v.count === 1 ? 'immagine' : 'immagini'} · ${formatBytes(v.bytes)}`,
        progress: v => `Elaborazione ${v.current} di ${v.total}…`,
        statusWait: 'In attesa',
        statusRun: 'Elaborazione…',
        statusSkipSame: v => `Già in ${v.format} e senza metadati, saltata`,
        statusSkipLimits: 'Già entro i limiti, saltata',
        statusDone: v => resultText(v),
        statusOver: v => `${resultText(v)} · oltre ${formatLimit(v.limit)}`,
        statusClean: v => `${resultText(v)} · senza ricodifica`,
        statusFail: 'Elaborazione non riuscita',
        tagGps: 'Contiene la posizione GPS',
        tagMetadata: 'Contiene metadati (EXIF)',
        tagRemoved: 'Metadati rimossi',
        summary: v => {
            let text = `${v.converted} ${v.converted === 1 ? 'immagine pronta' : 'immagini pronte'} in ${v.format}`;
            if (v.converted > 0) text += ` · da ${formatBytes(v.before)} a ${formatBytes(v.after)}${savingText(v.before, v.after)}`;
            if (v.skipped > 0) text += ` · ${v.skipped} ${v.skipped === 1 ? 'saltata' : 'saltate'}`;
            if (v.overLimit > 0) text += ` · ${v.overLimit} oltre ${formatLimit(v.limit)}`;
            if (v.cleaned > 0) text += ` · metadati rimossi da ${v.cleaned}`;
            if (v.failed > 0) text += ` · ${v.failed} ${v.failed === 1 ? 'non riuscita' : 'non riuscite'}`;
            return text;
        },
        rejectedCount: v => `${v.count} ${v.count === 1 ? 'file scartato' : 'file scartati'}`,
        rejectedNames: v => `${v.count === 1 ? 'non è' : 'non sono'} JPG, PNG, WebP o HEIC: ${v.names}`
    },
    en: {
        metaDescription: 'Convert, resize and compress JPG, PNG, WebP and iPhone (HEIC) photos right in your browser, even offline and many files at once. Removes GPS location and other metadata. Your images are never uploaded.',
        langButton: 'IT',
        langButtonLabel: 'Passa all’italiano',
        badgeLong: 'Your images never leave your device',
        badgeShort: 'Images never uploaded',
        heading: 'Convert your images',
        intro: 'Convert, resize and compress JPG, PNG, WebP and iPhone (HEIC) photos, even many files at once. Removes GPS location and other metadata from your photos. Everything happens in your browser, even offline: no file is uploaded.',
        dropTitle: 'Drop your images here',
        browse: 'Browse…',
        dropHint: 'Multiple files · JPG, PNG, WebP, HEIC',
        changeSelection: 'Change selection',
        formatLabel: 'Convert to',
        sizeLabel: 'Max long side (px)',
        weightLabel: 'Max file size',
        sizeOriginal: 'Original',
        weightNone: 'None',
        convertAll: 'Convert all',
        convertRunning: 'Processing…',
        reconvert: 'Convert again',
        download: 'Download',
        downloadOne: v => `Download ${v.name}`,
        downloadAll: v => `Download all (ZIP · ${formatBytes(v.bytes)})`,
        zipName: 'converted-images.zip',
        selection: v => `${v.count} ${v.count === 1 ? 'image' : 'images'} · ${formatBytes(v.bytes)}`,
        progress: v => `Processing ${v.current} of ${v.total}…`,
        statusWait: 'Waiting',
        statusRun: 'Processing…',
        statusSkipSame: v => `Already ${v.format}, no metadata: skipped`,
        statusSkipLimits: 'Already within limits, skipped',
        statusDone: v => resultText(v),
        statusOver: v => `${resultText(v)} · over ${formatLimit(v.limit)}`,
        statusClean: v => `${resultText(v)} · not re-encoded`,
        statusFail: 'Processing failed',
        tagGps: 'Contains GPS location',
        tagMetadata: 'Contains metadata (EXIF)',
        tagRemoved: 'Metadata removed',
        summary: v => {
            let text = `${v.converted} ${v.converted === 1 ? 'image' : 'images'} ready as ${v.format}`;
            if (v.converted > 0) text += ` · from ${formatBytes(v.before)} to ${formatBytes(v.after)}${savingText(v.before, v.after)}`;
            if (v.skipped > 0) text += ` · ${v.skipped} skipped`;
            if (v.overLimit > 0) text += ` · ${v.overLimit} over ${formatLimit(v.limit)}`;
            if (v.cleaned > 0) text += ` · metadata removed from ${v.cleaned}`;
            if (v.failed > 0) text += ` · ${v.failed} failed`;
            return text;
        },
        rejectedCount: v => `${v.count} ${v.count === 1 ? 'file rejected' : 'files rejected'}`,
        rejectedNames: v => `not JPG, PNG, WebP or HEIC: ${v.names}`
    }
};

const LANGUAGES = Object.keys(TRANSLATIONS);
// Chiave con cui la scelta della lingua viene ricordata nel browser
const LANGUAGE_KEY = 'pic-language';

// Lingua attiva: quella scelta l'ultima volta, altrimenti quella del browser
let language = detectLanguage();

/**
 * Sceglie la lingua iniziale. La scelta salvata vince; altrimenti italiano se il browser
 * è in italiano, inglese in tutti gli altri casi.
 * @returns {string} 'it' oppure 'en'
 */
function detectLanguage() {
    try {
        const saved = localStorage.getItem(LANGUAGE_KEY);
        if (LANGUAGES.includes(saved)) return saved;
    } catch (error) {
        // localStorage può non essere disponibile (navigazione privata, cookie bloccati)
    }
    return (navigator.language || '').toLowerCase().startsWith('it') ? 'it' : 'en';
}

/**
 * Cambia la lingua attiva, la ricorda per le visite successive e aggiorna i testi fissi della pagina.
 * @param {string} newLanguage - 'it' oppure 'en'
 */
function setLanguage(newLanguage) {
    language = newLanguage;
    try {
        localStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
        // Senza localStorage la scelta vale solo fino alla chiusura della pagina
    }
    translatePage();
}

/**
 * Restituisce un testo nella lingua attiva.
 * @param {string} key - chiave del testo (es. 'convertAll')
 * @param {object} [values] - dati da inserire nel testo (es. {count: 3})
 * @returns {string}
 */
function t(key, values = {}) {
    const entry = TRANSLATIONS[language][key];
    return typeof entry === 'function' ? entry(values) : entry;
}

/**
 * Traduce i testi fissi della pagina: gli elementi con data-i18n ricevono il testo della
 * loro chiave, quelli con data-i18n-label l'etichetta per i lettori di schermo.
 */
function translatePage() {
    document.documentElement.lang = language;
    document.querySelector('meta[name="description"]').content = t('metaDescription');
    for (const element of document.querySelectorAll('[data-i18n]')) {
        element.textContent = t(element.dataset.i18n);
    }
    for (const element of document.querySelectorAll('[data-i18n-label]')) {
        element.setAttribute('aria-label', t(element.dataset.i18nLabel));
    }
}

/**
 * Scrive un numero con il separatore decimale della lingua attiva ("3,2" oppure "3.2").
 * @param {number} value
 * @param {number} decimals - cifre decimali
 * @returns {string}
 */
function formatNumber(value, decimals) {
    return new Intl.NumberFormat(language, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}
