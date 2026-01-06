/* SPDX-License-Identifier: MIT */

pragma solidity ^0.8.0;

contract WebsiteRegisterContract {

struct Constraints{
    string nation;
    bool over18;
    string sex;
    bool weaponPermit;
    bool student;
    bool teacher;

}

address owner;

mapping(string => Constraints) productPolicy;  // policy associate ad ogni prodotto
mapping(string => string[]) userProducts;     // prodotti acquistati da ogni utente (did)
mapping(string => mapping(string => bool )) hasReturned; // flag per prodotti restituiti da ogni utente 
mapping(string=> Constraints) usersCredential;  // credenziali associate ad ogni utente

constructor( ) {

        owner = msg.sender; // quando viene creato contratto si imposta owner l'account che lo distribuisce nella rete
        productPolicy["LIBRO01"] = Constraints({
            nation: "ANY",
            over18: false,
            sex: "ANY",
            weaponPermit: false,
            student: false,
            teacher: false
        });

        
        productPolicy["ALCOL01"] = Constraints({
            nation: "ITA",
            over18: true,
            sex: "ANY",
            weaponPermit: false,
            student: false,
            teacher: false
        });

        productPolicy["EDUCA01"] = Constraints({
            nation: "ANY",
            over18: false,
            sex: "ANY",
            weaponPermit: false,
            student: true,
            teacher: false
        });

        productPolicy["WEAPN01"] = Constraints({
            nation: "USA",
            over18: true,
            sex: "ANY",
            weaponPermit: true,
            student: false,
            teacher: false
        });

        productPolicy["CONFE01"] = Constraints({
            nation: "ANY",
            over18: false,
            sex: "ANY",
            weaponPermit: false,
            student: false,
            teacher: true
        });

        productPolicy["DIGIT01"] = Constraints({
            nation: "ANY",
            over18: false,
            sex: "ANY",
            weaponPermit: false,
            student: false,
            teacher: false
        }) ;

        //utente ospite non ha nessuna credenziale NON PUò FARE RESO
        usersCredential["0"]=Constraints({
            nation: "",
            over18: false,
            sex: "",
            weaponPermit: false,
            student: false,
            teacher: false
        }) ;
}


modifier onlyOwner {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
        }




function addProduct(string memory productId, string memory nation, bool over18, string memory sex, bool weaponPermit, bool student, bool teacher) public onlyOwner(){
   require(
            bytes(productPolicy[productId].nation).length == 0 &&
            productPolicy[productId].over18 == false && // Aggiungiamo un check su un bool per maggior sicurezza
            !productPolicy[productId].weaponPermit, // Esempio, potresti non aver bisogno di controllare tutti i campi
            "Prodotto gia' esistente."
        );
    productPolicy[productId]= Constraints( nation, over18,  sex,  weaponPermit,  student,  teacher);

}

function login(string memory did, string memory nation, bool over18, string memory sex, bool weaponPermit, bool student, bool teacher) public onlyOwner() {  // deve essere only owner?
    usersCredential[did] = Constraints( nation, over18,  sex,  weaponPermit,  student,  teacher);
}


function buy(string memory did, string memory productId) public onlyOwner() { //deve essere only owner? Non ritorna niente in quanto viene fatto con send che invia transazioni mentre call le legge
    require(checkConstraint(productId,did), 'Non autorizzato a comprare prodotto');
    userProducts[did].push(productId);  // si potrebbe mettere il controllo che se did 0 non si incrementa lista di prodotti acquistati da ospiti, a meno che non possa servire per altre statistiche.
    hasReturned[did][productId]=false;

}

function checkConstraint(string memory productId, string memory did) private view returns (bool) {
        Constraints memory prodConstraint = productPolicy[productId];
        Constraints memory userCredential = usersCredential[did];

        // Pre-calcola l'hash per la stringa letterale "ANY"
        bytes32 anyHash = keccak256(abi.encodePacked("ANY"));

        // 1. Controllo Nazione
        bytes32 prodNationHash = keccak256(abi.encodePacked(prodConstraint.nation));
        bytes32 userNationHash = keccak256(abi.encodePacked(userCredential.nation));

        if (!(prodNationHash == anyHash || prodNationHash == userNationHash)) {
            return false;
        }

        // 2. Controllo Maggiore Età (over18)
        if (prodConstraint.over18 && !userCredential.over18) {
            return false;
        }

        // 3. Controllo Sesso (sex)
        // "ANY" nel prodotto significa nessuna restrizione.
        if (bytes(prodConstraint.sex).length != 0) { // C'è un vincolo specifico sul sesso nel prodotto
            bytes32 prodSexHash = keccak256(abi.encodePacked(prodConstraint.sex));
            if (prodSexHash != anyHash) { // E non è "ANY"
                bytes32 userSexHash = keccak256(abi.encodePacked(userCredential.sex));
                if (prodSexHash != userSexHash) { // E il sesso non corrisponde
                    return false;
                }
            }
        }

        // 4. Controllo Porto d'Armi (weaponPermit)
        if (prodConstraint.weaponPermit && !userCredential.weaponPermit) {
            return false;
        }

        // 5. Controllo Studente (student)
        if (prodConstraint.student && !userCredential.student) {
            return false;
        }

        // 6. Controllo Insegnante (teacher)
        if (prodConstraint.teacher && !userCredential.teacher) {
            return false;
        }

        return true;
    }
function returnProduct(string memory did, string memory productId) public onlyOwner(){
        uint i = 0;
        bool productFound = false; // Flag per tracciare se il prodotto è stato trovato

        for (i = 0; i < userProducts[did].length; i++) {
            if (keccak256(abi.encodePacked(userProducts[did][i])) == keccak256(abi.encodePacked(productId))) { // Confronto sicuro di stringhe
                productFound = true;
                break; // Esce dal loop una volta trovato il prodotto
            }
        }

        require(productFound, "Utente non ha acquistato il prodotto specificato o prodotto non trovato nella sua lista.");
        require(!hasReturned[did][productId], "Utente ha gia' fatto il reso di questo prodotto.");

        hasReturned[did][productId] = true;
    }

function getProductConstraints(string memory productId) public view returns (Constraints memory) {
    return productPolicy[productId];
}
//HO MESSO QUA EXTERNAL AL POSTO DI PUBLIC 
function getUserProductList(string memory did) external view returns (string[] memory) {
    //Questo non è un problema per la privacy in quanto gli utenti possono al massimo capire i prodotti acquistati da uno specifico did che per definizione non è linkabile alla persona fisica.
    return userProducts[did];
}
function getProductReturnStatus(string memory did, string memory productId) external view returns (bool) {
    return hasReturned[did][productId];
}

function IsUserRegistered (string memory did ) public view returns (bool){
    if(bytes(usersCredential[did].nation).length != 0)
        return true;
    else
        return false;
}


}


