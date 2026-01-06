const solc = require('solc');
const fs = require('fs');
const path = require('path');

// --- Compilazione per EthrDIDRegistry.sol (codice esistente) ---
const ethrDidContractPath = path.resolve(__dirname, 'EthrDIDRegistry.sol');
const ethrDidSourceCode = fs.readFileSync(ethrDidContractPath, 'utf8');

// --- Aggiunta per WebsiteRegisterContract.sol (nuovo contratto) ---
const websiteRegisterContractPath = path.resolve(__dirname, 'WebsiteRegisterContract.sol'); 
const websiteRegisterSourceCode = fs.readFileSync(websiteRegisterContractPath, 'utf8');

// --- Aggiunta per ReviewManagerContract.sol (nuovo contratto) ---
const reviewManagerContractPath = path.resolve(__dirname, 'ReviewManagerContract.sol'); 
const reviewManagerSourceCode = fs.readFileSync(reviewManagerContractPath, 'utf8');

// --- Aggiunta per Nft.sol (nuovo contratto) ---
const nftContractPath = path.resolve(__dirname, 'Nft.sol'); 
const nftSourceCode = fs.readFileSync(nftContractPath, 'utf8');

// --- Aggiunta per rewardManagerContract.sol (nuovo contratto) ---
const rewardManagerContractPath = path.resolve(__dirname, 'RewardManagerContract.sol'); 
const rewardManagerSourceCode = fs.readFileSync(rewardManagerContractPath, 'utf8');


// Compila entrambi i contratti
const input = {
    language: 'Solidity',
    sources: {
        'EthrDIDRegistry.sol': { content: ethrDidSourceCode },
        'WebsiteRegisterContract.sol': { content: websiteRegisterSourceCode }, // Aggiunto il nuovo contratto
        'ReviewManagerContract.sol': { content: reviewManagerSourceCode }, // Aggiunto il nuovo contratto
        'Nft.sol': {content: nftSourceCode },
        'RewardManagerContract.sol': { content: rewardManagerSourceCode }

    },
    settings: {
        outputSelection: {
            '*': { // Seleziona tutti i file
                '*': ['*'], // Seleziona tutti i contratti e tutti gli output (abi, evm.bytecode, ecc.)
            },
        },
    },
};

console.log('Starting compilation...');
const compiledContractsOutput = JSON.parse(solc.compile(JSON.stringify(input)));
console.log('Compilation finished.');

// Gestione degli errori di compilazione
if (compiledContractsOutput.errors) {
    console.error('Compilation errors:');
    compiledContractsOutput.errors.forEach(err => {
        console.error(`- ${err.formattedMessage}`);
    });
    // Esci se ci sono errori gravi che impediscono l'output
    const hasFatalErrors = compiledContractsOutput.errors.some(err => err.severity === 'error');
    if (hasFatalErrors) {
        console.error('Fatal compilation errors occurred. Exiting.');
        process.exit(1);
    }
}

// Estrae ABI e Bytecode per EthrDIDRegistry
// Assicurati che 'EthereumDIDRegistry' sia il nome esatto del contratto dentro EthrDIDRegistry.sol
const ethrDidRegistryContractName = 'EthereumDIDRegistry'; // Nome del contratto dentro EthrDIDRegistry.sol
if (compiledContractsOutput.contracts &&
    compiledContractsOutput.contracts['EthrDIDRegistry.sol'] &&
    compiledContractsOutput.contracts['EthrDIDRegistry.sol'][ethrDidRegistryContractName]) {

    const ethrDidAbi = compiledContractsOutput.contracts['EthrDIDRegistry.sol'][ethrDidRegistryContractName].abi;
    const ethrDidBytecode = compiledContractsOutput.contracts['EthrDIDRegistry.sol'][ethrDidRegistryContractName].evm.bytecode.object;

    // Salva ABI e Bytecode per EthrDIDRegistry
    fs.writeFileSync('EthrDIDRegistryAbi.json', JSON.stringify(ethrDidAbi, null, 2));
    fs.writeFileSync('EthrDIDRegistryBytecode.bin', ethrDidBytecode);
    console.log('EthrDIDRegistry ABI and Bytecode saved!');
} else {
    console.error(`Could not find compiled output for EthrDIDRegistry.sol -> ${ethrDidRegistryContractName}. Check contract name and compilation output.`);
}

