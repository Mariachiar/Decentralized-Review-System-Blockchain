document.addEventListener('DOMContentLoaded', () => {
    const vcDisplayDiv = document.getElementById('vcDisplay');
    const downloadBtn = document.getElementById('downloadVcBtn');
    const verificationSectionDiv = document.getElementById('verificationSection');
    const statusNotificationDiv = document.getElementById('statusNotificationMessage');

    const vcJwt = localStorage.getItem('vcJwt');
    const statusNotificationMsg = localStorage.getItem('vcStatusNotification'); // Chiave generica

    if (statusNotificationMsg && statusNotificationDiv) {
        statusNotificationDiv.innerHTML = `<p>${statusNotificationMsg}</p>`; // Il messaggio da SPID è già formattato
        // Applica uno stile generico o decidi in base al contenuto del messaggio se necessario
        statusNotificationDiv.className = 'vc-container info-message-box update-notification'; // Default a update, potrebbe essere migliorato
        if (statusNotificationMsg.toLowerCase().includes("conflitto") || statusNotificationMsg.toLowerCase().includes("esiste già")) {
            statusNotificationDiv.className = 'vc-container info-message-box conflict-notification';
        }
        statusNotificationDiv.style.display = 'block';
        localStorage.removeItem('vcStatusNotification'); // Pulisci dopo aver visualizzato
    }

    if (!vcJwt) {
        // ... (gestione vcJwt non trovato, invariata) ...
        vcDisplayDiv.innerHTML = '<p class="text-red-600">Nessuna Verifiable Credential trovata in memoria. Torna alla pagina di richiesta.</p>';
        downloadBtn.style.display = 'none';
        verificationSectionDiv.style.display = 'none';
        return;
    }

    displayVc(vcJwt, vcDisplayDiv);
    downloadBtn.style.display = 'inline-block';
    verificationSectionDiv.style.display = 'block';

    downloadBtn.addEventListener('click', () => { /* ... (invariato) ... */
        downloadJwt(vcJwt, 'spid_credential.jwt');
    });
    
    // localStorage.removeItem('vcJwt'); 
});

function displayVc(jwt, container) { /* ... (invariato) ... */
    container.innerHTML = ''; 
    const jwtSection = document.createElement('div');
    jwtSection.className = 'vc-section';
    jwtSection.innerHTML = '<h2>Verifiable Credential JWT Completa:</h2>';
    const preJwt = document.createElement('pre');
    const parts = jwt.split('.');
    if (parts.length !== 3) {
        preJwt.textContent = "Formato JWT non valido.";
        jwtSection.appendChild(preJwt);
        container.appendChild(jwtSection);
        return;
    }
    const headerSpan = document.createElement('span'); headerSpan.className = 'jwt-part'; headerSpan.textContent = parts[0];
    const payloadSpan = document.createElement('span'); payloadSpan.className = 'jwt-part'; payloadSpan.textContent = parts[1];
    const signatureSpan = document.createElement('span'); signatureSpan.className = 'jwt-part'; signatureSpan.textContent = parts[2];
    const dot1 = document.createElement('span'); dot1.className = 'jwt-dot'; dot1.textContent = '.';
    const dot2 = document.createElement('span'); dot2.className = 'jwt-dot'; dot2.textContent = '.';
    preJwt.appendChild(headerSpan); preJwt.appendChild(dot1); preJwt.appendChild(payloadSpan); preJwt.appendChild(dot2); preJwt.appendChild(signatureSpan);
    jwtSection.appendChild(preJwt); container.appendChild(jwtSection);
    try {
        function base64UrlDecode(str) { let output = str.replace(/-/g, '+').replace(/_/g, '/'); switch (output.length % 4) { case 0: break; case 2: output += '=='; break; case 3: output += '='; break; default: throw 'Illegal base64url string!'; } return decodeURIComponent(Array.prototype.map.call(atob(output), function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')); }
        const decodedPayload = JSON.parse(base64UrlDecode(parts[1]));
        const payloadSection = document.createElement('div'); payloadSection.className = 'vc-section'; payloadSection.innerHTML = '<h2>Payload Decodificato (Contenuto della VC):</h2>';
        const prePayload = document.createElement('pre'); prePayload.textContent = JSON.stringify(decodedPayload, null, 2); payloadSection.appendChild(prePayload); container.appendChild(payloadSection);
        const decodedHeader = JSON.parse(base64UrlDecode(parts[0]));
        const headerSection = document.createElement('div'); headerSection.className = 'vc-section'; headerSection.innerHTML = '<h2>Header JWT Decodificato:</h2>';
        const preHeader = document.createElement('pre'); preHeader.textContent = JSON.stringify(decodedHeader, null, 2); headerSection.appendChild(preHeader); container.appendChild(headerSection);
    } catch (e) { console.error("Errore decodifica JWT:", e); const errorMsg = document.createElement('p'); errorMsg.className = 'text-red-600 vc-section'; errorMsg.textContent = 'Errore decodifica Header/Payload JWT.'; container.appendChild(errorMsg); }
}

function downloadJwt(jwtString, filename) { /* ... (invariato) ... */
    const blob = new Blob([jwtString], { type: 'application/jwt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}