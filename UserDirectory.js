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
        residenza: "IT",
        over18: true,
        portoArmi: false,
        sesso: "F",
        studente: true,
        docente: false
      },
      M74aG92sVcH5nR0T: {
        residenza: "USA",
        over18: true,
        portoArmi: true,
        sesso: "M",
        studente: false,
        docente: true
      },
      J1cE6pY8UzL4sA7K: {
        residenza: "USA",
        over18: false,
        portoArmi: false,
        sesso: "M",
        studente: true,
        docente: false
      },
      F6tQ2mB9vS1nD5H3: {
        residenza: "UK",
        over18: true,
        portoArmi: false,
        sesso: "F",
        studente: false,
        docente: true
      },
      P0xR7gL3yW8kZ2V1: {
        residenza: "IT",
        over18: true,
        portoArmi: false,
        sesso: "M",
        studente: false,
        docente: false
      },
      N4dS9hM2fC6uE8B0: {
        residenza: "ESP",
        over18: true,
        portoArmi: true,
        sesso: "F",
        studente: false,
        docente: true
      },
      H3qT5aF7rG1pL9S2: {
        residenza: "JAP",
        over18: false,
        portoArmi: false,
        sesso: "F",
        studente: true,
        docente: false
      },
      R8vK0xJ6bP4nQ2C5: {
        residenza: "DEU",
        over18: true,
        portoArmi: false,
        sesso: "M",
        studente: false,
        docente: false
      },
      D5zL1yT9wH7mF3G6: {
        residenza: "NED",
        over18: true,
        portoArmi: true,
        sesso: "M",
        studente: true,
        docente: false
      },
      S2bN8cV4kR0pX6J9: {
        residenza: "FRA",
        over18: true,
        portoArmi: false,
        sesso: "F",
        studente: false,
        docente: true
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
  
  // --- esempio di utilizzo ---
  console.log(UserDirectory.getAll());
  /* Accesso a un singolo profilo:
     console.log(UserDirectory.get("K8wP3ZL2rQb9cX1D"));
  */
  