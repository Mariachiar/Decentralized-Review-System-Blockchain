// public_website/shop-ui.js
document.addEventListener('DOMContentLoaded', async () => {
    // --- Selezione Elementi DOM ---
    const userDIDEl = document.getElementById('userDID');
    const userCredentialsDisplayEl = document.getElementById('userCredentialsDisplay');
    const updateVpFileInput = document.getElementById('updateVpFileInput');
    const updateVpBtn = document.getElementById('updateVpBtn');
    const updateStatusEl = document.getElementById('updateStatus');
    const productsListEl = document.getElementById('productsList');
    const buyStatusEl = document.getElementById('buyStatus');
    const proofContainerEl = document.getElementById('proofContainer');
    const proofVcDisplayEl = document.getElementById('proofVcDisplay');
    const viewMyProductsBtn = document.getElementById('viewMyProductsBtn');
    const myProductsListEl = document.getElementById('myProductsList');
    const returnStatusEl = document.getElementById('returnStatus');
    const logoutBtn = document.getElementById('logoutBtn');
    const productCardTemplate = document.getElementById('product-card-template');
    
    // Nuovi elementi per NFT
    const viewMyNFTsBtn = document.getElementById('viewMyNFTsBtn');
    const myNFTsListEl = document.getElementById('myNFTsList');
    const nftStatusEl = document.getElementById('nftStatus');

    let appState = {};

    function displayStatus(element, message, isError = false) {
        element.textContent = message;
        element.className = 'status';
        if (message) element.classList.add(isError ? 'error' : 'success');
        if (!isError && message) setTimeout(() => { if (element.textContent === message) element.textContent = ''; }, 4000);
    }

    async function loadSessionData() {
        try {
            const response = await fetch('/api/session');
            if (!response.ok) {
                window.location.href = '/login';
                return false;
            }
            const result = await response.json();
            if (result.success) {
                appState = result.data;
                userDIDEl.textContent = appState.did;
                userCredentialsDisplayEl.textContent = JSON.stringify(appState.claims, null, 2);
                return true;
            }
        } catch (error) {
            console.error("Impossibile caricare la sessione:", error);
            window.location.href = '/login';
            return false;
        }
    }

    async function displayProducts() {
        productsListEl.innerHTML = 'Caricamento prodotti...';
        const productIds = ["LIBRO01", "ALCOL01", "EDUCA01", "WEAPN01", "CONFE01", "DIGIT01"];
        
        productsListEl.innerHTML = ''; // Pulisci la lista
        for (const id of productIds) {
            const card = productCardTemplate.content.cloneNode(true);
            const cardElement = card.querySelector('.product-item');
            cardElement.querySelector('.product-id').textContent = id;
            
            const buyButton = cardElement.querySelector('.buy-btn');
            buyButton.dataset.productId = id;

            const reviewLink = cardElement.querySelector('.btn-review');
            reviewLink.href = `/product-reviews.html?product=${id}`;

            productsListEl.appendChild(cardElement);

            fetch(`/api/product-constraints/${id}`)
                .then(res => res.json())
                .then(constraints => {
                    let constraintsText = 'Nessun vincolo specifico.';
                    if (constraints && !constraints.error) {
                        constraintsText = Object.entries(constraints)
                            .filter(([, value]) => value === true || (typeof value === 'string' && value && value.toUpperCase() !== 'ANY'))
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ') || constraintsText;
                    }
                    cardElement.querySelector('.product-constraints').textContent = constraintsText;
                }).catch(err => {
                    console.error("Errore fetch vincoli", err)
                    cardElement.querySelector('.product-constraints').textContent = 'Errore caricamento vincoli.';
                });
        }
    }

    async function viewMyProducts() {
        myProductsListEl.innerHTML = '<li>Caricamento...</li>';
        const response = await fetch('/api/user-products');
        const result = await response.json();
        if (result.success) {
            if (result.products.length === 0) {
                myProductsListEl.innerHTML = '<li>Nessun prodotto acquistato.</li>';
                return;
            }
            myProductsListEl.innerHTML = result.products.map(p => `<li>${p.id} <span>(Reso: ${p.isReturned})${!p.isReturned ? ` <button class="return-btn" data-product-id="${p.id}">Fai Reso</button>` : ''}</span></li>`).join('');
        } else {
            myProductsListEl.innerHTML = `<li>Errore caricamento: ${result.message}</li>`;
        }
    }

    // NUOVA FUNZIONE PER VISUALIZZARE GLI NFT
    async function viewMyNFTs() {
        myNFTsListEl.innerHTML = '<li>Caricamento NFT...</li>';
        try {
            const response = await fetch('/api/user-nfts');
            const result = await response.json();

            if (result.success) {
                if (result.nfts && result.nfts.length > 0) {
                    myNFTsListEl.innerHTML = result.nfts.map(nft => `<li>${nft}</li>`).join('');
                } else {
                    myNFTsListEl.innerHTML = '<li>Nessun NFT posseduto.</li>';
                }
            } else {
                myNFTsListEl.innerHTML = `<li>Errore nel caricamento degli NFT: ${result.message}</li>`;
            }
        } catch (error) {
            console.error("Errore fetch NFT:", error);
            myNFTsListEl.innerHTML = '<li>Errore di comunicazione con il server per gli NFT.</li>';
        }
    }
    
    updateVpBtn.addEventListener('click', () => {
        const file = updateVpFileInput.files[0];
        if (!file) { displayStatus(updateStatusEl, "Seleziona un file VP per l'aggiornamento.", true); return; }
        const reader = new FileReader();
        reader.onload = async (event) => {
            displayStatus(updateStatusEl, "Aggiornamento VP in corso...", false);
            const vpJwt = event.target.result;
            const response = await fetch('/api/update-vp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vpJwt: vpJwt }) });
            const result = await response.json();
            displayStatus(updateStatusEl, result.message, !result.success);
            if (result.success) await loadSessionData();
        };
        reader.readAsText(file);
    });

    productsListEl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('buy-btn')) {
            const productId = e.target.dataset.productId;
            displayStatus(buyStatusEl, `Acquisto di ${productId} in corso...`, false);
            const response = await fetch('/api/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: productId }) });
            const result = await response.json();
            displayStatus(buyStatusEl, result.message, !result.success);
            if (result.success) {
                if (result.proofVc) {
                    proofContainerEl.style.display = 'block';
                    proofVcDisplayEl.textContent = result.proofVc;
                }
                await viewMyProducts();
            }
        }
    });

    myProductsListEl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('return-btn')) {
            const productId = e.target.dataset.productId;
            displayStatus(returnStatusEl, `Reso di ${productId} in corso...`, false);
            const response = await fetch('/api/return', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: productId }) });
            const result = await response.json();
            displayStatus(returnStatusEl, result.message, !result.success);
            if (result.success) await viewMyProducts();
        }
    });

    logoutBtn.addEventListener('click', async () => {
        const response = await fetch('/api/logout', { method: 'POST' });
        const result = await response.json();
        if (result.success) {
            window.location.href = '/login';
        } else {
            alert('Logout fallito.');
        }
    });

    viewMyProductsBtn.addEventListener('click', viewMyProducts);
    viewMyNFTsBtn.addEventListener('click', viewMyNFTs); // Aggiungi l'evento al nuovo pulsante

    // Esecuzione Iniziale al caricamento della pagina
    if (await loadSessionData()) {
        await displayProducts();
        await viewMyProducts();
        await viewMyNFTs(); // Carica anche gli NFT all'avvio
    }
});