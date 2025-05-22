import { ethers } from "./ethers-frontend.js"
import * as constants from "./constants.js"

document.addEventListener("DOMContentLoaded", main())
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner()
async function main() {

    if (typeof window.ethereum == 'undefined') {
        //reinderizzamento alla pagina home
    }
    //connessione al provider 
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner()
    const certificatesContainer = document.getElementById("certificates-container")
    //inizializza il contratto 
    const certificateNFT = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer)
    const userNFT = new ethers.Contract(constants.userNFTAddress, constants.userNFTAbi, signer)
    const balanceOf = await certificateNFT.balanceOf(signer.getAddress())
    try {
        const tokenCounter = await certificateNFT.getCounter()
        const ownerAddress = await signer.getAddress()
        let tokenURIs = []
        for (let i = 0; i < tokenCounter; i++) {
            const ownerOf = await certificateNFT.ownerOf(i)
            if (ownerOf == ownerAddress) {
                tokenURIs.push(await certificateNFT.getTokenURI(i))
            }
        }
        certificatesContainer.innerHTML = "";
        tokenURIs.forEach(async (uri) => {
            const response = await fetch("http://localhost:8081/ipfs/" + ((uri.split("ipfs://"))[1]));
            const metadata = await response.json();
            console.log(metadata)
            const card = document.createElement("div");
            card.className = "certificate-card";
            card.innerHTML = `
                <img src="http://localhost:8081/ipfs/${metadata.certificateCID}" alt="NFT Image">
                <p>${metadata.description}</p>
            `;
            certificatesContainer.appendChild(card);
            const tooltip = document.createElement("div");
            tooltip.className = "tooltip";
            tooltip.innerHTML = `
        <p><strong>Proprietario:</strong> ${metadata.ownerName + metadata.ownerSurname || "Sconosciuto"} </p>
        <p><strong>Descrizione:</strong> ${metadata.description}</p>
        <p><strong>Data di rilascio :</strong> ${metadata.releaseDate}</p>
        <p><strong>ID:</strong> ${metadata.tokenId || "Non Disponibile"}</p>
    `;
            tooltip.style.display = "none";
            card.appendChild(tooltip);

            const institutionAddress = metadata["institutionAddress"];
            if ((await certificateNFT.getInstitutionStatus(institutionAddress)) == 2) {
                const icon = document.createElement("i");
                icon.className = "fa-solid fa-circle-check";
                icon.style.color = "#28a745";
                card.appendChild(icon);
            }

            //se tokenID è presente nei metadati dell'NFT si stampa un link alla transazione su EtherScan
            if (metadata.tokenId != null) {
                const etherscanButton = document.createElement("button");
                etherscanButton.innerHTML = "Visualizza Transazione su Etherscan";
                etherscanButton.target = "_blank"
                etherscanButton.addEventListener("click", async () => {
                    await redirectToEtherscan(metadata.tokenID, certificateNFT);
                });
                etherscanButton.style.background = "f8f9fa";
                card.appendChild(etherscanButton);
            }
            card.addEventListener("mouseenter", () => {
                tooltip.style.display = "block";
            });

            card.addEventListener("mouseleave", () => {
                tooltip.style.display = "none";
            });

        });
    } catch (error) {
        console.log("Errore in fase di caricamento dei certificati ")
    }




}

async function getTransactionHash(tokenID, certificateNFT) {
    console.log(await signer.getAddress())
    const filter = certificateNFT.filters.mintedCertificateNFT(await signer.getAddress(), tokenID);
    const events = await certificateNFT.queryFilter(filter);

    if (events.length > 0) {
        const txHash = events[0].transactionHash;
        return txHash;
    } else {
        console.error("Nessuna transazione trovata per il tokenID:", tokenID);
        return null;
    }
}

async function redirectToEtherscan(tokenID, certificateNFT) {
    const txHash = await getTransactionHash(tokenID, certificateNFT);
    if (txHash) {
        const etherscanURL = `https://sepolia.etherscan.io/tx/${txHash}`;
        window.location.href = etherscanURL;
    } else {
        alert("Errore: Transazione non trovata!");
    }
}



// //Dati i topics di una funzione, esegue una query sulle transazioni di etherscan 
// async function fetchLogs(topics) {
//     const etherscanURL = `https://api.etherscan.io/api?module=logs&action=getLogs&address=${constants.governanceContractAddress}&startblock=0&endblock=latest&apikey=${constants.ETHERSCAN_API_KEY}`;
//     try {
//         const response = await fetch(etherscanURL);
//         const data = await response.json();
//         return data;
//     } catch (error) {
//         alert("Qualcosa è andato storto!");
//     }
// }



