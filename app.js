// Trova nella pagina HTML l'elemento con id "file-input"
const fileInput = document.getElementById('file-input');
const message = document.getElementById('message');
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

// Quando il suo valore cambia ("change"), ovvero l'utente sceglie un file
fileInput.addEventListener('change', function () {
    // Prendi il primo file scelto
    const file = fileInput.files[0];

    // Nessun file (es. l'utente ha premuto Annulla): pulisci il messaggio ed esci
    if (!file) {
        message.textContent = '';
        return;
    }

    // Formato non ammesso: mostra l'errore e svuota l'input,
    // così accanto al pulsante non resta il nome del file rifiutato
    if (!ALLOWED_TYPES.includes(file.type)) {
        message.textContent = '❌ Formato non supportato. Scegli un JPG o PNG.';
        fileInput.value = '';
        return;
    }
    
    const sizeKB = Math.round(file.size / 1024);
    message.textContent = `✅ ${file.name} · ${sizeKB} KB`;
}); 
