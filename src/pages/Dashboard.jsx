import { useState, useEffect, useCallback } from "react";
import {
  Wallet, Plus, DollarSign, Ticket, Calendar,
  RefreshCw, CheckCircle, BarChart3, ScanLine,
  AlertCircle, Mail, TrendingUp, Users, X,
  UserPlus, UserMinus, ChevronRight, Eye, Shield,
} from "lucide-react";
import { V } from "../utils/constants";
import { formatDate, soldPct } from "../utils/format";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import {
  withdrawOrganizerFunds, getOrganizerBalance,
  setCheckInManager, isCheckInManagerFor,
} from "../utils/contract";
import ScanModal from "../components/ticket/ScanModal";
import { useNavigate } from "react-router-dom";

function truncateAddr(addr) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0,6)}…${addr.slice(-4)}`;
}

async function fetchEmailCount(eventId) {
  try {
    const r = await fetch(`/api/ticket-count?eventId=${eventId}`);
    if (!r.ok) return 0;
    const d = await r.json();
    return d.emailCount || 0;
  } catch { return 0; }
}

async function fetchRegistrations(eventId) {
  try {
    const r = await fetch(`/api/get-registrations?eventId=${eventId}`);
    if (!r.ok) return [];
    const d = await r.json();
    return d.registrations || [];
  } catch { return []; }
}

// ── Check-in manager modal ────────────────────────────────────────────────────
function CheckInManagerModal({ wallet, onClose }) {
  const [address,   setAddress]   = useState("");
  const [busy,      setBusy]      = useState(false);
  const [err,       setErr]       = useState("");
  const [checkResult, setCheckResult] = useState(null); // {is:bool, addr}
  const [managers,  setManagers]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(`cim:${wallet}`) || "[]"); } catch { return []; }
  });

  const saveManagers = (list) => {
    setManagers(list);
    localStorage.setItem(`cim:${wallet}`, JSON.stringify(list));
  };

  const add = async () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address.trim()))
      { setErr("Enter a valid wallet address (0x…)."); return; }
    setBusy(true); setErr("");
    try {
      await setCheckInManager(address.trim(), true);
      const list = [...new Set([...managers, address.trim().toLowerCase()])];
      saveManagers(list);
      setAddress("");
    } catch (e) { setErr(e?.reason || e?.message || "Transaction failed."); }
    finally { setBusy(false); }
  };

  const remove = async (addr) => {
    setBusy(true); setErr("");
    try {
      await setCheckInManager(addr, false);
      saveManagers(managers.filter(m => m !== addr.toLowerCase()));
    } catch (e) { setErr(e?.reason || e?.message || "Transaction failed."); }
    finally { setBusy(false); }
  };

  const checkAddr = async () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(address.trim())) { setErr("Enter a valid address."); return; }
    const is = await isCheckInManagerFor(wallet, address.trim());
    setCheckResult({ is, addr: address.trim() });
  };

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(10,10,20,.65)",
        backdropFilter:"blur(12px)", display:"flex", alignItems:"center",
        justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:440, background:"white", borderRadius:22,
        boxShadow:"0 24px 80px rgba(0,0,0,.2)", padding:28, position:"relative" }}>
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16,
          background:"none", border:"none", cursor:"pointer", color:V.muted }}><X size={18}/></button>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:V.b50,
            border:"1px solid "+V.b100, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Shield size={22} color={V.brand}/>
          </div>
          <div>
            <div style={{ fontFamily:"Outfit", fontWeight:800, fontSize:17, color:V.text }}>Check-in Managers</div>
            <div style={{ fontSize:12, color:V.muted }}>Grant others access to scan tickets at your events</div>
          </div>
        </div>

        {err && (
          <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:10,
            padding:"10px 12px", marginBottom:12, fontSize:13, color:"#DC2626",
            display:"flex", alignItems:"center", gap:8 }}>
            <AlertCircle size={13}/>{err}
          </div>
        )}

        {/* Add input */}
        <div style={{ display:"flex", gap:8, marginBottom:16 }}>
          <input className="inp" placeholder="0x… wallet address"
            value={address} onChange={e => { setAddress(e.target.value); setErr(""); setCheckResult(null); }}
            style={{ flex:1, fontSize:13 }}/>
          <button className="bp" onClick={add} disabled={busy||!address}
            style={{ padding:"9px 14px", borderRadius:11, gap:5, fontSize:13, flexShrink:0 }}>
            {busy ? <RefreshCw size={13} className="spin"/> : <UserPlus size={13}/>}Add
          </button>
        </div>

        {/* Check if address is already a manager */}
        <button className="bg" onClick={checkAddr}
          style={{ fontSize:12, marginBottom:14, gap:5, color:V.muted }}>
          <Eye size={12}/>Check if address is a manager
        </button>
        {checkResult && (
          <div style={{ fontSize:12, color:checkResult.is?"#16A34A":"#EF4444",
            marginBottom:12, display:"flex", alignItems:"center", gap:5 }}>
            {checkResult.is ? <CheckCircle size={12}/> : <AlertCircle size={12}/>}
            {truncateAddr(checkResult.addr)} is {checkResult.is?"":"not "}a check-in manager
          </div>
        )}

        {/* Manager list */}
        {managers.length > 0 ? (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <div style={{ fontSize:12, fontFamily:"Outfit", fontWeight:700, color:V.muted,
              textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>
              Managers ({managers.length})
            </div>
            {managers.map(m => (
              <div key={m} style={{ display:"flex", alignItems:"center", gap:10,
                background:V.surface, borderRadius:10, padding:"9px 12px" }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#16A34A", flexShrink:0 }}/>
                <span style={{ flex:1, fontSize:13, fontFamily:"monospace", color:V.text }}>{truncateAddr(m)}</span>
                <button onClick={() => remove(m)} disabled={busy}
                  style={{ background:"none", border:"none", cursor:"pointer", color:"#EF4444",
                    display:"flex", padding:4 }}>
                  <UserMinus size={14}/>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign:"center", padding:"16px 0", color:V.mutedL, fontSize:13 }}>
            No check-in managers added yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Event analytics modal ─────────────────────────────────────────────────────
function EventAnalyticsModal({ event, onClose }) {
  const [regs,       setRegs]      = useState([]);
  const [emailCount, setEmailCount]= useState(0);
  const [loading,    setLoading]   = useState(true);
  const [tab,        setTab]       = useState("overview"); // overview | guests

  useEffect(() => {
    (async () => {
      const [ec, rs] = await Promise.all([
        event.acceptsOffchainTickets ? fetchEmailCount(event.id) : Promise.resolve(0),
        fetchRegistrations(event.id),
      ]);
      setEmailCount(ec);
      setRegs(rs);
      setLoading(false);
    })();
  }, [event]);

  const totalSold = event.soldTickets + emailCount;
  const pct = soldPct(totalSold, event.maxTickets);
  const loc = [event.city, event.country].filter(Boolean).join(", ");

  // Build field columns from requiredFields
  const fieldCols = event.requiredFields ? [
    event.requiredFields.email    && "email",
    event.requiredFields.name     && "name",
    event.requiredFields.phone    && "phone",
    event.requiredFields.location && "location",
    event.requiredFields.customQuestion && "answer",
  ].filter(Boolean) : [];

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(10,10,20,.65)",
        backdropFilter:"blur(12px)", display:"flex", alignItems:"center",
        justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:600, background:"white", borderRadius:22,
        boxShadow:"0 24px 80px rgba(0,0,0,.2)", maxHeight:"90vh",
        display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"22px 24px 0", display:"flex", alignItems:"flex-start",
          justifyContent:"space-between", gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:11,
                background:event.imageURI?`url(${event.imageURI}) center/cover`:event.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:18, flexShrink:0 }}>
                {!event.imageURI && event.emoji}
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontFamily:"Outfit", fontWeight:800, fontSize:16, color:V.text,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {event.name}
                </div>
                <div style={{ fontSize:12, color:V.muted }}>
                  {formatDate(event.startTime)}{loc ? ` · ${loc}` : ""}
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:V.muted, flexShrink:0 }}>
            <X size={18}/>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, padding:"16px 24px 0", borderBottom:"1px solid "+V.borderS }}>
          {[["overview","Overview"],["guests","Guests"]].map(([key,label])=>(
            <button key={key} onClick={()=>setTab(key)}
              style={{ padding:"8px 16px", background:"none", border:"none",
                borderBottom:`2px solid ${tab===key?V.brand:"transparent"}`,
                color:tab===key?V.brand:V.muted, fontFamily:"Outfit", fontWeight:700,
                fontSize:13, cursor:"pointer", transition:"all .15s", marginBottom:-1 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px 24px" }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <RefreshCw size={20} className="spin" color={V.brand} style={{ margin:"0 auto" }}/>
            </div>
          ) : tab === "overview" ? (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Stats grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:12 }}>
                {[
                  { label:"NFT Tickets", value:event.soldTickets, color:V.brand },
                  { label:"Email Tickets", value:emailCount, color:"#0EA5E9" },
                  { label:"Total Sold", value:totalSold, color:"#16A34A" },
                  { label:"Remaining", value:Math.max(0,event.maxTickets-totalSold), color:"#D97706" },
                ].map(({label,value,color})=>(
                  <div key={label} className="sc" style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:11, color:V.muted, fontFamily:"Outfit", fontWeight:600, marginBottom:6 }}>{label}</div>
                    <div style={{ fontFamily:"Outfit", fontWeight:900, fontSize:22, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:V.muted, marginBottom:6 }}>
                  <span>{totalSold} of {event.maxTickets} sold</span>
                  <span style={{ fontFamily:"Outfit", fontWeight:700, color:V.brand }}>{pct}%</span>
                </div>
                <div className="pb" style={{ height:8, borderRadius:8 }}>
                  <div className="pf" style={{ width:pct+"%", borderRadius:8 }}/>
                </div>
              </div>

              {/* Revenue */}
              <div style={{ background:V.b50, border:"1px solid "+V.b100, borderRadius:12, padding:"14px 16px" }}>
                <div style={{ fontSize:12, color:V.muted, fontFamily:"Outfit", fontWeight:600, marginBottom:4 }}>Revenue from NFT Tickets</div>
                <div style={{ fontFamily:"Outfit", fontWeight:900, fontSize:24, color:V.brand }}>
                  {(parseFloat(event.ticketPrice||0)*event.soldTickets).toFixed(4)} OG
                </div>
              </div>

              {/* Ticket types — with sold counts derived from registrations */}
              {event.ticketTypes && event.ticketTypes.filter(t=>t.enabled!==false).length > 0 && (
                <div>
                  <div style={{ fontSize:12, fontFamily:"Outfit", fontWeight:700, color:V.muted, marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>Ticket Types</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {event.ticketTypes.filter(t=>t.enabled!==false).map(tt => {
                      const soldCount = regs.filter(r => (r.ticketType||"Regular") === tt.name).length;
                      return (
                        <div key={tt.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                          background:V.surface, borderRadius:9, padding:"9px 12px" }}>
                          <span style={{ fontFamily:"Outfit", fontWeight:700, fontSize:13, color:V.text }}>{tt.name}</span>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            {soldCount > 0 && (
                              <span style={{ fontSize:11, color:V.muted, fontFamily:"Outfit", fontWeight:600 }}>
                                {soldCount} sold
                              </span>
                            )}
                            <span style={{ fontSize:13, color:V.muted }}>{tt.price && tt.price!=="0" ? `${tt.price} OG` : "Free"}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Guests tab */
            regs.length === 0 ? (
              <div style={{ textAlign:"center", padding:"32px 0", color:V.mutedL }}>
                <Users size={36} style={{ margin:"0 auto 12px", opacity:.25 }}/>
                <div style={{ fontFamily:"Outfit", fontWeight:600, fontSize:14 }}>
                  No attendees yet
                </div>
                <div style={{ fontSize:12, color:V.mutedL, marginTop:4 }}>
                  Guests appear here once they buy a ticket
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                  marginBottom:14 }}>
                  <div style={{ fontSize:13, color:V.muted }}>
                    <strong style={{ color:V.text }}>{regs.length}</strong> attendee{regs.length!==1?"s":""}
                  </div>
                  <div style={{ fontSize:11, color:V.mutedL }}>click address/email to copy</div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {regs.map((reg, i) => {
                    const isWallet  = reg.identifier?.startsWith("0x");
                    const fullId    = reg.identifier || "";
                    const dispId    = isWallet ? truncateAddr(fullId) : fullId;
                    const ttName    = reg.ticketType || "Regular";
                    const isVIP     = ttName === "VIP";
                    const isSponsor = ttName === "Sponsor";
                    const ttColor   = isVIP?"#92400E":isSponsor?V.brand:"#166534";
                    const ttBg      = isVIP?"#FEF3C7":isSponsor?V.b50:"#DCFCE7";
                    const ttBorder  = isVIP?"#FDE68A":isSponsor?V.b100:"#86EFAC";
                    const ttIcon    = isVIP?"👑":isSponsor?"💎":"🎟️";
                    const checkedIn = reg.checkedIn === true;
                    return (
                      <div key={i} style={{ background:V.surface, borderRadius:12,
                        border:"1px solid "+V.borderS, overflow:"hidden" }}>
                        {/* Main row */}
                        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
                          borderBottom: fieldCols.length > 0 ? "1px solid "+V.borderS : "none" }}>
                          {/* Avatar */}
                          <div style={{ width:32, height:32, borderRadius:"50%",
                            background:isWallet?V.brand+"18":"#FEF3C7",
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:15, flexShrink:0 }}>
                            {isWallet ? "👛" : "✉️"}
                          </div>
                          {/* Identifier */}
                          <span title={fullId}
                            onClick={() => navigator.clipboard.writeText(fullId)}
                            style={{ fontSize:isWallet?12:13,
                              fontFamily:isWallet?"monospace":"DM Sans",
                              color:V.text, cursor:"pointer", flex:1,
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                              textDecoration:"underline dotted", textUnderlineOffset:3 }}>
                            {dispId}
                          </span>
                          {/* Right side: ticket type + check-in */}
                          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                            {/* Ticket type badge */}
                            <span style={{ fontSize:11, fontFamily:"Outfit", fontWeight:700,
                              color:ttColor, background:ttBg, borderRadius:6,
                              border:"1px solid "+ttBorder,
                              padding:"2px 8px", display:"flex", alignItems:"center", gap:4 }}>
                              {ttIcon} {ttName}
                            </span>
                            {/* Check-in status */}
                            <span style={{ fontSize:11, fontFamily:"Outfit", fontWeight:700,
                              color:checkedIn?"#166534":"#6B7280",
                              background:checkedIn?"#DCFCE7":"#F3F4F6",
                              border:"1px solid "+(checkedIn?"#86EFAC":"#E5E7EB"),
                              borderRadius:6, padding:"2px 8px",
                              display:"flex", alignItems:"center", gap:3 }}>
                              {checkedIn ? "✓ In" : "Pending"}
                            </span>
                          </div>
                        </div>
                        {/* Extra fields row */}
                        {fieldCols.length > 0 && (
                          <div style={{ display:"grid",
                            gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",
                            gap:6, padding:"8px 14px 10px" }}>
                            {fieldCols.map(col => reg[col] && (
                              <div key={col} style={{ background:"white", borderRadius:7, padding:"6px 9px" }}>
                                <div style={{ fontSize:9, fontFamily:"Outfit", fontWeight:800,
                                  color:V.mutedL, textTransform:"uppercase",
                                  letterSpacing:".07em", marginBottom:2 }}>{col}</div>
                                <div style={{ fontSize:12, color:V.text, wordBreak:"break-word" }}>{reg[col]}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { wallet, connect, connecting } = useWallet();
  const { orgEvents, loadingEvents, refreshOrgEvents, refreshEvents } = useApp();
  const [showScan,      setShowScan]      = useState(false);
  const [showCIM,       setShowCIM]       = useState(false);
  const [analyticsEvent,setAnalyticsEvent]= useState(null);
  const [wdBusy,        setWdBusy]        = useState(false);
  const [wdDone,        setWdDone]        = useState(false);
  const [wdErr,         setWdErr]         = useState("");
  const [balance,       setBalance]       = useState(null);
  const [emailCounts,   setEmailCounts]   = useState({});
  const navigate = useNavigate();

  const loadBalance = useCallback(async () => {
    if (!wallet) return;
    const b = await getOrganizerBalance(wallet);
    setBalance(b);
  }, [wallet]);

  const loadEmailCounts = useCallback(async () => {
    const offchain = orgEvents.filter(e => e.acceptsOffchainTickets);
    if (!offchain.length) return;
    const pairs = await Promise.all(offchain.map(async e => [e.id, await fetchEmailCount(e.id)]));
    setEmailCounts(Object.fromEntries(pairs));
  }, [orgEvents]);



  useEffect(() => { loadBalance(); }, [loadBalance]);
  useEffect(() => { loadEmailCounts(); }, [loadEmailCounts]);

  const totTix = orgEvents.reduce((a,e) => a + e.soldTickets + (e.acceptsOffchainTickets?(emailCounts[e.id]||0):0), 0);

  // Revenue: e.ticketPrice is already correctly derived in normaliseEvent
  // from metadata tier[0].price with isNaN guard
  const totRev = orgEvents.reduce((a, e) => {
    if (!e.soldTickets) return a;
    const p = parseFloat(e.ticketPrice);
    return a + (isNaN(p) ? 0 : p) * e.soldTickets;
  }, 0);
  const totRevDisplay = `${totRev.toFixed(4)} OG`;

  const balanceNum    = parseFloat(balance || 0);
  const hasBalance    = balance !== null && balance !== "unsupported" && balanceNum > 0;
  const balanceDisplay = balance === null          ? "…"
                       : balance === "unsupported" ? "N/A"
                       : `${balanceNum.toFixed(4)} OG`;

  const doWithdraw = async () => {
    setWdBusy(true); setWdErr(""); setWdDone(false);
    try {
      await withdrawOrganizerFunds();
      setWdDone(true); setBalance("0");
      setTimeout(() => setWdDone(false), 4000);
    } catch (err) { setWdErr(err?.reason||err?.message||"Withdrawal failed."); }
    finally { setWdBusy(false); }
  };

  const doRefresh = async () => {
    await Promise.all([refreshOrgEvents(wallet), refreshEvents()]);
    await Promise.all([loadBalance(), loadEmailCounts()]);
  };

  if (!wallet) return (
    <div style={{ padding:"80px 24px", display:"flex", alignItems:"center", justifyContent:"center", minHeight:"80vh" }}>
      <div style={{ textAlign:"center", maxWidth:380 }}>
        <div style={{ width:70, height:70, borderRadius:20, background:V.b50, border:"1px solid "+V.b100,
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
          <BarChart3 size={30} color={V.brand}/>
        </div>
        <h2 style={{ fontFamily:"Outfit", fontWeight:900, fontSize:25, marginBottom:10, color:V.text }}>Organizer Dashboard</h2>
        <p style={{ color:V.muted, marginBottom:24, lineHeight:1.7, fontSize:14 }}>
          Connect your wallet to manage your events and withdraw revenue.
        </p>
        <button className="bp" onClick={connect} disabled={connecting}
          style={{ borderRadius:14, padding:"13px 28px", fontSize:14, gap:10 }}>
          {connecting ? <><RefreshCw size={14} className="spin"/>Connecting…</> : <><Wallet size={15}/>Connect Wallet</>}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding:"80px 24px 80px", maxWidth:920, margin:"0 auto" }}>
      {showScan       && <ScanModal events={orgEvents} wallet={wallet} onClose={()=>setShowScan(false)}/>}
      {showCIM        && <CheckInManagerModal wallet={wallet} onClose={()=>setShowCIM(false)}/>}
      {analyticsEvent && <EventAnalyticsModal event={analyticsEvent} onClose={()=>setAnalyticsEvent(null)}/>}

      {/* Header */}
      <div className="fu" style={{ marginBottom:26 }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontFamily:"Outfit", fontWeight:900, fontSize:30, color:V.text, marginBottom:6 }}>Dashboard</h1>
            <div title={wallet} onClick={() => navigator.clipboard.writeText(wallet)}
              style={{ fontSize:13, color:V.muted, fontFamily:"monospace", cursor:"pointer",
                display:"inline-flex", alignItems:"center", gap:5, background:V.surface,
                border:"1px solid "+V.border, borderRadius:7, padding:"3px 9px" }}>
              {truncateAddr(wallet)}<span style={{ fontSize:10, color:V.mutedL }}>copy</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
            <button className="bg" onClick={doRefresh} style={{ gap:5, color:V.muted, fontSize:13, borderRadius:11, minWidth:86 }}>
              <RefreshCw size={13} className={loadingEvents?"spin":""}/>Refresh
            </button>
            <button className="bs" onClick={() => navigate("/create")} style={{ gap:5, borderRadius:11, minWidth:100 }}>
              <Plus size={13}/>Host Event
            </button>
            <button className="bs" onClick={() => setShowCIM(true)} style={{ gap:5, borderRadius:11, minWidth:100 }}>
              <Shield size={13}/>Managers
            </button>
            <button className="bs" onClick={() => setShowScan(true)} style={{ gap:5, borderRadius:11, minWidth:110 }}>
              <ScanLine size={13}/>Scan Tickets
            </button>
            <button className="bp" onClick={doWithdraw} disabled={wdBusy||wdDone||!hasBalance}
              title={!hasBalance&&balance!==null?"No funds to withdraw":""}
              style={{ gap:5, borderRadius:11, minWidth:140, justifyContent:"center",
                opacity:(!hasBalance&&!wdBusy)?0.55:1 }}>
              {wdBusy  ? <><RefreshCw size={13} className="spin"/>Withdrawing…</>
               :wdDone ? <><CheckCircle size={13}/>Withdrawn!</>
               :         <><DollarSign size={13}/>Withdraw Funds</>}
            </button>
          </div>
        </div>
        {wdErr && (
          <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:11,
            padding:"11px 14px", marginTop:12, display:"flex", gap:9, fontSize:13, color:"#DC2626" }}>
            <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }}/>{wdErr}
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="fu2" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:14, marginBottom:24 }}>
        {[
          { label:"Total Earned",  value:totRevDisplay,                       sub:"from NFT tickets",   I:TrendingUp, c:V.brand    },
          { label:"Available",     value:balanceDisplay,                   sub:"ready to withdraw",  I:DollarSign, c:"#16A34A"  },
          { label:"Tickets Sold",  value:totTix.toLocaleString(),          sub:"NFT + email",        I:Ticket,     c:"#0EA5E9"  },
          { label:"Events Hosted", value:orgEvents.length,                 sub:"on 0G chain",        I:Calendar,   c:"#D97706"  },
        ].map(({label,value,sub,I,c})=>(
          <div key={label} className="sc">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:11, color:V.muted, fontFamily:"Outfit", fontWeight:600 }}>{label}</span>
              <div style={{ width:32, height:32, borderRadius:9, background:c+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <I size={15} color={c}/>
              </div>
            </div>
            <div style={{ fontFamily:"Outfit", fontWeight:900, fontSize:22, color:c }}>{value}</div>
            <div style={{ fontSize:11, color:V.mutedL, marginTop:2 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Event list */}
      <div className="fu3 card" style={{ overflow:"hidden" }}>
        <div style={{ padding:"16px 22px", borderBottom:"1px solid "+V.borderS,
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <h3 style={{ fontFamily:"Outfit", fontWeight:700, fontSize:16, color:V.text }}>Your Events</h3>
          <span className="bdg bdg-p">{orgEvents.length} event{orgEvents.length!==1?"s":""}</span>
        </div>

        {loadingEvents ? (
          <div style={{ padding:"32px", textAlign:"center" }}>
            <div style={{ width:26, height:26, borderRadius:"50%", border:"3px solid "+V.b100,
              borderTopColor:V.brand, margin:"0 auto", animation:"spinA 1s linear infinite" }}/>
          </div>
        ) : orgEvents.length === 0 ? (
          <div style={{ padding:"32px 22px", textAlign:"center", color:V.muted, fontSize:14 }}>
            No events yet.{" "}
            <button className="bg" onClick={() => navigate("/create")} style={{ color:V.brand, fontWeight:600 }}>
              Host your first event →
            </button>
          </div>
        ) : orgEvents.map((ev, i) => {
          const ec        = ev.acceptsOffchainTickets ? (emailCounts[ev.id]||0) : 0;
          const totalSold = ev.soldTickets + ec;
          const pct       = soldPct(totalSold, ev.maxTickets);
          const rev       = (parseFloat(ev.ticketPrice||0)*ev.soldTickets).toFixed(4);
          return (
            <div key={ev.id}
              onClick={() => setAnalyticsEvent(ev)}
              style={{ padding:"16px 22px", borderBottom:i<orgEvents.length-1?"1px solid "+V.borderS:"none",
                display:"flex", gap:14, alignItems:"center", cursor:"pointer",
                transition:"background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background=V.surface}
              onMouseLeave={e => e.currentTarget.style.background="#fff"}>
              <div style={{ width:44, height:44, borderRadius:12,
                background:ev.imageURI?`url(${ev.imageURI}) center/cover`:ev.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, flexShrink:0 }}>
                {!ev.imageURI && ev.emoji}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:14, color:V.text,
                  marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {ev.name}
                </div>
                <div style={{ fontSize:12, color:V.muted, marginBottom:6 }}>
                  {formatDate(ev.startTime)} · {[ev.city,ev.country].filter(Boolean).join(", ")||"Location TBD"}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div className="pb" style={{ height:3, flex:1 }}><div className="pf" style={{ width:pct+"%" }}/></div>
                  <span style={{ fontSize:11, color:V.mutedL, flexShrink:0 }}>{pct}%</span>
                </div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontFamily:"Outfit", fontWeight:800, fontSize:15, color:V.text }}>{rev} OG</div>
                <div style={{ fontSize:12, color:V.muted, marginTop:2, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:4 }}>
                  {totalSold.toLocaleString()} tickets
                  {ec > 0 && (
                    <span style={{ background:"#EDE9FE", color:V.brand, borderRadius:4, padding:"1px 5px", fontSize:10, fontWeight:700, display:"inline-flex", alignItems:"center", gap:2 }}>
                      <Mail size={8}/>{ec}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={15} color={V.mutedL} style={{ flexShrink:0 }}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}