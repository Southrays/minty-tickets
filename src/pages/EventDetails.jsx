import { useState, useEffect, useRef } from "react";
import {
  Calendar, MapPin, Users, Shield, Sparkles, Ticket,
  RefreshCw, CheckCircle, Share2, AlertCircle, Mail,
  Wallet, ArrowLeft, Clock, Tag, Globe, ChevronRight, X
} from "lucide-react";
import { V } from "../utils/constants";
import { formatDate, formatTime, soldPct } from "../utils/format";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import { buyTicketOnChain, fetchEvent } from "../utils/contract";
import { useNavigate, useParams } from "react-router-dom";

// ─── Email / Wallet choice modal ────────────────────────────────────────────
function TicketMethodModal({ event, onWallet, onClose, onEmailSent }) {
  const [step,     setStep]     = useState("choose");
  const [email,    setEmail]    = useState("");
  const [name,     setName]     = useState("");
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [emailErr, setEmailErr] = useState("");

  const sendEmail = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr("Please enter a valid email address."); return;
    }
    setSending(true);
    setEmailErr("");
    try {
      const res = await fetch("/api/send-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:          name.trim() || undefined,
          email:         email.trim(),
          eventId:       String(event.id),
          eventName:     event.name,
          eventDate:     event.startTime
            ? new Date(event.startTime * 1000).toLocaleDateString("en-US",
                { weekday:"long", year:"numeric", month:"long", day:"numeric" })
            : undefined,
          eventLocation: [event.venue, event.city, event.country]
            .filter(Boolean).join(", ") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send ticket.");
      setSent(true);
      if (onEmailSent) onEmailSent(); // notify parent to update ticket count
    } catch (err) {
      setEmailErr(err.message || "Failed to send. Please try again.");
    } finally { setSending(false); }
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(10,10,20,.65)",
        backdropFilter:"blur(14px)",display:"flex",alignItems:"center",
        justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400,background:"white",borderRadius:24,
        boxShadow:"0 32px 80px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.06)",overflow:"hidden"}}>

        <div style={{background:`linear-gradient(135deg,${V.brand},#5B21B6)`,
          padding:"22px 24px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:11,fontFamily:"Outfit",fontWeight:700,color:"rgba(255,255,255,.6)",
              letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>
              {event.ticketPrice && event.ticketPrice !== "0" ? "Paid Event" : "Free Event"}
            </div>
            <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:17,color:"white",
              lineHeight:1.2,maxWidth:270}}>{event.name}</div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",
            background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:12}}>
            <X size={14} color="white"/>
          </button>
        </div>

        <div style={{padding:24}}>
          {step === "choose" && (
            <>
              <p style={{fontSize:14,color:V.muted,lineHeight:1.65,marginBottom:20,textAlign:"center"}}>
                How would you like to receive your ticket?
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button onClick={onWallet}
                  style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                    borderRadius:14,border:"1.5px solid "+V.b100,background:V.b50,
                    cursor:"pointer",textAlign:"left",transition:"all .18s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=V.brand;e.currentTarget.style.background="#EDE9FE";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=V.b100;e.currentTarget.style.background=V.b50;}}>
                  <div style={{width:40,height:40,borderRadius:11,background:"white",
                    border:"1px solid "+V.b100,display:"flex",alignItems:"center",
                    justifyContent:"center",flexShrink:0}}>
                    <Wallet size={18} color={V.brand}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:V.text,marginBottom:2}}>
                      Use Wallet (NFT)
                    </div>
                    <div style={{fontSize:12,color:V.muted,lineHeight:1.45}}>
                      Mint a soulbound NFT ticket — verifiable on-chain forever.
                    </div>
                  </div>
                  <ChevronRight size={15} color={V.mutedL}/>
                </button>

                <button onClick={() => setStep("email")}
                  style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                    borderRadius:14,border:"1.5px solid #FDE68A",background:"#FFFBEB",
                    cursor:"pointer",textAlign:"left",transition:"all .18s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#F59E0B";e.currentTarget.style.background="#FEF3C7";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#FDE68A";e.currentTarget.style.background="#FFFBEB";}}>
                  <div style={{width:40,height:40,borderRadius:11,background:"white",
                    border:"1px solid #FDE68A",display:"flex",alignItems:"center",
                    justifyContent:"center",flexShrink:0}}>
                    <Mail size={18} color="#D97706"/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:V.text,marginBottom:2}}>
                      Use Email (No wallet)
                    </div>
                    <div style={{fontSize:12,color:V.muted,lineHeight:1.45}}>
                      Get a confirmation email — no crypto wallet needed.
                    </div>
                  </div>
                  <ChevronRight size={15} color={V.mutedL}/>
                </button>
              </div>
            </>
          )}

          {step === "email" && !sent && (
            <>
              <button onClick={() => { setStep("choose"); setEmailErr(""); }}
                style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:V.muted,
                  background:"none",border:"none",cursor:"pointer",marginBottom:18,padding:0,
                  fontFamily:"Outfit",fontWeight:600}}>
                <ArrowLeft size={13}/> Back
              </button>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontFamily:"Outfit",fontWeight:700,fontSize:13,
                  color:V.text,marginBottom:6}}>Your Name</label>
                <input className="inp" placeholder="e.g. Alex Johnson" value={name}
                  onChange={e => setName(e.target.value)}/>
              </div>
              <div style={{marginBottom:18}}>
                <label style={{display:"block",fontFamily:"Outfit",fontWeight:700,fontSize:13,
                  color:V.text,marginBottom:6}}>Email Address <span style={{color:"#EF4444"}}>*</span></label>
                <input className="inp" type="email" placeholder="you@example.com" value={email}
                  onChange={e => { setEmail(e.target.value); setEmailErr(""); }}/>
                {emailErr && (
                  <div style={{fontSize:12,color:"#EF4444",marginTop:5,display:"flex",alignItems:"center",gap:4}}>
                    <AlertCircle size={11}/>{emailErr}
                  </div>
                )}
              </div>
              <button className="bp" onClick={sendEmail} disabled={sending}
                style={{width:"100%",justifyContent:"center",padding:13,borderRadius:13,
                  fontSize:14,gap:8,background:"linear-gradient(135deg,#D97706,#B45309)",
                  boxShadow:"0 2px 10px rgba(217,119,6,.25)"}}>
                {sending ? <><RefreshCw size={14} className="spin"/>Sending ticket…</> : <><Mail size={14}/>Send My Ticket</>}
              </button>
              <p style={{textAlign:"center",fontSize:11,color:V.mutedL,marginTop:10,lineHeight:1.5}}>
                You'll receive a confirmation email within seconds.
              </p>
            </>
          )}

          {step === "email" && sent && (
            <div style={{textAlign:"center",padding:"8px 0 4px"}}>
              <div style={{width:56,height:56,borderRadius:16,background:"#F0FDF4",
                border:"1px solid #86EFAC",display:"flex",alignItems:"center",
                justifyContent:"center",margin:"0 auto 14px"}}>
                <CheckCircle size={26} color="#16A34A"/>
              </div>
              <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:17,color:V.text,marginBottom:6}}>Ticket Sent!</div>
              <p style={{fontSize:13,color:V.muted,lineHeight:1.65,marginBottom:20}}>
                Check <strong>{email}</strong> — your ticket confirmation is on its way.
              </p>
              <button className="bp" onClick={onClose}
                style={{width:"100%",justifyContent:"center",padding:12}}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Already-has-ticket banner ───────────────────────────────────────────────
