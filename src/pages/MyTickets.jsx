import { useState } from "react";
import { Wallet, RefreshCw, Calendar, MapPin, CheckCircle, Flame, X, AlertCircle } from "lucide-react";
import { V } from "../utils/constants";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import TicketModal from "../components/ticket/TicketModal";
import QRCode from "../components/ui/QRCode";
import { formatDate } from "../utils/format";
import { burnTicketOnChain } from "../utils/contract";

// ── Burn confirmation modal ────────────────────────────────────────────────────
function BurnModal({ ticket, onClose, onBurned }) {
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState("");
  const [done, setDone]   = useState(false);

  const confirm = async () => {
    setBusy(true); setErr("");
    try {
      await burnTicketOnChain(ticket.tokenId);
      setDone(true);
      setTimeout(() => { onBurned(); onClose(); }, 1500);
    } catch (e) {
      setErr(e?.reason || e?.message || "Burn failed.");
    } finally { setBusy(false); }
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(10,10,20,.7)",
        backdropFilter:"blur(12px)", display:"flex", alignItems:"center",
        justifyContent:"center", padding:20 }}>
      <div style={{ width:"100%", maxWidth:360, background:"white", borderRadius:22,
        boxShadow:"0 24px 80px rgba(0,0,0,.22)", padding:28, position:"relative" }}>
        <button onClick={onClose}
          style={{ position:"absolute", top:16, right:16, background:"none", border:"none",
            cursor:"pointer", color:V.muted }}>
          <X size={18}/>
        </button>

        {done ? (
          <div style={{ textAlign:"center", padding:"10px 0" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>🔥</div>
            <div style={{ fontFamily:"Outfit", fontWeight:800, fontSize:18, color:V.text }}>Ticket Burned</div>
            <div style={{ fontSize:13, color:V.muted, marginTop:6 }}>Your ticket has been permanently destroyed.</div>
          </div>
        ) : (
          <>
            <div style={{ width:52, height:52, borderRadius:15, background:"#FEF2F2",
              border:"1px solid #FCA5A5", display:"flex", alignItems:"center",
              justifyContent:"center", marginBottom:16 }}>
              <Flame size={26} color="#EF4444"/>
            </div>
            <div style={{ fontFamily:"Outfit", fontWeight:800, fontSize:18, color:V.text, marginBottom:8 }}>
              Burn this ticket?
            </div>
            <p style={{ fontSize:14, color:V.muted, lineHeight:1.7, marginBottom:6 }}>
              You're about to permanently burn <strong>Token #{ticket.tokenId}</strong> for{" "}
              <strong>{ticket.event?.name}</strong>.
            </p>
            <p style={{ fontSize:13, color:"#EF4444", marginBottom:20, lineHeight:1.6 }}>
              ⚠️ This cannot be undone. The NFT will be destroyed forever.
            </p>

            {err && (
              <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5", borderRadius:10,
                padding:"10px 12px", marginBottom:14, fontSize:13, color:"#DC2626",
                display:"flex", alignItems:"center", gap:8 }}>
                <AlertCircle size={13}/>{err}
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button className="bg" onClick={onClose} style={{ flex:1, justifyContent:"center", padding:12 }}>
                Cancel
              </button>
              <button onClick={confirm} disabled={busy}
                style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                  gap:8, padding:12, background:"#EF4444", color:"white", border:"none",
                  borderRadius:12, fontFamily:"Outfit", fontWeight:700, fontSize:14,
                  cursor:busy?"not-allowed":"pointer", opacity:busy?.7:1 }}>
                {busy ? <><RefreshCw size={14} className="spin"/>Burning…</> : <><Flame size={14}/>Burn Ticket</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Ticket card ────────────────────────────────────────────────────────────────
function TicketCard({ ticket, onOpen, onBurnRequest }) {
  const [hovered, setHovered] = useState(false);
  const ev = ticket.event;
  const now = Date.now() / 1000;
  const eventEnded = ev.endTime && now > ev.endTime;
  const ticketType = ticket.ticketMeta?.ticketType || "Regular";

  // Gradient per ticket type
  const headerGradient = ticketType === "VIP"
    ? "linear-gradient(135deg,#D97706,#92400E)"      // gold
    : ticketType === "Sponsor"
    ? "linear-gradient(135deg,#7C3AED,#2563EB)"      // purple→blue
    : "linear-gradient(135deg,#00C48A,#007050)";     // teal (Regular)

  const perfBg = ticketType === "VIP"
    ? "linear-gradient(135deg,#D97706,#92400E)"
    : ticketType === "Sponsor"
    ? "linear-gradient(135deg,#7C3AED,#2563EB)"
    : "linear-gradient(135deg,#00C48A,#007050)";

  return (
    <div className="ci fu" style={{ animationDelay: "0s", overflow:"hidden", position:"relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(ticket)}>

      {/* Burn button — only visible on hover, only if event has ended */}
      {eventEnded && hovered && (
        <button
          onClick={e => { e.stopPropagation(); onBurnRequest(ticket); }}
          title="Burn this ticket"
          style={{ position:"absolute", top:10, right:10, zIndex:10,
            background:"rgba(239,68,68,.9)", border:"none", borderRadius:8,
            padding:"5px 9px", cursor:"pointer", display:"flex", alignItems:"center",
            gap:5, color:"white", fontSize:11, fontFamily:"Outfit", fontWeight:700,
            backdropFilter:"blur(4px)", transition:"all .15s" }}>
          <Flame size={12}/>Burn
        </button>
      )}

      {/* Header gradient */}
      <div style={{ background:headerGradient, padding:"16px 16px 0",
        display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ background:"rgba(255,255,255,.92)", borderRadius:8, padding:5, flexShrink:0 }}>
          <QRCode data={"MINTY-"+ticket.tokenId} size={52} dark="#1F2937"/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:"Outfit", fontWeight:800, fontSize:14, color:"white",
            lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {ev.name}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,.7)", marginTop:3, display:"flex", alignItems:"center", gap:6 }}>
            Token #{ticket.tokenId}
            <span style={{ background:"rgba(255,255,255,.22)", borderRadius:5,
              padding:"1px 7px", fontFamily:"Outfit", fontWeight:800, fontSize:10,
              color:"white", letterSpacing:".04em" }}>
              {ticketType.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Perforation */}
      <div style={{ background:perfBg, padding:"0 10px",
        display:"flex", alignItems:"center" }}>
        <div style={{ width:12, height:12, borderRadius:"50%", background:"white", flexShrink:0 }}/>
        <div style={{ flex:1, height:0, borderTop:"2px dashed rgba(255,255,255,.35)", margin:"0 3px" }}/>
        <div style={{ width:12, height:12, borderRadius:"50%", background:"white", flexShrink:0 }}/>
      </div>

      {/* Footer */}
      <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:V.muted, marginBottom:3 }}>
            <Calendar size={10}/>{formatDate(ev.startTime)}
          </div>
          {ev.city && (
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:V.muted }}>
              <MapPin size={10}/>{[ev.city, ev.country].filter(Boolean).join(", ")}
            </div>
          )}
        </div>
        {ticket.checkedIn
          ? <span className="bdg bdg-g"><CheckCircle size={9}/>Used</span>
          : <span style={{ fontSize:11, fontFamily:"Outfit", fontWeight:700, color:V.brand,
              background:V.b50, border:"1px solid "+V.b100, borderRadius:8, padding:"5px 10px" }}>
              Tap for QR
            </span>
        }
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MyTicketsPage() {
  const { wallet, connect, connecting } = useWallet();
  const { tickets, loadingTickets, refreshTickets } = useApp();
  const [open,        setOpen]       = useState(null);
  const [burnTarget,  setBurnTarget] = useState(null);

  if (!wallet) return (
    <div style={{ padding:"80px 24px", display:"flex", alignItems:"center", justifyContent:"center", minHeight:"80vh" }}>
      <div style={{ textAlign:"center", maxWidth:380 }}>
        <div style={{ width:70, height:70, borderRadius:20, background:V.b50, border:"1px solid "+V.b100,
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 18px" }}>
          <Wallet size={30} color={V.brand}/>
        </div>
        <h2 style={{ fontFamily:"Outfit", fontWeight:900, fontSize:25, marginBottom:10, color:V.text }}>Your Tickets</h2>
        <p style={{ color:V.muted, marginBottom:24, lineHeight:1.7, fontSize:14 }}>
          Connect your wallet to see your NFT tickets and reveal QR codes.
        </p>
        <button className="bp" onClick={connect} disabled={connecting}
          style={{ borderRadius:14, padding:"13px 28px", fontSize:14, gap:10 }}>
          {connecting ? <><RefreshCw size={14} className="spin"/>Connecting…</> : <><Wallet size={15}/>Connect Wallet</>}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding:"80px 24px 80px", maxWidth:860, margin:"0 auto" }}>
      {open        && <TicketModal ticket={open} onClose={() => setOpen(null)}/>}
      {burnTarget  && (
        <BurnModal
          ticket={burnTarget}
          onClose={() => setBurnTarget(null)}
          onBurned={() => refreshTickets(wallet)}
        />
      )}

      <div className="fu" style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:26 }}>
        <div>
          <h1 style={{ fontFamily:"Outfit", fontWeight:900, fontSize:30, color:V.text, marginBottom:4 }}>My Tickets</h1>
          <p style={{ color:V.muted, fontSize:14 }}>
            {loadingTickets ? "Loading…" : `${tickets.length} ticket${tickets.length!==1?"s":""} in your wallet`}
          </p>
        </div>
        <button className="bg" onClick={() => refreshTickets(wallet)} style={{ gap:6, color:V.muted, fontSize:13 }}>
          <RefreshCw size={13} className={loadingTickets?"spin":""}/>Refresh
        </button>
      </div>

      {loadingTickets ? (
        <div style={{ textAlign:"center", padding:"60px 0" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid "+V.b100,
            borderTopColor:V.brand, margin:"0 auto 14px", animation:"spinA 1s linear infinite" }}/>
          <div style={{ color:V.muted, fontFamily:"Outfit", fontWeight:600 }}>Loading from blockchain…</div>
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 24px", color:V.muted }}>
          <div style={{ fontSize:48, marginBottom:16 }}>🎫</div>
          <div style={{ fontFamily:"Outfit", fontWeight:800, fontSize:20, color:V.text, marginBottom:8 }}>No tickets yet</div>
          <div style={{ fontSize:14, lineHeight:1.7 }}>Buy tickets to events and they'll appear here as NFTs.</div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:20 }}>
          {tickets.map(t => (
            <TicketCard
              key={t.tokenId}
              ticket={t}
              onOpen={setOpen}
              onBurnRequest={setBurnTarget}
            />
          ))}
        </div>
      )}
    </div>
  );
}