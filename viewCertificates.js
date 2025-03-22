import { ethers } from "./ethers-frontend.js"
import * as constants from "./constants.js"

document.addEventListener("DOMContentLoaded", main())
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner()
async function main() {

    if (typeof window.ethereum == 'undefined') {
        //reinderizzamento alla pagina home
        //window.location.replace("http://google.com")

    }
    //connessione al provider 
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner()
    const certificatesContainer = document.getElementById("certificates-container")
    //inizializza il contratto 
    const certificateNFT = new ethers.Contract(constants.contractAddress, constants.abi, signer)
    //calcolato il numero dei token posseduti da un indirizzo
    const balanceOf = await certificateNFT.balanceOf(signer.getAddress())

    try {
        const tokenCounter = await certificateNFT.getCounter()
        console.log(await certificateNFT.ownerOf(10))
        const ownerAddress = await signer.getAddress()
        let tokenURIs = []
        const ownerOf = await certificateNFT.ownerOf(0)
        // console.log(ownerOf)
        // console.log(await signer.getAddress())
        for (let i = 0; i < tokenCounter; i++) {
            const ownerOf = await certificateNFT.ownerOf(i)
            if (ownerOf == ownerAddress) {
                tokenURIs.push(await certificateNFT.getTokenURI(i))
            }
        }
        certificatesContainer.innerHTML = "";
        tokenURIs.forEach(async (uri) => {
            const response = await fetch("http://localhost:8080/ipfs/" + ((uri.split("ipfs://"))[1]));
            const metadata = await response.json();
            console.log(metadata)
            const card = document.createElement("div");
            card.className = "certificate-card";
            card.innerHTML = `
                <img src="http://localhost:8080/ipfs/${metadata.certificateCID}" alt="NFT Image">
                <p>${metadata.description}</p>
            `;
            certificatesContainer.appendChild(card);
            // Crea un elemento per il tooltip
            const tooltip = document.createElement("div");
            tooltip.className = "tooltip";
            tooltip.innerHTML = `
        <p><strong>Proprietario:</strong> ${metadata.ownerName + metadata.ownerSurname || "Sconosciuto"} </p>
        <p><strong>Descrizione:</strong> ${metadata.description}</p>
        <p><strong>Data di rilascio :</strong> ${metadata.releaseDate}</p>
        <p><strong>ID:</strong> ${metadata.id || "Non Disponibile"}</p>
    `;
            tooltip.style.display = "none"; // Nasconde il tooltip inizialmente
            card.appendChild(tooltip);

            // Eventi mouse
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



