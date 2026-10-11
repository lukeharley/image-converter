// Lettura e rimozione dei metadati (EXIF, XMP, IPTC, commenti) da JPG, PNG e WebP;
// per le foto HEIC solo la lettura, perché vengono sempre convertite (e il canvas non copia i metadati).
// I metadati vengono tolti lavorando direttamente sui byte del file, senza ricodificare
// l'immagine: i pixel restano identici e la qualità non cambia.
// Restano solo le informazioni necessarie a mostrare bene l'immagine (es. il profilo colore).

/**
 * Esamina i metadati di un'immagine.
 * @param {File} file - immagine JPG, PNG o WebP
 * @returns {Promise<{hasMetadata: boolean, hasGps: boolean, orientation: number, parsed: boolean}>}
 *   parsed = false se il file non si è potuto leggere: per prudenza va trattato come "con metadati"
 */
async function inspectMetadata(file) {
    const info = { hasMetadata: false, hasGps: false, orientation: 1, parsed: true };
    try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const blocks = metadataBlocks(bytes, file.type);
        for (const block of blocks) {
            info.hasMetadata = true;
            if (block.kind === 'exif') {
                const exif = readExif(block.data);
                info.hasGps = info.hasGps || exif.hasGps;
                if (exif.orientation) info.orientation = exif.orientation;
            } else if (block.kind === 'xmp' && containsText(block.data, 'GPSLatitude')) {
                info.hasGps = true;
            }
        }
    } catch (error) {
        info.parsed = false;
    }
    return info;
}

/**
 * Restituisce una copia dell'immagine senza metadati, senza ricodificarla.
 * @param {File} file - immagine JPG, PNG o WebP
 * @param {{orientation: number}} info - risultato di inspectMetadata
 * @returns {Promise<Blob|null>} null se non si può fare senza ricodifica: ad esempio se l'EXIF
 *   indica una rotazione, che togliendolo andrebbe persa (la foto apparirebbe girata)
 */
async function stripMetadata(file, info) {
    if (info.orientation !== 1) return null;
    const bytes = new Uint8Array(await file.arrayBuffer());
    try {
        const parts = file.type === 'image/jpeg' ? stripJpeg(bytes)
            : file.type === 'image/png' ? stripPng(bytes)
            : file.type === 'image/webp' ? stripWebp(bytes)
            : null;
        return parts ? new Blob(parts, { type: file.type }) : null;
    } catch (error) {
        return null;
    }
}

// ——— JPG ———————————————————————————————————————————————————————————————
// Un JPG è una sequenza di segmenti: 0xFF, un byte "marcatore", 2 byte di lunghezza e i dati.
// I metadati stanno nei segmenti APPn (0xE0–0xEF) e COM (0xFE), prima dei dati dell'immagine.

/**
 * Elenca i segmenti di un JPG fino all'inizio dei dati dell'immagine (marcatore SOS).
 * @param {Uint8Array} bytes
 * @returns {{marker: number, start: number, end: number, dataStart: number}[]}
 */
function jpegSegments(bytes) {
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) throw new Error('Non è un JPG');
    const segments = [];
    let i = 2;
    while (i < bytes.length) {
        if (bytes[i] !== 0xFF) throw new Error('Segmento JPG non valido');
        const marker = bytes[i + 1];
        if (marker === 0xFF) { i++; continue; }                 // byte di riempimento
        if (marker === 0xD9) break;                              // fine immagine
        if (marker >= 0xD0 && marker <= 0xD7) { i += 2; continue; }   // marcatori senza dati
        const length = (bytes[i + 2] << 8) | bytes[i + 3];
        segments.push({ marker: marker, start: i, end: i + 2 + length, dataStart: i + 4 });
        if (marker === 0xDA) break;                              // da qui iniziano i dati dell'immagine
        i += 2 + length;
    }
    return segments;
}

