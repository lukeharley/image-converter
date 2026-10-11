// Trova nella pagina HTML l'elemento con id "file-input"
const fileInput = document.getElementById('file-input');
const message = document.getElementById('message');
const preview = document.getElementById('preview');
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

// Quando il suo valore cambia ("change"), ovvero l'utente sceglie un file
fileInput.addEventListener('change', function () {
    // Prendi il primo file scelto
    const file = fileInput.files[0];

    // Nessun file (es. l'utente ha premuto Annulla): pulisci il messaggio ed esci
    if (!file) {
        message.textContent = '';
        preview.hidden = true; 
        return;
    }

    // Formato non ammesso: mostra l'errore e svuota l'input,
    // così accanto al pulsante non resta il nome del file rifiutato
    if (!ALLOWED_TYPES.includes(file.type)) {
        message.textContent = '❌ Formato non supportato. Scegli un JPG o PNG.';
        fileInput.value = '';
        preview.hidden = true; 
        return;
    }
    
    const sizeKB = Math.round(file.size / 1024);
    message.textContent = `✅ ${file.name} · ${sizeKB} KB`;
    // Prima di creare un nuovo URL, liberiamo il precedente
    if (preview.src) URL.revokeObjectURL(preview.src);
    preview.src = URL.createObjectURL(file); 
    preview.hidden = false; 
}); 
