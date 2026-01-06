// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Nft{
 
    uint256 tokenHash=1; //’ID progressivo dei token NFT. Parte da 1 per assegnare identificativi univoci a ogni NFT creato

    address owner;
    
    mapping(uint256 => string ) tokensUri; //Associa un tokenID a un URI (es. "EDU10"), che rappresenta il contenuto del token 
    mapping(uint256 => address) tokenOwner; //Tiene traccia di chi possiede ogni token.
    mapping(string => bool) public exURI; // Questo mapping determina se quell'URI di uno specifico token esiste già in quanto deve essere univoco
    
    
    
    mapping(uint256 => uint256[] ) tokenPerReputationPool; // lista di nft (sconto) che possono essere assegnati agli utenti a seconda della loro reputazione
    mapping (uint256 => uint256)  tokenPerReputation; // ogni token è associato ad una specifica reputation.


    mapping(address => mapping(uint256 => address)) public approvedLists;

    mapping(address => uint256[] ) tokenPerAccount; 

    

    event Transfer(address indexed from, address indexed to, uint256 tokenID); // Emitted when tokens are transferred
    event Approval(address indexed from, address indexed to, uint256 tokenID);

    

     constructor() {
        owner=msg.sender;

        mint(owner, "EDU10");
        tokenPerReputationPool[3].push(tokenHash-1);
        tokenPerReputation[tokenHash-1]=3;

        mint(owner, "TECH10");
        tokenPerReputationPool[3].push(tokenHash-1);
        tokenPerReputation[tokenHash-1]=3;

        mint(owner, "WEAP10");
        tokenPerReputationPool[3].push(tokenHash-1);
        tokenPerReputation[tokenHash-1]=3;


        mint(owner, "EDU20");
        tokenPerReputationPool[6].push(tokenHash-1);
        tokenPerReputation[tokenHash-1]=6;

        mint(owner, "TECH20");
        tokenPerReputationPool[6].push(tokenHash-1);
        tokenPerReputation[tokenHash-1]=6;

        mint(owner, "WEAP20");
        tokenPerReputationPool[6].push(tokenHash-1);
        tokenPerReputation[tokenHash-1]=6;
       



    }

    // Creating new tokens and adding them to the total supply
    function mint(address recipient, string  memory newTokenURI) public{
    

        require(!exURI[newTokenURI] , "URI NFT already exist"); // Controllo se l'URI esiste già
        require(tokenOwner[tokenHash] == address(0) , "NFT already exist"); // Controllo se il NFT esiste già nella lista

        tokensUri[tokenHash]=newTokenURI;
        tokenOwner[tokenHash]= recipient;

        tokenPerAccount[recipient].push(tokenHash);

        exURI[newTokenURI] = true; // Aggiungo l'URI al mapping in modo tale da dire che quell'URI non deve essere più aggiunto visto che deve essere univoco


        tokenHash++; // Incremento l'id degli NFT in quanto ogni NFT deve avere un id univoco
        
    }


    // Allows another address to spend a specified amount of tokens on behalf of the token owner
    function approve(address to, uint256 tokenId) public onlyOwner(tokenId){
       //allowedHolder[msg.sender][to].push(tokenID);
       approvedLists[to][tokenId]= owner;
       emit Approval(owner, to, tokenId);
    }

    

    modifier onlyOwner(uint256 tokenID){
        require (tokenOwner[tokenID] == owner, 'Only owner can do this function');
        _;
    }

    modifier onlyOwnerOrApproved(uint256 tokenId){
        require ((tokenOwner[tokenId] == owner) || (approvedLists[tokenOwner[tokenId]][tokenId] == owner), 'Only owner or owner approved can do this function');
         _;
    }

    // Transfers tokens to another address
    function transfer(address to, uint256 tokenId) external onlyOwner(tokenId){
        approve(to,tokenId);

        address own = _ownerOf(tokenId);  

        tokenOwner[tokenId]=to;  // L'NFT a questo punto avrà un nuovo proprietario (owner) ossia il receiver (to)

        tokenPerAccount[to].push(tokenId);
        uint256 i=0;
        bool find=false;
        for (i=0; i< tokenPerAccount[own].length; i++){
            if(tokenPerAccount[own][i]==tokenId){
                find=true;
                break;
            }
          }

        require(find, "Non sei il possessore del token");
        tokenPerAccount[own][i]=tokenPerAccount[own][tokenPerAccount[own].length -1];
        tokenPerAccount[own].pop();
        emit Transfer(own, to, tokenId);
    }


    
    // Transfers tokens from one address to another using the allowance mechanism
    function transferFrom(address from, address to, uint256 tokenId) external onlyOwnerOrApproved(tokenId){
        
        
        tokenOwner[tokenId]=to;
        
        approvedLists[from][tokenId] = address(0);

        tokenPerAccount[to].push(tokenId);
        uint256 i=0;
        bool find=false;
        for (i=0; i< tokenPerAccount[from].length; i++){
            if(tokenPerAccount[from][i]==tokenId){
                find=true;
                break;
            }
          }

        require(find, "Non sei il possessore del token");
        tokenPerAccount[from][i]=tokenPerAccount[from][tokenPerAccount[from].length -1];
        tokenPerAccount[from].pop();

        setTokenPerReputation(getReputationPerToken(tokenId),  tokenId);


        emit Transfer(from, to, tokenId);
    }
    
    
    
    function _ownerOf(uint256 tokenID) private view returns (address){
        require ( tokenOwner[tokenID] != address(0), " The NFT does not exist ");
        return tokenOwner[tokenID];
    }


    
    function ownerOf(uint256 tokenID) external view returns (address){
        require ( tokenOwner[tokenID] != address(0), " The NFT does not exist ");
        return tokenOwner[tokenID];
    }

    function getSingleToken(uint256 reputation) external  returns(uint256){
        uint256 x= tokenPerReputationPool[reputation][tokenPerReputationPool[reputation].length-1];
        tokenPerReputationPool[reputation].pop();
        return x;

    }

    function getTokensPerReputation(uint256 reputation) public view returns(uint256[] memory){
        
        return tokenPerReputationPool[reputation];
        

    }

    function getReputationPerToken(uint256 tokenId) public view returns(uint256){
        return tokenPerReputation[tokenId]; 
    }

    function setTokenPerReputation(uint256 reputation, uint256 tokenId) public onlyOwner(tokenId) {
        tokenPerReputationPool[reputation].push(tokenId);
    }

    function getNftPerHolder(address holder) external view returns (uint256[] memory) {
        return tokenPerAccount[holder];
    }

    function getUri(uint256 tokenId) public view returns (string memory) {
        return tokensUri[tokenId];
    }

   




}
