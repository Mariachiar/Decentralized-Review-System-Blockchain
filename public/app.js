/* basic helper, const, FIELD_LABELS, selected, validateDid, validateCode, clearErrorMessage, displayErrorMessage, toggleSubmit, addBtn listener, renderChips, chipContainer listener -- come nella versione precedente */
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const didInput = qs("#didInput"); const codeInput = qs("#userCodeInput");
const dropdown = qs("#fieldSelect"); const chipContainer = qs("#selectedContainer");
const submitBtn = qs("#submitBtn"); const form = qs("#vcRequestForm");
const addBtn = qs("#addAttributoBtn"); const errorMessageDiv = qs("#errorMessage");
const FIELD_LABELS = { nation: "Residenza", over18: "Maggiorenne", weaponPermit: "Porto d'Armi", sex: "Sesso", isStudent: "Studente", isTeacher: "Docente" };
let selected = new Set();
function validateDid(value) { return /^did:ethr:(0x[0-9a-fA-F]+):0x[0-9a-fA-F]{40}$/.test(value.trim()); }
function validateCode(value) { return /^[A-Za-z0-9]{16}$/.test(value.trim()); }
function clearErrorMessage() { errorMessageDiv.innerHTML = ""; }
function displayErrorMessage(message, isHtml = false) { if (isHtml) { errorMessageDiv.innerHTML = message; } else { errorMessageDiv.textContent = message; } }
function toggleSubmit() { const ok = validateDid(didInput.value) && validateCode(codeInput.value) && selected.size > 0; submitBtn.disabled = !ok; }
[didInput, codeInput].forEach(inp => inp.addEventListener("input", () => { if (errorMessageDiv.textContent || errorMessageDiv.innerHTML) { clearErrorMessage(); } toggleSubmit(); }));
dropdown.addEventListener("change", () => { addBtn.disabled = !dropdown.value; if (errorMessageDiv.textContent || errorMessageDiv.innerHTML) { clearErrorMessage(); } });
addBtn.addEventListener("click", () => { const field = dropdown.value; if (!field) { dropdown.focus(); return; } if (selected.has(field)) { displayErrorMessage(`Attributo '${FIELD_LABELS[field]}' già selezionato.`); return; } clearErrorMessage(); selected.add(field); renderChips(); dropdown.value = ""; addBtn.disabled = true; toggleSubmit(); dropdown.focus(); });
function renderChips() { chipContainer.innerHTML = ""; selected.forEach(key => { const chip = document.createElement("div"); chip.className = "chip"; chip.innerHTML = `${FIELD_LABELS[key]} <button type="button" data-key="${key}" class="close" aria-label="Rimuovi ${FIELD_LABELS[key]}">×</button>`; chipContainer.appendChild(chip); }); }
chipContainer.addEventListener("click", e => { if (e.target.classList.contains("close") && e.target.dataset.key) { clearErrorMessage(); const k = e.target.dataset.key; selected.delete(k); renderChips(); toggleSubmit(); } });


