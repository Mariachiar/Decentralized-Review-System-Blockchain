// WebsiteRegister.js
const { Web3 } = require('web3');
const fs = require('fs');
require('dotenv').config();

const { EthrDID } = require('ethr-did');
const { createVerifiableCredentialJwt, verifyPresentation } = require('did-jwt-vc');
const { Resolver } = require('did-resolver');
const ethrDidResolver = require('ethr-did-resolver');
const UserDirectory = require('./UserDirectory');

let instance = null;

class WebsiteRegister {
    constructor() {
        this.isUserLoggedIn = false;
        this.currentHolderDid = null;
        this.currentClaims = null;
        this.lastVpJwt = "0.0.0";

        this.providerUrl = process.env.PROVIDER_URL || 'http://127.0.0.1:7545';
        this.web3 = new Web3(this.providerUrl);
        const abi = JSON.parse(fs.readFileSync('WebsiteRegisterContractAbi.json', 'utf8'));
        const contractAddress = process.env.WEBSITE_REGISTRY_ADDRESS;
        if (!contractAddress) throw new Error("WEBSITE_REGISTRY_ADDRESS non trovato nel file .env");
        this.contract = new this.web3.eth.Contract(abi, contractAddress);

        const abi2 = JSON.parse(fs.readFileSync('RewardManagerContractAbi.json', 'utf8'));
        const contractAddress2 = process.env.REWARDMANAGER_REGISTRY_ADDRESS;
        if (!contractAddress2) throw new Error("REWARDMANAGER_REGISTRY_ADDRESS non trovato nel file .env");
        this.contract2 = new this.web3.eth.Contract(abi2, contractAddress2);
        
        this.verifierDid = process.env.WEBSITE_DID;
        this.verifierPrivateKey = process.env.WEBSITE_PRIVATE_KEY;
        this.didResolver = null;
        console.log("Istanza WebsiteRegister creata.");
    }

    static getInstance() {
        if (!instance) {
            instance = new WebsiteRegister();
        }
        return instance;
    }

    async _getResolver() {
        if (this.didResolver) return this.didResolver;
        const chainId = await this.web3.eth.getChainId();
        const registryAddress = process.env.ETHRDID_REGISTRY_ADDRESS;
        if (!registryAddress) throw new Error("ETHRDID_REGISTRY_ADDRESS non trovato nel file .env");

        const resolverConfig = {
            networks: [{
                name: '0x' + chainId.toString(16), rpcUrl: this.providerUrl,
                chainId: chainId, registry: registryAddress
            }]
        };
        this.didResolver = new Resolver(ethrDidResolver.getResolver(resolverConfig));
        return this.didResolver;
    }

    async _checkVP(vpJwt) {
        const didResolver = await this._getResolver();
        try {
            let result = await verifyPresentation(vpJwt, didResolver);
            
            let issuerDid=result.verifiablePresentation.verifiableCredential[0].issuer.id
            console.log(issuerDid);

            if(issuerDid == process.env.SPID_DID)
                return result;
            else
             return { verified: false, error: "Issuer non corretto" };
        } catch (err) {
            console.error("\nErrore durante la verifica della Presentation:", err.message);
            return { verified: false, error: err.message };
        }
    }

    _extractClaims(verifiableCredentials) {
        let claims = { nation: '', over18: false, sex: '', weaponPermit: false, isTeacher: false, isStudent: false };
        if (!verifiableCredentials || verifiableCredentials.length === 0) return claims;

        let claimsFound = {};
        for (const vc of verifiableCredentials) {
            if (vc && vc.credentialSubject) {
                const subject = vc.credentialSubject;
                if (!claimsFound.nation && subject.nation !== undefined) { claims.nation = subject.nation; claimsFound.nation = true; }
                if (!claimsFound.over18 && subject.over18 !== undefined) { claims.over18 = subject.over18; claimsFound.over18 = true; }
                if (!claimsFound.sex && subject.sex !== undefined) { claims.sex = subject.sex; claimsFound.sex = true; }
                if (!claimsFound.weaponPermit && subject.weaponPermit !== undefined) { claims.weaponPermit = subject.weaponPermit; claimsFound.weaponPermit = true; }
                if (!claimsFound.isTeacher && subject.isTeacher !== undefined) { claims.isTeacher = subject.isTeacher; claimsFound.isTeacher = true; }
                if (!claimsFound.isStudent && subject.isStudent !== undefined) { claims.isStudent = subject.isStudent; claimsFound.isStudent = true; }
            }
        }
        return claims;
    }

