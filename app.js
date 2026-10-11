// Trova nella pagina HTML gli elementi tramite riferimenti (id)
const fileInput = document.getElementById('file-input');
const message = document.getElementById('message');
const preview = document.getElementById('preview');
const convertBtn = document.getElementById('convert-btn');
const downloadLink = document.getElementById('download-link');
const formatSelect = document.getElementById('format');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Nome leggibile di ogni formato, da mostrare all'utente.
const FORMAT_LABELS = {'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WebP'};
// Estensione del file per ogni formato.
const FORMAT_EXTENSIONS = {'image/png' : '.png', 'image/jpeg' : '.jpg', 'image/webp' : '.webp'};
const OUTPUT_TYPES = ALLOWED_TYPES.filter(canEncode);

// Stato iniziale della macchina a stati: VUOTO (non ci fidiamo dell'HTML - 
// alcuni browser ripristinano lo stato dopo un caricamento). 
// Codice eseguito una volta sola, al caricamento.
convertBtn.disabled = true;
convertBtn.textContent = 'Converti';
downloadLink.hidden = true; 
formatSelect.disabled = true;

// GESTORE DI EVENTO 'change': eseguito ogni volta che l'utente sceglie (o annulla) un file
fileInput.addEventListener('change', function () {
    // Prendi il primo file scelto
    const file = fileInput.files[0];

    // Nessun file (es. l'utente ha premuto Annulla): pulisci il messaggio ed esci
    if (!file) {
        message.textContent = '';
        preview.hidden = true;
        convertBtn.disabled = true;
        convertBtn.textContent = 'Converti';
        downloadLink.hidden = true; 
        formatSelect.disabled = true;
        return;
    }

    // Formato non ammesso: mostra l'errore e svuota l'input,
    // così accanto al pulsante non resta il nome del file rifiutato
    if (!ALLOWED_TYPES.includes(file.type)) {
        message.textContent = '❌ Formato non supportato. Il file selezionato deve essere nel formato JPG, PNG o WebP.';
        fileInput.value = '';
        preview.hidden = true; 
        convertBtn.disabled = true;
        convertBtn.textContent = 'Converti';
        downloadLink.hidden = true;
        formatSelect.disabled = true; 
        return;
    }
    
    const sizeKB = Math.round(file.size / 1024);
    message.textContent = `✅ ${file.name} · ${sizeKB} KB`;

    downloadLink.hidden = true; 
    convertBtn.disabled = true; // Il pulsante si riabilita solo a caricamento finito
    // Prima di creare un nuovo URL, liberiamo il precedente
    if (preview.src) URL.revokeObjectURL(preview.src);
    preview.src = URL.createObjectURL(file); 
    preview.hidden = false; 
    fillFormatOptions(file.type);
    formatSelect.disabled = false;
    convertBtn.textContent = 'Converti';
    
    // CALLBACK: eseguita dal browser quando l'anteprima dell'immagine ha finito di caricarsi
    preview.onload = function () { convertBtn.disabled = false; }; 
}); 

// GESTORE DI EVENTO 'click': eseguito quando l'utente preme sul pulsante "Converti" 
// Ridisegna l'immagine su un canvas e la ricodifica nel formato di destinazione.
convertBtn.addEventListener('click', function() {
    // Creo una "tela" grande quanto l'immagine originale
    const canvas = document.createElement('canvas');
    canvas.width = preview.naturalWidth; 
    canvas.height = preview.naturalHeight; 

    // Disegno l'anteprima sulla tela (pixel per pixel)
    const ctx = canvas.getContext('2d');
    const format = formatSelect.value;
    const fileExtension = FORMAT_EXTENSIONS[format]; 
    if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(preview, 0, 0);

    // CALLBACK: eseguita dal browser quando la ricodifica è terminata (operazione asincrona) 
    // Riceve il file convertito (blob) e prepara il link per scaricarlo con il nome corretto.
    canvas.toBlob(function (blob) {
        if (!blob) {
            message.textContent = '❌ Conversione non riuscita, riprova.'; 
            return;
        }
        const sizeKB = Math.round(blob.size / 1024);
        message.textContent = `✅ Convertito in ${FORMAT_LABELS[format]} · nuovo peso: ${sizeKB} KB`;

        if (downloadLink.href) URL.revokeObjectURL(downloadLink.href);
        downloadLink.href = URL.createObjectURL(blob); 

        const originalName = fileInput.files[0].name; 
        const dotIndex = originalName.lastIndexOf('.'); // Posizione dell'ultimo punto
        const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
        downloadLink.download = baseName + fileExtension;
        downloadLink.hidden = false;

    }, format);
});

// GESTORE DI EVENTO 'change' della select: un nuovo formato rende vecchio il download precedente
formatSelect.addEventListener('change', function () {
    downloadLink.hidden = true;
});

/**
 * Verifica se il browser sa creare immagini nel formato indicato. 
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
 * Riempie la select con i formati di destinazione possibili,
 * escludendo il formato del file di partenza. 
 * @param {string} sourceType - tipo MIME del file originale 
 */
function fillFormatOptions(sourceType) {
    formatSelect.innerHTML = ''; // Svuota le opzioni precedenti
    for (const type of OUTPUT_TYPES) {
        if (type === sourceType) continue;
        const option = document.createElement('option');
        option.value = type;
        option.textContent = FORMAT_LABELS[type];
        formatSelect.appendChild(option);
    }

}
