import { ethers } from "./ethers-frontend.js"
import * as constants from "./constants.js"


document.addEventListener("DOMContentLoaded", main())
let blobImage = null
let fileImage = null

const error = document.getElementById("error-para")
const success = document.getElementById("success-para")

//connessione al provider 
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
//inizializza il contratto 
const userNFT = new ethers.Contract(constants.userNFTAddress, constants.userNFTAbi, signer)

const PINATA_API_KEY = "c64b26d404a2e509af87";
const PINATA_API_SECRET = "88a014b7eee87920ce956a8f3336625d1da4f9c7f6a0e9632249042b2c0202fd";
const PINATA_GETAWAY = "jade-peculiar-rhinoceros-412.mypinata.cloud";

document.getElementById("etherscanBtn").href = "https://sepolia.etherscan.io/address/" + constants.userNFTAddress

if (Number(await userNFT.balanceOf(await signer.getAddress())) == 1) {
    alert("Sei già proprietario di un NFT personale!")
    window.location.href = "http://localhost:5500/viewUserCertificates.html";
    process.exit(1)
}


async function main() {
    document.getElementById("issueCertificateForm").addEventListener("submit", uploadData)
    document.getElementById("generatePreview").addEventListener("click", displaySVGPreview)
}

async function connect() {
    console.log("Logging to metamask ....")
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: "eth_requestAccounts" })
        } catch (error) {
            console.log(error)
        }
        console.log("wallet successfully connected! ")
    } else {
        console.log("Please install Metamask ")
    }
}
async function uploadData(event) {
    event.preventDefault();

    try {
        const svgElement = document.getElementById("selectedImageContainer");
        if (!svgElement || !svgElement.src) {
            throw new Error("Genera prima l'anteprima SVG");
        }
        const svgResponse = await fetch(svgElement.src);
        const svgString = await svgResponse.text();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        let id = new Date().getTime()
        // 4. Carica su IPFS
        const imageCid = await uploadFileToPinata(
            svgBlob,
            `nft-${id}.svg`
        );

        if (!imageCid) throw new Error("Caricamento immagine fallito");

        // 5. Prepara metadati
        const userAddress = await signer.getAddress();
        const userName = document.getElementById("userName").value || "DeTalents User";
        const tokenID = Number(await userNFT.getCounter());

        const jsonData = {
            name: `DeTalents NFT - ${userName}`,
            description: "NFT generato automaticamente su DeTalents",
            image: getMetaMaskCompatibleURL(imageCid),
            attributes: [
                {
                    trait_type: "Owner",
                    value: userAddress
                },
                {
                    trait_type: "Generation Date",
                    value: new Date().toISOString()
                }
            ]
        };
        // 6. Carica metadati
        const metadataCID = await pinJSONToPinata(
            jsonData,
            `metadata_${id}.json`
        );
        if (!metadataCID) throw new Error("Caricamento metadati fallito");
        const tx = await userNFT.mintNFT(
            userAddress,
            getMetaMaskCompatibleURL(metadataCID),
            { value: await ethers.utils.parseEther(document.getElementById("nome").value) }
        );
    } catch (error) {
        console.error("Errore:", error);
        error.innerHTML = error.message;
        error.style.display = "block";
    }
}
function getMetaMaskCompatibleURL(cid) {
    //return `https://ipfs.io/ipfs/${cid}`;
    return `https://${PINATA_GETAWAY}/ipfs/${cid}`;
}

// Modifica la funzione displaySVGPreview per salvare l'SVG
async function displaySVGPreview() {
    try {
        const userAddress = await signer.getAddress();
        const userName = document.getElementById("userName").value || "DeTalents User";
        const svgString = await generateUserSVG(userAddress, userName);

        // Converti in URL visualizzabile
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);

        // Salva l'SVG in una variabile globale per l'upload
        window.generatedSVG = svgString;

        // Mostra anteprima
        const img = document.getElementById("selectedImageContainer");
        document.getElementById("altPara").innerHTML = ""
        img.src = url;
        img.style.display = "inline-block";
        document.getElementById("selectedFileContainer").hidden = false;

    } catch (error) {
        console.error("Errore generazione anteprima:", error);
    }
}

// async function convertSVGtoPNG(svgURL) {
//     const canvas = document.createElement("canvas");
//     const ctx = canvas.getContext("2d");
//     const img = new Image();
//     img.src = svgURL;
//     await img.decode();

