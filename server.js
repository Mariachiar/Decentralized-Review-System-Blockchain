const express = require('express');
const path = require('path');
const { getSpidInstance, VcConflictError, VcUpdateNotificationError } = require('./src/SPID');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 3000 ;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/richiesta-vc', async (req, res) => {
  try {
    const { did, userCode, campiRichiesti } = req.body;
    if (!did || !userCode || !Array.isArray(campiRichiesti)) { /* ... (validazione invariata) ... */
      return res.status(400).json({ message: "Dati mancanti o malformati..." });
    }

    const spid = await getSpidInstance();
    const spidResponse = await spid.requestVC(did, userCode, campiRichiesti);

    // Gestione della risposta strutturata da SPID.requestVC
    // spidResponse è un oggetto se non sono stati lanciati VcConflictError o VcUpdateNotificationError
    if (spidResponse.type === "creation_success") {
      res.json({ status: "created", message: spidResponse.message, token: spidResponse.token, did: spidResponse.did });
    } else if (spidResponse.type === "retrieval_success_existing_fields") {
      res.json({ status: "retrieved_existing", message: spidResponse.message, token: spidResponse.token, did: spidResponse.did });
    } else if (spidResponse.type === "direct_update_success") {
      res.json({ status: "updated_direct", message: spidResponse.message, token: spidResponse.token, did: spidResponse.did });
    } else {
      // Fallback per risposte inattese (non dovrebbe accadere con la logica attuale)
      console.warn("Tipo di risposta SPID non gestito:", spidResponse);
      res.status(500).json({ message: "Risposta interna del server inattesa." });
    }

  } catch (error) {
    console.error("Errore API /api/richiesta-vc:", error.name, error.message);
    if (error instanceof VcConflictError) {
      return res.status(error.statusCode || 409).json({
        error: "conflict", // Tipo di errore per il client
        message: error.message,
        details: {
            conflictingDid: error.conflictingDid,
            conflictingVcJwt: error.conflictingVcJwt
        }
      });
    } else if (error instanceof VcUpdateNotificationError) {
      // Questo errore ora significa che il client riceve una VC (quella aggiornata dell'anchor)
      // ma con un messaggio che spiega il consolidamento.
      return res.status(error.statusCode || 200).json({ // Status 200 OK con payload specifico
        status: "updated_consolidated", // Nuovo status per il client
        message: error.message,         // Messaggio che spiega il consolidamento
        details: {
            updatedDid: error.updatedDid, // Il DID che è stato effettivamente aggiornato (l'anchor)
            token: error.updatedVcJwt     // Il JWT della VC aggiornata
        }
      });
    }
    // Errore generico
    res.status(500).json({ message: error.message || "Errore interno del server." });
  }
});

// ... (route GET invariate)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'richiesta_VC.html')));
app.get('/holder.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'holder.html')));
app.get('/spid-vc-context.jsonld', (req, res) => res.sendFile(path.join(__dirname, 'public', 'spid-vc-context.jsonld')));

app.listen(PORT, () => { /* ... (console.log invariato) ... */
  console.log(`Server SPID VC in ascolto sulla porta ${PORT}`);
  console.log(`Apri http://localhost:${PORT} nel browser.`);
});