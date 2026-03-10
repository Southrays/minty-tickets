import { useState, useEffect } from "react";
import { Calendar, MapPin, Users, Shield, Sparkles, Ticket, RefreshCw, CheckCircle, Share2, AlertCircle } from "lucide-react";
import { V, CONTRACT_ADDRESS } from "../utils/constants";
import { formatDate, formatTime, shortAddr, soldPct } from "../utils/format";
import { useWallet } from "../context/WalletContext";
import { buyTicketOnChain, fetchEvent } from "../utils/contract";
import FreeTicketModal from "../components/ticket/FreeTicketModal";
import { useNavigate, useParams } from "react-router-dom";

export default function EventDetailsPage({ onTicketBought }) {
  const { wallet, connect, connecting, requireWallet } = useWallet();
  const [event, setEvent] = useState(null);
  const [buying, setBuying] = useState(false);
  const [bought, setBought] = useState(false);
  const [txErr, setTxErr] = useState("");
  const [showFree, setShowFree] = useState(false);
  const [copied, setCopied] = useState(false);

  const navigate = useNavigate();
  const { eventId } = useParams();

  // Fetch event on-chain
  useEffect(() => {
    if (!eventId) return;

    const fetchOnChain = async () => {
      try {
        const e = await fetchEvent(eventId);
        console.log("Fetched event:", e);
        setEvent(e);
      } catch (err) {
        console.error("Failed to fetch event:", err);
      }
    };

    fetchOnChain();
  }, [eventId]);

  if (!event) return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: `3px solid ${V.b100}`, borderTopColor: V.brand,
        margin: "0 auto 14px", animation: "spinA 1s linear infinite"
      }} />
      <div style={{ color: V.muted, fontFamily: "Outfit", fontWeight: 600 }}>
        Loading from blockchain…
      </div>
    </div>
  );

  const pct = soldPct(event.soldTickets, event.maxTickets);
  const free = event.ticketPriceUSD === "0";
  const loc = [event.venue, event.city, event.state, event.country].filter(Boolean).join(", ");
  const shareUrl = `${window.location.origin}/event/${event.id}`;

  const copy = () => navigator.clipboard.writeText(shareUrl).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });

  const claim = async () => {
    if (free && event.acceptsOffchainTickets) { setShowFree(true); return; }
    if (!requireWallet("Connect your wallet to buy this ticket as an NFT.")) return;

    setBuying(true); setTxErr("");
    try {
      await buyTicketOnChain(event.id, event.name);
      setBought(true);
      if (onTicketBought) await onTicketBought();
    } catch (err) {
      console.error(err);
      setTxErr(err?.reason || err?.message || "Transaction failed. Please try again.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div style={{ padding: "72px 24px 80px", maxWidth: 900, margin: "0 auto" }}>
      {showFree && <FreeTicketModal event={event} onClose={() => setShowFree(false)} />}

      <button
        className="bg"
        onClick={() => navigate("/explore")}
        style={{ marginBottom: 22, color: V.muted, gap: 5, fontSize: 13 }}
      >
        ← Back to Explore
      </button>

      {/* Hero banner */}
      <div style={{
        height: 270, borderRadius: 24, background: event.bg,
        marginBottom: 26, display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden"
      }}>
        <span style={{ fontSize: 72, filter: "drop-shadow(0 8px 24px rgba(0,0,0,.4))" }}>{event.emoji}</span>
        <div style={{ position: "absolute", bottom: 24, left: 26 }}>
          {event.tags && event.tags.length > 0 && (
            <div style={{ display: "flex", gap: 7, marginBottom: 9 }}>
              {event.tags.map(t => (
                <span key={t} style={{
                  background: "rgba(255,255,255,.15)",
                  color: "white",
                  backdropFilter: "blur(8px)",
                  padding: "2px 6px",
                  borderRadius: 6,
                  fontSize: 11
                }}>{t}</span>
              ))}
            </div>
          )}
          <span style={{
            background: "rgba(255,255,255,.15)",
            color: "white",
            backdropFilter: "blur(8px)",
            marginBottom: 8,
            display: "inline-flex",
            padding: "2px 6px",
            borderRadius: 6,
            fontSize: 11
          }}>{event.category}</span>
          <h1 style={{
            fontFamily: "Outfit", fontWeight: 900, fontSize: 28,
            color: "white", lineHeight: 1.1, marginTop: 6
          }}>{event.name}</h1>
        </div>
        <button
          onClick={copy}
          style={{
            position: "absolute", top: 16, right: 16,
            borderRadius: 12, padding: "7px 13px", gap: 6, fontSize: 13,
            background: "rgba(255,255,255,.18)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,.3)",
            color: "white",
            display: "flex",
            alignItems: "center"
          }}
        >
          {copied ? <><CheckCircle size={13} />Copied!</> : <><Share2 size={13} />Share</>}
        </button>
      </div>

      {/* Responsive grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: window.innerWidth >= 768 ? "1fr 305px" : "1fr",
        gap: 22,
        alignItems: "start"
      }}>
        {/* Left */}
        <div className="fu2">
          {(event.shortDescription || event.fullDescription) && (
            <div style={{ padding: 24, marginBottom: 18, borderRadius: 18, background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
              <h3 style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 16, color: V.text, marginBottom: 10 }}>About this event</h3>
              {event.shortDescription && <p style={{
                fontFamily: "DM Sans", fontWeight: 500, fontSize: 15, color: V.text2,
                marginBottom: event.fullDescription ? 10 : 0, lineHeight: 1.7
              }}>{event.shortDescription}</p>}
              {event.fullDescription && <p style={{ color: V.muted, lineHeight: 1.75, fontSize: 14 }}>{event.fullDescription}</p>}
            </div>
          )}
          <div style={{ padding: 24, borderRadius: 18, background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.05)" }}>
            <h3 style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 16, color: V.text, marginBottom: 16 }}>Event Details</h3>
            {[
              { I: Calendar, l: "Date", v: formatDate(event.startTime) + " · " + formatTime(event.startTime) + " — " + formatTime(event.endTime) },
              loc && { I: MapPin, l: "Location", v: loc },
              { I: Users, l: "Capacity", v: event.maxTickets.toLocaleString() + " tickets" },
              { I: Shield, l: "Contract", v: shortAddr(CONTRACT_ADDRESS) },
            ].filter(Boolean).map(({ I, l, v }) => (
              <div key={l} style={{ display: "flex", gap: 13, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: V.b50,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <I size={15} color={V.brand} />
                </div>
                <div>
                  <div style={{
                    fontSize: 11, color: V.muted, fontFamily: "Outfit", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: ".07em"
                  }}>{l}</div>
                  <div style={{ fontSize: 14, color: V.text2, marginTop: 2 }}>{v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — purchase card */}
        <div style={{
          padding: 24,
          borderRadius: 18,
          background: "#fff",
          boxShadow: "0 4px 20px rgba(109,40,217,.10)",
          borderColor: "#DDD6FE",
          position: window.innerWidth >= 768 ? "sticky" : "static",
          top: window.innerWidth >= 768 ? 72 : "auto"
        }}>
          {/* ...purchase card content remains the same as your original... */}
        {/* Right — purchase card */}
        <div className="fu3 card" style={{padding:24,position:"sticky",top:72,boxShadow:"0 4px 20px rgba(109,40,217,.10)",borderColor:"#DDD6FE"}}>
          <div style={{textAlign:"center",marginBottom:18}}>
            {free
              ? <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:36,color:"#16A34A"}}>Free</div>
              : <>
                  <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:36,color:V.text}}>${event.ticketPriceUSD}</div>
                  <div style={{fontSize:13,color:V.muted,marginTop:3}}>≈ {event.ticketPrice} OG tokens</div>
                </>
            }
          </div>

          {/* Progress */}
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:V.muted,marginBottom:5}}>
              <span>{event.soldTickets.toLocaleString()} sold</span>
              <span>{(event.maxTickets-event.soldTickets).toLocaleString()} remaining</span>
            </div>
            <div className="pb" style={{height:5}}><div className="pf" style={{width:pct+"%"}}/></div>
          </div>

          {bought ? (
            <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:12,padding:18,textAlign:"center"}}>
              <CheckCircle size={28} color="#16A34A" style={{margin:"0 auto 8px"}}/>
              <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:15,color:"#15803D"}}>Ticket Minted!</div>
              <div style={{fontSize:12,color:"#166534",marginTop:4,marginBottom:12}}>NFT sent to your wallet</div>
              <button className="bp" onClick={() => navigate("/tickets")} style={{width:"100%",justifyContent:"center",padding:10,fontSize:13}}>View My Tickets</button>
            </div>
          ) : !wallet ? (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <button className="bp" onClick={connect} disabled={connecting} style={{width:"100%",justifyContent:"center",padding:13,borderRadius:14,fontSize:14,gap:8}}>
                {connecting ? <><RefreshCw size={14} className="spin"/>Connecting…</> : <>Connect Wallet to Buy</>}
              </button>
              <p style={{textAlign:"center",fontSize:12,color:V.mutedL}}>Wallet required to mint NFT ticket</p>
            </div>
          ) : (
            <button className="bp" onClick={claim} disabled={buying||event.soldTickets>=event.maxTickets}
              style={{width:"100%",justifyContent:"center",padding:13,borderRadius:14,fontSize:14}}>
              {buying
                ? <><RefreshCw size={14} className="spin"/>Minting…</>
                : event.soldTickets>=event.maxTickets
                  ? "Sold Out"
                  : <><Ticket size={14}/>{free?"Claim Free Ticket":"Buy Ticket"}</>
              }
            </button>
          )}

          {txErr && (
            <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:10,padding:"10px 12px",marginTop:12,fontSize:12,color:"#DC2626",display:"flex",gap:7}}>
              <AlertCircle size={13} style={{flexShrink:0,marginTop:1}}/>{txErr}
            </div>
          )}

          <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:14}}>
            {[{I:Shield,t:"NFT Verified"},{I:Sparkles,t:"Soulbound"}].map(({I,t}) => (
              <div key={t} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:V.muted}}>
                <I size={11}/>{t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}