//     canvas.width = img.width;
//     canvas.height = img.height;
//     ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

//     return canvas.toDataURL("image/png");
// }


// fnzione di pubblicazione dell immagine
async function uploadFileToPinata(file, fileName) {
    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
    const formData = new FormData();
    //const fileName = `image_${timestamp}.${file.name.split('.').pop()}`;

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
        return result.IpfsHash;
    } catch (error) {
        console.error("Errore nel pinning dell'immagine su Pinata:", error);
        return null;
    }
}


// funzione di pubblicazione json su pinata
async function pinJSONToPinata(jsonData, jsonName) {
    const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

    const metadata = JSON.stringify({ name: jsonName });
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_API_SECRET
            },
            body: JSON.stringify({
                pinataMetadata: metadata,
                pinataContent: jsonData
            })
        });

        const result = await response.json();
        console.log("JSON pubblicato su Pinata:", result);
        return result.IpfsHash;
    } catch (error) {
        console.error("Errore nel pinning del JSON su Pinata:", error);
        return null;
    }
}

// async function loadImage(imageUrl) {
//     const viewImage = document.getElementById("selectedFileContainer")
//     const image = document.getElementById("selectedImageContainer")
//     viewImage.hidden = false
//     image.src = imageUrl
//     image.style.visibility = "visible";
//     image.style.display = "inline-block";
//     document.getElementById("altPara").innerHTML = "";
// }

async function generateUserSVG(userAddress, username) {
    const seed = userAddress.slice(2, 10);
    const hue = parseInt(seed, 16) % 360;
    const primaryColor = `hsl(${hue}, 75%, 45%)`;
    const secondaryColor = `hsl(${(hue + 120) % 360}, 75%, 45%)`;
    const bgColor = `hsl(${hue}, 50%, 15%)`;

    const animals = ['🦊', '🐱', '🐻', '🐼', '🐨', '🐯'];
    const animalIndex = parseInt(seed.slice(0, 2), 16) % animals.length;
    const mascot = animals[animalIndex];

    return `
    <svg width="2000" height="2000" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradiente -->
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgColor}" />
          <stop offset="100%" stop-color="#121212" />
        </linearGradient>
        
        <!-- Stile testi -->
        <style>
          .dt-text { font-family: 'Segoe UI', Roboto, sans-serif; }
          .dt-username { font-size: 26px; fill: white; font-weight: 600; }
          .dt-address { font-family: 'Courier New', monospace; font-size: 12px; fill: rgba(255,255,255,0.6); }
          .dt-brand { font-size: 11px; fill: rgba(255,255,255,0.5); letter-spacing: 1px; }
          .mascot { font-size: 120px; }
        </style>
        
        <!-- Filtro ombre -->
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.3)" />
        </filter>
        
        <!-- Cappello di laurea (come nel logo) -->
        <symbol id="graduation-cap" viewBox="0 0 100 100">
          <path d="M10,40 L50,20 L90,40 L90,50 L50,70 L10,50 Z" fill="#2C3E50"/>
          <rect x="40" y="40" width="20" height="10" fill="#2C3E50"/>
        </symbol>
      </defs>
      
      <!-- Sfondo -->
      <rect width="100%" height="100%" fill="url(#bgGradient)" rx="20" />
      
      <!-- Cerchi decorativi -->
      <circle cx="50%" cy="35%" r="22%" fill="${primaryColor}" opacity="0.15" filter="url(#shadow)" />
      <circle cx="50%" cy="35%" r="18%" fill="${secondaryColor}" opacity="0.2" />
      
      <!-- Mascotte animale -->
      <g transform="translate(250, 220)">
        <!-- Emoji animale -->
        <text x="0" y="20" class="mascot" text-anchor="middle">${mascot}</text>
        
        <!-- Cappello di laurea posizionato sopra -->
        <use href="#graduation-cap" x="-50" y="-100" width="100" height="100" />
      </g>
      
      <!-- Nome utente -->
      <text x="50%" y="85%" class="dt-text dt-username" text-anchor="middle">
        ${username}
      </text>    
      <text x="50%" y="95%" class="dt-text dt-brand" text-anchor="middle">
        POWERED BY DETALENTS
      </text>
    </svg>
  `;
}

function reimposta() {
    success.hidden = true
    error.hidden = true
}


