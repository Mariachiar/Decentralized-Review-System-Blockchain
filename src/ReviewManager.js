const { Web3 } = require('web3');
const fs = require('fs');
const fs2 = require('fs').promises; 
require('dotenv').config();

const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const { EthrDID } = require('ethr-did');
const { createVerifiableCredentialJwt, verifyPresentation } = require('did-jwt-vc');
const { Resolver } = require('did-resolver');
const ethrDidResolver = require('ethr-did-resolver');

const WebsiteRegister = require('./WebsiteRegister');

let instance = null;

class ReviewManager{

    constructor() {
        this.verifierDid = process.env.WEBSITE_DID;
        this.didResolver = null;
        this.providerUrl = process.env.PROVIDER_URL;
        this.web3 = new Web3(this.providerUrl);
        const abi = JSON.parse(fs.readFileSync('ReviewManagerContractAbi.json', 'utf8'));
        const contractAddress = process.env.REVIEWMANAGER_REGISTRY_ADDRESS;
        if (!contractAddress) throw new Error("REVIEWMANAGER_REGISTRY_ADDRESS non trovato nel file .env");
        this.contract = new this.web3.eth.Contract(abi, contractAddress);

        
        const abi2 = JSON.parse(fs.readFileSync('WebsiteRegisterContractAbi.json', 'utf8'));
        const contractAddress2 = process.env.WEBSITE_REGISTRY_ADDRESS;
        if (!contractAddress2) throw new Error("Website_REGISTRY_ADDRESS non trovato nel file .env");
        this.contract2 = new this.web3.eth.Contract(abi2, contractAddress2);

        const abi3 = JSON.parse(fs.readFileSync('RewardManagerContractAbi.json', 'utf8'));
        const contractAddress3 = process.env.REWARDMANAGER_REGISTRY_ADDRESS;
        if (!contractAddress3) throw new Error("REWARDMANAGER_REGISTRY_ADDRESS non trovato nel file .env");
        this.contract3 = new this.web3.eth.Contract(abi3, contractAddress3);


        
    

        
        console.log("Istanza ReviewManager creata.");
    }