    loginAsGuest() {
        this.isUserLoggedIn = true;
        this.currentHolderDid = "0";
        this.currentClaims = { nation: '', over18: false, sex: '', weaponPermit: false, student: false, teacher: false };
        return { success: true, message: "Accesso come ospite riuscito." };
    }

    async _loginOrUpdate(vpJwt) {
        let result=await this._readVp(vpJwt);

        const verificationResult = await this._checkVP(vpJwt);
        if (!verificationResult || !verificationResult.verified) {
            return { success: false, message: "Presentazione Verificabile (VP) non valida." };
        }
        
        const presentation = verificationResult.verifiablePresentation;
        const holderDid = presentation.holder;

        const holderAddr= holderDid.slice(15,holderDid.length);
        let blacklist= await this.contract2.methods.getBlacklist().call()
        let addr;
        for( addr of blacklist){
            if(addr == holderAddr ){
                return {success: false, message: " Holder è in blacklist non ti puoi loggare "};
            }
        }

        const extractedClaims = this._extractClaims(presentation.verifiableCredential);

        try {
            const accounts = await this.web3.eth.getAccounts();

            if(result){
                
                let isRegistered = await this.contract.methods.IsUserRegistered(holderDid).call();
                console.log("Sono registrato? ", isRegistered, holderDid);
                if(!isRegistered){
                    await this.contract2.methods.incrementTotalHolders().send({ from: accounts[1], gas: 3000000 })
                }
                await this.contract.methods.login(holderDid, extractedClaims.nation, extractedClaims.over18, extractedClaims.sex, extractedClaims.weaponPermit, extractedClaims.isStudent, extractedClaims.isTeacher).send({ from: accounts[1], gas: 3000000 });
                

            
            }
            this.isUserLoggedIn = true;
            this.currentHolderDid = holderDid;
            this.currentClaims = extractedClaims;
            this.lastVpJwt = vpJwt;
            
            return { success: true, message: "Credenziali registrate/aggiornate on-chain.", data: { holder: holderDid, claims: extractedClaims } };
        } catch (err) {
            return { success: false, message: "Errore di login " };
        }
    }

    async login(vpJwt) {
        return this._loginOrUpdate(vpJwt);
    }
    
    async updateVp(vpJwt) {
        return this._loginOrUpdate(vpJwt);
    }

    async _readVp(vpJwt2){
        let success=false;
        try {
        const parts2 = vpJwt2.split('.');
        const parts1 = this.lastVpJwt.split('.');

        if(parts1[1] != parts2[1]){
            success=true;
            this.lastVpJwt=vpJwt2;
        }

        return success;

        
    } catch (err) {
        console.error("Errore durante la lettura del file VP:", err.message);
        return success;
    }
    }

    _parseRevertReason(error) {
        let revertReason = "Errore sconosciuto durante l'esecuzione del contratto.";
        if (error.cause && typeof error.cause.message === 'string') {
            const parts = error.cause.message.split('revert ');
            if (parts.length > 1) revertReason = parts[1];
        }
        return revertReason;
    }
    
    async _createProof(userProducts) {
        const uniqueProducts = [...new Set(userProducts)];
        if (uniqueProducts.length === 0) return null;

        const acquistiList = uniqueProducts.map(id => ({ productId: id }));

        const vcPayload = {
            sub: this.currentHolderDid,
            nbf: Math.floor(Date.now() / 1000),
            vc: {
                "@context": ["https://www.w3.org/2018/credentials/v1", `http://localhost:${process.env.PORT || 3001}/ecommerce-vc-context.jsonld`],
                type: ["VerifiableCredential", "ProofOfPurchaseCredential"],
                credentialSubject: {
                    id: this.currentHolderDid,
                    purchases: acquistiList
                }
            }
        };
        try {
            const chainId = await this.web3.eth.getChainId();
            const issuerEthrDid = new EthrDID({ identifier: this.verifierDid, privateKey: this.verifierPrivateKey, provider: this.web3.currentProvider, chainNameOrId: '0x' + chainId.toString(16) });
            return await createVerifiableCredentialJwt(vcPayload, issuerEthrDid);
        } catch(err) {
            console.error("Impossibile creare prova d'acquisto VC:", err);
            return null;
        }
    }

