// server.js
const express = require('express');
const path = require('path');
const WebsiteRegister = require('../src/WebsiteRegister');
const ReviewManager = require('../src/ReviewManager');
const { fstat } = require('fs');

const fs2 = require('fs').promises; 

const app = express();
const PORT = 3001; // Il nostro unico server gira sulla porta 3001

// --- Middleware ---
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- Inizializzazione Singleton ---
let websiteRegisterInstance;
let reviewManagerInstance;
try {
    websiteRegisterInstance = WebsiteRegister.getInstance();
    reviewManagerInstance = ReviewManager.getInstance();
    console.log("Istanze Singleton di WebsiteRegister e ReviewManager pronte.");
} catch (error) {
    console.error("Errore fatale all'avvio:", error);
    process.exit(1);
}

// ===========================================
// === API Endpoints per E-COMMERCE (Login, Acquisti, ecc.)
// ===========================================
app.post('/api/login', async (req, res) => {
    const { vpJwt } = req.body;
    if (!vpJwt) return res.status(400).json({ success: false, message: "VP JWT non fornito." });
    const result = await websiteRegisterInstance.login(vpJwt);
    if (result.success) {
        res.json({ success: true, redirect: '/shop' });
    } else {
        res.status(401).json(result);
    }
});

app.post('/api/update-vp', async (req, res) => {
    const { vpJwt } = req.body;
    if (!vpJwt) return res.status(400).json({ success: false, message: "VP JWT per aggiornamento non fornito." });
    const result = await websiteRegisterInstance.updateVp(vpJwt);
    res.json(result);
});

app.post('/api/guest-login', (req, res) => {
    websiteRegisterInstance.loginAsGuest();
    res.json({ success: true, redirect: '/shop' });
});

app.post('/api/logout', (req, res) => {
    const result = websiteRegisterInstance.logout();
    res.json(result);
});

app.get('/api/session', (req, res) => {
    if (!websiteRegisterInstance.isUserLoggedIn) {
        return res.status(401).json({ success: false, redirect: '/login' });
    }
    res.json({
        success: true,
        data: {
            did: websiteRegisterInstance.currentHolderDid,
            claims: websiteRegisterInstance.currentClaims
        }
    });
});

app.get('/api/product-constraints/:productId', async (req, res) => {
    const result = await websiteRegisterInstance.getProductConstraints(req.params.productId);
    res.json(result);
});

app.get('/api/user-products', async (req, res) => {
    const result = await websiteRegisterInstance.getUserProducts();
    res.json(result);
});

app.post('/api/buy', async (req, res) => {
    const { productId } = req.body;
    const result = await websiteRegisterInstance.buy(productId);
    res.json(result);
});

app.post('/api/return', async (req, res) => {
    const { productId } = req.body;
    const result = await websiteRegisterInstance.returnProduct(productId);
    res.json(result);
});

// NUOVO ENDPOINT PER GLI NFT
app.get('/api/user-nfts', async (req, res) => {
    if (!websiteRegisterInstance || !websiteRegisterInstance.isUserLoggedIn) {
        return res.status(401).json({ success: false, message: "Utente non loggato." });
    }
    const didHolder = websiteRegisterInstance.currentHolderDid;
    // Assumiamo che la tua classe abbia questo metodo
    const result = await websiteRegisterInstance.getNFTList(didHolder);
    res.json({
        success: true,
        nfts: result
    });
});




// ===========================================
// === API Endpoints per REVIEW MANAGER
// ===========================================

let prodId;

app.get('/api/reviews/product/:productId', async (req, res) => {
    const result= await reviewManagerInstance.getProductReviews(req.params.productId);
    prodId=req.params.productId;
    res.json(result);

    console.log(result);
});

app.get('/api/reviews/content/:cid', async (req, res) => {
    const content = await reviewManagerInstance.downloadFromIPFS(req.params.cid, "./file");
    if (content === null) {
        return res.status(404).json({ success: false, message: 'Contenuto non trovato su IPFS.' });
    }
    res.json({ success: true, content: content });
});





app.get('/api/reviews/details/:cid', async (req, res) => {
    // Endpoint unificato per ottenere tutti i dettagli di una recensione
    const { cid } = req.params;
    console.log(prodId);

    //console.log(cid);
    let holder;
    try {
        
        const likes = await reviewManagerInstance.getReviewLike(cid);
        //console.log(likes);
        const disLikes = await reviewManagerInstance.getReviewDislike(cid);
        //console.log(disLikes);
        holder = await reviewManagerInstance.getHolderReview(cid);
       // console.log(holder);
        //const timestamp= await reviewManagerInstance.getTimestampReview(cid);
        //console.log( convertTimestampToDate(timestamp));

        await reviewManagerInstance.downloadFromIPFS(cid, "./temp/review.txt");

        const plainReview = await fs2.readFile("./temp/review.txt", 'utf8');

        //console.log(plainReview);

        const stateReview= await reviewManagerInstance.getStateReview(cid);
        //console.log(stateReview);

        
        let hasReturned= await reviewManagerInstance.getProductReturnStatus(holder.reviewer, prodId );

        //let hasReturned= await reviewManagerInstance.getProductReturnStatus(cid);
        
        console.log(hasReturned);
        

        

        res.json({
            success: true,
            likes: {reviewers:likes.reviewers, total:likes.total },
            dislikes: {reviewers: disLikes.reviewers, total: disLikes.total },
            holder: {reviewer: holder.reviewer} ,
            //timestamp: {timestamp: timestamp.timestamp},
            plainReview: plainReview,
            state: {state: stateReview.state },
            hasReturned: hasReturned
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// --- Routing Pagine HTML ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/shop', (req, res) => {
    if (!websiteRegisterInstance || !websiteRegisterInstance.isUserLoggedIn) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'shop.html'));
});
app.get('/product-reviews.html', (req, res) => {
    // Questa pagina può essere vista da tutti, ma le azioni potrebbero richiedere un login
    res.sendFile(path.join(__dirname, 'public', 'product-reviews.html'));
});

// Redirect della root a /login
app.get('/', (req, res) => res.redirect('/login'));

app.listen(PORT, () => console.log(`Server Unificato in ascolto su http://localhost:${PORT}`));