/**
 * Indica se un segmento JPG va tenuto: servono a mostrare correttamente l'immagine
 * APP0 (JFIF), APP2 con il profilo colore ICC e APP14 (Adobe, necessario per alcuni JPG CMYK).
 * Tutti gli altri APPn e i commenti sono metadati.
 * @param {Uint8Array} bytes
 * @param {{marker: number, dataStart: number}} segment
 * @returns {boolean}
 */
function keepJpegSegment(bytes, segment) {
    const { marker, dataStart } = segment;
    if (marker === 0xFE) return false;                                     // commento
    if (marker < 0xE0 || marker > 0xEF) return true;                       // non è un APPn
    if (marker === 0xE0 || marker === 0xEE) return true;                   // JFIF, Adobe
    if (marker === 0xE2) return startsWith(bytes, dataStart, 'ICC_PROFILE\0');
    return false;
}

/**
 * Copia il JPG tenendo solo i segmenti necessari e i dati dell'immagine principale.
 * Tutto ciò che segue la fine dell'immagine principale viene scartato: ad esempio le
 * immagini aggiuntive di alcuni smartphone (anteprime, mappe HDR), che hanno metadati propri.
 * @param {Uint8Array} bytes
 * @returns {Uint8Array[]} i pezzi del nuovo file, da unire in un Blob
 */
function stripJpeg(bytes) {
    const segments = jpegSegments(bytes);
    const sos = segments[segments.length - 1];
    if (!sos || sos.marker !== 0xDA) throw new Error('Dati immagine non trovati');
    const parts = [bytes.subarray(0, 2)];                                  // SOI
    for (const segment of segments) {
        if (keepJpegSegment(bytes, segment)) parts.push(bytes.subarray(segment.start, segment.end));
    }
    parts.push(bytes.subarray(sos.end, jpegImageEnd(bytes, sos.end)));
    return parts;
}

/**
 * Trova la fine dei dati compressi dell'immagine principale (marcatore EOI 0xFFD9 compreso).
 * Nei dati compressi un byte 0xFF è sempre seguito da 0x00 o da un marcatore RSTn,
 * quindi il primo 0xFFD9 è davvero la fine dell'immagine.
 * @param {Uint8Array} bytes
 * @param {number} from - posizione da cui iniziano i dati compressi
 * @returns {number}
 */
function jpegImageEnd(bytes, from) {
    for (let i = from; i < bytes.length - 1; i++) {
        if (bytes[i] === 0xFF && bytes[i + 1] === 0xD9) return i + 2;
    }
    return bytes.length;
}

// ——— PNG ———————————————————————————————————————————————————————————————
// Un PNG è una firma di 8 byte seguita da "chunk": 4 byte di lunghezza, 4 di tipo, i dati, 4 di CRC.
// I metadati stanno nei chunk eXIf (EXIF), tEXt / zTXt / iTXt (testi, anche XMP) e tIME (data).

const PNG_METADATA_CHUNKS = ['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME'];

/**
 * Elenca i chunk di un PNG.
 * @param {Uint8Array} bytes
 * @returns {{type: string, start: number, end: number, dataStart: number, dataEnd: number}[]}
 */
function pngChunks(bytes) {
    if (!startsWith(bytes, 0, '\x89PNG\r\n\x1a\n')) throw new Error('Non è un PNG');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const chunks = [];
    let i = 8;
    while (i + 8 <= bytes.length) {
        const length = view.getUint32(i);
        const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
        chunks.push({ type: type, start: i, end: i + 12 + length, dataStart: i + 8, dataEnd: i + 8 + length });
        i += 12 + length;
        if (type === 'IEND') break;
    }
    return chunks;
}

/**
 * Copia il PNG senza i chunk di metadati.
 * @param {Uint8Array} bytes
 * @returns {Uint8Array[]}
 */
function stripPng(bytes) {
    const parts = [bytes.subarray(0, 8)];
    for (const chunk of pngChunks(bytes)) {
        if (!PNG_METADATA_CHUNKS.includes(chunk.type)) parts.push(bytes.subarray(chunk.start, chunk.end));
    }
    return parts;
}

