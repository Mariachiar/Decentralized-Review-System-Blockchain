/* SPDX-License-Identifier: MIT */

pragma solidity ^0.8.0;

contract EthereumDIDRegistry {

  mapping(address => address) public owners; //Mappa ogni identità al suo proprietario. Se non è specificato l'identity è owner di sé stessa
  mapping(address => mapping(bytes32 => mapping(address => uint))) public delegates; //Registra delegati temporanei per ogni identità organizzati per tipo di delega, address del delegato e timestamp di scadenza
  mapping(address => uint) public changed; //Tiene traccia dell'ultimo blocco in cui un'identità è stata modificata
  mapping(address => uint) public nonce; //Previene replay attack incrementando per ogni operazione firmata

  //Garantisce che solo il proprietario possa modificare l'identità
  modifier onlyOwner(address identity, address actor) {
    require (actor == identityOwner(identity), "bad_actor");
    _;
  }

  event DIDOwnerChanged(address indexed identity, address owner,uint previousChange); //Evento del cambio del proprietario
  event DIDDelegateChanged(address indexed identity, bytes32 delegateType, address delegate, uint validTo, uint previousChange); //Evento della modifica dei delegati
  event DIDAttributeChanged(address indexed identity, bytes32 name, bytes value, uint validTo,uint previousChange); //Evento dell'aggiornamento degli attributi

  //Definisce chi controlla l'identità restituendo l'owner o l'identity stessa se non impostato.
  function identityOwner(address identity) public view returns(address) {
     address owner = owners[identity]; //Cerca nel mapping owners
     if (owner != address(0x00)) { //Se non trova un owner registrato assume che l'identity sia self-owned
       return owner;
     }
     return identity;
  }

  //Abilita operazioni off-chain firmate tipiche dei sistemi DID tra cui verificare la firma ECDSA e incrementare il nonce
  function checkSignature(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 hash) internal returns(address) {
    address signer = ecrecover(hash, sigV, sigR, sigS); //Ottiene l'address firmatario
    require(signer == identityOwner(identity), "bad_signature"); //Confronta con l'owner dell'identity
    nonce[signer]++; //Incrementa nonce per prevenire replay attacks
    return signer;
  }

  //Permette deleghe temporanee per specifiche funzioni (es. firma per conto di terzi) e controlla la validità temporale della delega
  function validDelegate(address identity, bytes32 delegateType, address delegate) public view returns(bool) {
    uint validity = delegates[identity][keccak256(abi.encode(delegateType))][delegate];
    return (validity > block.timestamp);
  }

  //Trasferisce la proprietà dell'identity.
  function changeOwner(address identity, address actor, address newOwner) internal onlyOwner(identity, actor) {
    owners[identity] = newOwner; //Aggiorna il mapping owners
    emit DIDOwnerChanged(identity, newOwner, changed[identity]); //Emissione evento
    changed[identity] = block.number; //Registra il blocco del cambiamento
  }

  function changeOwner(address identity, address newOwner) public {
    changeOwner(identity, msg.sender, newOwner);
  }

  //Cambiamento dell'owner usando la firma
  function changeOwnerSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, address newOwner) public {
    bytes32 hash = keccak256(abi.encodePacked(
      bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "changeOwner", newOwner)); //Costruisce un hash secondo lo standard EIP-191 aggiungendo un nonce per l'unicità e usa la firma per autenticare l'operazione
    changeOwner(identity, checkSignature(identity, sigV, sigR, sigS, hash), newOwner);
  }

  //Aggiunge un delegato ad uno specifico DID in cui "identity" è il DID (indirizzo ethr) a cui aggiungiamo un delegato, 
  //"delegateType" è il tipo di delega (veriKey, auth), delegate è l'address della persona o entità che sarà delegata
  function addDelegate(address identity, address actor, bytes32 delegateType, address delegate, uint validity) internal onlyOwner(identity, actor) {
    delegates[identity][keccak256(abi.encode(delegateType))][delegate] = block.timestamp + validity; //Salva la scadenza come timestamp assoluto in cui l'hash del delegateType permette qualsiasi tipo di delega (es. "sig","auth")
    emit DIDDelegateChanged(identity, delegateType, delegate, block.timestamp + validity, changed[identity]);
    changed[identity] = block.number;
  }

  function addDelegate(address identity, bytes32 delegateType, address delegate, uint validity) public {
    addDelegate(identity, msg.sender, delegateType, delegate, validity);
  }

  function addDelegateSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 delegateType, address delegate, uint validity) public {
    bytes32 hash = keccak256(abi.encodePacked(
      //Prefisso EIP-191 (0x1900) per firme strutturate, include l'address del contratto (previene replay cross-chain) usando un nonce specifico per owner
      bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "addDelegate", delegateType, delegate, validity)); 
    addDelegate(identity, checkSignature(identity, sigV, sigR, sigS, hash), delegateType, delegate, validity);
  }

  //Funzione di revoca della delega, in particolare "identity" fa riferimento all'indirizzo dell'identità DID da modificare,
  //"actor" fa riferimento a chi sta effettuando l'operazione (deve essere owner), 
  //"delegateType" fa riferimento al ripo di delega ("verifica", "firma", "auth") e "delegate" l'indirizzo del delegato da revocare
  function revokeDelegate(address identity, address actor, bytes32 delegateType, address delegate) internal onlyOwner(identity, actor) {
    delegates[identity][keccak256(abi.encode(delegateType))][delegate] = block.timestamp; //Imposta il timestamp di validità al blocco corrente cercando nel mapping delle deleghe l'indirizzo del delegato (delegate) da chi è stato delegato e che tipo di delega ha avuto
    emit DIDDelegateChanged(identity, delegateType, delegate, block.timestamp, changed[identity]);
    changed[identity] = block.number; //Aggiorna l'ultimo blocco di modifica
  }

  //Questa è la funzione pubblica a cui gli utenti possono fare accesso e in particolare è un wrapper semplificato in cui viene automaticamente iniettato msg.sender come actor
  //e questo permette chiamate dirette da wallet/contratti
  function revokeDelegate(address identity, bytes32 delegateType, address delegate) public {
    revokeDelegate(identity, msg.sender, delegateType, delegate);
  }

  //Si costruisce l'hash sulla base del prefisso 0x1900 per prevenire replay attacks, l'address del contratto (this), come stringa il nome della funzione "revokeDelegate" (quella in alto),
  //andando a recuperare l'owner corrente con identityOwner(identity)
  function revokeDelegateSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 delegateType, address delegate) public {
    bytes32 hash = keccak256(abi.encodePacked(bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "revokeDelegate", delegateType, delegate));
    revokeDelegate(identity, checkSignature(identity, sigV, sigR, sigS, hash), delegateType, delegate); //Chiama la funzione di revoca, controlla la validità della firma ed esegue la revoca solo se la firma è valida
  }

  //Gestisce VC legate all'identità tra cui memorizzare gli attributi (es. chiavi pubbliche) con scadenza ub cui:
  //"name" è il nome dell'attributo (es: did/pubKey/hex), "value" è il valore binario (es: chiave pubblica) e "validity" è per quanto tempo resta valido
  function setAttribute(address identity, address actor, bytes32 name, bytes memory value, uint validity ) internal onlyOwner(identity, actor) {
    emit DIDAttributeChanged(identity, name, value, block.timestamp + validity, changed[identity]);
    changed[identity] = block.number;
  }

  function setAttribute(address identity, bytes32 name, bytes memory value, uint validity) public {
    setAttribute(identity, msg.sender, name, value, validity);
  }

  function setAttributeSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 name, bytes memory value, uint validity) public {
    bytes32 hash = keccak256(abi.encodePacked(bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "setAttribute", name, value, validity));
    setAttribute(identity, checkSignature(identity, sigV, sigR, sigS, hash), name, value, validity);
  }

  //Revoca attributi in cui "identity" è l'indirizzo dell'entità DID, l'actor è chi esegue l'azione (deve essere owner), 
  //il "name" è l'identificatore dell'attributo (es. publicKey) e "value" è il valore specifico da revocare (chiave pubblica in formato bytes)
  function revokeAttribute(address identity, address actor, bytes32 name, bytes memory value ) internal onlyOwner(identity, actor) {
    emit DIDAttributeChanged(identity, name, value, 0, changed[identity]); //Imposta validTo a 0 (marchio di revoca) per dire che l'attributo è revocato immediatamente e mantiene name e value per identificare cosa revocare
    changed[identity] = block.number; //Registra il blocco della modifica per tracciabilità
  }

  //Wrapper che inietta automaticamente msg.sender come actor e permette a chi controlla l'identity di revocare direttamente via transazione
  function revokeAttribute(address identity, bytes32 name, bytes memory value) public {
    revokeAttribute(identity, msg.sender, name, value);
  }

  //Si costruisce l'hash sulla base del prefisso 0x1900 per prevenire replay attacks, l'address del contratto (this), come stringa il nome della funzione "revokeDelegate" (quella in alto),
  //andando a recuperare l'owner corrente con identityOwner(identity)
  function revokeAttributeSigned(address identity, uint8 sigV, bytes32 sigR, bytes32 sigS, bytes32 name, bytes memory value) public {
    bytes32 hash = keccak256(abi.encodePacked(bytes1(0x19), bytes1(0), this, nonce[identityOwner(identity)], identity, "revokeAttribute", name, value)); 
    revokeAttribute(identity, checkSignature(identity, sigV, sigR, sigS, hash), name, value); //Chiama la funzione di revoca, controlla la validità della firma ed esegue la revoca solo se la firma è valida
  }

}