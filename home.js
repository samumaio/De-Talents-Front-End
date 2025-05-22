import { ethers } from "./ethers-frontend.js"
import * as constants from "./constants.js"

document.addEventListener("DOMContentLoaded", main());

async function main() {
    if (!window.ethereum) {
        alert("Please install MetaMask!");
        return;
    }
    const btn = document.getElementById("connect");
    btn.addEventListener("click", walletConnection);
    const etherscanButton = document.getElementById("etherscanBtn");
    etherscanButton.href = "https://sepolia.etherscan.io/address/" + constants.governanceContractAddress;
    etherscanButton.display = "block";
    etherscanButton.hidden = false;
    etherscanButton.innerHTML = "Visualizza il contratto su Etherscan!";

}

async function walletConnection() {
    const btn = document.getElementById("connect");
    await window.ethereum.request({ method: 'eth_requestAccounts' })
    btn.innerHTML = "Connesso!"
}
