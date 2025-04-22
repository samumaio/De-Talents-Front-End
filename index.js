document.addEventListener("DOMContentLoaded", addListeners);

async function addListeners() {
    await connect()
}

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