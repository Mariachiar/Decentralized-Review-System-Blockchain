// public_website/login-ui.js
document.addEventListener('DOMContentLoaded', () => {
    const vpFileInput = document.getElementById('vpFileInput');
    const loginWithVpBtn = document.getElementById('loginWithVpBtn');
    const guestLoginBtn = document.getElementById('guestLoginBtn');
    const loginStatusEl = document.getElementById('loginStatus');

    function displayStatus(message, isError = false) {
        loginStatusEl.textContent = message;
        loginStatusEl.className = 'status';
        if (message) loginStatusEl.classList.add(isError ? 'error' : 'success');
    }

    async function handleLogin(apiEndpoint, body) {
        displayStatus("Elaborazione in corso...", false);
        loginWithVpBtn.disabled = true;
        guestLoginBtn.disabled = true;
        
        try {
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const result = await response.json();
            if (result.success && result.redirect) {
                window.location.href = result.redirect;
            } else {
                displayStatus(`Login fallito: ${result.message}`, true);
            }
        } catch (error) {
            displayStatus("Errore di comunicazione con il server.", true);
        } finally {
            loginWithVpBtn.disabled = false;
            guestLoginBtn.disabled = false;
        }
    }

    loginWithVpBtn.addEventListener('click', () => {
        const file = vpFileInput.files[0];
        if (!file) {
            displayStatus("Per favore, seleziona un file VP.", true);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const vpJwt = event.target.result;
            handleLogin('/api/login', { vpJwt: vpJwt });
        };
        reader.onerror = () => {
            displayStatus("Errore durante la lettura del file.", true);
        };
        reader.readAsText(file);
    });

    guestLoginBtn.addEventListener('click', () => {
        handleLogin('/api/guest-login', {});
    });
});