// Creazione di archivi ZIP senza librerie esterne.
// Usa il metodo "stored" (nessuna compressione): JPG, PNG e WebP sono già compressi,
// quindi comprimerli di nuovo non farebbe risparmiare spazio.

// Tabella precalcolata per il CRC-32 (codice di controllo richiesto dal formato ZIP)
const CRC_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0;
    }
    return table;
})();

/**
 * Calcola il CRC-32 di una sequenza di byte.
 * Serve a chi apre lo ZIP per verificare che il file non sia corrotto.
 * @param {Uint8Array} bytes - dati del file
 * @returns {number} codice di controllo a 32 bit
 */
function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) {
        crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Converte una data nel formato MS-DOS usato dallo ZIP (16 bit per l'ora, 16 per la data).
 * @param {Date} date - data da convertire
 * @returns {{time: number, day: number}}
 */
function dosDateTime(date) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
}

/**
 * Crea un archivio ZIP a partire da un elenco di file.
 * @param {{name: string, blob: Blob}[]} files - nome e contenuto di ogni file
 * @returns {Promise<Blob>} il file ZIP
 */
async function createZip(files) {
    const encoder = new TextEncoder();
    const { time, day } = dosDateTime(new Date());
    const parts = [];    // contenuto dello ZIP: per ogni file, intestazione + nome + dati
    const central = [];  // "directory centrale": l'indice dei file, in fondo allo ZIP
    let offset = 0;      // posizione (in byte) in cui inizia il file corrente

    for (const file of files) {
        const name = encoder.encode(file.name);
        const data = new Uint8Array(await file.blob.arrayBuffer());
        const crc = crc32(data);

        // Intestazione locale (30 byte), subito prima dei dati del file
        const local = new DataView(new ArrayBuffer(30));
        local.setUint32(0, 0x04034b50, true);    // firma "PK\x03\x04"
        local.setUint16(4, 20, true);            // versione minima per l'estrazione (2.0)
        local.setUint16(6, 0x0800, true);        // flag: nome del file in UTF-8
        local.setUint16(8, 0, true);             // metodo 0 = stored (nessuna compressione)
        local.setUint16(10, time, true);
        local.setUint16(12, day, true);
        local.setUint32(14, crc, true);
        local.setUint32(18, data.length, true);  // dimensione compressa
        local.setUint32(22, data.length, true);  // dimensione originale (uguali: stored)
        local.setUint16(26, name.length, true);
        local.setUint16(28, 0, true);            // nessun campo extra
        parts.push(local, name, data);

        // Voce della directory centrale (46 byte): ripete i dati e dice dove trovare il file
        const entry = new DataView(new ArrayBuffer(46));
        entry.setUint32(0, 0x02014b50, true);    // firma "PK\x01\x02"
        entry.setUint16(4, 20, true);            // versione che ha creato l'archivio
        entry.setUint16(6, 20, true);            // versione minima per l'estrazione
        entry.setUint16(8, 0x0800, true);
        entry.setUint16(10, 0, true);
        entry.setUint16(12, time, true);
        entry.setUint16(14, day, true);
        entry.setUint32(16, crc, true);
        entry.setUint32(20, data.length, true);
        entry.setUint32(24, data.length, true);
        entry.setUint16(28, name.length, true);
        entry.setUint32(42, offset, true);       // dove inizia l'intestazione locale
        central.push(entry, name);

        offset += 30 + name.length + data.length;
    }

    // Record di fine archivio (22 byte): dice quanti file ci sono e dove inizia l'indice
    const centralSize = central.reduce((sum, part) => sum + part.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);          // firma "PK\x05\x06"
    end.setUint16(8, files.length, true);        // file in questo disco
    end.setUint16(10, files.length, true);       // file totali
    end.setUint32(12, centralSize, true);        // dimensione dell'indice
    end.setUint32(16, offset, true);             // posizione dell'indice

    return new Blob([...parts, ...central, end], { type: 'application/zip' });
}