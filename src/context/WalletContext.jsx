import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ZERO_G_CHAIN } from "../utils/constants";

const Ctx = createContext(null);

const STORAGE_KEY      = "minty_wallet";
const DISCONNECTED_KEY = "minty_disconnected"; // set when user explicitly disconnects

export function WalletProvider({ children }) {
  const [wallet,     setWallet]     = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptMsg,  setPromptMsg]  = useState("Connect your wallet to continue.");

  // ── Silent auto-reconnect on load ────────────────────────────────────────
  // Only reconnects if:
  //   1. MetaMask still has the account approved (eth_accounts returns it), AND
  //   2. The user has NOT explicitly disconnected (no DISCONNECTED_KEY in storage)
  useEffect(() => {
    if (!window.ethereum) return;

    const userDisconnected = localStorage.getItem(DISCONNECTED_KEY) === "true";
    if (userDisconnected) return; // respect the user's last choice

    window.ethereum
      .request({ method: "eth_accounts" })
      .then(accounts => {
        if (accounts[0]) {
          setWallet(accounts[0]);
          localStorage.setItem(STORAGE_KEY, accounts[0]);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => {});

    // React to MetaMask account switches / disconnects at the extension level
    const onAccountsChanged = accounts => {
      if (!accounts.length) {
        setWallet(null);
        localStorage.removeItem(STORAGE_KEY);
      } else {
        setWallet(accounts[0]);
        localStorage.setItem(STORAGE_KEY, accounts[0]);
        localStorage.removeItem(DISCONNECTED_KEY); // they reconnected in MetaMask
      }
    };
    window.ethereum.on("accountsChanged", onAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", onAccountsChanged);
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      // No MetaMask — open install page
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    if (connecting) return;

    setConnecting(true);
    try {
      // Clear the "user disconnected" flag so auto-reconnect works next load
      localStorage.removeItem(DISCONNECTED_KEY);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (!accounts[0]) throw new Error("No account returned.");

      setWallet(accounts[0]);
      localStorage.setItem(STORAGE_KEY, accounts[0]);

      // Switch to 0G network
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId.toLowerCase() !== ZERO_G_CHAIN.chainId.toLowerCase()) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [ZERO_G_CHAIN],
        });
      }

      setShowPrompt(false);
    } catch (err) {
      const code = err?.code;
      const msg  = err?.message || "";
      // 4001 = user rejected, -32002 = request already pending
      if (code === 4001 || msg.includes("User rejected")) {
        // user cancelled — silently reset, no alert
      } else if (code === -32002 || msg.includes("already pending")) {
        // MetaMask went behind the browser — silently reset so they can click again
        console.warn("MetaMask request already pending — click the MetaMask icon in your browser toolbar.");
      } else {
        console.error("Wallet connect error:", err);
      }
      // Always revert the disconnected flag if connect failed
      // (we removed it optimistically above)
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  // ── Disconnect ────────────────────────────────────────────────────────────
  // Sets the DISCONNECTED_KEY so auto-reconnect is suppressed on next load.
  const disconnect = useCallback(() => {
    setWallet(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(DISCONNECTED_KEY, "true");
    setShowPrompt(false);
  }, []);

  // ── Require wallet helper ─────────────────────────────────────────────────
  const requireWallet = useCallback((msg) => {
    if (wallet) return true;
    setPromptMsg(msg || "Connect your wallet to continue.");
    setShowPrompt(true);
    return false;
  }, [wallet]);

  return (
    <Ctx.Provider value={{
      wallet,
      connecting,
      connect,
      connectWeb3Auth: connect,  // alias so existing callers keep working
      disconnect,
      requireWallet,
      showPrompt,
      setShowPrompt,
      promptMsg,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be inside WalletProvider");
  return ctx;
}