// Estrae ABI e Bytecode per WebsiteRegisterContract
// Assicurati che 'WebsiteRegisterContract' sia il nome esatto del contratto dentro WebsiteRegisterContract.sol
const websiteRegisterContractName = 'WebsiteRegisterContract'; // Nome del contratto dentro WebsiteRegisterContract.sol
if (compiledContractsOutput.contracts &&
    compiledContractsOutput.contracts['WebsiteRegisterContract.sol'] &&
    compiledContractsOutput.contracts['WebsiteRegisterContract.sol'][websiteRegisterContractName]) {

    const websiteRegisterAbi = compiledContractsOutput.contracts['WebsiteRegisterContract.sol'][websiteRegisterContractName].abi;
    const websiteRegisterBytecode = compiledContractsOutput.contracts['WebsiteRegisterContract.sol'][websiteRegisterContractName].evm.bytecode.object;

    // Salva ABI e Bytecode per WebsiteRegisterContract
    fs.writeFileSync('WebsiteRegisterContractAbi.json', JSON.stringify(websiteRegisterAbi, null, 2));
    fs.writeFileSync('WebsiteRegisterContractBytecode.bin', websiteRegisterBytecode);
    console.log('WebsiteRegisterContract ABI and Bytecode saved!');
} else {
    console.error(`Could not find compiled output for WebsiteRegisterContract.sol -> ${websiteRegisterContractName}. Check contract name and compilation output.`);
}


const reviewManagerContractName = 'ReviewManagerContract'; // Nome del contratto dentro WebsiteRegisterContract.sol
if (compiledContractsOutput.contracts &&
    compiledContractsOutput.contracts['ReviewManagerContract.sol'] &&
    compiledContractsOutput.contracts['ReviewManagerContract.sol'][reviewManagerContractName]) {

    const reviewManagerAbi = compiledContractsOutput.contracts['ReviewManagerContract.sol'][reviewManagerContractName].abi;
    const reviewManagerBytecode = compiledContractsOutput.contracts['ReviewManagerContract.sol'][reviewManagerContractName].evm.bytecode.object;

    // Salva ABI e Bytecode per WebsiteRegisterContract
    fs.writeFileSync('ReviewManagerContractAbi.json', JSON.stringify(reviewManagerAbi, null, 2));
    fs.writeFileSync('ReviewManagerContractBytecode.bin', reviewManagerBytecode);
    console.log('ReviewManagerContract ABI and Bytecode saved!');
} else {
    console.error(`Could not find compiled output for ReviewManagerContract.sol -> ${reviewManagerContractName}. Check contract name and compilation output.`);
}

const nftContractName = 'Nft'; // Nome del contratto dentro WebsiteRegisterContract.sol
if (compiledContractsOutput.contracts &&
    compiledContractsOutput.contracts['Nft.sol'] &&
    compiledContractsOutput.contracts['Nft.sol'][nftContractName]) {

    const nftAbi = compiledContractsOutput.contracts['Nft.sol'][nftContractName].abi;
    const nftBytecode = compiledContractsOutput.contracts['Nft.sol'][nftContractName].evm.bytecode.object;

    // Salva ABI e Bytecode per WebsiteRegisterContract
    fs.writeFileSync('NftContractAbi.json', JSON.stringify(nftAbi, null, 2));
    fs.writeFileSync('NftContractBytecode.bin', nftBytecode);
    console.log('NftContract ABI and Bytecode saved!');
} else {
    console.error(`Could not find compiled output for NftContract.sol -> ${nftContractName}. Check contract name and compilation output.`);
}

const rewardManagerContractName = 'RewardManagerContract'; // Nome del contratto dentro WebsiteRegisterContract.sol
if (compiledContractsOutput.contracts &&
    compiledContractsOutput.contracts['RewardManagerContract.sol'] &&
    compiledContractsOutput.contracts['RewardManagerContract.sol'][rewardManagerContractName]) {

    const rewardManagerAbi = compiledContractsOutput.contracts['RewardManagerContract.sol'][rewardManagerContractName].abi;
    const rewardManagerBytecode = compiledContractsOutput.contracts['RewardManagerContract.sol'][rewardManagerContractName].evm.bytecode.object;

    // Salva ABI e Bytecode per WebsiteRegisterContract
    fs.writeFileSync('RewardManagerContractAbi.json', JSON.stringify(rewardManagerAbi, null, 2));
    fs.writeFileSync('RewardManagerContractBytecode.bin', rewardManagerBytecode);
    console.log('RewardManagerContract ABI and Bytecode saved!');
} else {
    console.error(`Could not find compiled output for RewardManagerContract.sol -> ${rewardManagerContractName}. Check contract name and compilation output.`);
}


console.log('Script finished.');