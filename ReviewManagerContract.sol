/* SPDX-License-Identifier: MIT */

pragma solidity ^0.8.0;


interface WebsiteRegister{
    function getProductReturnStatus(string memory did, string memory productId) external view returns (bool);
    //function getUserProductList(string memory did) public external returns (string[] memory);
}


contract ReviewManagerContract {


    address owner;
    address websiteRegisterContractAddress;
    WebsiteRegister myWebsiteRegister;
    mapping(string => string[]) productsReview;  // recensioni associate ad ogni prodotti (ovviamente come cid)
    mapping(string => string[] ) reviewLikes;     // did di holder che hanno inserito like alle specifiche recensioni. 
    mapping(string => string[] ) reviewDislikes;     // did di holder che hanno inserito Dislike alle specifiche recensioni.
    mapping(string => string) reviewHolders;  // i proprietari di ogni recensione
    mapping(string => mapping(string => string)) productAlreadyReviewed; // registra se un utente ha già fatto la recensione al prodotto
    mapping (string => uint256) reviewTimestamps; //date di inserimento associate ad ogni recensione 
    mapping (string => string) reviewStates; // stati della recensione 'Nuova', 'Modificata', 'Revocata'
    
    mapping (string => bool) reviewIsProductReturned; // recensioni su prodotto restituito.

    //Nota: quando viene fatto il reso di un prodotto l'altro contratto dovrebbe chiamare una set per aggiornare real time reviewIsProductedReturned.

    event reviewInserted(string cid, string  holderDid, string  productId);
    event reviewModified(string  oldCid, string  newCid, string  holderDid, string  productId);
    event reviewDeleted(string  cid, string  holderDid, string  productId);
    event likeInserted(string  cid, string voterDid);
    event dislikeInserted(string  cid, string voterDid);


    constructor(address _websiteRegisterContractAddress ) {
        owner = msg.sender; // quando viene creato contratto si imposta owner l'account che lo distribuisce nella rete
        websiteRegisterContractAddress= _websiteRegisterContractAddress;
        myWebsiteRegister= WebsiteRegister(websiteRegisterContractAddress);
    }


    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
        
    }

    modifier onlyHolder(address holderAddress){
        require(msg.sender == holderAddress, "Solo il creatore (holder) della recensione puo chiamare questa funzione");
        _;
    }

    function insertReview(string memory productId, string memory cid, address holderAddress, string memory holderDid) public onlyHolder(holderAddress) {
        require(bytes(productAlreadyReviewed[holderDid][productId]).length == 0, 'Recensione gia inserita, se vuoi modificare o revocare utilizza la funzione modifica');
        
        

        productsReview[productId].push(cid);
        reviewHolders[cid]=holderDid;
        reviewTimestamps[cid]= block.timestamp;
        reviewDislikes[cid]= new string[](0);
        reviewLikes[cid]=new string[](0);
        reviewStates[cid]='NEW';
        reviewIsProductReturned[cid]=myWebsiteRegister.getProductReturnStatus(holderDid, productId);
        productAlreadyReviewed[holderDid][productId] = cid;

        emit reviewInserted(cid,holderDid, productId);

    }

    modifier onlyReviewHolder(string memory oldCid, string memory holderDid, string memory productId){
        require(keccak256(abi.encodePacked(productAlreadyReviewed[holderDid][productId])) == keccak256(abi.encodePacked(oldCid)),'Non hai inserito la recensione del prodotto quindi non puoi modificarla o cancallarla');
        require(keccak256(abi.encodePacked(reviewHolders[oldCid])) == keccak256(abi.encodePacked(holderDid)), "Non sei il possessore della recensione che vuoi modificare o cancellare");
        _;    
    }

    function modifyReview(string memory productId, string memory oldCid, string memory newCid, address holderAddress, string memory holderDid) public onlyHolder(holderAddress) onlyReviewHolder(oldCid, holderDid, productId) {
        // 1. Rimuovi oldCid dall'array di lookup in modo efficiente
        uint256 i = 0;
        for(i = 0; i < productsReview[productId].length; i++) {
            if(keccak256(abi.encodePacked(productsReview[productId][i])) == keccak256(abi.encodePacked(oldCid))) {
                break;
            }
        }
        // Non serve un require qui perché onlyReviewHolder garantisce che la recensione esista
        productsReview[productId][i] = productsReview[productId][productsReview[productId].length - 1];
        productsReview[productId].pop();

        // 2. CANCELLA i dati della vecchia recensione per risparmiare gas
        delete reviewHolders[oldCid];
        delete reviewTimestamps[oldCid];
        delete reviewDislikes[oldCid];
        delete reviewLikes[oldCid];
        delete reviewStates[oldCid];
        delete reviewIsProductReturned[oldCid];
        
        // 3. Aggiungi la nuova recensione
        productsReview[productId].push(newCid);
        reviewHolders[newCid] = holderDid;
        reviewTimestamps[newCid] = block.timestamp;
        // Inizializza gli array vuoti (non serve perché è il default, ma è più chiaro)
        reviewDislikes[newCid] = new string[](0);  
        reviewLikes[newCid] = new string[](0);
        reviewStates[newCid] = 'MOD'; //
        reviewIsProductReturned[newCid] = myWebsiteRegister.getProductReturnStatus(holderDid, productId);
        productAlreadyReviewed[holderDid][productId] = newCid;
        

        // 4. Emetti l'evento per la tracciabilità off-chain
        emit reviewModified(oldCid, newCid, holderDid, productId);
    }

    function deleteReview(string memory productId, string memory cid, address holderAddress, string memory holderDid) public onlyHolder(holderAddress) onlyReviewHolder(cid, holderDid, productId) {
        
        // 1. Rimuovi cid dall'array di lookup in modo efficiente
        uint256 i = 0;
        for(i = 0; i < productsReview[productId].length; i++) {
            if(keccak256(abi.encodePacked(productsReview[productId][i])) == keccak256(abi.encodePacked(cid))) {
                break;
            }
        }
        // Non serve un require qui perché onlyReviewHolder garantisce che la recensione esista
        productsReview[productId][i] = productsReview[productId][productsReview[productId].length - 1];
        productsReview[productId].pop();

        // 2. CANCELLA i dati della vecchia recensione per risparmiare gas
        delete reviewHolders[cid];
        delete reviewTimestamps[cid];
        delete reviewDislikes[cid];
        delete reviewLikes[cid];
        delete reviewStates[cid];
        delete reviewIsProductReturned[cid];
        
        
        
        productAlreadyReviewed[holderDid][productId] = "";

        // 4. Emetti l'evento per la tracciabilità off-chain
        emit reviewDeleted(cid, holderDid, productId);
    }

    function insertLike(string memory voterDid, string memory cid, address voterAddress ) public onlyHolder(voterAddress){
        uint256 i=0;
        for(i=0; i< reviewDislikes[cid].length; i++){
            if(keccak256(abi.encodePacked(reviewDislikes[cid][i])) == keccak256(abi.encodePacked(voterDid))){
                reviewDislikes[cid][i]=reviewDislikes[cid][reviewDislikes[cid].length -1 ];
                reviewDislikes[cid].pop();
                break;
            }
                
        }

        reviewLikes[cid].push(voterDid);
        emit likeInserted(cid, voterDid);
    }

    function insertDislike(string memory voterDid, string memory cid, address voterAddress ) public onlyHolder(voterAddress){
        uint256 i=0;
        for(i=0; i< reviewLikes[cid].length; i++){
            if(keccak256(abi.encodePacked(reviewLikes[cid][i])) == keccak256(abi.encodePacked(voterDid))){
                reviewLikes[cid][i]=reviewLikes[cid][reviewLikes[cid].length -1 ];
                reviewLikes[cid].pop();
                break;
            }
                
        }
        
        reviewDislikes[cid].push(voterDid);
        emit dislikeInserted(cid, voterDid);

    }

    function getProductReviews(string memory productId) public view returns (string[] memory){
        return productsReview[productId];
    }

    function getReviewLikes(string memory cid) public view returns (string[] memory){
        return reviewLikes[cid];
    }

    function getReviewDisikes(string memory cid) public view returns (string[] memory){
        return reviewDislikes[cid];
    }

    function getHolderReview(string memory cid) public view returns (string memory){
        return reviewHolders[cid];
    }

    function getReviewTimestamp(string memory cid) public view returns (uint256){
        return reviewTimestamps[cid];
    }

    function getReviewState(string memory cid) public view returns (string memory){
        return reviewStates[cid];
    }

    function getReviewIsProductReturned(string memory cid) public view returns (bool){
        return reviewIsProductReturned[cid];
    }
}


