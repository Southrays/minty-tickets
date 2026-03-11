import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/modal";
import { ethers } from "ethers";

const clientId = "YOUR_WEB3AUTH_CLIENT_ID"; // from Web3Auth dashboard

export default function Web3Login() {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const init = async () => {
      const w3a = new Web3Auth({ clientId, chainConfig: { chainNamespace: "eip155", chainId: "0x1" } });
      setWeb3auth(w3a);
      await w3a.initModal();
      if (w3a.provider) {
        setProvider(w3a.provider);
        const ethersProvider = new ethers.BrowserProvider(w3a.provider);
        const signer = await ethersProvider.getSigner();
        setAccount(await signer.getAddress());
      }
    };
    init();
  }, []);

  const login = async () => {
    if (!web3auth) return;
    const p = await web3auth.connect();
    setProvider(p);
    const ethersProvider = new ethers.BrowserProvider(p);
    const signer = await ethersProvider.getSigner();
    setAccount(await signer.getAddress());
  };

  return (
    <div>
      {account ? (
        <div>Connected: {account.slice(0,6)}...{account.slice(-4)}</div>
      ) : (
        <button onClick={login}>Login with Wallet</button>
      )}
    </div>
  );
}