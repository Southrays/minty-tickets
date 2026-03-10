import { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import { WalletProvider } from "./context/WalletContext";
import { AppProvider, useApp } from "./context/AppContext";

import Navbar from "./components/layout/Navbar";
import BottomNav from "./components/layout/BottomNav";
import WalletPrompt from "./components/layout/WalletPrompt";

import HomePage from "./pages/Home";
import ExplorePage from "./pages/Explore";
import EventDetailsPage from "./pages/EventDetails";
import MyTicketsPage from "./pages/MyTickets";
import DashboardPage from "./pages/Dashboard";
import CreateEventPage from "./pages/CreateEvent";

function AppInner() {
  const { refreshEvents, refreshTickets } = useApp();
  const navigate = useNavigate();

  const [isMobile, setMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onR = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);

  // smooth scroll when route changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [navigate]);

  const handleEventCreated = async () => {
    await refreshEvents();
    navigate("/dashboard");
  };

  const handleTicketBought = async () => {
    await refreshTickets();
  };

  return (
    <div className="mw">
      <Navbar isMobile={isMobile} />

      <main style={{ paddingBottom: isMobile ? 68 : 0 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/explore" element={<ExplorePage />} />

          <Route
            path="/event/:eventId"
            element={<EventDetailsPage onTicketBought={handleTicketBought} />}
          />

          <Route path="/tickets" element={<MyTicketsPage />} />

          <Route path="/dashboard" element={<DashboardPage />} />

          <Route
            path="/create"
            element={<CreateEventPage onCreated={handleEventCreated} />}
          />
        </Routes>
      </main>

      {isMobile && <BottomNav />}

      <WalletPrompt />
    </div>
  );
}

export default function App() {
  return (
    <WalletProvider>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </WalletProvider>
  );
}