// public_website/product-reviews-ui.js
document.addEventListener('DOMContentLoaded', async () => {
    const productIdEl = document.getElementById('productId');
    const reviewsContainer = document.getElementById('reviewsContainer');
    const reviewCardTemplate = document.getElementById('review-card-template');

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');

    if (!productId) {
        reviewsContainer.innerHTML = '<p class="error">ID del prodotto non specificato.</p>';
        return;
    }
    productIdEl.textContent = productId;

    try {
        // Chiama il nostro server unificato (percorso relativo)
        const reviewsResponse = await fetch(`/api/reviews/product/${productId}`);
        const reviewsResult = await reviewsResponse.json();

        

        reviewsContainer.innerHTML = ''; 
        
        for (const cid of reviewsResult.reviews) {
            const card = reviewCardTemplate.content.cloneNode(true);
            const cardEl = card.querySelector('.review-card');
            
            cardEl.querySelector('.review-cid span').textContent = cid;

            // Chiamata all'endpoint unificato che recupera tutti i dettagli
            const detailsResponse = await fetch(`/api/reviews/details/${cid}`);
            const detailsResult = await detailsResponse.json();
            
            // Chiamata separata per il contenuto IPFS
            const contentResponse = await fetch(`/api/reviews/content/${cid}`);
            const contentResult = await contentResponse.json();

            // Popola la card con i dati recuperati
            if (contentResult.success) {
                cardEl.querySelector('.review-text').textContent = contentResult.content;
            } else {
                 cardEl.querySelector('.review-text').textContent = "Contenuto non disponibile.";
            }

            if (detailsResult.success) {
                cardEl.querySelector('.review-plain').textContent = detailsResult.plainReview || 'N/A' ;
                cardEl.querySelector('.review-author').textContent = detailsResult.holder.reviewer || 'N/A' ;
                cardEl.querySelector('.review-likes-count').textContent = detailsResult.likes.total ?? 'N/A';
                cardEl.querySelector('.review-likes-list').textContent = detailsResult.likes.reviewers ?? 'N/A';
                cardEl.querySelector('.review-dislikes-count').textContent = detailsResult.dislikes.total ?? 'N/A';
                cardEl.querySelector('.review-dislikes-list').textContent = detailsResult.dislikes.reviewers ?? 'N/A';
                //cardEl.querySelector('.review-timestamp').textContent = detailsResult.timestamp.formattedDate || 'N/A';

                cardEl.querySelector('.review-hasReturned').textContent = detailsResult.hasReturned ?? 'N/A';
                
                cardEl.querySelector('.review-state').textContent = detailsResult.state.state || 'N/A';
            }

            reviewsContainer.appendChild(cardEl);
        }

    } catch (error) {
        console.error("Errore nel recuperare le recensioni:", error);
        reviewsContainer.innerHTML = '<p class="error">Impossibile caricare le recensioni.</p>';
    }
});