    async buy(productId) {

        var proofVc='Non sei autenticato, quindi non puoi ricevere la proof per inserire le recensioni';
        if (!this.isUserLoggedIn  ) return { success: false, message: "Nessun utente loggato." };
        const accounts = await this.web3.eth.getAccounts();
        try {
            await this.contract.methods.buy(this.currentHolderDid, productId).send({ from: accounts[1], gas: 3000000 });
            
            const userProductsList = await this.contract.methods.getUserProductList(this.currentHolderDid).call();
            if(this.currentHolderDid != '0')
                proofVc = await this._createProof(userProductsList);

            return { success: true, message: `Acquisto di ${productId} riuscito!`, proofVc: proofVc };
        } catch (err) {
            return { success: false, message: this._parseRevertReason(err) };
        }
    }

    async returnProduct(productId) {
        if (!this.isUserLoggedIn) return { success: false, message: "Nessun utente loggato." };
        const accounts = await this.web3.eth.getAccounts();
        try {
            await this.contract.methods.returnProduct(this.currentHolderDid, productId).send({ from: accounts[1], gas: 3000000 });
            return { success: true, message: `Reso di ${productId} effettuato con successo.` };
        } catch (err) {
            return { success: false, message: this._parseRevertReason(err) };
        }
    }

    async getUserProducts() {
        if (!this.isUserLoggedIn || this.currentHolderDid === "0") return { success: true, products: [] };
        try {
            const productIds = await this.contract.methods.getUserProductList(this.currentHolderDid).call();
            const productsWithStatus = [];
            for (const id of productIds) {
                const isReturned = await this.contract.methods.getProductReturnStatus(this.currentHolderDid, id).call();
                productsWithStatus.push({ id, isReturned });
            }
            return { success: true, products: productsWithStatus };
        } catch (error) {
            return { success: false, message: error.message, products: [] };
        }
    }
    
    async getProductConstraints(productId) {
        try {
            const constraints = await this.contract.methods.getProductConstraints(productId).call();
            return {
                nation: constraints.nation,
                over18: constraints.over18,
                sex: constraints.sex,
                weaponPermit: constraints.weaponPermit,
                student: constraints.student,
                teacher: constraints.teacher
            };
        } catch (error) {
            return { error: `Impossibile recuperare vincoli per ${productId}` };
        }
    }

    logout() {
        this.isUserLoggedIn = false;
        this.currentHolderDid = null;
        this.currentClaims = null;
        this.lastVpJwt = "0.0.0";
        console.log("Sessione utente resettata (logout).");
        return { success: true, message: "Logout effettuato con successo." };
    }

    async getNFTList(didHolder){
        let nftList = await this.contract2.methods.getHolderNftList(didHolder.slice(15, didHolder.length)).call();
        console.log(await this.contract2.methods.getPositiveReputation(didHolder.slice(15, didHolder.length)).call());
        console.log(await this.contract2.methods.getNegativeReputation(didHolder.slice(15, didHolder.length)).call());

        console.log("lista di NFT:" , nftList);
        const abi3 = JSON.parse(fs.readFileSync('NftContractAbi.json', 'utf8'));
        const contractAddress3 = process.env.NFT_REGISTRY_ADDRESS;
        if (!contractAddress3) throw new Error("NFT_REGISTRY_ADDRESS non trovato nel file .env");
        this.contract3 = new this.web3.eth.Contract(abi3, contractAddress3);

        let nftUri = await Promise.all(nftList.map(id => this.contract3.methods.getUri(id).call()));
        

        console.log(nftUri)
        return nftUri;
    }


}

module.exports = WebsiteRegister;