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
    voteForBtn.className = "vote-button for";
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
    voteAgainstBtn.className = "vote-button against";
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
    //await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();

    const contract = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer);
    //const governanceContract = new ethers.Contract(constants.governanceContractAddress, constants.governanceAbi, signer)
    const institutionName = await contract.getInstitutionName(userAddress);
    const institutionStatus = await contract.getInstitutionStatus(userAddress);
    if (institutionStatus == 0) {    //se l'indirizzo non è un istituzione reindirizza alla pagina di registrazione
      window.location.href = "registra.html";
    }
    await fetchLogs();
    const nomeElemento = document.getElementById("institutionName");
    nomeElemento.innerHTML = `<strong>${institutionName}</strong>`;

    const statoElemento = document.getElementById("institutionStatus");
    let statusText;
    switch (institutionStatus) {
      case 1:
        statusText = "UNVERIFIED";
        console.log("Address: " + userAddress)
        console.log("Stato Istituzione " + await contract.getInstitutionStatus(userAddress))
        console.log("Tempo rimanenete " + await contract.getDaysLeft(userAddress))
        statoElemento.innerHTML = `Stato Istituzione: <span class="stato-rosso">${statusText}</span>`;
        const verificationButton = document.getElementById("proposalButton");
        verificationButton.addEventListener("click", async function () {
          //viene creata una proposal della durata di 180 secondi (prova)
          //const estimatedGas = await governanceContract.estimateGas.createProposal(300, false).catch(() => 1000000);
          const tx = await contract.createProposal(2, true);
          await tx.wait(4)
        })
        break;
      case 2:
        statusText = "VERIFIED";
        console.log("Verificato")
        statoElemento.innerHTML = `Stato Istituzione: <span class="stato-verde">${statusText}</span>`;
        //se l'istituzione e' verificata, si mostrano tutte le proposte di voto attualmente attive 
        await displayActiveProposals(signer);
        const proposalButton = document.getElementById("proposalButton");
        proposalButton.hidden = true
        proposalButton.style.display = "none";
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


//Funzione che dati i nomi degli events dello smart contract, esegue una query con i rispettivi topics su etherscan  
async function fetchLogs(topics) {
  const etherscanURL = `https://api.etherscan.io/api?module=logs&action=getLogs&address=${constants.governanceContractAddress}&startblock=0&endblock=latest&apikey=${constants.ETHERSCAN_API_KEY}`;
  try {
    const response = await fetch(etherscanURL);
    const data = await response.json();
    return data;
  } catch (error) {
    alert("Qualcosa è andato storto!");
  }
}


window.onload = fetchInstitutionInfo();


