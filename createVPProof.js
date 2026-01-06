const fs = require('fs').promises; 
const { Web3 } = require('web3');
const { EthrDID } = require('ethr-did');

require('dotenv').config();

const {
  createVerifiableCredentialJwt,
  createVerifiablePresentationJwt,
  verifyPresentation
} = require('did-jwt-vc');
const { Resolver } = require('did-resolver');
const ethrDidResolver = require('ethr-did-resolver');

(async () => {
  const providerUrl = 'http://127.0.0.1:7545'; // Ganache
  const web3 = new Web3(providerUrl);

  // Retrieve accounts from Ganache
  const accounts = await web3.eth.getAccounts();
  //const address_issuer = accounts[0];
  const address_subject = accounts[2]; // Subject of the VC
  //const privateKey_issuer = '0x43e826de95d3b698ad59c7817c1eba6b79441dc83a0707fbc6d31657d8de274a'; //Chiave privata dell'issuer
  const privateKey_subject = process.env.HOLDER2_PRIVATE_KEY; //Chiave privata del subject (holder)
  const chainId = await web3.eth.getChainId();

  
  //Creazione del did del subject (holder)
  const subject = new EthrDID({
    identifier: address_subject,
    privateKey: privateKey_subject,
    provider: web3.currentProvider,
    chainNameOrId: chainId
  });

  let vcJwtProof;
  let filePathVcProof="./credentials/VC_Proof/proof_vc_2.jwt"
  let filePathVpProof="./credentials/VP_Proof/proof_vp_2.jwt"

    try {
        vcJwtProof = await fs.readFile(filePathVcProof, 'utf8');
        console.log("Contenuto del file VC letto con successo.");
    } catch (err) {
        console.error("Errore durante la lettura del file VC Proof:", err.message);
        return { success: false, message: "Errore lettura file VC Proof." };
    }
  
  console.log("\n Verifiable Credential Proof JWT:\n", vcJwtProof);

  // === CREATION OF THE VP PROOF===
  const vpProofPayload = {
    vp: {
      "@context": ["https://www.w3.org/2018/credentials/v1", `http://localhost:${process.env.PORT || 3000}/ecommerce-vc-context.jsonld`],
      type: ["VerifiablePresentation","ReviewProofPresentation"],
      verifiableCredential: [vcJwtProof]
    }
  };

  const vpJwtProof = await createVerifiablePresentationJwt(vpProofPayload, subject);
  console.log("\n Verifiable Presentation JWT:\n", vpJwtProof);

  await fs.writeFile(filePathVpProof, vpJwtProof, 'utf8');
  console.log(` VP creata e salvata con successo nel file: ${filePathVpProof}`);

  // === CONFIGURATION OF THE RESOLVER ===
    const registryAddress = process.env.ETHRDID_REGISTRY_ADDRESS; // <-- replace with the DID contract address
    const resolverConfig = {
      networks: [{
        name: chainId,
        rpcUrl: providerUrl,
        chainId: chainId,
        registry: registryAddress
      }]
    };
    const didResolver = new Resolver(ethrDidResolver.getResolver(resolverConfig));
  
    // === VERIFICATION OF THE VP ===
    try {
      const result = await verifyPresentation(vpJwtProof, didResolver);
      console.log("\n Verification completed:\n", JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("\n Error during the presentation verification:", err);
    }
})();
