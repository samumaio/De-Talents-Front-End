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
const certificateNFT = new ethers.Contract(constants.contractAddress, constants.abi, signer)


async function main() {
    document.getElementById("immagine").addEventListener("change", readSelectedImage)
    document.getElementById("MetamaskConnection").addEventListener("click", connect)
    document.getElementById("issueCertificateForm").addEventListener("submit", uploadData)
    document.getElementsByName("reimposta")[0].addEventListener("click", reimposta)
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


// //funzione che controlla che il file JSON contenente i metadati dell
// async function controllaNomi(data) {
//     const fileHash = await constants.ipfs.files.write("/nftImages/file", data, { onlyHash: true })
//     console.log(fileHash)
//     const hostedFiles = []
//     for await (let files of constants.ipfs.files.ls("/nftImages")) {
//         hostedFiles.push(files)
//     }
//     let fileEsistente = false;

//     for (let i = 0; i < hostedFiles.length; i++) {
//         const existingFileStat = await constants.ipfs.files.stat("/nftImages/" + hostedFiles[i].name)
//         if (existingFileStat.cid.toString() === fileHash.cid.toString()) {
//             fileEsistente = true
//             break;
//         }
//     }
// }


async function uploadData(event) {
    event.preventDefault()
    //Funzione che carica i dati su IPFS e registra il corrispondente hash nello smart contract
    let imageCid
    let tokenID;

    if (blobImage !== null && fileImage !== null) {
        imageCid = await uploadToIPFS(blobImage, fileImage.name, "/nftImages")
    } else {
        alert("Per favore inserire un immagine Inserire un immagine ")
    }
    let dataRilascio = document.getElementsByName("dataRilascio")[0]?.value
    if (dataRilascio == null) {
        dataRilascio = new Date().getTime()
    }
    let ownerAddress = document.getElementById("walletAddress").value
    const jsonData = {
        ownerAddress: ownerAddress,
        ownerName: document.getElementById("nome").value,
        ownerSurname: document.getElementById("cognome").value,
        description: document.getElementById("descrizione").value,
        releaseDate: dataRilascio,
        certificateCID: "" + imageCid,
    }
    console.log(jsonData)
    let fileName = (fileImage.name.split("."))[0] + ".json"
    let metadataCID = await uploadToIPFS(JSON.stringify(jsonData), fileName, "/nftMetadata")
    process.exit(1)
    try {
        if (metadataCID != null) {
            const tx = await certificateNFT.mintNFT(ownerAddress, "ipfs://" + metadataCID)

            // const receipt = await tx.wait()
            // console.log(receipt)
            // tokenID = await receipt.logs[0].args[2]
            // console.log(tokenID)
        }
        //redirect alla pagina successiva 
        //window.location.replace("./success.html")
    } catch (error) {
        alert("Errore in fase di interazione con smart contract ")
        console.error(error)
    }



}

async function readSelectedImage() {
    //Permette al browser di leggere un file inserito dall'utente
    fileImage = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(fileImage)
    reader.onloadend = (event) => {
        const result = event.target.result
        blobImage = new Blob([result], { type: fileImage.type });
        const url = URL.createObjectURL(blobImage)
        loadImage(url)
    }
}

async function uploadToIPFS(data, title, dir) {
    let cid
    try {
        //Funzione per caricare un file nel Nodo IPFS locale

        //Evitare duplicati con hashes uguali 
        const hostedFiles = await constants.ipfs.files.ls(dir)
        let nomeValido = true;
        for (let i = 0; i < hostedFiles.length; i++) {
            if (hostedFiles[i].name == title) {
                nomeValido = false
                break;
            }
        }

        if (nomeValido) {
            // await ipfs.pin.add(result.path)
            await constants.ipfs.files.write(dir + "/" + title, data, { create: true })
            const fileStat = await constants.ipfs.files.stat(dir + "/" + title)
            cid = fileStat.cid
            success.innerHTML = "File successfully uploaded to: " + cid
        } else {
            alert("Nome già presente nel file system distribuito, per favore cambiare il nome del file ")
            error.hidden = false
        }
    } catch (error) {
        innerHTML = "Errore in fase di caricamento IPFS "
        console.log("path: " + dir + "/" + title)
    }
    return cid
}


async function loadImage(imageUrl) {
    const viewImage = document.getElementById("selectedFileContainer")
    const image = document.getElementById("selectedImageContainer")
    viewImage.hidden = false
    image.src = imageUrl
}

function reimposta() {
    success.hidden = true
    error.hidden = true
}


