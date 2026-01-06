document.addEventListener('DOMContentLoaded', () => {
    // --- Selezione Elementi DOM ---
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const userAccountEl = document.getElementById('userAccount');
    const userDIDEl = document.getElementById('userDID');
    
    const vpFilePathInput = document.getElementById('vpFilePathInput');
    const loginWithVpBtn = document.getElementById('loginWithVpBtn');
    const guestLoginBtn = document.getElementById('guestLoginBtn');
    const loginStatusEl = document.getElementById('loginStatus');
    const userCredentialsDisplayEl = document.getElementById('userCredentialsDisplay');

    const productsListEl = document.getElementById('productsList');
    const buyStatusEl = document.getElementById('buyStatus');

    const viewMyProductsBtn = document.getElementById('viewMyProductsBtn');
    const myProductsListEl = document.getElementById('myProductsList');
    const returnStatusEl = document.getElementById('returnStatus');

    // --- Placeholder per la TUA classe WebsiteRegister ---
    // Questo script assume che tu abbia un file 'WebsiteRegister.js' che espone
    // la classe e che noi possiamo istanziarla qui.
    // Per ora, useremo un oggetto mock per permettere alla UI di funzionare.
    // DOVRAI SOSTITUIRE QUESTO MOCK CON L'ISTANZA REALE DELLA TUA CLASSE.
    let websiteRegister; // Questa sarà l'istanza della tua classe.

    // Elenco dei prodotti da visualizzare (da contratto)
    const productIds = ["LIBRO01", "ALCOL01", "EDUCA01", "WEAPN01", "CONFE01", "DIGIT01"];
    
    // --- Funzioni di Utilità per la UI ---
    function displayStatus(element, message, isError = false) {
        element.textContent = message;
        element.className = 'status'; // Reset
        if (message) {
             element.classList.add(isError ? 'error' : 'success');
        }
    }

    function updateUserInfo(account, did) {
        userAccountEl.textContent = account || 'Non connesso';
        userDIDEl.textContent = did || 'N/A';
    }

    // --- Logica Principale ---

    async function initializeApp() {
        // Qui dovresti inizializzare la tua classe WebsiteRegister
        // Esempio di come potrebbe essere (adattalo alla tua implementazione):
        /*
        try {
            // Assumiamo che il costruttore della tua classe gestisca la connessione web3, ecc.
            websiteRegister = new WebsiteRegister(); 
            await websiteRegister.init(); // Esempio di metodo di inizializzazione
            
            connectWalletBtn.textContent = 'Connesso';
            connectWalletBtn.disabled = true;

            const account = websiteRegister.getCurrentAccount();
            const did = websiteRegister.getCurrentDid();
            updateUserInfo(account, did);
            
            await displayProducts();
            await viewMyProducts();
        } catch(error) {
            console.error("Errore di inizializzazione:", error);
            displayStatus(loginStatusEl, "Errore di connessione al wallet o al contratto.", true);
        }
        */
       console.log("App pronta. Connetti il wallet per iniziare.");
       // Per ora l'inizializzazione reale avverrà al click del pulsante.
    }

    // --- Gestori di Eventi ---

    connectWalletBtn.addEventListener('click', async () => {
        // Questa funzione ora simula l'inizializzazione della tua classe
        displayStatus(loginStatusEl, 'Inizializzazione in corso...', false);
        try {
            // SOSTITUISCI QUESTA PARTE CON LA LOGICA DELLA TUA CLASSE
            // Esempio:
            // websiteRegister = new WebsiteRegister();
            // const connectionData = await websiteRegister.connect(); 
            // updateUserInfo(connectionData.account, connectionData.did);
            
            // Dati Mock per ora:
            const mockConnection = { account: '0x123...abc', did: 'did:ethr:0x123...abc' };
            websiteRegister = new MockWebsiteRegister(mockConnection); // Usa il mock per test UI
            updateUserInfo(mockConnection.account, mockConnection.did);
            
            connectWalletBtn.textContent = 'Connesso';
            connectWalletBtn.disabled = true;
            displayStatus(loginStatusEl, 'Wallet connesso con successo!', false);

            await displayProducts();

        } catch (error) {
            console.error("Errore durante la connessione:", error);
            displayStatus(loginStatusEl, `Errore: ${error.message}`, true);
        }
    });

    loginWithVpBtn.addEventListener('click', async () => {
        if (!websiteRegister) {
            displayStatus(loginStatusEl, "Per favore, connetti prima il wallet.", true);
            return;
        }
        const vpPath = vpFilePathInput.value.trim();
        if (!vpPath) {
            displayStatus(loginStatusEl, "Per favore, specifica il percorso del file VP.", true);
            return;
        }

        displayStatus(loginStatusEl, "Verifica della VP in corso...", false);
        try {
            const result = await websiteRegister.login(vpPath);
            if (result.success) {
                displayStatus(loginStatusEl, result.message, false);
                userCredentialsDisplayEl.textContent = JSON.stringify(result.data.claims, null, 2);
                updateUserInfo(result.data.holder, result.data.holder); // Aggiorna UI con DID dalla VP
            } else {
                displayStatus(loginStatusEl, `Login fallito: ${result.message}`, true);
            }
        } catch (error) {
            console.error("Errore chiamata login:", error);
            displayStatus(loginStatusEl, `Errore: ${error.message}`, true);
        }
    });

    guestLoginBtn.addEventListener('click', async () => {
        if (!websiteRegister) {
            displayStatus(loginStatusEl, "Per favore, connetti prima il wallet.", true);
            return;
        }
        // Simula il login come ospite aggiornando lo stato interno
        await websiteRegister.loginAsGuest();
        updateUserInfo('N/A', '0 (Ospite)');
        userCredentialsDisplayEl.textContent = "Credenziali standard per utente ospite.";
        displayStatus(loginStatusEl, "Accesso effettuato come Ospite.", false);
        await viewMyProducts(); // Aggiorna la vista dei prodotti
    });
    
    async function displayProducts() {
        if (!websiteRegister) return;

        productsListEl.innerHTML = 'Caricamento prodotti...';
        let content = '';
        for (const productId of productIds) {
            // Assumo che la tua classe abbia un metodo per ottenere i vincoli
            const constraints = await websiteRegister.getProductConstraints(productId); 
            content += `
                <div class="product-item" id="product-${productId}">
                    <h3>${productId}</h3>
                    <p><strong>Vincoli:</strong> ${constraints}</p>
                    <button class="buy-btn" data-product-id="${productId}">Compra</button>
                </div>
            `;
        }
        productsListEl.innerHTML = content;
    }
    
    productsListEl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('buy-btn')) {
            const productId = e.target.dataset.productId;
            displayStatus(buyStatusEl, `Acquisto di ${productId} in corso...`, false);
            try {
                const result = await websiteRegister.buyProduct(productId);
                if (result.success) {
                    displayStatus(buyStatusEl, result.message, false);
                    await viewMyProducts(); // Aggiorna la lista dei prodotti acquistati
                } else {
                    displayStatus(buyStatusEl, `Acquisto fallito: ${result.message}`, true);
                }
            } catch(error) {
                displayStatus(buyStatusEl, `Errore: ${error.message}`, true);
            }
        }
    });

    viewMyProductsBtn.addEventListener('click', viewMyProducts);

    async function viewMyProducts() {
        if (!websiteRegister) {
            myProductsListEl.innerHTML = '<li>Connetti prima il wallet.</li>';
            return;
        }
        myProductsListEl.innerHTML = '<li>Caricamento...</li>';
        try {
            const products = await websiteRegister.getUserProducts();
            if (products.length === 0) {
                myProductsListEl.innerHTML = '<li>Nessun prodotto acquistato.</li>';
                return;
            }
            let content = '';
            for (const product of products) {
                content += `
                    <li>
                        ${product.id} 
                        <span>
                            (Reso: ${product.isReturned})
                            ${!product.isReturned ? `<button class="return-btn" data-product-id="${product.id}">Fai Reso</button>` : ''}
                        </span>
                    </li>`;
            }
            myProductsListEl.innerHTML = content;
        } catch (error) {
            myProductsListEl.innerHTML = `<li>Errore nel caricamento dei prodotti.</li>`;
            console.error(error);
        }
    }
    
    myProductsListEl.addEventListener('click', async (e) => {
        if (e.target.classList.contains('return-btn')) {
            const productId = e.target.dataset.productId;
            displayStatus(returnStatusEl, `Reso di ${productId} in corso...`, false);
            try {
                const result = await websiteRegister.returnProduct(productId);
                 if (result.success) {
                    displayStatus(returnStatusEl, result.message, false);
                    await viewMyProducts(); 
                } else {
                    displayStatus(returnStatusEl, `Reso fallito: ${result.message}`, true);
                }
            } catch(error) {
                displayStatus(returnStatusEl, `Errore: ${error.message}`, true);
            }
        }
    });


    // --- CLASSE MOCK (da sostituire con la tua) ---
    // Ho creato questa classe fittizia per mostrarti come la UI interagisce con i metodi.
    // La tua classe reale conterrà le chiamate a Ethers.js/Web3.js e la logica di `verifyPresentation`.
    class MockWebsiteRegister {
        constructor(connectionData) {
            this.currentUser = connectionData;
            this.userClaims = {};
            this.userProducts = [];
            console.log("MockWebsiteRegister inizializzata.");
        }
        
        async login(filePath) {
            console.log(`Mock: Chiamato login con path: ${filePath}`);
            if (filePath.includes('error')) {
                return { success: false, message: "VP non valida (simulato)." };
            }
            this.userClaims = { nation: 'ITA', over18: true, sex: 'M', weaponPermit: false, isStudent: true, isTeacher: false };
            this.currentUser.did = 'did:ethr:0xSimulatedUser...';
            return {
                success: true,
                message: "Login con VP riuscito (simulato).",
                data: {
                    holder: this.currentUser.did,
                    claims: this.userClaims
                }
            };
        }
        
        async loginAsGuest() {
            this.currentUser.did = '0 (Ospite)';
            this.userClaims = { nation: '', over18: false, sex: '', weaponPermit: false, isStudent: false, isTeacher: false };
        }

        async getProductConstraints(productId) {
            // Simula il ritorno dei vincoli
            return `Nazione: ANY, Over18: false (simulato per ${productId})`;
        }

        async buyProduct(productId) {
            console.log(`Mock: Tentativo di acquisto di ${productId} per ${this.currentUser.did}`);
            // Simula una logica di acquisto
            if (this.currentUser.did === '0 (Ospite)') {
                return { success: false, message: "Gli ospiti non possono acquistare." };
            }
            if (this.userProducts.find(p => p.id === productId)) {
                 return { success: false, message: "Prodotto già acquistato." };
            }
            this.userProducts.push({id: productId, isReturned: false});
            return { success: true, message: `Acquisto di ${productId} riuscito (simulato)!` };
        }
        
        async getUserProducts() {
            return this.userProducts;
        }

        async returnProduct(productId) {
            const product = this.userProducts.find(p => p.id === productId);
            if (product && !product.isReturned) {
                product.isReturned = true;
                return { success: true, message: `Reso di ${productId} effettuato.` };
            }
            return { success: false, message: "Prodotto non trovato o già reso." };
        }
    }

    // Inizializza l'app al caricamento della pagina
    initializeApp();
});