// ——— WebP ——————————————————————————————————————————————————————————————
// Un WebP è un contenitore RIFF: "RIFF", dimensione totale, "WEBP", poi chunk con 4 lettere,
// 4 byte di lunghezza (little-endian) e i dati (allineati a un numero pari di byte).
// I metadati stanno nei chunk "EXIF" e "XMP ".

/**
 * Elenca i chunk di un WebP.
 * @param {Uint8Array} bytes
 * @returns {{type: string, start: number, end: number, dataStart: number, dataEnd: number}[]}
 */
function webpChunks(bytes) {
    if (!startsWith(bytes, 0, 'RIFF') || !startsWith(bytes, 8, 'WEBP')) throw new Error('Non è un WebP');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const chunks = [];
    let i = 12;
    while (i + 8 <= bytes.length) {
        const length = view.getUint32(i + 4, true);
        const type = String.fromCharCode(...bytes.subarray(i, i + 4));
        const end = i + 8 + length + (length % 2);                         // byte di allineamento
        chunks.push({ type: type, start: i, end: Math.min(end, bytes.length), dataStart: i + 8, dataEnd: i + 8 + length });
        i = end;
    }
    return chunks;
}

/**
 * Copia il WebP senza i chunk EXIF e XMP, aggiornando le intestazioni che li dichiarano.
 * @param {Uint8Array} bytes
 * @returns {Uint8Array[]}
 */
function stripWebp(bytes) {
    const kept = webpChunks(bytes).filter(chunk => chunk.type !== 'EXIF' && chunk.type !== 'XMP ');
    const parts = kept.map(chunk => {
        const copy = bytes.slice(chunk.start, chunk.end);
        // Nel chunk VP8X un byte di "flag" dichiara se ci sono EXIF (bit 3) e XMP (bit 2): si azzerano
        if (chunk.type === 'VP8X') copy[8] &= ~(0x08 | 0x04);
        return copy;
    });
    const size = parts.reduce((sum, part) => sum + part.length, 4);       // 4 = "WEBP"
    const header = new Uint8Array(12);
    header.set(bytes.subarray(0, 12));
    new DataView(header.buffer).setUint32(4, size, true);                  // nuova dimensione RIFF
    return [header, ...parts];
}

// ——— Ricerca dei metadati ————————————————————————————————————————————————

/**
 * Trova i blocchi di metadati di un'immagine, nel formato in cui si trovano.
 * @param {Uint8Array} bytes
 * @param {string} type - tipo MIME
 * @returns {{kind: 'exif'|'xmp'|'other', data: Uint8Array}[]}
 */
function metadataBlocks(bytes, type) {
    const blocks = [];
    if (type === 'image/jpeg') {
        const segments = jpegSegments(bytes);
        for (const segment of segments) {
            if (keepJpegSegment(bytes, segment)) continue;
            const data = bytes.subarray(segment.dataStart, segment.end);
            if (segment.marker === 0xE1 && startsWith(data, 0, 'Exif\0\0')) blocks.push({ kind: 'exif', data: data.subarray(6) });
            else if (segment.marker === 0xE1 && startsWith(data, 0, 'http://ns.adobe.com/xap/')) blocks.push({ kind: 'xmp', data: data });
            else blocks.push({ kind: 'other', data: data });
        }
        // Anche i dati dopo la fine dell'immagine principale (immagini aggiuntive) contano come metadati
        const sos = segments[segments.length - 1];
        if (sos && sos.marker === 0xDA && jpegImageEnd(bytes, sos.end) < bytes.length - 2) {
            blocks.push({ kind: 'other', data: bytes.subarray(jpegImageEnd(bytes, sos.end)) });
        }
    } else if (type === 'image/png') {
        for (const chunk of pngChunks(bytes)) {
            if (!PNG_METADATA_CHUNKS.includes(chunk.type)) continue;
            const data = bytes.subarray(chunk.dataStart, chunk.dataEnd);
            const kind = chunk.type === 'eXIf' ? 'exif' : containsText(data, 'XML:com.adobe.xmp') ? 'xmp' : 'other';
            blocks.push({ kind: kind, data: data });
        }
    } else if (type === 'image/heic' || type === 'image/heif') {
        // Nell'HEIC l'EXIF è un "elemento" del contenitore, preceduto da "Exif\0\0" e seguito
        // dall'intestazione TIFF ("MM" o "II"). L'HEIC non si riscrive (si converte sempre),
        // quindi basta trovarlo per avvisare l'utente.
        for (const tiff of ['MM\0*', 'II*\0']) {
            const start = indexOfText(bytes, 'Exif\0\0' + tiff);
            if (start >= 0) blocks.push({ kind: 'exif', data: bytes.subarray(start + 6) });
        }
        const xmp = indexOfText(bytes, '<x:xmpmeta');
        if (xmp >= 0) blocks.push({ kind: 'xmp', data: bytes.subarray(xmp, Math.min(bytes.length, xmp + 65536)) });
    } else if (type === 'image/webp') {
        for (const chunk of webpChunks(bytes)) {
            const data = bytes.subarray(chunk.dataStart, chunk.dataEnd);
            // Alcuni programmi scrivono l'EXIF del WebP con il prefisso "Exif\0\0" del JPG
            if (chunk.type === 'EXIF') blocks.push({ kind: 'exif', data: startsWith(data, 0, 'Exif\0\0') ? data.subarray(6) : data });
            if (chunk.type === 'XMP ') blocks.push({ kind: 'xmp', data: data });
        }
    }
    return blocks;
}

