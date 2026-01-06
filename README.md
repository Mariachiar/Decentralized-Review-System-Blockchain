## Premises
Is highly recommended to do a backup folder before doing tests!!

## Dependencies
You must install dotenv e express to configure the .env extension and the express server for running the website service doing
1. npm install dotenv
2. npm install express

## Files
The *credentials* folder contains the VC, VC proof, VP and VP proof useful for accessing to the website and leave a review

The *ipfs* folder contains the review to be uploaded to IPFS

The *public* folder contains the files useful for view and run the logic of the web application

The *review-app* folder contains the files useful for running the website to leave a review and evaluate them
- run *node server-reviews.js* to start the service on the port 3002 and open your browser to interact with the review platform

The *src* folder contains the .js useful for interacting with the different pages of the web application
- ReviewManager.js contains the logic for leaving a review, a like, a dislike and so on...
- SPID.js contains the logic for requesting the VC to the SPID (issuer)
- UserDirectory contains all the users already instanceated
- WebsiteRegister contains all the logic of the e-commerce site that interacts with the contract WebsiteRegisterContract.sol: the login, the bought of a product, the logout and the return of a product

The *website* folder contains all the file useful for view and run the logic of the e-commerce website
- run *node server-website.js* to start the service on the port 3001 and open your browser to interact with the e-commerce

access-vc-context.jsonld is the .jsonld file useful for creating the context of the VCs to be correctly verified
createVP.js is the file useful for creating the VP
createVPProof is the file useful for creating the VP Proof when the verifier gives us the VC proof certifying the purchase of a product
ecommerce-vc-context.jsonld is the .jsonld file useful for creating the context of the VCs proof to be correctly verified
EthrDIDRegistry.sol is the contract useful for the resolver to call the Resolver
Nft.sol is the contract useful for the logic of the NFT
ReviewManagerContract.sol is the contract useful for managing the logic of the reviews to be added to the blockchain
run *node server.js* to start the SPID website
WebsiteRegisterContract.sol is the contract useful for running the logic of the Website on the chain


