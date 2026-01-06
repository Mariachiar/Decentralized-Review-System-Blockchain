/**
 * Directory statica di 10 utenti.
 *  • Chiave  : codice alfanumerico casuale (16 caratteri) generato **una sola volta**.
 *  • Valore  : oggetto con attributi anagrafici e permessi.
 *
 * NB: poiché i codici sono hard-coded, rimangono identici a ogni esecuzione.
 */
class UserDirectory {
    // Dizionario immutabile
    static users = {
      K8wP3ZL2rQb9cX1D: {
        nation: "IT",
        over18: true,
        weaponPermit: false,
        sex: "F",
        isStudent: true,
        isTeacher: false
      },
      M74aG92sVcH5nR0T: {
        nation: "USA",
        over18: true,
        weaponPermit: true,
        sesso: "M",
        isStudent: false,
        isTeacher: true
      },
      J1cE6pY8UzL4sA7K: {
        nation: "USA",
        over18: false,
        weaponPermit: false,
        sesso: "M",
        isStudent: true,
        isTeacher: false
      },
      F6tQ2mB9vS1nD5H3: {
        nation: "UK",
        over18: true,
        weaponPermit: false,
        sesso: "F",
        isStudent: false,
        isTeacher: true
      },
      P0xR7gL3yW8kZ2V1: {
        nation: "IT",
        over18: true,
        weaponPermit: false,
        sex: "M",
        isStudent: false,
        isTeacher: false
      },
      N4dS9hM2fC6uE8B0: {
        nation: "ESP",
        over18: true,
        weaponPermit: true,
        sex: "F",
        isStudent: false,
        isTeacher: true
      },
      H3qT5aF7rG1pL9S2: {
        nation: "JAP",
        over18: false,
        weaponPermit: false,
        sex: "F",
        isStudent: true,
        isTeacher: false
      },
      R8vK0xJ6bP4nQ2C5: {
        nation: "DEU",
        over18: true,
        weaponPermit: false,
        sex: "M",
        isStudent: false,
        isTeacher: false
      },
      D5zL1yT9wH7mF3G6: {
        nation: "NED",
        over18: true,
        weaponPermit: true,
        sex: "M",
        isStudent: true,
        isTeacher: false
      },
      S2bN8cV4kR0pX6J9: {
        nation: "FRA",
        over18: true,
        weaponPermit: false,
        sex: "F",
        isStudent: false,
        isTeacher: true
      }
    };
  
    /** Ritorna l’intero dizionario */
    static getAll() {
      return this.users;
    }
  
    /** Ritorna un profilo dato il codice; null se non esiste */
    static get(code) {
      return this.users[code] || null;
    }
  }
  module.exports = UserDirectory;
  // --- esempio di utilizzo ---
  console.log(UserDirectory.getAll());
  /* Accesso a un singolo profilo:
     console.log(UserDirectory.get("K8wP3ZL2rQb9cX1D"));
  */
  