// server-reviews.js
const express = require('express');
const path = require('path');
const ReviewManager = require('../src/ReviewManager');

const app = express();
const PORT = 3002;

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public_reviews')));

let reviewManagerInstance;
try {
    reviewManagerInstance = ReviewManager.getInstance();
    console.log("Istanza Singleton di ReviewManager pronta.");
} catch (error) {
    console.error("Errore fatale all'avvio:", error);
    process.exit(1);
}

// API Endpoints Principali
app.post('/api/upload-review', async (req, res) => {
    const { reviewText } = req.body;
    if (!reviewText) return res.status(400).json({ success: false, message: "Testo recensione mancante." });
    try {
        const cid = await reviewManagerInstance.sendReviewToIPFS(reviewText);
        res.json({ success: true, cid: cid });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});
app.post('/api/submit-review', async (req, res) => {
    const { vpJwtProof, cid, productId } = req.body;
    if (!vpJwtProof || !cid || !productId) return res.status(400).json({ success: false, message: "Dati mancanti." });
    res.json(await reviewManagerInstance.insertReview(vpJwtProof, cid, productId));
});
app.post('/api/modify-review', async (req, res) => {
    const { vpJwtProof, oldCid, newCid, productId } = req.body;
    if (!vpJwtProof || !oldCid || !newCid || !productId) return res.status(400).json({ success: false, message: "Dati mancanti." });
    res.json(await reviewManagerInstance.modifyReview(vpJwtProof, oldCid, newCid, productId));
});
app.post('/api/delete-review', async (req, res) => {
    const { vpJwtProof, cid, productId } = req.body;
    if (!vpJwtProof || !cid || !productId) return res.status(400).json({ success: false, message: "Dati mancanti." });
    res.json(await reviewManagerInstance.deleteReview(vpJwtProof, cid, productId));
});
app.post('/api/like', async (req, res) => {
    const { vpJwt, cid } = req.body;
    if (!vpJwt || !cid) return res.status(400).json({ success: false, message: "Dati mancanti." });
    res.json(await reviewManagerInstance.insertLike(vpJwt, cid));
});
app.post('/api/dislike', async (req, res) => {
    const { vpJwt, cid } = req.body;
    if (!vpJwt || !cid) return res.status(400).json({ success: false, message: "Dati mancanti." });
    res.json(await reviewManagerInstance.insertDislike(vpJwt, cid));
});

// API Endpoints per le GET
app.get('/api/product-reviews/:productId', async (req, res) => {
    res.json(await reviewManagerInstance.getProductReviews(req.params.productId));
});
app.get('/api/review-likes/:cid', async (req, res) => {
    res.json(await reviewManagerInstance.getReviewLike(req.params.cid));
});
app.get('/api/review-dislikes/:cid', async (req, res) => {
    res.json(await reviewManagerInstance.getReviewDislike(req.params.cid));
});
app.get('/api/review-holder/:cid', async (req, res) => {
    res.json(await reviewManagerInstance.getHolderReview(req.params.cid));
});

app.get('/api/review-state/:cid', async (req, res) => {
    res.json(await reviewManagerInstance.getStateReview(req.params.cid));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public_reviews', 'reviews.html'));
});
app.listen(PORT, () => console.log(`Server Review Manager in ascolto su http://localhost:${PORT}`));