function AlreadyHasBanner({ ticket, navigate }) {
  return (
    <div style={{
      background:"linear-gradient(135deg,#0D9488,#0F766E)",
      borderRadius:18,
      padding:"18px 20px",
      display:"flex",
      alignItems:"center",
      gap:16,
      marginBottom:0,
      boxShadow:"0 4px 20px rgba(13,148,136,.25)",
    }}>
      <div style={{width:46,height:46,borderRadius:13,background:"rgba(255,255,255,.18)",
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ticket size={22} color="white"/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:15,color:"white",marginBottom:3}}>
          🎉 You already have a ticket!
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.8)",lineHeight:1.5}}>
          NFT #{String(ticket.tokenId).padStart(4,"0")} is in your wallet
          {ticket.checkedIn ? " · ✓ Checked in" : " · Ready to use"}
        </div>
      </div>
      <button onClick={() => navigate("/tickets")}
        style={{flexShrink:0,background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.3)",
          borderRadius:11,padding:"8px 14px",color:"white",fontSize:12,
          fontFamily:"Outfit",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
        View Ticket
      </button>
    </div>
  );
}

// ─── Purchase card ───────────────────────────────────────────────────────────
function PurchaseCard({ event, totalSold, wallet, connect, connecting, buying, bought, txErr,
  onClaim, onShowModal, navigate, existingTicket }) {

  const free    = !event.ticketPrice || event.ticketPrice === "0";
  const soldOut = totalSold >= event.maxTickets;
  const pct     = soldPct(totalSold, event.maxTickets);

  return (
    <div style={{background:"white",borderRadius:20,
      boxShadow:"0 4px 28px rgba(109,40,217,.12),0 0 0 1px #EDE9FE",
      overflow:"hidden"}}>

      {/* Already-has-ticket ribbon */}
      {existingTicket && !bought && (
        <div style={{background:"linear-gradient(90deg,#0D9488,#0F766E)",
          padding:"10px 18px",display:"flex",alignItems:"center",gap:8}}>
          <CheckCircle size={14} color="white"/>
          <span style={{fontFamily:"Outfit",fontWeight:700,fontSize:12,color:"white"}}>
            You own ticket #{String(existingTicket.tokenId).padStart(4,"0")}
            {existingTicket.checkedIn ? " · Checked in" : ""}
          </span>
        </div>
      )}

      <div style={{padding:24}}>
        {/* Price */}
        <div style={{textAlign:"center",paddingBottom:18,borderBottom:"1px solid "+V.borderS,marginBottom:18}}>
          {free ? (
            <>
              <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:42,color:"#16A34A",letterSpacing:"-.02em"}}>Free</div>
              <div style={{fontSize:12,color:V.muted,marginTop:2}}>No cost to attend</div>
            </>
          ) : (
            <>
              <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:42,color:V.text,letterSpacing:"-.02em"}}>${event.ticketPriceUSD}</div>
              <div style={{fontSize:13,color:V.muted,marginTop:3}}>≈ {event.ticketPrice} OG tokens</div>
            </>
          )}
        </div>

        {/* Availability */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:7}}>
            <span style={{fontFamily:"Outfit",fontWeight:600,color:V.muted}}>{totalSold.toLocaleString()} sold</span>
            <span style={{fontFamily:"Outfit",fontWeight:600,
              color:soldOut?"#EF4444":pct>80?"#F59E0B":V.brand}}>
              {soldOut ? "Sold out" : `${(event.maxTickets - totalSold).toLocaleString()} left`}
            </span>
          </div>
          <div style={{height:6,borderRadius:99,background:V.borderS,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,width:pct+"%",transition:"width .6s",
              background:soldOut?"#EF4444":pct>80?"linear-gradient(90deg,#F59E0B,#EF4444)"
                :`linear-gradient(90deg,${V.brand},#5B21B6)`}}/>
          </div>
        </div>

        {/* CTA */}
        {(bought || existingTicket) ? (
          /* ── User already owns a ticket ── */
          <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:14,
            padding:18,textAlign:"center",marginBottom:14}}>
            <CheckCircle size={28} color="#16A34A" style={{margin:"0 auto 8px"}}/>
            <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:15,color:"#15803D",marginBottom:4}}>
              {bought ? "Ticket Minted!" : "You Have a Ticket!"}
            </div>
            <div style={{fontSize:12,color:"#166534",marginBottom:14}}>
              {bought
                ? "NFT sent to your wallet"
                : `NFT #${String(existingTicket.tokenId).padStart(4,"0")}${existingTicket.checkedIn?" · Already checked in":" · Ready to use"}`}
            </div>
            <button className="bp" onClick={() => navigate("/tickets")}
              style={{width:"100%",justifyContent:"center",padding:11,fontSize:13}}>
              View My Tickets
            </button>
          </div>
        ) : !wallet && !free && !event.acceptsOffchainTickets ? (
          <div style={{marginBottom:14}}>
            <button className="bp" onClick={connect} disabled={connecting}
              style={{width:"100%",justifyContent:"center",padding:13,borderRadius:14,fontSize:14,gap:8,marginBottom:8}}>
              {connecting
                ? <><RefreshCw size={14} className="spin"/>Connecting…</>
                : <><Wallet size={14}/>Connect Wallet to Buy</>}
            </button>
            <p style={{textAlign:"center",fontSize:11,color:V.mutedL}}>MetaMask required to mint NFT ticket</p>
          </div>
        ) : (
          <div style={{marginBottom:14}}>
            <button className="bp" onClick={onClaim} disabled={buying || soldOut}
              style={{width:"100%",justifyContent:"center",padding:14,borderRadius:14,
                fontSize:15,gap:8,
                background: (free || event.acceptsOffchainTickets) ? "linear-gradient(135deg,#16A34A,#15803D)" : undefined,
                boxShadow:  (free || event.acceptsOffchainTickets) ? "0 4px 14px rgba(22,163,74,.3)" : undefined}}>
              {buying
                ? <><RefreshCw size={14} className="spin"/>Minting ticket…</>
                : soldOut ? "Sold Out"
                : (free || event.acceptsOffchainTickets)
                  ? <><Ticket size={15}/>Get Ticket</>
                  : <><Ticket size={15}/>Buy Ticket</>}
            </button>
            {event.acceptsOffchainTickets && (
              <p style={{textAlign:"center",fontSize:11,color:V.muted,marginTop:8,lineHeight:1.5}}>
                Wallet or email — your choice
              </p>
            )}
          </div>
        )}

        {/* Error box — word-wrap safe, never overflows */}
        {txErr && (
          <div style={{
            background:"#FEF2F2",
            border:"1px solid #FCA5A5",
            borderRadius:10,
            padding:"10px 12px",
            marginBottom:14,
            display:"flex",
            alignItems:"flex-start",
            gap:8,
            fontSize:12,
            color:"#DC2626",
            wordBreak:"break-word",
            overflowWrap:"anywhere",
            minWidth:0,
          }}>
            <AlertCircle size={13} style={{flexShrink:0,marginTop:1}}/>
            <span style={{flex:1,minWidth:0,lineHeight:1.6}}>
              {txErr.length > 120 ? txErr.slice(0, 120).trimEnd() + "…" : txErr}
            </span>
          </div>
        )}

        {/* Trust badges */}
        <div style={{borderTop:"1px solid "+V.borderS,paddingTop:14,display:"flex",justifyContent:"center",gap:18}}>
          {[{I:Shield,t:"NFT Verified"},{I:Sparkles,t:"Soulbound"}].map(({I,t}) => (
            <div key={t} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,
              color:V.muted,fontFamily:"Outfit",fontWeight:600}}>
              <I size={11}/>{t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function EventDetailsPage({ onTicketBought }) {
  const { wallet, connect, connecting, requireWallet } = useWallet();
  const { tickets } = useApp();
  const [event,          setEvent]          = useState(null);
  const [buying,         setBuying]         = useState(false);
  const [bought,         setBought]         = useState(false);
  const [txErr,          setTxErr]          = useState("");
  const [showModal,      setShowModal]      = useState(false);
  const [copied,         setCopied]         = useState(false);
  const [isDesktop,      setIsDesktop]      = useState(window.innerWidth >= 768);
  const [emailTicketCount, setEmailTicketCount] = useState(0);
  const heroRef = useRef(null);
  const navigate    = useNavigate();
  const { eventId } = useParams();

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!eventId) return;
    import("../utils/contract").then(m => m.fetchEvent(eventId))
      .then(e => setEvent(e))
      .catch(err => console.error("Failed to fetch event:", err));
  }, [eventId]);

  // Fetch email ticket count for events that accept offchain tickets
  useEffect(() => {
    if (!eventId) return;
    fetch(`/api/ticket-count?eventId=${eventId}`)
      .then(r => r.json())
      .then(d => setEmailTicketCount(d.emailCount || 0))
      .catch(() => {}); // fail silently — bar just shows on-chain count
  }, [eventId]);

  // Parallax
  useEffect(() => {
    const onScroll = () => {
      if (heroRef.current)
        heroRef.current.style.transform = `translateY(${window.scrollY * 0.28}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!event) return (
    <div style={{textAlign:"center",padding:"80px 0"}}>
      <div style={{width:34,height:34,borderRadius:"50%",
        border:`3px solid ${V.b100}`,borderTopColor:V.brand,
        margin:"0 auto 14px",animation:"spinA 1s linear infinite"}}/>
      <div style={{color:V.muted,fontFamily:"Outfit",fontWeight:600,fontSize:14}}>Loading from blockchain…</div>
    </div>
  );

  // Check if user already has a ticket for this event
  const existingTicket = tickets?.find(t =>
    String(t.eventId ?? t.event?.id) === String(event.id)
  ) ?? null;

  const free    = !event.ticketPrice || event.ticketPrice === "0";
  const soldOut = event.soldTickets >= event.maxTickets;
  const loc     = [event.venue, event.city, event.state, event.country].filter(Boolean).join(", ");
  const shareUrl = `${window.location.origin}/event/${event.id}`;
  const copy = () => navigator.clipboard.writeText(shareUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });

  const durMs  = (event.endTime - event.startTime) * 1000;
  const durH   = Math.round(durMs / 36e5 * 10) / 10;
  const durLbl = durH >= 24 ? `${Math.round(durH/24)} day${durH>=48?"s":""}` : `${durH} hr${durH!==1?"s":""}`;

  const handleClaim = async () => {
    // Any event that accepts offchain tickets → always show wallet-vs-email choice
    if (event.acceptsOffchainTickets) { setShowModal(true); return; }
    // Paid event, no offchain option → require wallet and mint directly
    if (!requireWallet("Connect your wallet to get this ticket.")) return;
    await mintTicket();
  };

  const mintTicket = async () => {
    setShowModal(false);
    if (!requireWallet("Connect your wallet to mint this ticket.")) return;
    setBuying(true); setTxErr("");
    try {
      const { buyTicketOnChain } = await import("../utils/contract");
      await buyTicketOnChain(event.id, event.name);
      setBought(true);
      if (onTicketBought) await onTicketBought();
    } catch (err) {
      console.error(err);
      setTxErr(err?.reason || err?.message || "Transaction failed. Please try again.");
    } finally { setBuying(false); }
  };

  const purchaseCardProps = {
    event,
    totalSold: event.soldTickets + emailTicketCount, // on-chain NFTs + email tickets
    wallet, connect, connecting, buying, bought, txErr,
    onClaim: handleClaim,
    onShowModal: () => setShowModal(true),
    navigate,
    existingTicket,
  };

  const statItems = [
    { icon: Clock,  label: "Duration", value: durLbl },
    { icon: Users,  label: "Capacity", value: event.maxTickets.toLocaleString() + " tickets" },
    { icon: Tag,    label: "Price",    value: free ? "Free" : `$${event.ticketPriceUSD}` },
    loc && { icon: Globe, label: "Location", value: event.city || loc },
  ].filter(Boolean);

  return (
    <div style={{paddingTop:62,minHeight:"100vh",background:"#F8F7FF"}}>
      {showModal && (
        <TicketMethodModal
          event={event}
          onWallet={mintTicket}
          onClose={() => setShowModal(false)}
          onEmailSent={() => setEmailTicketCount(c => c + 1)}
        />
      )}

      {/* ── Hero ── */}
      <div style={{height:360,position:"relative",overflow:"hidden"}}>
        <div ref={heroRef} style={{position:"absolute",inset:"-40px -2px",willChange:"transform",
          background: event.imageURI
            ? `url(${event.imageURI}) center/cover no-repeat`
            : event.bg}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.1) 0%,rgba(0,0,0,.6) 100%)"}}/>
        {!event.imageURI && (
          <div style={{position:"absolute",top:"38%",left:"50%",transform:"translate(-50%,-50%)",
            fontSize:76,filter:"drop-shadow(0 8px 32px rgba(0,0,0,.4))",pointerEvents:"none",userSelect:"none"}}>
            {event.emoji}
          </div>
        )}
        <button onClick={() => navigate("/explore")}
          style={{position:"absolute",top:18,left:20,zIndex:10,display:"flex",alignItems:"center",
            gap:6,padding:"8px 14px",borderRadius:30,background:"rgba(255,255,255,.15)",
            backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,.25)",
            color:"white",fontSize:13,cursor:"pointer",fontFamily:"Outfit",fontWeight:600}}>
          <ArrowLeft size={13}/> Back
        </button>
        <button onClick={copy}
          style={{position:"absolute",top:18,right:20,zIndex:10,display:"flex",alignItems:"center",
            gap:6,padding:"8px 14px",borderRadius:30,background:"rgba(255,255,255,.15)",
            backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,.25)",
            color:"white",fontSize:13,cursor:"pointer",fontFamily:"Outfit",fontWeight:600}}>
          {copied ? <><CheckCircle size={13}/>Copied!</> : <><Share2 size={13}/>Share</>}
        </button>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 24px 24px"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            <span style={{background:"rgba(255,255,255,.2)",backdropFilter:"blur(8px)",color:"white",
              padding:"3px 10px",borderRadius:20,fontSize:11,fontFamily:"Outfit",fontWeight:700}}>
              {event.category}
            </span>
            {event.tags && event.tags.slice(0,3).map(t => (
              <span key={t} style={{background:"rgba(255,255,255,.12)",backdropFilter:"blur(8px)",
                color:"rgba(255,255,255,.85)",padding:"3px 10px",borderRadius:20,fontSize:11,
                fontFamily:"Outfit",fontWeight:600}}>{t}</span>
            ))}
          </div>
          <h1 style={{fontFamily:"Outfit",fontWeight:900,fontSize:isDesktop?30:24,color:"white",
            lineHeight:1.1,marginBottom:10,textShadow:"0 2px 16px rgba(0,0,0,.3)"}}>
            {event.name}
          </h1>
          <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center"}}>
            {[
              { icon: Calendar, val: formatDate(event.startTime) },
              { icon: Clock,    val: formatTime(event.startTime) },
              event.venue && { icon: MapPin, val: event.venue },
            ].filter(Boolean).map(({ icon: Icon, val }) => (
              <div key={val} style={{display:"flex",alignItems:"center",gap:5,
                fontSize:13,color:"rgba(255,255,255,.85)"}}>
                <Icon size={12}/><span style={{fontFamily:"DM Sans",fontWeight:500}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{maxWidth:960,margin:"0 auto",padding:"24px 20px 80px"}}>

        {/* ── Already-has-ticket banner (full width, above stats) ── */}
        {existingTicket && !bought && (
          <div style={{marginBottom:18}}>
            <AlreadyHasBanner ticket={existingTicket} navigate={navigate}/>
          </div>
        )}

        {/* ── Stat chips — full-width grid, never squeezed ── */}
        <div style={{
          display:"grid",
          gridTemplateColumns:`repeat(${isDesktop ? 4 : 2}, 1fr)`,
          gap:12,
          marginBottom:22,
        }}>
          {statItems.map(({ icon: Icon, label, value }) => (
            <div key={label} style={{display:"flex",alignItems:"center",gap:12,
              padding:"14px 16px",borderRadius:14,background:"white",
              border:"1px solid "+V.borderS,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <div style={{width:36,height:36,borderRadius:10,background:V.b50,flexShrink:0,
                display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon size={15} color={V.brand}/>
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:10,fontFamily:"Outfit",fontWeight:700,color:V.muted,
                  textTransform:"uppercase",letterSpacing:".07em",marginBottom:2}}>{label}</div>
                <div style={{fontSize:13,fontFamily:"Outfit",fontWeight:700,color:V.text,
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Two-col on desktop, single-col on mobile ── */}
        <div style={{
          display:"grid",
          gridTemplateColumns: isDesktop ? "1fr 300px" : "1fr",
          gap:22,
          alignItems:"start",
        }}>
          {/* LEFT: content */}
          <div style={{display:"flex",flexDirection:"column",gap:18}}>

            {(event.shortDescription || event.fullDescription) && (
              <div style={{background:"white",borderRadius:18,padding:24,
                boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
                <h3 style={{fontFamily:"Outfit",fontWeight:800,fontSize:16,color:V.text,marginBottom:12}}>
                  About this Event
                </h3>
                {event.shortDescription && (
                  <p style={{fontFamily:"DM Sans",fontSize:15,color:V.text2,lineHeight:1.75,
                    marginBottom:event.fullDescription?10:0,fontWeight:500}}>
                    {event.shortDescription}
                  </p>
                )}
                {event.fullDescription && (
                  <p style={{fontSize:14,color:V.muted,lineHeight:1.8}}>{event.fullDescription}</p>
                )}
              </div>
            )}

            <div style={{background:"white",borderRadius:18,padding:24,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
              <h3 style={{fontFamily:"Outfit",fontWeight:800,fontSize:16,color:V.text,marginBottom:18}}>
                Event Details
              </h3>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {[
                  { icon: Calendar, label:"Starts",   value: formatDate(event.startTime)+" · "+formatTime(event.startTime) },
                  { icon: Clock,    label:"Ends",      value: formatDate(event.endTime)  +" · "+formatTime(event.endTime)   },
                  loc && { icon: MapPin, label:"Location", value: loc },
                  { icon: Users, label:"Available",   value: `${(event.maxTickets-event.soldTickets).toLocaleString()} of ${event.maxTickets.toLocaleString()} tickets left` },
                ].filter(Boolean).map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:34,height:34,borderRadius:10,background:V.b50,
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                      <Icon size={14} color={V.brand}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontFamily:"Outfit",fontWeight:700,color:V.muted,
                        textTransform:"uppercase",letterSpacing:".07em"}}>{label}</div>
                      <div style={{fontSize:14,color:V.text2,marginTop:2,fontFamily:"DM Sans"}}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                { icon: Shield,   label:"Soulbound NFT",          bg:"#F5F3FF", color:V.brand   },
                { icon: Sparkles, label:"Fraud-proof",            bg:"#F0FDF4", color:"#16A34A" },
                free && event.acceptsOffchainTickets
                  ? { icon: Mail, label:"Email tickets accepted", bg:"#FFFBEB", color:"#D97706" }
                  : null,
              ].filter(Boolean).map(({ icon: Icon, label, bg, color }) => (
                <div key={label} style={{display:"flex",alignItems:"center",gap:7,
                  padding:"7px 13px",borderRadius:20,background:bg,
                  fontSize:12,color,fontFamily:"Outfit",fontWeight:700}}>
                  <Icon size={12}/>{label}
                </div>
              ))}
            </div>

            {/* Mobile: purchase card lives here, after all content */}
            {!isDesktop && (
              <PurchaseCard {...purchaseCardProps}/>
            )}
          </div>

          {/* RIGHT: sticky purchase card — desktop only */}
          {isDesktop && (
            <div style={{position:"sticky",top:80}}>
              <PurchaseCard {...purchaseCardProps}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}