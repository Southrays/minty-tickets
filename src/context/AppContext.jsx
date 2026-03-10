import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { fetchAllEvents, fetchUserTickets, fetchOrganizerEvents } from "../utils/contract";
import { useWallet } from "./WalletContext";

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const { wallet } = useWallet();

  const [events,          setEvents]          = useState([]);
  const [tickets,         setTickets]         = useState([]);
  const [orgEvents,       setOrgEvents]       = useState([]);
  const [loadingEvents,   setLoadingEvents]   = useState(true);
  const [loadingTickets,  setLoadingTickets]  = useState(false);

  // ── Fetch all on-chain events ──────────────────────────────
  const refreshEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const evs = await fetchAllEvents();
      setEvents(evs);
    } catch (err) {
      console.error("fetchAllEvents failed:", err);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // ── Fetch user tickets ─────────────────────────────────────
  const refreshTickets = useCallback(async (addr) => {
    const a = addr || wallet;
    if (!a) { setTickets([]); return; }
    setLoadingTickets(true);
    try {
      const tix = await fetchUserTickets(a);
      setTickets(tix);
    } catch (err) {
      console.error("fetchUserTickets failed:", err);
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, [wallet]);

  // ── Fetch organizer events ─────────────────────────────────
  const refreshOrgEvents = useCallback(async (addr) => {
    const a = addr || wallet;
    if (!a) { setOrgEvents([]); return; }
    try {
      const evs = await fetchOrganizerEvents(a);
      setOrgEvents(evs);
    } catch (err) {
      console.error("fetchOrganizerEvents failed:", err);
      setOrgEvents([]);
    }
  }, [wallet]);

  // Load events on mount
  useEffect(() => { refreshEvents(); }, [refreshEvents]);

  // Load user data when wallet connects
  useEffect(() => {
    if (wallet) {
      refreshTickets(wallet);
      refreshOrgEvents(wallet);
    } else {
      setTickets([]);
      setOrgEvents([]);
    }
  }, [wallet, refreshTickets, refreshOrgEvents]);

  return (
    <AppCtx.Provider value={{
      events, loadingEvents, refreshEvents,
      tickets, loadingTickets, refreshTickets,
      orgEvents, refreshOrgEvents,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
