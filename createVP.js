
const fs = require('fs').promises; 
const { Web3 } = require('web3');
const { EthrDID } = require('ethr-did');

require('dotenv').config();

const {
  createVerifiableCredentialJwt, //funzione per firmare VC
  createVerifiablePresentationJwt, //funzione per firmare VP
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
  const address_subject = accounts[5]; // Subject of the VC
  //const privateKey_issuer = '0x43e826de95d3b698ad59c7817c1eba6b79441dc83a0707fbc6d31657d8de274a'; //Chiave privata dell'issuer
  const privateKey_subject = process.env.HOLDER5_PRIVATE_KEY; //Chiave privata del subject (holder)
  const chainId = await web3.eth.getChainId();

  
  //Creazione del did del subject (holder)
  const subject = new EthrDID({
    identifier: address_subject,
    privateKey: privateKey_subject,
    provider: web3.currentProvider,
    chainNameOrId: chainId
  });

  let vcJwt;
  let filePathVc="./credentials/VC/spid_credential_5.jwt"
  let filePathVp="./credentials/VP/vp_credential_5.jwt"

  try {
      vcJwt = await fs.readFile(filePathVc, 'utf8');
      console.log("Contenuto del file VC letto con successo.");
  } catch (err) {
      console.error("Errore durante la lettura del file VC:", err.message);
      return { success: false, message: "Errore lettura file VC." };
  }
  
  console.log("\n Verifiable Credential JWT:\n", vcJwt);

  // === CREATION OF THE VP ===
  const vpPayload = {
    vp: {
      "@context": ["https://www.w3.org/2018/credentials/v1", `http://localhost:${process.env.PORT || 3000}/access-vc-context.jsonld`],
      type: ["VerifiablePresentation","AccessPresentation"],
      verifiableCredential: [vcJwt]
    }
  };

  const vpJwt = await createVerifiablePresentationJwt(vpPayload, subject);
  console.log("\n Verifiable Presentation JWT:\n", vpJwt);

  await fs.writeFile(filePathVp, vpJwt, 'utf8');
  console.log(` VP creata e salvata con successo nel file: ${filePathVp}`);

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
      const result = await verifyPresentation(vpJwt, didResolver);
      console.log("\n Verification completed:\n", JSON.stringify(result, null, 2));
    } catch (err) {
      console.error("\n Error during the presentation verification:", err);
    }



  
})();