form.addEventListener("submit", async e => {
  e.preventDefault();
  clearErrorMessage();
  submitBtn.disabled = true;
  submitBtn.textContent = "Richiesta in corso...";

  const didValue = didInput.value.trim();
  const userCodeValue = codeInput.value.trim();
  const selectedFieldsArray = [...selected];

  if (!validateDid(didValue)) { displayErrorMessage("Formato DID non valido. Es: did:ethr:0x539:0xADDRESS"); submitBtn.disabled = false; submitBtn.textContent = "Richiedi VC"; return; }
  if (!validateCode(userCodeValue)) { displayErrorMessage("Formato Codice Utente non valido (16 caratteri alfanumerici)."); submitBtn.disabled = false; submitBtn.textContent = "Richiedi VC"; return; }
  if (selectedFieldsArray.length === 0) { displayErrorMessage("Selezionare almeno un attributo."); submitBtn.disabled = false; submitBtn.textContent = "Richiedi VC"; return; }

  try {
    const response = await fetch('/api/richiesta-vc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', },
      body: JSON.stringify({
        did: didValue,
        userCode: userCodeValue,
        campiRichiesti: selectedFieldsArray,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) { // Gestisce errori HTTP come 400, 409 (conflitto), 500
      if (response.status === 409 && responseData.error === "conflict") {
        let conflictMessage = `${responseData.message}`;
        if (responseData.details && responseData.details.conflictingDid) {
             conflictMessage += `<br/>DID Esistente: ${responseData.details.conflictingDid}.`;
        }
        if (responseData.details && responseData.details.conflictingVcJwt) {
            conflictMessage += `<br/><button type="button" class="btn-link" onclick="localStorage.setItem('vcJwt', '${responseData.details.conflictingVcJwt}'); localStorage.setItem('vcStatusNotification', 'Stai visualizzando una VC esistente suggerita a seguito di un conflitto.'); window.location.href='/holder.html';">Visualizza VC Esistente</button>`;
        }
        displayErrorMessage(conflictMessage, true);
      } else {
        throw new Error(responseData.message || `Errore dal server: ${response.status}`);
      }
    } else { // Risposta OK (200)
      localStorage.removeItem('vcStatusNotification'); // Pulisci notifiche vecchie

      let notificationMessage = responseData.message; // Messaggio da SPID
      let tokenToStore = responseData.token;
      let redirectToHolder = true;

      switch (responseData.status) {
        case "created":
          // Messaggio già incluso in responseData.message o non necessario per nuova creazione semplice
          // notificationMessage = `Nuova VC creata con successo per il DID ${responseData.did}.`; (opzionale)
          break;
        case "retrieved_existing":
          // L'utente ha richiesto campi già coperti dalla sua VC (stesso DID)
          // Il messaggio da SPID dovrebbe essere sufficiente.
          break;
        case "updated_direct":
          // La VC dell'utente (stesso DID) è stata aggiornata con nuovi campi
          // Il messaggio da SPID dovrebbe essere sufficiente.
          break;
        case "updated_consolidated":
          // La VC è stata aggiornata su un anchor DID a seguito di una richiesta per un DID diverso
          // Il messaggio da SPID (contenuto in responseData.message) spiega questo.
          // Il token è in responseData.details.token
          tokenToStore = responseData.details.token;
          notificationMessage = responseData.message; // Assicurati che il messaggio sia quello completo
          break;
        default:
          console.warn("Status di risposta OK non pienamente gestito:", responseData.status);
          // Procedi comunque se c'è un token
          if (!tokenToStore && responseData.details && responseData.details.token) tokenToStore = responseData.details.token;
          if (!tokenToStore && !responseData.token) redirectToHolder = false;
      }

      if (redirectToHolder && tokenToStore) {
        if (notificationMessage) {
            localStorage.setItem('vcStatusNotification', notificationMessage);
        }
        localStorage.setItem('vcJwt', tokenToStore);
        window.location.href = '/holder.html';
      } else if (!redirectToHolder) {
        displayErrorMessage(notificationMessage || "Operazione completata, ma nessun token VC ricevuto per la visualizzazione.");
      }
    }
  } catch (error) {
    console.error("Errore durante la richiesta VC:", error);
    displayErrorMessage(`Errore: ${error.message}`);
  } finally {
    const isStillOnPage = window.location.pathname.endsWith('richiesta_VC.html') || window.location.pathname === "/";
    const hasUserActionMessage = errorMessageDiv.innerHTML.includes("Visualizza VC Esistente");
    const willRedirect = localStorage.getItem('vcJwt') && (localStorage.getItem('vcStatusNotification') || !errorMessageDiv.innerHTML);


    if (isStillOnPage && !hasUserActionMessage && !willRedirect) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Richiedi VC";
    } else if (hasUserActionMessage || willRedirect) {
        if (!willRedirect) submitBtn.textContent = "Azione Richiesta"; // se non c'è reindirizzamento automatico
        // altrimenti il reindirizzamento gestirà il cambio pagina
    }
  }
});

// Inizializzazione
toggleSubmit();
if (dropdown.value) { addBtn.disabled = false; } else { addBtn.disabled = true; }