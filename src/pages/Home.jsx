import { useState } from "react";
import { Search, ArrowRight, Calendar, Ticket, ScanLine, Zap } from "lucide-react";
import { CATEGORIES, V } from "../utils/constants";
import { useApp } from "../context/AppContext";
import EventCard from "../components/events/EventCard";
import { useNavigate } from "react-router-dom";

const HOW_IT_WORKS = [
  { icon: Calendar, color: "#7C3AED", title: "Create an Event",   desc: "Fill in your event details, set a ticket price, and deploy directly to the 0G blockchain. Your event is live in minutes." },
  { icon: Ticket,   color: "#16A34A", title: "Sell NFT Tickets",  desc: "Attendees buy soulbound NFT tickets straight from the smart contract. No middlemen, no platform fees eating your revenue." },
  { icon: ScanLine, color: "#D97706", title: "Scan & Verify",     desc: "Use the built-in QR scanner to verify tickets at the door. Every ticket is cryptographically signed and unique." },
  { icon: Zap,      color: "#2563EB", title: "Instant Payouts",   desc: "Revenue flows directly to your wallet. Withdraw whenever you want — no waiting periods, no payment processors." },
];

export default function HomePage({ setSelectedEvent }) {
  const { events, loadingEvents } = useApp();
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    navigate(`/explore?q=${encodeURIComponent(query)}`);
  };

  const filtered = events.filter(e => {
    const matchCat   = cat === "All" || e.category === cat;
    const matchQuery = !query || e.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQuery;
  });

  const hasEvents = events.length > 0;

  return (
    <div>
      {/* ── HERO ── */}
      <div className="hero" style={{ padding: "100px 24px 64px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.08) 0%,transparent 70%)", top: -250, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(109,40,217,.06) 0%,transparent 70%)", bottom: -100, right: "10%", pointerEvents: "none" }} />

        <div className="fu" style={{ padding: "50px 0px 10px", maxWidth: 660, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(36px,5.5vw,62px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-.03em", marginBottom: 20, color: V.text }}>
            Host your next event<br /><span className="gt">on the blockchain</span>
          </h1>
          <p style={{ fontSize: 18, color: V.muted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 40px" }}>
            Create events, sell NFT tickets, and verify attendance — all on-chain. No middlemen, no fraud.
          </p>

          {/* Search bar */}
          <div className="fu2" style={{ display: "flex", maxWidth: 520, margin: "0 auto 36px", background: "white", border: "1.5px solid var(--border)", borderRadius: 18, padding: 5, boxShadow: "var(--sh)" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
              <Search size={15} color={V.mutedL} />

              <input
                placeholder="Search events…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  fontFamily: "DM Sans",
                  color: V.text,
                  background: "transparent"
                }}
              />
            </div>

            <button
              className="bp"
              style={{ borderRadius: 13, padding: "11px 22px" }}
              onClick={handleSearch}
            >
              Search
            </button>
          </div>

          {/* CTA buttons */}
          <div className="fu3" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="bp" onClick={() => navigate("/create")} style={{ borderRadius: 14, padding: "12px 26px", fontSize: 15 }}>
              Host an Event
            </button>
            <button className="bs" onClick={() => navigate("/explore")} style={{ borderRadius: 14, padding: "12px 26px", fontSize: 15 }}>
              Explore Events <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── EVENTS SECTION or HOW IT WORKS ── */}
      <div style={{ padding: "0 24px 80px", maxWidth: 1180, margin: "0 auto" }}>

        {loadingEvents ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${V.b100}`, borderTopColor: V.brand, margin: "0 auto 16px", animation: "spinA 1s linear infinite" }} />
            <div style={{ color: V.muted, fontFamily: "Outfit", fontWeight: 600 }}>Loading events from blockchain…</div>
          </div>

        ) : hasEvents ? (
          <>
            {/* Category pills */}
            <div className="fu" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 26 }}>
              {CATEGORIES.map(c => (
                <button key={c} className={`cp${cat === c ? " act" : ""}`} onClick={() => setCat(c)}>{c}</button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ fontFamily: "Outfit", fontSize: 22, fontWeight: 800, color: V.text }}>
                {cat === "All" ? "All Events" : `${cat} Events`}
                {filtered.length > 0 && <span style={{ fontSize: 14, color: V.muted, fontWeight: 500, marginLeft: 10 }}>{filtered.length} found</span>}
              </h2>
              <button className="bg" style={{ color: V.brand, fontWeight: 600, gap: 4 }} onClick={() => navigate("/explore")}>
                Browse all <ArrowRight size={14} />
              </button>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: V.muted }}>
                <div style={{ fontSize: 14 }}>No {cat} events yet. <button className="bg" style={{ color: V.brand, fontWeight: 600 }} onClick={() => navigate("/create")}>Create the first one →</button></div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
                {filtered.slice(0, 9).map(ev => (
                  <EventCard key={ev.id} event={ev} onClick={setSelectedEvent} />
                ))}
              </div>
            )}
          </>

        ) : (
          /* ── HOW IT WORKS (shown when no events) ── */
          <div className="fu" style={{ maxWidth: 900, margin: "0 auto", paddingTop: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 30, color: V.text, marginBottom: 10 }}>
                How Minty Tickets works
              </h2>
              <p style={{ color: V.muted, fontSize: 16, lineHeight: 1.7 }}>
                A fully on-chain event ticketing platform built on the 0G blockchain.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 18, marginBottom: 48 }}>
              {HOW_IT_WORKS.map(({ icon: Icon, color, title, desc }, i) => (
                <div key={title} className="card" style={{ padding: "24px 20px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                    <Icon size={22} color={color} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "Outfit", fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 15, color: V.text }}>{title}</div>
                  </div>
                  <div style={{ fontSize: 13, color: V.muted, lineHeight: 1.65 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: "center" }}>
              <button className="bp" onClick={() => navigate("/create")} style={{ borderRadius: 14, padding: "14px 32px", fontSize: 16 }}>
                Create the first event
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
