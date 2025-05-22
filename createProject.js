import { ethers } from "./ethers-frontend.js"
import * as constants from "./constants.js"

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const contractFactory = new ethers.Contract(constants.projectFactoryAddress, constants.factoryAbi, signer)
document.getElementById("createBtn").addEventListener("click", createProject);

// async function createProject() {
//     event.preventDefault()
//     //crea un nuovo progetto 
//     const name = document.getElementById("projectName").value;
//     const description = document.getElementById("projectDescription").value
//     const duration = getSecondsRemaining(document.getElementById("projectDeadline").value)
//     let ethersAmount = document.getElementById("projectReward").value
//     const reward = ethers.utils.parseEther(ethersAmount);
//     console.log(reward)
//     //Transazione allo smart contract factory richiede la durata del progetto in secondi
//     if (duration) {
//         try {
//             const tx = await contractFactory.createProject(name, description, duration, {
//                 value: reward
//             });
//             const receipt = await tx.wait();
//             console.log(receipt)
//             const address = await receipt.logs.args[0]
//             alert(address)
//         } catch (error) {
//             console.log(error)
//         }


//         console.log(receipt)
//     }
//     process.exit()

// }

async function createProject(event) {
    event.preventDefault();

    try {
        // 1. Raccolta e validazione base degli input
        const name = document.getElementById("projectName").value;
        const description = document.getElementById("projectDescription").value;
        const rewardEth = document.getElementById("projectReward").value;
        const deadline = new Date(document.getElementById("projectDeadline").value);

        if (!name || !description || !rewardEth || isNaN(deadline.getTime())) {
            throw new Error("Compila tutti i campi correttamente");
        }

        // 2. Conversione valori
        const reward = ethers.utils.parseEther(rewardEth);
        const duration = Math.floor((deadline - new Date()) / 1000);

        // 3. Parametri transazione rinforzati
        const txParams = {
            value: reward,
            gasLimit: 1000000, // 1M gas (generoso)
            maxPriorityFeePerGas: ethers.utils.parseUnits('3', 'gwei'),
            maxFeePerGas: ethers.utils.parseUnits('30', 'gwei')
        };

        console.log("Invio con parametri:", { name, description, duration, ...txParams });

        // 4. Invio diretto con fallback pattern
        const tx = await contractFactory.createProject(
            name,
            description,
            duration,
            txParams
        );

        const receipt = await tx.wait();

        if (receipt.status === 0) {
            throw new Error("Transazione eseguita ma revertita dal contratto");
        }

        alert("Progetto creato con successo!");

    } catch (error) {
        console.error("Errore catturato:", {
            rawError: error,
            message: error.message,
            data: error.data
        });

        // Messaggi utente mirati
        const userMessages = {
            "initialRewardisZero": "Inserisci una ricompensa maggiore di 0 ETH",
            "failedTransaction": "Errore nel trasferimento dei fondi",
            "call revert exception": "Dati invalidi (verifica nome, descrizione e data)"
        };

        const reason = Object.entries(userMessages).find(([key]) =>
            error.message.includes(key)
        )?.[1] || "Errore durante la creazione del progetto";

        alert(`❌ ${reason}`);
    }
}

function getSecondsRemaining(duration) {
    const futureDate = new Date(duration)
    console.log(futureDate)
    const now = new Date();
    console.log(now)
    let seconds = Math.floor((futureDate - now) / 1000)
    if (seconds > 0) {
        return seconds
    } else {
        alert("Inserire una data valida! ")
    }
}