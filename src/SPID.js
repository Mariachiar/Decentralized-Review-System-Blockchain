// SPID.js
const { Web3 } = require('web3');
const { EthrDID } = require('ethr-did');
const { createVerifiableCredentialJwt } = require('did-jwt-vc');
const { Resolver } = require('did-resolver');
const { getResolver: ethrDidResolverProvider } = require('ethr-did-resolver');
const UserDirectory = require('./UserDirectory');

require('dotenv').config();

const VC_ATTRIBUTE_MAP = { /* ... (invariato) ... */
  nation: "nation", over18: "over18", weaponPermit: "weaponPermit",
  sex: "sex", isStudent: "isStudent", isTeacher: "isTeacher"
};
const USER_DATA_KEYS = ["nation", "over18", "weaponPermit", "sex", "isStudent", "isTeacher"];

function createFieldSetKey(fieldsArray) { /* ... (invariato) ... */ //: normalizza (ordina) e crea una stringa chiave
    if (!fieldsArray || fieldsArray.length === 0) return "";
    return [...new Set(fieldsArray)].sort().join(',');
}
function parseFieldSetKey(fieldSetKey) { /* ... (invariato) ... */ //converte la chiave stringa di nuovo in array
    if (!fieldSetKey) return [];
    return fieldSetKey.split(',');
}

class VcConflictError extends Error { /* ... (invariato) ... */
    constructor(message, conflictingDid, conflictingVcJwt) {
        super(message); this.name = "VcConflictError";
        this.conflictingDid = conflictingDid; this.conflictingVcJwt = conflictingVcJwt;
        this.statusCode = 409;
    }
}
class VcUpdateNotificationError extends Error { /* ... (invariato) ... */
    constructor(message, updatedDid, updatedVcJwt) {
        super(message); this.name = "VcUpdateNotificationError";
        this.updatedDid = updatedDid; this.updatedVcJwt = updatedVcJwt;
        this.statusCode = 200; // Server risponderà 200 con status 'updated_existing'
    }
}

let instance = null;

class SPID {
    constructor() { /* ... (invariato, con this.userVcStoreMeta) ... */
        if (SPID._constructing) {
            this.userVcData = {};
            this.userVcStoreMeta = {}; // { userCode: { anchorDid: "did_string_ancora" } }
            this.providerUrl = process.env.PROVIDER_URL || 'http://127.0.0.1:7545';
            this.registryAddress = process.env.ETHRDID_REGISTRY_ADDRESS ;
            this.issuerBlockchainAddress = null;
            this.issuerPrivateKey = process.env.SPID_PRIVATE_KEY ;
            this.issuerEthrDid = null; this.didResolver = null; this.web3 = null;
            this.currentChainId = null; this.isInitialized = false;
            return;
        }
        if (instance) return instance;
        throw new Error("Cannot construct SPID directly. Use SPID.getInstance()");
    }

    async _initialize() { /* ... (invariato) ... */
        if (this.isInitialized) return;
        this.web3 = new Web3(this.providerUrl);
        const accounts = await this.web3.eth.getAccounts();
        if (accounts.length === 0) throw new Error("Nessun account Ganache.");
        this.issuerBlockchainAddress = accounts[0];
        const networkIdBigInt = await this.web3.eth.getChainId();
        this.currentChainId = '0x' + networkIdBigInt.toString(16);
        const resolverConfig = { networks: [{ name: this.currentChainId, rpcUrl: this.providerUrl, chainId: this.currentChainId, registry: this.registryAddress }] };
        this.didResolver = new Resolver(ethrDidResolverProvider(resolverConfig));
        this.issuerEthrDid = new EthrDID({ identifier: this.issuerBlockchainAddress, privateKey: this.issuerPrivateKey, provider: this.web3.currentProvider, chainNameOrId: this.currentChainId, registry: this.registryAddress });
        this.isInitialized = true;
        console.log(`SPID Inizializzato. Issuer DID: ${this.issuerEthrDid.did}, Chain ID: ${this.currentChainId}`);
    }

