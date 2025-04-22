import { ethers } from "./ethers-frontend.js"
import * as constants from "./constants.js"
async function ottieniListaIstituzioni() {
  //controlla che metamask sia connesso
  if (!window.ethereum) {
    alert("Please connect to MetaMask first!");
    return;
  }



  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    //const contract = new ethers.Contract(constants.contractAddress, constants.abi, signer);
    const governanceContract = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer)
    //redirect se l'indirizzo non corrisponde a quello del proprietario 
    // if (await signer.getAddress() != await governanceContract.getOwner()) {
    //   alert("Pagina riservata solo al proprietario dello smart contract")
    //   window.location.href = "http://localhost:5500/registra.html";
    // }
    const istituzioni = await governanceContract.getAllInstitutions();

    const listaIstituzioni = [];
    for (const indirizzo of istituzioni) {
      const nome = await governanceContract.getInstitutionName(indirizzo);
      const stato = await governanceContract.getInstitutionStatus(indirizzo);

      let statusMessage = "";
      switch (stato) {
        case 0:
          statusMessage = "NOT AN INSTITUTION";
          break;
        case 1:
          statusMessage = "UNVERIFIED";
          break;
        case 2:
          statusMessage = "VERIFIED";
          break;
        default:
          statusMessage = "UNKNOWN STATUS";
      }
      //console.log(`Stato dell'istituzione ${statusMessage}:`, stato);
      listaIstituzioni.push({ address: indirizzo, name: nome, state: statusMessage });
    }


    const outputElement = document.getElementById("elencoIstituzioni");
    outputElement.innerHTML = ""; // Pulisce il contenitore

    listaIstituzioni.forEach((istituzione) => {
      const card = document.createElement("div");
      card.className = "card";

      // Determina il colore dello stato in base al suo valore
      const statoColorClass = istituzione.state === "VERIFIED" ? "stato-verde" : "stato-rosso";

      card.innerHTML = `
            <h3>${istituzione.name}</h3>
            <p><strong>Indirizzo:</strong> ${istituzione.address}</p>
            <p><strong>Stato:</strong> <span class="${statoColorClass}">${istituzione.state}</span></p>
        `;
      outputElement.appendChild(card);
    });

  } catch (error) {
    console.error("Errore durante l'interazione con il contratto:", error);
    document.getElementById("output").innerText = "Errore durante l'interazione con il contratto.";
  }
}

async function stampaIstituzioneNonVerificata() {
  if (!window.ethereum) {
    alert("Please connect to MetaMask first!");
    return;
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const governanceContract = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer);

    const istituzioni = await governanceContract.getAllInstitutions();
    const lista = [];
    for (const indirizzo of istituzioni) {
      try {
        const stato = await governanceContract.getInstitutionStatus(indirizzo);
        if (stato === 1) { // Stato "UNVERIFIED"
          const nome = await governanceContract.getInstitutionName(indirizzo);
          lista.push(nome + " " + indirizzo);
        }
      } catch (error) {
        console.error(`Errore durante il recupero dei dati per ${indirizzo}:`, error);
      }
    }

    //const dropdown = document.createElement("select");
    const options = lista;

    const menu = document.getElementById("selezionaIstituzione");

    menu.innerHTML = ""; // Pulisce il menu prima di rigenerarlo

    options.forEach(options => {
      const elemento = document.createElement("option");
      elemento.value = options;
      elemento.textContent = options;
      menu.appendChild(elemento);
    });

  } catch (error) {
    console.error("Errore durante il caricamento delle istituzioni non verificate:", error);
  }
}

async function verifica() {
  if (!window.ethereum) {
    alert("Please connect to MetaMask first!");
    return;
  }

  try {
    const selezionato = document.getElementById("selezionaIstituzione").value;
    const s = selezionato.split(" ");
    const indirizzoSelezionato = s[s.length - 1];
    console.log(`Hai selezionato: ${indirizzoSelezionato}`);

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer);

    if (!indirizzoSelezionato) {
      alert("Seleziona un'istituzione dal menu a tendina.");
      return;
    }

    // Verifica l'istituzione selezionata
    const tx = await contract.verifyInstitution(indirizzoSelezionato);
    await tx.wait();
    alert("Istituzione verificata con successo!");

    location.reload();


    ottieniListaIstituzioni();
    stampaIstituzioneNonVerificata();
  } catch (error) {
    console.error("Errore durante la verifica dell'istituzione:", error);
    alert("Errore durante la verifica dell'istituzione.");
  }

}

//funzione che permette di visualizzare le proposals che sono scadute in modo da poterle approvares
async function visualizzaProposte() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner()
  const governanceContract = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer)
  let proposals = await governanceContract.getAllProposals();
  const currentTime = (await provider.getBlock('latest')).timestamp
  let instituionName
  let expiredProposals = []
  //Selezione delle proposte scadute
  for (let i = 0; i < proposals.length; i++) {
    //aggiungi all'array solo le proposals scadute e non eseguite in precedenza
    if (proposals[i].endTime <= currentTime && !proposals[i].executed) {
      const proposal = {
        proposalId: i,
        activeProposal: proposals[i],
      }
      expiredProposals.push(proposal)
    }
  }
  for (let i = 0; i < expiredProposals.length; i++) {
    const proposalElement = document.createElement("div");
    proposalElement.classList.add("proposal-item");
    instituionName = await governanceContract.getInstitutionName(expiredProposals[i].activeProposal.institutionAddress)
    proposalElement.innerHTML = `
          <p><strong>Istituzione:</strong> ${instituionName}</p>
          <p><strong>Voti a favore:</strong> ${expiredProposals[i].activeProposal.votesFor}</p>
          <p><strong>Voti contrari:</strong> ${expiredProposals[i].activeProposal.votesAgainst}</p>
          <p><strong>Scadenza:</strong> ${new Date(expiredProposals[i].activeProposal.endTime * 1000).toLocaleString()}</p>
      `;
    const approveBtn = document.createElement("button");
    approveBtn.textContent = "Esegui la proposta";
    approveBtn.className = "approveBtn"
    approveBtn.onclick = async () => {
      try {
        const tx = await governanceContract.executeProposal(expiredProposals[i].proposalId)
        await tx.wait();
      } catch (err) {
        console.error("Errore nel eseguire la propsota:", err);
        alert("Errore nell'eseguire la proposta.");
      }
    };
    const proposalContainer = document.getElementById("elencoProposte")
    proposalElement.appendChild(approveBtn)
    proposalContainer.appendChild(proposalElement)
  }

}

await ottieniListaIstituzioni()
await stampaIstituzioneNonVerificata()
await visualizzaProposte()

// window.onload = async function () {
//   await ottieniListaIstituzioni();
//   await stampaIstituzioneNonVerificata();
// };

window.verifica = verifica;


