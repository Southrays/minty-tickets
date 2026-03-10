import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ZERO_G_CHAIN } from "../utils/constants";

const Ctx = createContext(null);

export function WalletProvider({ children }) {
  const [wallet,     setWallet]     = useState(null);
  const [connecting, setConnecting] = useState(false);
  // showPrompt is ONLY set to true by an explicit requireWallet() call — never on load.
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptMsg,  setPromptMsg]  = useState("Connect your wallet to continue.");
  

  // Silent auto-reconnect — no popup, just restores state if already approved
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" })
      .then(accounts => {
        if (accounts[0]) {
          setWallet(accounts[0]);
          localStorage.setItem("minty_wallet", accounts[0]);
        } else {
          // No previously approved account — do NOT show any prompt
          const saved = localStorage.getItem("minty_wallet");
          if (saved) {
            localStorage.removeItem("minty_wallet");
          }
        }
      })
      .catch(() => {});

    window.ethereum.on("accountsChanged", accounts => {
      if (!accounts.length) {
        setWallet(null);
        localStorage.removeItem("minty_wallet");
      } else {
        setWallet(accounts[0]);
        localStorage.setItem("minty_wallet", accounts[0]);
      }
    });
  }, []);

  const connect = useCallback(async () => {
  setConnecting(true);
  try {
    if (!window.ethereum) throw new Error("MetaMask not found");

    // request accounts first (triggers MetaMask popup)
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts[0]) throw new Error("No wallet connected");

    setWallet(accounts[0]);
    localStorage.setItem("minty_wallet", accounts[0]);

    // switch to 0G network if not already
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== ZERO_G_CHAIN.chainId) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [ZERO_G_CHAIN],
      });
    }

    setShowPrompt(false);
  } catch (e) {
    console.error("Connect failed:", e);
    alert(e.message);
  } finally {
    setConnecting(false);
  }
}, []);

  const disconnect = useCallback(() => {
    setWallet(null);
    localStorage.removeItem("minty_wallet");
  }, []);

  // Returns true if wallet connected, otherwise shows the prompt and returns false
  const requireWallet = useCallback((msg) => {
    if (wallet) return true;
    setPromptMsg(msg || "Connect your wallet to continue.");
    setShowPrompt(true);
    return false;
  }, [wallet]);

  return (
    <Ctx.Provider value={{ wallet, connecting, connect, disconnect, requireWallet, showPrompt, setShowPrompt, promptMsg }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be inside WalletProvider");
  return ctx;
}
