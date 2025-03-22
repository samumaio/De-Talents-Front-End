const CONTRACT_ADDRESS = "0xe85AC63cf124590679F8F9885c8aBc8985dE9e77"; // Inserisci l'indirizzo del contratto
import { CONTRACT_ABI } from './abiCertificateNFT.js'


async function connect() {
    if (typeof window.ethereum !== "undefined") {
      try {
        await ethereum.request({ method: "eth_requestAccounts" });
        document.getElementById("connectButton").innerHTML = "Connected";
        const accounts = await ethereum.request({ method: "eth_accounts" });
        console.log(accounts);
      } catch (error) {
        console.log(error);
      }
    } else {
      document.getElementById("connectButton").innerHTML = "Please install MetaMask";
    }
  }
  
async function ottieniStatoIstituzione() {
    if (!window.ethereum) {
      alert("Please connect to MetaMask first!");
      return;
    }
  
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
  
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  
      const userAddress = await signer.getAddress();
      console.log("User Address:", userAddress);
  
      const stato = await contract.getInstitutionStatus(userAddress);

      let statusMessage;
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
      return statusMessage;
    } catch (error) {
      console.error("Error interacting with contract:", error);
      document.getElementById("output").innerText = "Error interacting with contract.";
    }
}

async function verificaStatoIstituzione() {
    const statusMessage = await ottieniStatoIstituzione();
    if (statusMessage) {
      document.getElementById("outputButton").innerText = `${statusMessage}`;
    }
  }

async function registraIstituzione(){
    if (!window.ethereum) {
        alert("Please connect to MetaMask first!");
        return;
    }
    
      try {
        // Inizializza il provider e il signer
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
    
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        const userAddress = await signer.getAddress();
        console.log("User Address:", userAddress);

        const tx = await contract.addNewInstitution(userAddress);
        await tx.wait();
    
        document.getElementById("output").innerText = "Institution registered successfully!";
      } catch (error) {
        console.error("Error registering institution:", error);
        document.getElementById("output").innerText = "Error registering institution.";
      }
}

window.connect = connect;
window.verificaStatoIstituzione = verificaStatoIstituzione;
window.registraIstituzione = registraIstituzione;
