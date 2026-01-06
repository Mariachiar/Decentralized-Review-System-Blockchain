// public_reviews/reviews-ui.js
document.addEventListener('DOMContentLoaded', () => {
    const actionSelector = document.getElementById('actionSelector');
    const formContainer = document.getElementById('actionFormContainer');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsOutput = document.getElementById('resultsOutput');

    function displayResults(data) {
        resultsContainer.style.display = 'block';
        resultsOutput.textContent = JSON.stringify(data, null, 2);
    }

    function validateCurrentForm() {
        const action = actionSelector.value;
        const submitBtn = formContainer.querySelector('#submitBtn');
        if (!submitBtn) return;
        let isValid = true;
        const q = (sel) => formContainer.querySelector(sel);
        switch (action) {
            case 'uploadToIpfs': isValid = q('#reviewText').value.trim() !== ''; break;
            case 'insertReview': isValid = q('#vpProofFile').files.length > 0 && q('#cidInput').value.trim() !== '' && q('#productIdInput').value.trim() !== ''; break;
            case 'modifyReview': isValid = q('#vpProofFile').files.length > 0 && q('#oldCidInput').value.trim() !== '' && q('#newCidInput').value.trim() !== '' && q('#productIdInput').value.trim() !== ''; break;
            case 'deleteReview': isValid = q('#vpProofFile').files.length > 0 && q('#cidInput').value.trim() !== '' && q('#productIdInput').value.trim() !== ''; break;
            case 'addLike': case 'addDislike': isValid = q('#vpFile').files.length > 0 && q('#cidInput').value.trim() !== ''; break;
            case 'viewReviews': isValid = q('#productIdInput').value.trim() !== ''; break;
            case 'getReviewLikes': case 'getReviewDislikes': case 'getHolderReview':  case 'getStateReview':
                isValid = q('#cidInput').value.trim() !== '';
                break;
            default: isValid = false;
        }
        submitBtn.disabled = !isValid;
    }

    function renderForm(action) {
        formContainer.style.display = 'block';
        resultsContainer.style.display = 'none';
        let html = '';
        const submitText = "Esegui Azione";
        switch (action) {
            case 'uploadToIpfs': html = `<h3>Scrivi Recensione</h3><div class="form-group"><label for="reviewText">Testo:</label><textarea id="reviewText" rows="5"></textarea></div><button id="submitBtn" disabled>Carica su IPFS</button>`; break;
            case 'insertReview': html = `<h3>Invia Recensione</h3><div class="form-group"><label>Prova d'Acquisto (VP):</label><input type="file" id="vpProofFile" accept=".jwt,.txt"></div><div class="form-group"><label>CID:</label><input type="text" id="cidInput"></div><div class="form-group"><label>ID Prodotto:</label><input type="text" id="productIdInput"></div><button id="submitBtn" disabled>${submitText}</button>`; break;
            case 'modifyReview': html = `<h3>Modifica Recensione</h3><div class="form-group"><label>Prova d'Acquisto (VP):</label><input type="file" id="vpProofFile" accept=".jwt,.txt"></div><div class="form-group"><label>Vecchio CID:</label><input type="text" id="oldCidInput"></div><div class="form-group"><label>Nuovo CID:</label><input type="text" id="newCidInput"></div><div class="form-group"><label>ID Prodotto:</label><input type="text" id="productIdInput"></div><button id="submitBtn" disabled>${submitText}</button>`; break;
            case 'deleteReview': html = `<h3>Cancella Recensione</h3><div class="form-group"><label>Prova d'Acquisto (VP):</label><input type="file" id="vpProofFile" accept=".jwt,.txt"></div><div class="form-group"><label>CID:</label><input type="text" id="cidInput"></div><div class="form-group"><label>ID Prodotto:</label><input type="text" id="productIdInput"></div><button id="submitBtn" disabled>${submitText}</button>`; break;
            case 'addLike': case 'addDislike': html = `<h3>Vota Recensione</h3><p>Autenticati con la VP di login del sito.</p><div class="form-group"><label>La tua VP di Login:</label><input type="file" id="vpFile" accept=".jwt,.txt"></div><div class="form-group"><label>CID Recensione:</label><input type="text" id="cidInput"></div><button id="submitBtn" disabled>${submitText}</button>`; break;
            case 'viewReviews': html = `<h3>Visualizza Recensioni</h3><div class="form-group"><label>ID Prodotto:</label><input type="text" id="productIdInput"></div><button id="submitBtn" disabled>${submitText}</button>`; break;
            case 'getReviewLikes': case 'getReviewDislikes': case 'getHolderReview':  case 'getStateReview':
                 html = `<h3>Visualizza Dettagli Recensione</h3><div class="form-group"><label>CID Recensione:</label><input type="text" id="cidInput"></div><button id="submitBtn" disabled>${submitText}</button>`; break;
            default: formContainer.style.display = 'none';
        }
        formContainer.innerHTML = html;
    }

    actionSelector.addEventListener('change', (e) => renderForm(e.target.value));
    formContainer.addEventListener('input', validateCurrentForm);
    formContainer.addEventListener('change', validateCurrentForm);

    formContainer.addEventListener('click', async (e) => {
        if (e.target.id !== 'submitBtn') return;
        e.target.disabled = true; e.target.textContent = 'Elaborando...';
        
        const currentAction = actionSelector.value;
        const body = {}; let endpoint = ''; let method = 'POST'; let requiresFile = false; let fileInputId = ''; let fileBodyKey = '';

        try {
            switch (currentAction) {
                case 'uploadToIpfs': endpoint = '/api/upload-review'; body.reviewText = formContainer.querySelector('#reviewText').value; break;
                case 'insertReview': endpoint = '/api/submit-review'; requiresFile = true; fileInputId = 'vpProofFile'; fileBodyKey = 'vpJwtProof'; body.cid = formContainer.querySelector('#cidInput').value; body.productId = formContainer.querySelector('#productIdInput').value; break;
                case 'modifyReview': endpoint = '/api/modify-review'; requiresFile = true; fileInputId = 'vpProofFile'; fileBodyKey = 'vpJwtProof'; body.oldCid = formContainer.querySelector('#oldCidInput').value; body.newCid = formContainer.querySelector('#newCidInput').value; body.productId = formContainer.querySelector('#productIdInput').value; break;
                case 'deleteReview': endpoint = '/api/delete-review'; requiresFile = true; fileInputId = 'vpProofFile'; fileBodyKey = 'vpJwtProof'; body.cid = formContainer.querySelector('#cidInput').value; body.productId = formContainer.querySelector('#productIdInput').value; break;
                case 'addLike': endpoint = '/api/like'; requiresFile = true; fileInputId = 'vpFile'; fileBodyKey = 'vpJwt'; body.cid = formContainer.querySelector('#cidInput').value; break;
                case 'addDislike': endpoint = '/api/dislike'; requiresFile = true; fileInputId = 'vpFile'; fileBodyKey = 'vpJwt'; body.cid = formContainer.querySelector('#cidInput').value; break;
                case 'viewReviews': method = 'GET'; endpoint = `/api/product-reviews/${formContainer.querySelector('#productIdInput').value}`; break;
                case 'getReviewLikes': method = 'GET'; endpoint = `/api/review-likes/${formContainer.querySelector('#cidInput').value}`; break;
                case 'getReviewDislikes': method = 'GET'; endpoint = `/api/review-dislikes/${formContainer.querySelector('#cidInput').value}`; break;
                case 'getHolderReview': method = 'GET'; endpoint = `/api/review-holder/${formContainer.querySelector('#cidInput').value}`; break;
                case 'getStateReview': method = 'GET'; endpoint = `/api/review-state/${formContainer.querySelector('#cidInput').value}`; break;
            }

            const processRequest = async (finalBody) => {
                const fetchOptions = { method: method, headers: { 'Content-Type': 'application/json' } };
                if (method === 'POST') fetchOptions.body = JSON.stringify(finalBody);
                const response = await fetch(endpoint, fetchOptions);
                const result = await response.json();
                displayResults(result);
            };

            if (requiresFile) {
                const file = formContainer.querySelector(`#${fileInputId}`).files[0];
                if (!file) { displayResults({ success: false, message: 'File non selezionato.' }); return; }
                const reader = new FileReader();
                reader.onload = (event) => { body[fileBodyKey] = event.target.result; processRequest(body); };
                reader.readAsText(file);
            } else {
                await processRequest(body);
            }
        } catch (error) {
            displayResults({ success: false, message: `Errore client: ${error.message}` });
        } finally {
            e.target.disabled = false; e.target.textContent = 'Esegui Azione';
        }
    });
});