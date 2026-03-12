import { useState, useEffect, useCallback } from "react";
import {
  Wallet, Plus, DollarSign, Ticket, Calendar,
  RefreshCw, CheckCircle, BarChart3, ScanLine,
  AlertCircle, Mail, TrendingUp,
} from "lucide-react";
import { V } from "../utils/constants";
import { formatDate, soldPct } from "../utils/format";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import { withdrawOrganizerFunds, getOrganizerBalance } from "../utils/contract";
import ScanModal from "../components/ticket/ScanModal";
import { useNavigate } from "react-router-dom";

// Fetches email ticket count for one event
async function fetchEmailCount(eventId) {
  try {
    const r = await fetch(`/api/ticket-count?eventId=${eventId}`);
    if (!r.ok) return 0;
    const d = await r.json();
    return d.emailCount || 0;
  } catch { return 0; }
}

// Truncate wallet address: 0x1234…abcd
function truncateAddr(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function DashboardPage() {
  const { wallet, connect, connecting } = useWallet();
  const { orgEvents, loadingEvents, refreshOrgEvents, refreshEvents } = useApp();
  const [showScan,     setShowScan]     = useState(false);
  const [wdBusy,       setWdBusy]       = useState(false);
  const [wdDone,       setWdDone]       = useState(false);
  const [wdErr,        setWdErr]        = useState("");
  const [balance,      setBalance]      = useState(null);   // null = loading, string = value
  const [emailCounts,  setEmailCounts]  = useState({});     // { [eventId]: number }
  const navigate = useNavigate();

  // Fetch on-chain balance
  const loadBalance = useCallback(async () => {
    if (!wallet) return;
    setBalance(null); // null = loading spinner
    try {
      const b = await getOrganizerBalance(wallet);
      // getOrganizerBalance returns null when the contract doesn't expose a getter
      setBalance(b !== null ? b : "unsupported");
    } catch {
      setBalance("unsupported");
    }
  }, [wallet]);

  // Fetch email counts for all offchain events
  const loadEmailCounts = useCallback(async () => {
    const offchain = orgEvents.filter(e => e.acceptsOffchainTickets);
    if (!offchain.length) return;
    const pairs = await Promise.all(
      offchain.map(async e => [e.id, await fetchEmailCount(e.id)])
    );
    setEmailCounts(Object.fromEntries(pairs));
  }, [orgEvents]);

  useEffect(() => { loadBalance(); },     [loadBalance]);
  useEffect(() => { loadEmailCounts(); }, [loadEmailCounts]);

  // Totals — include email counts
  const totTix = orgEvents.reduce((a, e) => {
    const ec = e.acceptsOffchainTickets ? (emailCounts[e.id] || 0) : 0;
    return a + e.soldTickets + ec;
  }, 0);
  const totRev = orgEvents.reduce((a, e) =>
    a + parseFloat(e.ticketPrice || 0) * e.soldTickets, 0);

  const doWithdraw = async () => {
    setWdBusy(true); setWdErr(""); setWdDone(false);
    try {
      await withdrawOrganizerFunds();
      setWdDone(true);
      setBalance("0"); // optimistically clear balance
      setTimeout(() => setWdDone(false), 4000); // reset button after 4s
    } catch (err) {
      setWdErr(err?.reason || err?.message || "Withdrawal failed.");
    } finally { setWdBusy(false); }
  };

  const doRefresh = async () => {
    await Promise.all([refreshOrgEvents(wallet), refreshEvents()]);
    await Promise.all([loadBalance(), loadEmailCounts()]);
  };

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!wallet) return (
    <div style={{ padding: "80px 24px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div style={{ width: 70, height: 70, borderRadius: 20, background: V.b50, border: "1px solid " + V.b100, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <BarChart3 size={30} color={V.brand} />
        </div>
        <h2 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 25, marginBottom: 10, color: V.text }}>Organizer Dashboard</h2>
        <p style={{ color: V.muted, marginBottom: 24, lineHeight: 1.7, fontSize: 14 }}>
          Connect your wallet to manage your events and withdraw revenue.
        </p>
        <button className="bp" onClick={connect} disabled={connecting} style={{ borderRadius: 14, padding: "13px 28px", fontSize: 14, gap: 10 }}>
          {connecting ? <><RefreshCw size={14} className="spin" />Connecting…</> : <><Wallet size={15} />Connect Wallet</>}
        </button>
      </div>
    </div>
  );

  const hasBalance = balance !== null && balance !== "unsupported" && balance !== "0" && parseFloat(balance) > 0;

  return (
    <div style={{ padding: "80px 24px 80px", maxWidth: 920, margin: "0 auto" }}>
      {showScan && <ScanModal events={orgEvents} onClose={() => setShowScan(false)} />}

      {/* Header */}
      <div className="fu" style={{ marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 30, color: V.text, marginBottom: 4 }}>Dashboard</h1>
            {/* Truncated address with copy on click */}
            <div
              title={wallet}
              onClick={() => navigator.clipboard.writeText(wallet)}
              style={{ fontSize: 13, color: V.muted, fontFamily: "monospace", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, background: V.surface, border: "1px solid " + V.border, borderRadius: 7, padding: "3px 9px" }}
            >
              {truncateAddr(wallet)}
              <span style={{ fontSize: 10, color: V.mutedL }}>copy</span>
            </div>
          </div>

          {/* Action buttons — fixed widths to prevent layout shift */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button className="bg" onClick={doRefresh}
              style={{ gap: 6, color: V.muted, fontSize: 13, borderRadius: 11, minWidth: 90 }}>
              <RefreshCw size={13} className={loadingEvents ? "spin" : ""} />Refresh
            </button>
            <button className="bs" onClick={() => navigate("/create")}
              style={{ gap: 6, borderRadius: 12, minWidth: 110 }}>
              <Plus size={14} />Host Event
            </button>
            <button className="bs" onClick={() => setShowScan(true)}
              style={{ gap: 6, borderRadius: 12, minWidth: 120 }}>
              <ScanLine size={14} />Scan Tickets
            </button>
            <button
              className="bp"
              onClick={doWithdraw}
              disabled={wdBusy || wdDone || !hasBalance}
              title={!hasBalance && balance !== null ? "No funds available to withdraw" : ""}
              style={{
                gap: 6, borderRadius: 12,
                minWidth: 150,           // fixed width prevents layout shift
                justifyContent: "center",
                opacity: (!hasBalance && !wdBusy) ? 0.55 : 1,
              }}
            >
              {wdBusy  ? <><RefreshCw size={14} className="spin" />Withdrawing…</> :
               wdDone  ? <><CheckCircle size={14} />Withdrawn!</> :
                         <><DollarSign size={14} />Withdraw Funds</>}
            </button>
          </div>
        </div>

        {/* Error */}
        {wdErr && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 12, padding: "11px 14px", marginTop: 14, display: "flex", gap: 9, fontSize: 13, color: "#DC2626" }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{wdErr}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="fu2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, marginBottom: 26 }}>
        {/* Total Earned */}
        <div className="sc">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: V.muted, fontFamily: "Outfit", fontWeight: 600 }}>Total Earned</span>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: V.brand + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={16} color={V.brand} />
            </div>
          </div>
          <div style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 22, color: V.brand }}>{totRev.toFixed(4)} OG</div>
          <div style={{ fontSize: 12, color: V.mutedL, marginTop: 3 }}>from NFT tickets</div>
        </div>

        {/* Available to Withdraw */}
        <div className="sc">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: V.muted, fontFamily: "Outfit", fontWeight: 600 }}>Available</span>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#16A34A18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={16} color="#16A34A" />
            </div>
          </div>
          {balance === null ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={14} className="spin" color={V.mutedL} />
              <span style={{ fontSize: 13, color: V.mutedL }}>Loading…</span>
            </div>
          ) : balance === "unsupported" ? (
            // Contract doesn't expose a balance getter — show total earned as guide
            <div>
              <div style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 22, color: "#16A34A" }}>
                {totRev.toFixed(4)} OG
              </div>
              <div style={{ fontSize: 11, color: V.mutedL, marginTop: 3 }}>estimated (on-chain balance N/A)</div>
            </div>
          ) : (
            <div style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 22, color: parseFloat(balance) > 0 ? "#16A34A" : V.mutedL }}>
              {parseFloat(balance).toFixed(4)} OG
            </div>
          )}
          {balance !== null && balance !== "unsupported" && (
            <div style={{ fontSize: 12, color: V.mutedL, marginTop: 3 }}>ready to withdraw</div>
          )}
        </div>

        {/* Tickets Sold */}
        <div className="sc">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: V.muted, fontFamily: "Outfit", fontWeight: 600 }}>Tickets Sold</span>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#16A34A18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ticket size={16} color="#16A34A" />
            </div>
          </div>
          <div style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 22, color: "#16A34A" }}>{totTix.toLocaleString()}</div>
          <div style={{ fontSize: 12, color: V.mutedL, marginTop: 3 }}>NFT + email</div>
        </div>

        {/* Events Hosted */}
        <div className="sc">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: V.muted, fontFamily: "Outfit", fontWeight: 600 }}>Events Hosted</span>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "#D9770618", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calendar size={16} color="#D97706" />
            </div>
          </div>
          <div style={{ fontFamily: "Outfit", fontWeight: 900, fontSize: 22, color: "#D97706" }}>{orgEvents.length}</div>
          <div style={{ fontSize: 12, color: V.mutedL, marginTop: 3 }}>on 0G chain</div>
        </div>
      </div>

      {/* Event table */}
      <div className="fu3 card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "17px 22px", borderBottom: "1px solid " + V.borderS, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 16, color: V.text }}>Your Events</h3>
          <span className="bdg bdg-p">{orgEvents.length} event{orgEvents.length !== 1 ? "s" : ""}</span>
        </div>

        {loadingEvents ? (
          <div style={{ padding: "32px 22px", textAlign: "center" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid " + V.b100, borderTopColor: V.brand, margin: "0 auto", animation: "spinA 1s linear infinite" }} />
          </div>
        ) : orgEvents.length === 0 ? (
          <div style={{ padding: "32px 22px", textAlign: "center", color: V.muted, fontSize: 14 }}>
            No events yet.{" "}
            <button className="bg" onClick={() => navigate("/create")} style={{ color: V.brand, fontWeight: 600 }}>
              Host your first event →
            </button>
          </div>
        ) : orgEvents.map((ev, i) => {
          const ec        = ev.acceptsOffchainTickets ? (emailCounts[ev.id] || 0) : 0;
          const totalSold = ev.soldTickets + ec;
          const pct       = soldPct(totalSold, ev.maxTickets);
          const rev       = (parseFloat(ev.ticketPrice || 0) * ev.soldTickets).toFixed(4);
          return (
            <div key={ev.id}
              style={{ padding: "17px 22px", borderBottom: i < orgEvents.length - 1 ? "1px solid " + V.borderS : "none", display: "flex", gap: 14, alignItems: "center", transition: "background .15s", cursor: "default" }}
              onMouseEnter={e => e.currentTarget.style.background = V.surface}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: ev.imageURI ? `url(${ev.imageURI}) center/cover` : ev.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {!ev.imageURI && ev.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 14, color: V.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {ev.name}
                </div>
                <div style={{ fontSize: 12, color: V.muted, marginBottom: 7 }}>
                  {formatDate(ev.startTime)} · {[ev.city, ev.country].filter(Boolean).join(", ") || "Location TBD"}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="pb" style={{ height: 3, flex: 1 }}><div className="pf" style={{ width: pct + "%" }} /></div>
                  <span style={{ fontSize: 11, color: V.mutedL, flexShrink: 0 }}>{pct}%</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 16, color: V.text }}>{rev} OG</div>
                <div style={{ fontSize: 12, color: V.muted, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                  {totalSold.toLocaleString()} tickets
                  {ev.acceptsOffchainTickets && ec > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "#EDE9FE", color: V.brand, borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 600 }}>
                      <Mail size={8} />{ec}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}