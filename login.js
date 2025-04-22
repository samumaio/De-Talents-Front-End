import { ethers } from "./ethers-frontend.js"
import * as constants from "./constants.js"



async function displayActiveProposals(signer) {
  const governanceContract = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer)
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  let proposals = await governanceContract.getAllProposals();
  //console.log(proposals)
  const currentTime = (await provider.getBlock('latest')).timestamp
  let instituionName
  let activeVerifiedProposals = []
  // const activeVerifiedProposals = proposals.filter(proposal =>
  //   proposal.endTime > currentTime
  // );
  for (let i = 0; i < proposals.length; i++) {
    if (proposals[i].endTime > currentTime) {
      const proposal = {
        proposalId: i,
        activeProposal: proposals[i],
      }
      activeVerifiedProposals.push(proposal)
    }
  }

  const proposalsContainer = document.getElementById("elencoProposte");
  proposalsContainer.innerHTML = "";

  for (let i = 0; i < activeVerifiedProposals.length; i++) {
    const proposalElement = document.createElement("div");
    proposalElement.classList.add("proposal-item");
    let timeRemaining = activeVerifiedProposals[i].activeProposal.endTime - currentTime;
    const timerElement = document.createElement("p");
    timerElement.classList.add("timer");
    timerElement.innerHTML = `<strong>Tempo rimanente:</strong> ${formatTime(timeRemaining)}`;

    setInterval(() => {
      timeRemaining--;
      if (timeRemaining > 0) {
        timerElement.innerHTML = `<strong>Tempo rimanente:</strong> ${formatTime(timeRemaining)}`;
      } else {
        timerElement.innerHTML = `<strong>Scaduto</strong>`;
      }
    }, 1000);
    instituionName = await governanceContract.getInstitutionName(activeVerifiedProposals[i].activeProposal.institutionAddress)
    proposalElement.innerHTML = `
          <p><strong>Istituzione:</strong> ${instituionName}</p>
          <p><strong>Voti a favore:</strong> ${activeVerifiedProposals[i].activeProposal.votesFor}</p>
          <p><strong>Voti contrari:</strong> ${activeVerifiedProposals[i].activeProposal.votesAgainst}</p>
          <p><strong>Scadenza:</strong> ${new Date(activeVerifiedProposals[i].activeProposal.endTime * 1000).toLocaleString()}</p>
      `;

    //Pulsante per il voto a favore
    const voteForBtn = document.createElement("button");
    voteForBtn.textContent = "Vota a favore";
    voteForBtn.className = "button-for";
    voteForBtn.onclick = async () => {
      try {
        const tx = await governanceContract.vote(activeVerifiedProposals[i].proposalId, true);
        await tx.wait();
      } catch (err) {
        console.error("Errore nel voto a favore:", err);
        alert("Errore durante il voto.");
      }
    };

    //Pulsante per il voto contrario
    const voteAgainstBtn = document.createElement("button");
    voteAgainstBtn.textContent = "Vota contro ";
    voteAgainstBtn.className = "button-against";
    voteAgainstBtn.onclick = async () => {
      try {
        const tx = await governanceContract.vote(activeVerifiedProposals[i].proposalId, false);
        await tx.wait();
      } catch (err) {
        console.error("Errore nel voto contro:", err);
        alert("Errore durante il voto.");
      }
    };


    proposalElement.appendChild(timerElement);
    proposalsContainer.appendChild(proposalElement);
    proposalElement.appendChild(voteForBtn);
    proposalElement.appendChild(voteAgainstBtn);
  }
}

// Funzione per formattare il tempo rimanente in ore, minuti, secondi
function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}



async function fetchInstitutionInfo() {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    return;
  }

  try {
    // Richiedi l'accesso agli account di MetaMask
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();

    // Instanzia il contratto e chiama le funzioni
    const contract = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer);
    //const governanceContract = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer)
    const institutionName = await contract.getInstitutionName(userAddress);
    const institutionStatus = await contract.getInstitutionStatus(userAddress);

    // Aggiorna il nome dell'istituzione con grassetto
    const nomeElemento = document.getElementById("institutionName");
    nomeElemento.innerHTML = `Nome Istituzione: <strong>${institutionName}</strong>`;

    // Determina e applica il colore dello stato
    const statoElemento = document.getElementById("institutionStatus");
    let statusText;
    switch (institutionStatus) {
      case 0:
        statusText = "NOT AN INSTITUTION";
        statoElemento.innerHTML = `Stato Istituzione: ${statusText}`;
        statoElemento.style.color = "#555"; // Grigio per uno stato non definito
        break;
      case 1:
        statusText = "UNVERIFIED";
        console.log("Address: " + userAddress)
        console.log("Stato Istituzione " + await contract.getInstitutionStatus(userAddress))
        console.log("Tempo rimanenete " + await contract.getDaysLeft(userAddress))
        statoElemento.innerHTML = `Stato Istituzione: <span class="stato-rosso">${statusText}</span>`;
        const verificationButton = document.createElement("button")
        const node = document.createTextNode("Richiedi la verifica dell'istituzione")
        verificationButton.appendChild(node)
        verificationButton.id = "proposalButton"
        verificationButton.addEventListener("click", async function () {
          //viene creata una proposal della durata di 180 secondi (prova)
          //const estimatedGas = await governanceContract.estimateGas.createProposal(300, false).catch(() => 1000000);

          const tx = await contract.createProposal(300 * 6, false);
          await tx.wait(4)

        })
        document.getElementById("institutionInfo").appendChild(verificationButton)
        break;
      case 2:
        statusText = "VERIFIED";
        console.log("Verificato")
        statoElemento.innerHTML = `Stato Istituzione: <span class="stato-verde">${statusText}</span>`;
        //se l'istituzione e' verificata, si mostrano tutte le proposte di voto attualmente attive 
        await displayActiveProposals(signer);
        break;
      default:
        statusText = "UNKNOWN STATUS";
        statoElemento.innerHTML = `Stato Istituzione: ${statusText}`;
        statoElemento.style.color = "#555"; // Grigio per stati sconosciuti
    }
  } catch (error) {
    console.error("Error fetching institution info:", error);
  }
}




window.onload = fetchInstitutionInfo();