/**
 * Legge da un blocco EXIF (formato TIFF) l'orientamento e la presenza di coordinate GPS.
 * Il TIFF inizia con "II" (little-endian) o "MM" (big-endian), poi la posizione della prima
 * "directory" (IFD): una lista di voci da 12 byte (etichetta, tipo, quantità, valore).
 * @param {Uint8Array} data
 * @returns {{orientation: number, hasGps: boolean}}
 */
function readExif(data) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const little = startsWith(data, 0, 'II');
    if (!little && !startsWith(data, 0, 'MM')) throw new Error('EXIF non valido');
    const u16 = offset => view.getUint16(offset, little);
    const u32 = offset => view.getUint32(offset, little);

    const result = { orientation: 0, hasGps: false };
    const ifd0 = u32(4);
    const count = u16(ifd0);
    for (let n = 0; n < count; n++) {
        const entry = ifd0 + 2 + n * 12;
        const tag = u16(entry);
        if (tag === 0x0112) result.orientation = u16(entry + 8);          // Orientation
        if (tag === 0x8825) {                                               // puntatore alla directory GPS
            const gps = u32(entry + 8);
            const gpsCount = u16(gps);
            for (let g = 0; g < gpsCount; g++) {
                if (u16(gps + 2 + g * 12) === 0x0002) result.hasGps = true;   // GPSLatitude
            }
        }
    }
    return result;
}

/**
 * Indica se i byte, a partire da una posizione, coincidono con un testo (un carattere = un byte).
 * @param {Uint8Array} bytes
 * @param {number} offset
 * @param {string} text
 * @returns {boolean}
 */
function startsWith(bytes, offset, text) {
    if (offset + text.length > bytes.length) return false;
    for (let i = 0; i < text.length; i++) {
        if (bytes[offset + i] !== text.charCodeAt(i)) return false;
    }
    return true;
}

/**
 * Posizione della prima occorrenza di un testo in una sequenza di byte, -1 se non c'è.
 * @param {Uint8Array} bytes
 * @param {string} text - testo ASCII (un carattere = un byte)
 * @returns {number}
 */
function indexOfText(bytes, text) {
    const first = text.charCodeAt(0);
    for (let i = bytes.indexOf(first); i >= 0; i = bytes.indexOf(first, i + 1)) {
        if (startsWith(bytes, i, text)) return i;
    }
    return -1;
}

/**
 * Indica se un testo compare in una sequenza di byte (testi ASCII, come l'XMP).
 * @param {Uint8Array} bytes
 * @param {string} text
 * @returns {boolean}
 */
function containsText(bytes, text) {
    return new TextDecoder('latin1').decode(bytes).includes(text);
}