    static getInstance() {
        if (!instance) {
            instance = new ReviewManager();
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

    _extractClaims(verifiableCredentialsProof) {
        let claims = { purchases: [] };
        if (!verifiableCredentialsProof || verifiableCredentialsProof.length === 0) return claims;

        let claimsFound = {};
        for (const vc of verifiableCredentialsProof) {
            if (vc && vc.credentialSubject) {
                const subject = vc.credentialSubject;
                if (!claimsFound.purchases && subject.purchases !== undefined){
                    claims.purchases = subject.purchases; 
                    claimsFound.purchases = true;
                }
            }
        }
        return claims;
    }

    async sendReviewToIPFS(review){
        const filePath = "./IPFS/review.txt";
        await fs2.writeFile(filePath, review, 'utf8');
        console.log(` VP creata e salvata con successo nel file: IPFS/review.txt`);
        return await this._uploadToIPFS(filePath); //ritorna il cid
    }

    // ----- Direct upload function via HTTP POST -----
    async _uploadToIPFS(filePath) {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath));
        const res = await axios.post('http://localhost:5001/api/v0/add', form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        });
        let data = res.data;
        if (typeof data === 'string') {
            const lines = data.trim().split('\n');
            data = JSON.parse(lines[lines.length - 1]);
            }
        return data.Hash;
    }

    // ----- Direct download function via HTTP POST -----
    async downloadFromIPFS(cid, outputPath) {
        try {
            const res = await axios.post(
                'http://localhost:5001/api/v0/cat',
                null,
                {
                    params: { arg: cid },
                    responseType: 'stream',
                    timeout: 500
                }
            );

            return new Promise((resolve, reject) => {
                const writer = fs.createWriteStream(outputPath);
                res.data.pipe(writer);
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

        } catch (err) {
            console.error("Errore durante il download da IPFS:", err.message);
            throw err; // Propaga l'errore per il catch esterno
        }
    }

    async _checkVPProof(vpJwtProof) {
        const didResolver = await this._getResolver();
        
        try {
            let result= await verifyPresentation(vpJwtProof, didResolver); 
            
            let issuerDid=result.verifiablePresentation.verifiableCredential[0].issuer.id
            console.log(issuerDid);

            if(issuerDid == process.env.WEBSITE_DID)
                return result;
            else
             return { verified: false, error: "Issuer non corretto" };

        } catch (err) {
            console.error("\nErrore durante la verifica della Presentation:", err.message);
            return { verified: false, error: err.message };
        }    
    }

    async _checkIpfsEexistence(cid){

        try{
            await this.downloadFromIPFS(cid,"../RECENSIONEBELLADELLIBRO.txt");
            console.log("File scaricato!")
            return true
        }catch(err){
            console.log("Cid invalido");
            return false;
        }


    }

    async _checkClaims(extractedClaims, productId){
        let find = false;
        for(const prodDict of extractedClaims.purchases){
            if(prodDict.productId == productId){
                find = true;
                break;
            }
        }
        return find;

    }

    async insertReview(vpJwtProof, cid, productId){
        const verificationResult = await this._checkVPProof(vpJwtProof);
        if (!verificationResult || !verificationResult.verified) {
            return { success: false, message: "Presentazione Verificabile (Proof) non valida." };
        }
        
        const presentation = verificationResult.verifiablePresentation;
        const holderDid = presentation.holder;
        const holderAddress = holderDid.slice(15,holderDid.length);

        let blacklist= await this.contract3.methods.getBlacklist().call()
        let addr;
        for( addr of blacklist){
            if(addr == holderAddress ){
                return {success: false, message: " Sei in blacklist non ti puoi loggare o inserire nuove recensioni."};
            }
        }

        const extractedClaims = this._extractClaims(presentation.verifiableCredential);

        
        console.log(extractedClaims.purchases)
        let find = this._checkClaims(extractedClaims, productId);

        

        if(await this._checkIpfsEexistence(cid) == false)
            return { success: false, message: "Hai inserito un cid non valido." };

        

        try {
            if(find){
                await this.contract.methods.insertReview(productId, cid, holderAddress, holderDid).send({ from: holderAddress, gas: 3000000 });
                return { success: true, message: "Recensione inserita con successo", data: { holder: holderDid, cid: cid, productId: productId }};
            }
            else
                return { success: false, message: "Stai recensendo un prodotto che non hai acquistato." };
        } catch (err) {
            return { success: false, message: "Inserimento della recensione fallita." };
        }
    }

    async modifyReview(vpJwtProof, oldCid, newCid, productId){
        const verificationResult = await this._checkVPProof(vpJwtProof);
        if (!verificationResult || !verificationResult.verified) {
            return { success: false, message: "Presentazione Verificabile (Proof) non valida." };
        }
        
        const presentation = verificationResult.verifiablePresentation;
        const holderDid = presentation.holder;
        const holderAddress = holderDid.slice(15,holderDid.length);
        let blacklist= await this.contract3.methods.getBlacklist().call()
        let addr;
        for( addr of blacklist){
            if(addr == holderAddress ){
                return {success: false, message: " Sei in blacklist non ti puoi loggare o inserire nuove recensioni."};
            }
        }
        const extractedClaims = this._extractClaims(presentation.verifiableCredential);

        console.log(extractedClaims.purchases);
        let find = this._checkClaims(extractedClaims, productId);

        

        if(await this._checkIpfsEexistence(oldCid) == false)
            return { success: false, message: "Hai inserito un cid non valido." };
        if(await this._checkIpfsEexistence(newCid) == false)
            return { success: false, message: "Hai inserito un cid non valido." };
        

        try {
            //const accounts = await this.web3.eth.getAccounts();
            if(find){
                await this.contract.methods.modifyReview(productId, oldCid, newCid, holderAddress, holderDid).send({ from: holderAddress, gas: 3000000 });
                return { success: true, message: "Recensione modificata con successo", data: { holder: holderDid, cid: newCid, productId: productId }};
            }
            else
                return { success: false, message: "Stai recensendo un prodotto che non hai acquistato." };
        } catch (err) {
            return { success: false, message: "Caricamento della recensione non riuscito" };
        }
    }

    async deleteReview(vpJwtProof, cid, productId){
        const verificationResult = await this._checkVPProof(vpJwtProof);
        if (!verificationResult || !verificationResult.verified) {
            return { success: false, message: "Presentazione Verificabile (Proof) non valida." };
        }
        
        const presentation = verificationResult.verifiablePresentation;
        const holderDid = presentation.holder;
        const holderAddress = holderDid.slice(15,holderDid.length);

        let blacklist= await this.contract3.methods.getBlacklist().call()
        
        let addr;
        for( addr of blacklist){
            if(addr == holderAddress ){
                return {success: false, message: " Sei in blacklist non ti puoi loggare o inserire nuove recensioni."};
            }
        }

        const extractedClaims = this._extractClaims(presentation.verifiableCredential);

        console.log(extractedClaims.purchases)
       
        let find = this._checkClaims(extractedClaims, productId);
        

        if(await this._checkIpfsEexistence(cid) == false)
            return { success: false, message: "Hai inserito un cid non valido." };

        try {
            if(find){
                await this.contract.methods.deleteReview(productId, cid, holderAddress, holderDid).send({ from: holderAddress, gas: 3000000 });
                return { success: true, message: "Recensione cancellata con successo", data: { holder: holderDid, cid: cid, productId: productId }};
            }
            else
                return { success: false, message: "Stai cancellando la recensione di un prodotto che non hai acquistato." };
        } catch (err) {
            return { success: false, message: "Cancellazione della recensione fallita." };
        }
    }

    _convertDidToAddress(did){
        return did.slice(15, did.length);
    }

    async _calculateEthReward(cid,reviewList, isLike){
        let i=0;
        let expectedValue=BigInt(0);

        let valutationThreshold= await this.contract3.methods.getValutationThreshold().call();
        let reviewEthRewardThreshold=0;
        if(isLike == true)
              reviewEthRewardThreshold= await this.contract3.methods.getReviewEthRewardThreshold().call();
        let likeEthRewardThreshold=  await this.contract3.methods.getLikeEthRewardThreshold().call();
        
        let totalHolders= await this.contract3.methods.getTotalHolders().call();

        if(totalHolders<4)
            return BigInt(1);

        console.log("Holder totali: ", totalHolders);
        

        if((BigInt(reviewList.length) ) > (BigInt((totalHolders )) * BigInt(valutationThreshold)/ BigInt(100))){ 
            // --- CALCOLO VALORE ATTESO ---
            expectedValue = BigInt(reviewEthRewardThreshold);
            let  likersToRewardCount = 0;
            for (i = 0; i < reviewList.length  ; i++) {
                if (await this.contract3.methods.isPayedReviewer(cid, reviewList[i]).call() != true) {
                    likersToRewardCount++;
                }
            }
            expectedValue += (BigInt(likersToRewardCount) * BigInt( likeEthRewardThreshold) );

        }

        console.log("Valore da pagare: ",expectedValue);

        return expectedValue;

    }


    async insertLike(vpJwt, cid){
        let websiteRegisterInstance;
        let result = {success: false, message: ""};
        try {
            websiteRegisterInstance = WebsiteRegister.getInstance();
            console.log("Istanza Singleton di WebsiteRegister pronta.");
        } catch (error) {
            console.error("Errore fatale: impossibile inizializzare WebsiteRegister", error);
            return { success: false, message: "Istanza non inizializzata." };
        }

        if(await this._checkIpfsEexistence(cid) == false)
            return { success: false, message: "Hai inserito un cid non valido." };



        try{
            result = await websiteRegisterInstance.login(vpJwt);
            if(result.success)
                console.log("Sei autenticato, puoi inserire il like!");
            else
                return { success: false, message: "Errore nell'autenticazione, non puoi mettere like!"};
        }catch(err){
            console.log("Login fallito");
            return { success: false, message: "Internal error." };
        }

        const voterDid =  result.data.holder;
        const voterAddress = voterDid.slice(15,voterDid.length);

        let reviewLikesList=[];

        try{
            reviewLikesList = (await this.getReviewLike(cid)).reviewers;
            for (const voter of reviewLikesList){
                if(voter==voterDid)
                    return { success: false, message: "Già hai messo il like!"};
            }
        }catch(error){
            return { success: false, message: "Internal error."};
        }

        try{
            await this.contract.methods.insertLike(voterDid, cid, voterAddress ).send({ from: voterAddress, gas: 3000000 }); 
            //da inserire controllo se bisogna incrementare la reputazione di chi ha messo la recensione.
            reviewLikesList.push(voterDid);
            let reviewer= await this.getHolderReview(cid);
            let addressesList = reviewLikesList.map(did => {
                     return this._convertDidToAddress(did);
            });
            
            let expectedValue= await this._calculateEthReward(cid, addressesList, true);
            
            if(expectedValue != 1)
                await this.contract3.methods.incrementPositiveReputation(this._convertDidToAddress(reviewer.reviewer), cid, addressesList).send({ from: this._convertDidToAddress(this.verifierDid) , gas: 3000000, value:  expectedValue.toString()});
            


            return { success: true, message: "Like inserito con successo" };
        } catch(err) {
            return { success: false, message: "Errore nell'inserimento del like." };
            
        }
    }

    async insertDislike(vpJwt, cid){
        let websiteRegisterInstance;
        let result = {success: false, message: ""};
        try {
            websiteRegisterInstance = WebsiteRegister.getInstance();
            console.log("Istanza Singleton di WebsiteRegister pronta.");
        } catch (error) {
            console.error("Errore fatale: impossibile inizializzare WebsiteRegister", error);
            return { success: false, message: "Istanza non inizializzata." };
        }

        if(await this._checkIpfsEexistence(cid) == false)
            return { success: false, message: "Hai inserito un cid non valido." };

        

        try{
            result = await websiteRegisterInstance.login(vpJwt);
            if(result.success)
                console.log("Sei autenticato, puoi inserire il Dislike!");
            else
                return { success: false, message: "Errore nell'autenticazione, non puoi mettere Dislike!"};
        }catch(err){
            console.log("Login fallito");
            return { success: false, message: "Internal error." };
        }

        const voterDid =  result.data.holder;
        const voterAddress = voterDid.slice(15,voterDid.length);

        let reviewDislikesList=[];
        try{
            reviewDislikesList = (await this.getReviewDislike(cid)).reviewers;
            for (const voter of reviewDislikesList){
                if(voter==voterDid)
                    return { success: false, message: "Già hai messo il Dislike!"};
            }
        }catch(error){
            return { success: false, message: "Internal error."};
        }

        try{
            await this.contract.methods.insertDislike(voterDid, cid, voterAddress ).send({ from: voterAddress, gas: 3000000 });
            //da inserire controllo se bisogna decrementare la reputazione di chi ha messo la recensione.
            reviewDislikesList.push(voterDid);
            
            let reviewer= await this.getHolderReview(cid);
            let addressesList = reviewDislikesList.map(did => {
                        return this._convertDidToAddress(did);
                    });

            let expectedValue= await this._calculateEthReward(cid, addressesList, false);
            if(expectedValue != BigInt(1))
                await this.contract3.methods.decrementPositiveReputation(this._convertDidToAddress(reviewer.reviewer), cid, addressesList).send({ from: this._convertDidToAddress(this.verifierDid) , gas: 3000000, value:  expectedValue.toString()})
            
            return { success: true, message: "Dislike inserito con successo" };
        } catch(err) {
             console.log(err);
            return { success: false, message: "Errore nell'inserimento del Dislike." };
           
        }
    }

    async getProductReviews(productId){
        try {
            const reviews = await this.contract.methods.getProductReviews(productId).call();
            return {
                reviews: reviews
            };
        } catch (error) {
            return { error: `Impossibile recuperare recensioni per ${productId}` };
        }
    }

    async getReviewLike(cid){
        if(await this._checkIpfsEexistence(cid) == false)
            return { error: "Hai inserito un cid non valido." };

        try {
            const votersLikeDid = await this.contract.methods.getReviewLikes(cid).call();
            return {
                reviewers: votersLikeDid,
                total: votersLikeDid.length
            };
        } catch (error) {
            return { error: `Impossibile recuperare like per ${cid}` };
        }
    }

    async getReviewDislike(cid){
        if(await this._checkIpfsEexistence(cid) == false)
            return { error: "Hai inserito un cid non valido." };
        try {
            const votersDislikeDid = await this.contract.methods.getReviewDisikes(cid).call();
            return {
                reviewers: votersDislikeDid,
                total: votersDislikeDid.length
            };
        } catch (error) {
            return { error: `Impossibile recuperare dislike per ${cid}` };
        }
    }

    async getHolderReview(cid){
        if(await this._checkIpfsEexistence(cid) == false)
            return { error: "Hai inserito un cid non valido." };
        try {
            const reviewerDid = await this.contract.methods.getHolderReview(cid).call();
            return {
                reviewer: reviewerDid
            };
        } catch (error) {
            return { error: `Impossibile recuperare holder per ${cid}` };
        }
    }

    async getTimestampReview(cid){
        if(await this._checkIpfsEexistence(cid) == false)
            return { error: "Hai inserito un cid non valido." };

        try {
            const timestampReview = await this.contract.methods.getReviewTimestamp(cid).call();
            return {
                timestamp: timestampReview
            };
        } catch (error) {
            return { error: `Impossibile recuperare timestamp per ${cid}` };
        }
    }

    async getStateReview(cid){
        if(await this._checkIpfsEexistence(cid) == false)
            return { error: "Hai inserito un cid non valido." };
        try {
            const stateReview = await this.contract.methods.getReviewState(cid).call();
            return {
                state: stateReview
            };
        } catch (error) {
            return { error: `Impossibile recuperare stato per ${cid}` };
        }
    }

    async getProductReturnStatus(didHolder, productId){
        return await this.contract2.methods.getProductReturnStatus(didHolder, productId).call();
    }

    
}

module.exports = ReviewManager;

