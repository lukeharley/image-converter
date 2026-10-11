// Trova nella pagina HTML l'elemento con id "file-input"
const fileInput = document.getElementById('file-input');
const message = document.getElementById('message');
const preview = document.getElementById('preview');
const convertBtn = document.getElementById('convert-btn');
const downloadLink = document.getElementById('download-link');
const formatSelect = document.getElementById('format');
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

// Quando il suo valore cambia ("change"), ovvero l'utente sceglie un file
fileInput.addEventListener('change', function () {
    // Prendi il primo file scelto
    const file = fileInput.files[0];

    // Nessun file (es. l'utente ha premuto Annulla): pulisci il messaggio ed esci
    if (!file) {
        message.textContent = '';
        preview.hidden = true; 
        convertBtn.disabled = true;
        downloadLink.hidden = true; 
        return;
    }

    // Formato non ammesso: mostra l'errore e svuota l'input,
    // così accanto al pulsante non resta il nome del file rifiutato
    if (!ALLOWED_TYPES.includes(file.type)) {
        message.textContent = '❌ Formato non supportato. Scegli un JPG o PNG.';
        fileInput.value = '';
        preview.hidden = true; 
        convertBtn.disabled = true;
        downloadLink.hidden = true; 
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
    preview.onload = function () { convertBtn.disabled = false; }; 
}); 

convertBtn.addEventListener('click', function() {
    // Creo una "tela" grande quanto l'immagine originale
    const canvas = document.createElement('canvas');
    canvas.width = preview.naturalWidth; 
    canvas.height = preview.naturalHeight; 

    // Disegno l'anteprima sulla tela (pixel per pixel)
    const ctx = canvas.getContext('2d');
    const format = formatSelect.value; 
    if (format === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(preview, 0, 0);

    canvas.toBlob(function (blob) {
        if (!blob) {
            message.textContent = '❌ Conversione non riuscita, riprova.'; 
            return;
        }
        const sizeKB = Math.round(blob.size / 1024);
        message.textContent = `✅ Conversione completata · nuovo peso: ${sizeKB} KB`;

        if (downloadLink.href) URL.revokeObjectURL(downloadLink.href);
        downloadLink.href = URL.createObjectURL(blob); 

        const originalName = fileInput.files[0].name; 
        const dotIndex = originalName.lastIndexOf('.'); // Posizione dell'ultimo punto
        const baseName = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
        const fileExtension = format === 'image/png' ? '.png' : '.jpg';
        downloadLink.download = baseName + fileExtension;
        downloadLink.hidden = false;

    }, format);
});