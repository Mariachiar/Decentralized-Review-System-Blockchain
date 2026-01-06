/* SPDX-License-Identifier: MIT */

pragma solidity ^0.8.0;


interface ReviewManager{
    function getReviewLikes(string memory cid) external view returns (string[] memory);
    function getReviewDislikes(string memory cid) external view returns (string[] memory);
    
    
}


interface Nft{
    function transfer(address to, uint256 tokenID) external ; 
    function transferFrom(address from, address to ,uint256 tokenID) external ; 
    function getSingleToken(uint256 reputation) external  returns(uint256);
    function getNftPerHolder(address holder) external view returns (uint256[] memory);
    
}

contract RewardManagerContract {
    address owner;
    address nftContractAddress;
    Nft nft;

    address reviewManagerContractAddress;
    ReviewManager reviewManager; 
    

    uint256 totalHolders;
    //soglie che possono essere cambiate dal sito di e-commerce
    uint256 valutationThreshold;
    uint256 nftThreshold;
    uint256 penaltyThreshold;
    uint256 reviewEthRewardThreshold;
    uint256 likeEthRewardThreshold;

    address[] blacklist;

    
    mapping(address => uint256) positiveReputation; // associa ad ogni holder la reputazione positiva ovvero di recensioni valutate come affidabili dagli altri holder
    mapping(address => uint256) negativeReputation; // associa ad ogni holder la reputazione negativa ovvero di recensioni valutate come non affidabili dagli altri holder
    mapping (string => mapping(address => bool)) payedReviewer; // permette di assegnare reward una sola volta per recensione.
    
    mapping(address => mapping (uint256 => bool)) nftOwnedPerReputation; // vede se utente ha già ricevuto nft per la specifica reputation
    event nftAssigned(string holder, uint256 tokenId);
    event nftRevoked(string holder, uint256 tokenId);
    event nftSpent(string holder, uint256 tokenId);
    event rewardPaid(address holder, uint256 threshold);

    constructor(address _nftContractAddress, address _reviewManagerContractAddress ) {
        owner = msg.sender; // quando viene creato contratto si imposta owner l'account che lo distribuisce nella rete
        nftContractAddress=_nftContractAddress;
        nft= Nft(nftContractAddress);

        reviewManagerContractAddress=_reviewManagerContractAddress;
        reviewManager= ReviewManager(reviewManagerContractAddress);

        valutationThreshold=50;
        nftThreshold= 3;
        penaltyThreshold=2;
        reviewEthRewardThreshold=1 * 10**(16); //in wei 1eth= 1*10^18
        likeEthRewardThreshold= 1 * 10**(15);

    }


    modifier onlyOwner {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
        
    }

    function incrementPositiveReputation(address holder, string memory cid, address[] memory didLikes) public onlyOwner() payable{
        uint256 i=0;
      if(didLikes.length > ((totalHolders ) * valutationThreshold/100)){
        positiveReputation[holder]+=1;

            sendEthReward(holder, reviewEthRewardThreshold);
            
            for(i=0; i<didLikes.length; i++){
                if(payedReviewer[cid][didLikes[i]] != true)
                    sendEthReward(didLikes[i], likeEthRewardThreshold );
                }

            int256 total = int256 (positiveReputation[holder] - negativeReputation[holder] );
            if(total >= 0){
                if(uint256(total) % nftThreshold == 0 ){
                    if(nftOwnedPerReputation[holder][uint256(total)] != true){
                        assignNft(holder);
                        nftOwnedPerReputation[holder][uint256(total)]=true;
                    }
                }                
            }
        }    
    }


    function decrementPositiveReputation(address  didHolder, string memory cid, address[] memory didDislikes) public onlyOwner() payable {
        uint256 i=0;
        if(didDislikes.length > ((totalHolders ) * valutationThreshold/100)){
            negativeReputation[didHolder]+=1;

            for(i=0; i<didDislikes.length; i++){
                if(payedReviewer[cid][didDislikes[i]] != true)
                    sendEthReward(didDislikes[i], likeEthRewardThreshold );
                }
            
            if(negativeReputation[didHolder] % penaltyThreshold == 0 ){
                revokeNft(didHolder,0);    
            }
        }
    }
    

    function assignNft(address holder) private {  
        nft.transfer( holder, nft.getSingleToken(positiveReputation[holder] - negativeReputation[holder]) );
    }

    function revokeNft(address holder, uint256 tokenId) public onlyOwner() { 
        try nft.transferFrom(holder, msg.sender, tokenId){
        }catch{
            require(tokenId==0, "Impossibile revocare token");
            uint256[] memory nftHolder= nft.getNftPerHolder(holder);
            if(nftHolder.length==0)
                blacklist.push(holder);
            else
                nft.transferFrom(holder, msg.sender, nftHolder[nftHolder.length-1]);
        }
    }

   function sendEthReward(address holder, uint256 threshold) private {
        if (threshold == 0) 
            return;
        (bool success, ) = holder.call{value: threshold}("");
        require(success, "Trasferimento ETH fallito");
        emit rewardPaid(holder, threshold);
        return;
    }


    function setValutationThreshold(uint256 value) public onlyOwner(){
        valutationThreshold=value;
    }

    function setNftThreshold(uint256 value) public onlyOwner(){
        nftThreshold=value;
    }

    function setPenaltyThreshold(uint256 value) public onlyOwner(){
        penaltyThreshold=value;
    }

    function setReviewEthRewardThreshold(uint256 value) public onlyOwner(){
         reviewEthRewardThreshold=value;
    }

    function setLikeEthRewardThreshold(uint256 value) public onlyOwner(){
         likeEthRewardThreshold= value;
    }

    function getValutationThreshold() public  view returns(uint256){
        return valutationThreshold;
    }

    function getNftThreshold() public view returns(uint256){
        return nftThreshold;
    }

    function getPenaltyThreshold() public view returns(uint256){
       return  penaltyThreshold;
    }

    function getReviewEthRewardThreshold() public view returns(uint256){
        return reviewEthRewardThreshold;
    }

    function getLikeEthRewardThreshold() public view returns(uint256){
        return likeEthRewardThreshold;
    }

    function getBlacklist() public view returns(address[] memory){
        return blacklist;
    }

    function getHolderNftList(address  holder) public view returns(uint256[] memory){
        return nft.getNftPerHolder(holder);
    }

    function getPositiveReputation(address  didHolder)public view returns (uint256){
        return positiveReputation[didHolder];
    }

    function getNegativeReputation(address didHolder)public view returns (uint256){
        return negativeReputation[didHolder];
    }

    function incrementTotalHolders() public onlyOwner(){
        totalHolders= totalHolders + 1 ;
    }

    function getTotalHolders() public view returns (uint256){
        return totalHolders;
    }

    function isPayedReviewer(string memory cid, address reviewer) public view returns (bool){
        return payedReviewer[cid][reviewer];
    }



}