    static async getInstance() { /* ... (invariato) ... */
        if (!instance) { SPID._constructing = true; instance = new SPID(); SPID._constructing = false; await instance._initialize(); }
        else if (!instance.isInitialized) { await instance._initialize(); }
        return instance;
    }
    
    async _createAndStoreNewVcForAnchor(targetDid, userCode, fieldsToIncludeInVc, firstTimeAnchor = false) {
        // Crea o aggiorna la VC per un anchor DID.
        // Se firstTimeAnchor = true, imposta targetDid come anchor.
        const checkResult = await this.check(userCode, fieldsToIncludeInVc);
        if (!checkResult.isValid) {
            throw new Error(checkResult.error || "Validazione fallita per i campi da includere.");
        }

        const credentialSubject = { id: targetDid, ...checkResult.credentialAttributes };
        const vcPayload = {
            sub: targetDid,
            nbf: Math.floor(Date.now() / 1000),
            vc: {
                "@context": ["https://www.w3.org/2018/credentials/v1", `http://localhost:${process.env.PORT || 3000}/access-vc-context.jsonld`],
                type: ["VerifiableCredential", "AccessCredentials"],
                credentialSubject: credentialSubject
            }
        };
        const vcJwt = await createVerifiableCredentialJwt(vcPayload, this.issuerEthrDid);

        if (!this.userVcData[userCode]) this.userVcData[userCode] = {};
        this.userVcData[userCode][targetDid] = {
            vcJwt: vcJwt,
            actualVcFields: Object.keys(checkResult.credentialAttributes),
            requestedFieldSetKey: createFieldSetKey(checkResult.validRequestedFields)
        };
        if (firstTimeAnchor) {
             if (!this.userVcStoreMeta[userCode]) this.userVcStoreMeta[userCode] = {};
             this.userVcStoreMeta[userCode].anchorDid = targetDid;
             console.log(`Nuovo anchor DID ${targetDid} impostato per userCode ${userCode}.`);
        }
        console.log(`VC ${firstTimeAnchor ? 'creata' : 'aggiornata'} per userCode ${userCode}, DID ${targetDid}.`);
        return vcJwt;
    }

    async check(userCode, campiRichiestiDalForm) { /* ... (invariato) ... */
        if (!this.isInitialized) throw new Error("SPID non è inizializzato.");
        const userDataFromDirectory = UserDirectory.get(userCode);
        if (!userDataFromDirectory) return { isValid: false, error: "Codice utente non valido.", validRequestedFields: [] };
        const credentialAttributes = {}; let hasValidFields = false; const validRequestedFields = [];
        for (const formFieldKey of campiRichiestiDalForm) {
            if (USER_DATA_KEYS.includes(formFieldKey)) {
                const vcAttributeKey = VC_ATTRIBUTE_MAP[formFieldKey];
                if (vcAttributeKey && userDataFromDirectory.hasOwnProperty(formFieldKey)) {
                    credentialAttributes[vcAttributeKey] = userDataFromDirectory[formFieldKey];
                    validRequestedFields.push(formFieldKey); hasValidFields = true;
                }
            }
        }
        if (campiRichiestiDalForm.length > 0 && !hasValidFields) return { isValid: false, error: "Campi richiesti non validi.", validRequestedFields: [] };
        return { isValid: true, credentialAttributes: credentialAttributes, validRequestedFields: [...new Set(validRequestedFields)] };
    }

