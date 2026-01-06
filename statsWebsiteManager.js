// WebsiteRegisterBenchmark.js
const fs = require('fs');
const WebsiteRegister = require('./src/WebsiteRegister');

async function measure(label, txPromise) {
    const start = process.hrtime.bigint();
    const receipt = await txPromise;
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    return {
        label,
        durationMs,
        gasUsed: receipt.gasUsed.toString()
    };
}

async function runBenchmark() {
    const wr = WebsiteRegister.getInstance();
    const accounts = await wr.web3.eth.getAccounts();

    const results = [];

    // Simula login come utente verificato con claims personalizzati
    console.log(">> Login con VP...");
    const dummyVpJwt = "eyJhbGciOiJFUzI1NkstUiIsInR5cCI6IkpXVCJ9.eyJ2cCI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSIsImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9hY2Nlc3MtdmMtY29udGV4dC5qc29ubGQiXSwidHlwZSI6WyJWZXJpZmlhYmxlUHJlc2VudGF0aW9uIiwiQWNjZXNzUHJlc2VudGF0aW9uIl0sInZlcmlmaWFibGVDcmVkZW50aWFsIjpbImV5SmhiR2NpT2lKRlV6STFOa3N0VWlJc0luUjVjQ0k2SWtwWFZDSjkuZXlKMll5STZleUpBWTI5dWRHVjRkQ0k2V3lKb2RIUndjem92TDNkM2R5NTNNeTV2Y21jdk1qQXhPQzlqY21Wa1pXNTBhV0ZzY3k5Mk1TSXNJbWgwZEhBNkx5OXNiMk5oYkdodmMzUTZNekF3TUM5aFkyTmxjM010ZG1NdFkyOXVkR1Y0ZEM1cWMyOXViR1FpWFN3aWRIbHdaU0k2V3lKV1pYSnBabWxoWW14bFEzSmxaR1Z1ZEdsaGJDSXNJa0ZqWTJWemMwTnlaV1JsYm5ScFlXeHpJbDBzSW1OeVpXUmxiblJwWVd4VGRXSnFaV04wSWpwN0ltbGtJam9pWkdsa09tVjBhSEk2TUhnMU16azZNSGcyTlRCRlptTXhOemcxT1RZNFFUWTBOV0kyWlRnek1qUkNPVVF6UVRrek56UTBPVGxqTVRaaUlpd2libUYwYVc5dUlqb2lSVk5RSWl3aWIzWmxjakU0SWpwMGNuVmxMQ0ozWldGd2IyNVFaWEp0YVhRaU9uUnlkV1VzSW1selZHVmhZMmhsY2lJNmRISjFaWDE5TENKemRXSWlPaUprYVdRNlpYUm9jam93ZURVek9Ub3dlRFkxTUVWbVl6RTNPRFU1TmpoQk5qUTFZalpsT0RNeU5FSTVSRE5CT1RNM05EUTVPV014Tm1JaUxDSnVZbVlpT2pFM05EazVNelEwTURBc0ltbHpjeUk2SW1ScFpEcGxkR2h5T2pCNE5UTTVPakI0UVRWa1ptTXlNVFJDTURneE1UQkZSVFJrTlRRMVpqSkZORGMzTUVVM01VVXlNVUk0T0RoQ01pSjkub0xjQXpyUUNHWHgzdmVsYkg5alIzc0xGZEJIcUs0dzZ6UF9keGUtWlM0ZE1FNVdWSVZGMEtvaGJpUDRoOFEzVENIWktTb3BxejFRUzFUMVdBMUdvTVFFIl19LCJpc3MiOiJkaWQ6ZXRocjoweDUzOToweDY1MEVmYzE3ODU5NjhBNjQ1YjZlODMyNEI5RDNBOTM3NDQ5OWMxNmIifQ.sHngfAX19E0peR2HZI5mOcfYbK5J-fF7enpLy75ojeMpjddbt7A1NEO63oRmS5stKYU65CiP0Tl61JKzPNkDEAA"; // Sostituisci con un VP valido o simula login come guest
    const loginResult = await wr.login(dummyVpJwt);
    if (!loginResult.success) {
        console.log("Login fallito. Provo con login come ospite...");
        wr.loginAsGuest();
    }

    // Misura BUY per ogni prodotto
    const productIds = ["LIBRO01", "ALCOL01", "EDUCA01", "WEAPN01", "CONFE01", "DIGIT01"];

    for (const productId of productIds) {
        try {
            const metric = await measure(
                `buy(${wr.currentHolderDid}, ${productId})`,
                wr.contract.methods.buy(wr.currentHolderDid, productId).send({ from: accounts[1], gas: 3000000 })
            );
            console.log(metric);
            results.push(metric);
        } catch (err) {
            console.log(`Errore su buy(${productId}):`, err.message);
        }
    }

    // Prova il reso per un prodotto acquistato
    try {
        const returnMetric = await measure(
            `returnProduct(${wr.currentHolderDid}, ${productIds[0]})`,
            wr.contract.methods.returnProduct(wr.currentHolderDid, productIds[0]).send({ from: accounts[1], gas: 3000000 })
        );
        console.log(returnMetric);
        results.push(returnMetric);
    } catch (err) {
        console.log(`Errore su returnProduct(${productIds[0]}):`, err.message);
    }

    // Salva su CSV
    const csvLines = ["label,durationMs,gasUsed"];
    for (const res of results) {
        csvLines.push(`${res.label},${res.durationMs},${res.gasUsed}`);
    }
    fs.writeFileSync('metrics.csv', csvLines.join('\n'));
    console.log("✅ Metriche salvate in metrics.csv");
}

runBenchmark().catch(err => {
    console.error("Errore durante il benchmark:", err);
});