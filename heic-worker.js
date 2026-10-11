// Worker che decodifica le foto HEIC/HEIF (il formato delle foto iPhone) con libheif,
// compilata in WebAssembly. Gira in un thread separato: la pagina resta reattiva anche
// mentre decodifica foto da 12 megapixel. Riceve i byte del file e restituisce i pixel.

importScripts('vendor/libheif/libheif-bundle.js');

// Il file della libreria espone una funzione che crea l'istanza (WebAssembly incluso)
const heif = typeof libheif === 'function' ? libheif() : libheif;

// MESSAGGIO DALLA PAGINA: {id, buffer} con i byte del file HEIC.
// Risposta: {id, width, height, pixels} con i pixel RGBA, oppure {id, error}.
self.addEventListener('message', function (event) {
    const { id, buffer } = event.data;
    let images = [];
    try {
        images = new heif.HeifDecoder().decode(new Uint8Array(buffer));
        if (images.length === 0) throw new Error('Nessuna immagine nel file HEIC');

        // Un HEIC può contenere più immagini (anteprime, Live Photo): si usa quella principale.
        // display() applica anche la rotazione dichiarata nel file, come fa il telefono.
        const image = images.find(img => img.is_primary()) || images[0];
        const width = image.get_width();
        const height = image.get_height();
        image.display({ data: new Uint8ClampedArray(width * height * 4), width: width, height: height }, function (result) {
            if (result) {
                // Il buffer dei pixel viene "trasferito" alla pagina, non copiato
                self.postMessage({ id: id, width: width, height: height, pixels: result.data.buffer }, [result.data.buffer]);
            } else {
                self.postMessage({ id: id, error: 'Decodifica HEIC non riuscita' });
            }
            freeAll(images);
        });
    } catch (error) {
        self.postMessage({ id: id, error: String(error && error.message || error) });
        freeAll(images);
    }
});

/**
 * Libera la memoria WebAssembly occupata dalle immagini decodificate.
 * @param {object[]} images - immagini restituite da HeifDecoder.decode
 */
function freeAll(images) {
    for (const image of images) image.free();
}
