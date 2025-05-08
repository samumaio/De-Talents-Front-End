import { ethers } from "./ethers-frontend.js"
import * as constants from "./constants.js"

document.addEventListener("DOMContentLoaded", main());

async function main() {
    if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
    }
    document.getElementById("connect").innerHTML = "Connesso!"
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const etherscanButton = document.getElementById("etherscanBtn");
    etherscanButton.href = "https://sepolia.etherscan.io/address/" + constants.governanceContractAddress;
    etherscanButton.display = "block";
    etherscanButton.hidden = false;
    etherscanButton.innerHTML = "Visualizza il contratto su Etherscan!";

}
