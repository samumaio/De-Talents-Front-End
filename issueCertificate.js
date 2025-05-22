import { ethers } from "./ethers-frontend.js";
import * as constants from "./constants.js";

document.addEventListener("DOMContentLoaded", () => main());

let blobImage = null;
let fileImage = null;

// API e Gateway di Pinata
const PINATA_API_KEY = "c64b26d404a2e509af87";
const PINATA_API_SECRET = "88a014b7eee87920ce956a8f3336625d1da4f9c7f6a0e9632249042b2c0202fd";
const PINATA_GETAWAY = "jade-peculiar-rhinoceros-412.mypinata.cloud";

const error = document.getElementById("error-para");
const success = document.getElementById("success-para");

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const certificateNFT = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer);

async function main() {
    document.getElementById("immagine").addEventListener("change", readSelectedImage);
    document.getElementById("issueCertificateForm").addEventListener("submit", uploadData);
}

export async function connect() {
    console.log("Logging to Metamask...");
    if (typeof window.ethereum !== "undefined") {
        try {
            await window.ethereum.request({ method: "eth_requestAccounts" });
            console.log("Wallet connesso con successo!");
        } catch (error) {
            console.log("Errore nella connessione a Metamask:", error);
        }
    } else {
        console.log("Per favore installa Metamask.");
    }
}


async function uploadData(event) {
    event.preventDefault();
    
    const imageFile = document.getElementById("selectedFileContainer").files[0];
    if (!imageFile) {
        alert("Devi caricare un'immagine!");
        return;
    }

    // pubblicazione dell immagine su pinata e ottieni il cid
    const imageData = await uploadFileToPinata(imageFile);
    if (!imageData) {
        document.getElementById("status").innerHTML = "Errore nella pubblicazione dell'immagine su Pinata.";
        return;
    }

    const imageCID = imageData.cid;
    const timestamp = imageData.timestamp;

    let dataRilascio = document.getElementsByName("dataRilascio")[0]?.value || new Date().getTime();
    let ownerAddress = document.getElementById("walletAddress").value;
    let tokenID = Number(await certificateNFT.getCounter());

    const jsonData = {
        ownerAddress: ownerAddress,
        tokenId: tokenID,
        ownerName: document.getElementById("nome").value,
        ownerSurname: document.getElementById("cognome").value,
        description: document.getElementById("descrizione").value,
        institutionAddress: "" + (await signer.getAddress()),
        releaseDate: dataRilascio,
        image: `https://${PINATA_GETAWAY}/ipfs/${imageCID}`
    };

    // pubblicazione del json su pinata
    const jsonCID = await pinJSONToPinata(jsonData, timestamp);
    if (!jsonCID) {
        console.log("ERRORE, JSON non pubblicato su Pinata");
        return;
    }

    try {
        const tx = await certificateNFT.mintNFT(ownerAddress, `https://${PINATA_GETAWAY}/ipfs/${jsonCID}`);
        console.log("NFT mintato con successo!");
    } catch (error) {
        alert("Errore in fase di interazione con smart contract");
        console.error(error);
    }
}


async function readSelectedImage(event) {
    fileImage = event.target.files[0];
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(fileImage);
    reader.onloadend = (event) => {
        const result = event.target.result;
        blobImage = new Blob([result], { type: fileImage.type });
        const url = URL.createObjectURL(blobImage);
        loadImage(url);
    };
}

async function loadImage(imageUrl) {
    const viewImage = document.getElementById("selectedFileContainer");
    const image = document.getElementById("selectedImageContainer");
    viewImage.hidden = false;
    image.src = imageUrl;
    image.style.visibility = "visible";
    image.style.display = "inline-block";
    document.getElementById("altPara").innerHTML = "";
}

function reimposta() {
    success.hidden = true;
    error.hidden = true;
}

// fnzione di pubblicazione dell immagine
async function uploadFileToPinata(file) {
    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
    const formData = new FormData();
    
    // Genera un timestamp per rendere il nome univoco
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
    const fileName = `image_${timestamp}.${file.name.split('.').pop()}`;
    
    formData.append("file", file, fileName);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_API_SECRET
            },
            body: formData
        });

        const result = await response.json();
        console.log("Immagine pubblicata su Pinata:", result);
        return { cid: result.IpfsHash, timestamp };
    } catch (error) {
        console.error("Errore nel pinning dell'immagine su Pinata:", error);
        return null;
    }
}


// funzione di pubblicazione json su pinata
async function pinJSONToPinata(jsonData, timestamp) {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
    
    // Aggiungi il timestamp al nome del JSON
    jsonData.name = `metadata_${timestamp}.json`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_API_SECRET
            },
            body: JSON.stringify(jsonData)
        });

        const result = await response.json();
        console.log("JSON pubblicato su Pinata:", result);
        return result.IpfsHash;
    } catch (error) {
        console.error("Errore nel pinning del JSON su Pinata:", error);
        return null;
    }
}
