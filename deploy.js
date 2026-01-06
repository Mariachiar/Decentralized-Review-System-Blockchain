const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path'); // Utile per percorsi più robusti, anche se non strettamente necessario qui

// Configurazione della connessione a Ganache
const web3 = new Web3('http://127.0.0.1:7545');

// Carica ABI e Bytecode per EthrDIDRegistry
const ethrDidAbiPath = path.resolve(__dirname, 'EthrDIDRegistryAbi.json');
const ethrDidBytecodePath = path.resolve(__dirname, 'EthrDIDRegistryBytecode.bin');
const ethrDidAbi = JSON.parse(fs.readFileSync(ethrDidAbiPath, 'utf8'));
const ethrDidBytecode = fs.readFileSync(ethrDidBytecodePath, 'utf8');

// Carica ABI e Bytecode per WebsiteRegisterContract
const websiteRegisterAbiPath = path.resolve(__dirname, 'WebsiteRegisterContractAbi.json');
const websiteRegisterBytecodePath = path.resolve(__dirname, 'WebsiteRegisterContractBytecode.bin');
const websiteRegisterAbi = JSON.parse(fs.readFileSync(websiteRegisterAbiPath, 'utf8'));
const websiteRegisterBytecode = fs.readFileSync(websiteRegisterBytecodePath, 'utf8');

// Carica ABI e Bytecode per WebsiteRegisterContract
const reviewManagerAbiPath = path.resolve(__dirname, 'ReviewManagerContractAbi.json');
const reviewManagerBytecodePath = path.resolve(__dirname, 'ReviewManagerContractBytecode.bin');
const reviewManagerAbi = JSON.parse(fs.readFileSync(reviewManagerAbiPath, 'utf8'));
const reviewManagerBytecode = fs.readFileSync(reviewManagerBytecodePath, 'utf8');

// Carica ABI e Bytecode per WebsiteRegisterContract
const nftAbiPath = path.resolve(__dirname, 'NftContractAbi.json');
const nftBytecodePath = path.resolve(__dirname, 'NftContractBytecode.bin');
const nftAbi = JSON.parse(fs.readFileSync(nftAbiPath, 'utf8'));
const nftBytecode = fs.readFileSync(nftBytecodePath, 'utf8');

// Carica ABI e Bytecode per WebsiteRegisterContract
const rewardManagerAbiPath = path.resolve(__dirname, 'RewardManagerContractAbi.json');
const rewardManagerBytecodePath = path.resolve(__dirname, 'RewardManagerContractBytecode.bin');
const rewardManagerAbi = JSON.parse(fs.readFileSync(rewardManagerAbiPath, 'utf8'));
const rewardManagerBytecode = fs.readFileSync(rewardManagerBytecodePath, 'utf8');

async function deployAllContracts() {
    try {
        // Recupera gli account disponibili da Ganache
        const accounts = await web3.eth.getAccounts();

        if (accounts.length < 2) {
            console.error("Errore: Sono necessari almeno due account in Ganache per deployare entrambi i contratti come specificato.");
            return;
        }

        console.log('Account disponibili:', accounts);
        console.log('----------------------------------------------------');

        // --- Deploy di EthrDIDRegistry (da accounts[0]) ---
        console.log('Inizio deploy di EthrDIDRegistry da account:', accounts[0]);
        const ethrDidContract = new web3.eth.Contract(ethrDidAbi);
        const deployedEthrDidContract = await ethrDidContract
            .deploy({ data: '0x' + ethrDidBytecode }) // '0x' prefisso per bytecode esadecimale
            .send({ from: accounts[0], gas: 4000000 }); // Aumenta il gas se necessario

        console.log('EthrDIDRegistry deployato con successo all\'indirizzo:', deployedEthrDidContract.options.address);
        console.log('----------------------------------------------------');

        // --- Deploy di WebsiteRegisterContract (da accounts[1]) ---
        console.log('Inizio deploy di WebsiteRegisterContract da account:', accounts[1]);
        const websiteRegisterContract = new web3.eth.Contract(websiteRegisterAbi);
        const deployedWebsiteRegisterContract = await websiteRegisterContract
            .deploy({ data: '0x' + websiteRegisterBytecode }) // '0x' prefisso
            .send({ from: accounts[1], gas: 5000000 }); // Potrebbe richiedere più gas a causa delle inizializzazioni nel costruttore

        console.log('WebsiteRegisterContract deployato con successo all\'indirizzo:', deployedWebsiteRegisterContract.options.address);
        console.log('L\'owner di WebsiteRegisterContract dovrebbe essere:', accounts[1]);
        console.log('----------------------------------------------------');

        // --- Deploy di ReviewManagerContract (da accounts[1]) ---
        console.log('Inizio deploy di WebsiteRegisterContract da account:', accounts[1]);
        const reviewManagerContract = new web3.eth.Contract(reviewManagerAbi);
        const deployedReviewManagerContract = await reviewManagerContract
            .deploy({ data: '0x' + reviewManagerBytecode, arguments: [deployedWebsiteRegisterContract.options.address] }) // '0x' prefisso
            .send({ from: accounts[1], gas: 5000000 }); // Potrebbe richiedere più gas a causa delle inizializzazioni nel costruttore

        console.log('ReviewManagerContract deployato con successo all\'indirizzo:', deployedReviewManagerContract.options.address);
        console.log('L\'owner di ReviewManagerContract dovrebbe essere:', accounts[1]);
        console.log('----------------------------------------------------');

        // --- Deploy di Nft (da accounts[1]) ---
        console.log('Inizio deploy di NftContract da account:', accounts[1]);
        const nftContract = new web3.eth.Contract(nftAbi);
        const deployedNftContract = await nftContract
            .deploy({ data: '0x' + nftBytecode}) // '0x' prefisso
            .send({ from: accounts[1], gas: 5000000 }); // Potrebbe richiedere più gas a causa delle inizializzazioni nel costruttore

        console.log('NftContract deployato con successo all\'indirizzo:', deployedNftContract.options.address);
        console.log('----------------------------------------------------');

        // --- Deploy di RewardManagerContract (da accounts[1]) ---
        console.log('Inizio deploy di RewardRegisterContract da account:', accounts[1]);
        const rewardManagerContract = new web3.eth.Contract(rewardManagerAbi);
        const deployedRewardManagerContract = await rewardManagerContract
            .deploy({ data: '0x' + rewardManagerBytecode, arguments: [deployedNftContract.options.address,deployedReviewManagerContract.options.address] }) // '0x' prefisso
            .send({ from: accounts[1], gas: 5000000 }); // Potrebbe richiedere più gas a causa delle inizializzazioni nel costruttore

        console.log('RewardManagerContract deployato con successo all\'indirizzo:', deployedRewardManagerContract.options.address);
        console.log('L\'owner di RewardManagerContract dovrebbe essere:', accounts[1]);
        console.log('----------------------------------------------------');

    } catch (error) {
        console.error('Errore durante il deploy dei contratti:', error);
    }
}

// Chiama la funzione di deploy e gestisce eventuali errori
deployAllContracts();