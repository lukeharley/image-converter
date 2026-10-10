// Trova nella pagina HTML l'elemento con id "file-input"
const fileInput = document.getElementById('file-input');

// Quando il suo valore cambia ("change"), ovvero l'utente sceglie un file
fileInput.addEventListener('change', function () {
    // Prendi il primo file e scrivi queste informazioni in console
    const file = fileInput.files[0];
    console.log('Nome: ', file.name);
    console.log('Tipo: ', file.type);
    console.log('Peso: ', file.size, 'byte'); 
}); 