    async requestVC(didRichiesto, userCode, campiRichiestiDalForm) {
        if (!this.isInitialized) throw new Error("SPID non è inizializzato.");

        const initialCheck = await this.check(userCode, campiRichiestiDalForm);
        if (!initialCheck.isValid) {
            throw new Error(initialCheck.error || "Validazione iniziale fallita.");
        }
        if (campiRichiestiDalForm.length > 0 && initialCheck.validRequestedFields.length === 0) {
             throw new Error("Nessuno dei campi richiesti è valido o posseduto dall'utente.");
        }
        
        const nuoviCampiValidatiSet = new Set(initialCheck.validRequestedFields);

        const anchorDid = this.userVcStoreMeta[userCode]?.anchorDid;

        if (!anchorDid) {
            // Nessun anchor DID: prima VC per questo userCode. didRichiesto diventa l'anchor.
            const vcJwt = await this._createAndStoreNewVcForAnchor(didRichiesto, userCode, initialCheck.validRequestedFields, true);
            return {
                type: "creation_success",
                message: `Nuova VC creata con successo per il DID ${didRichiesto}.`,
                did: didRichiesto,
                token: vcJwt
            };
        }

        // Anchor DID esiste
        const anchorVcData = this.userVcData[userCode]?.[anchorDid];
        if (!anchorVcData) { // Incosistenza teorica, gestita per robustezza
            console.warn(`Incosistenza dati: anchorDid ${anchorDid} per ${userCode} non ha VC. Tratto come prima creazione per ${didRichiesto}.`);
            const vcJwt = await this._createAndStoreNewVcForAnchor(didRichiesto, userCode, initialCheck.validRequestedFields, true);
            return { type: "creation_success", message: `Nuova VC creata per ${didRichiesto} (reset anchor).`, did: didRichiesto, token: vcJwt };
        }

        const campiAncoratiEsistentiSet = new Set(parseFieldSetKey(anchorVcData.requestedFieldSetKey));
        
        let isSubsetOrEqual = true;
        for (const field of nuoviCampiValidatiSet) {
            if (!campiAncoratiEsistentiSet.has(field)) {
                isSubsetOrEqual = false;
                break;
            }
        }

        if (isSubsetOrEqual) { // La nuova richiesta è coperta dalla VC ancorata
            if (didRichiesto !== anchorDid) {
                throw new VcConflictError(
                    `Una VC con questi campi (o un set più ampio) esiste già per il tuo codice utente sotto il DID ${anchorDid}. Si prega di utilizzare quella esistente.`,
                    anchorDid,
                    anchorVcData.vcJwt
                );
            } else { // Stesso DID (anchor) e stessi campi (o subset): restituisci la VC ancorata esistente
                return {
                    type: "retrieval_success_existing_fields",
                    message: `Possiedi già una VC per il DID ${anchorDid} che copre i campi richiesti.`,
                    did: anchorDid,
                    token: anchorVcData.vcJwt
                };
            }
        }

        // Altrimenti, i nuoviCampiValidatiSet aggiungono qualcosa: merge e update della VC dell'anchorDid
        const campiUnioneSet = new Set([...campiAncoratiEsistentiSet, ...nuoviCampiValidatiSet]);
        const campiUnioneArray = Array.from(campiUnioneSet);
        
        const vcAggiornataJwt = await this._createAndStoreNewVcForAnchor(anchorDid, userCode, campiUnioneArray, false); // isUpdate = true (implicito se firstTimeAnchor=false)

        if (didRichiesto !== anchorDid) {
            // La richiesta era per un DID diverso, ma abbiamo aggiornato l'anchor
            throw new VcUpdateNotificationError(
                `La VC per il DID ${didRichiesto} non è stata creata. La tua richiesta è stata usata per aggiornare/arricchire la VC esistente associata al DID ${anchorDid}.`,
                anchorDid,
                vcAggiornataJwt
            );
        } else {
            // Aggiornamento diretto dell'anchor DID perché sono stati richiesti nuovi campi per esso
            return {
                type: "direct_update_success",
                message: `La tua VC associata al DID ${anchorDid} è stata aggiornata con i nuovi campi richiesti.`,
                did: anchorDid, // è lo stesso di didRichiesto
                token: vcAggiornataJwt
            };
        }
    }
    getStoredVC(userCode, did) { return this.userVcData[userCode]?.[did]?.vcJwt || null; }
}

module.exports = { /* ... (invariato) ... */
    getSpidInstance: SPID.getInstance,
    VcConflictError,
    VcUpdateNotificationError
};