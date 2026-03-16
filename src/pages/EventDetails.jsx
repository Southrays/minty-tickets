import { useState, useEffect, useRef } from "react";
import {
  Calendar, MapPin, Users, Shield, Sparkles, Ticket,
  RefreshCw, CheckCircle, Share2, AlertCircle, Mail,
  Wallet, ArrowLeft, Clock, Tag, Globe, ChevronRight, X,
} from "lucide-react";
import { V } from "../utils/constants";
import { formatDate, formatTime, soldPct } from "../utils/format";
import { useWallet } from "../context/WalletContext";
import { useApp } from "../context/AppContext";
import { useNavigate, useParams } from "react-router-dom";

// ── Helpers ──────────────────────────────────────────────────────────────────
function calendarDays(startTs, endTs) {
  const s = new Date(startTs * 1000); s.setHours(0,0,0,0);
  const e = new Date(endTs   * 1000); e.setHours(0,0,0,0);
  return Math.round((e - s) / 86400000) + 1;
}

// ── Guest data form step ──────────────────────────────────────────────────────
function GuestDataForm({ event, identifier, onSubmit, onBack }) {
  const rf = event.requiredFields || {};
  const [fields, setFields] = useState({
    email:"", name:"", phone:"", location:"", answer:""
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setFields(f => ({...f, [k]:v}));

  const submit = async () => {
    if (rf.email && !fields.email.trim())   { setErr("Email address is required."); return; }
    if (rf.name  && !fields.name.trim())    { setErr("Full name is required."); return; }
    if (rf.phone && !fields.phone.trim())   { setErr("Phone number is required."); return; }
    setBusy(true); setErr("");
    try {
      const payload = {};
      if (rf.email)          payload.email    = fields.email.trim();
      if (rf.name)           payload.name     = fields.name.trim();
      if (rf.phone)          payload.phone    = fields.phone.trim();
      if (rf.location)       payload.location = fields.location.trim();
      if (rf.customQuestion) payload.answer   = fields.answer.trim();

      await fetch("/api/submit-registration", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          eventId: String(event.id),
          identifier: identifier || "anonymous",
          fields: payload,
        }),
      });
      onSubmit(payload);
    } catch { onSubmit({}); } // non-fatal — proceed even if storage fails
    finally { setBusy(false); }
  };

  const inputs = [
    rf.email          && { key:"email",    label:"Email Address",      type:"email",  req:true  },
    rf.name           && { key:"name",     label:"Full Name",          type:"text",   req:true  },
    rf.phone          && { key:"phone",    label:"Phone Number",       type:"tel",    req:false },
    rf.location       && { key:"location", label:"City / Location",    type:"text",   req:false },
    rf.customQuestion && { key:"answer",   label:rf.customQuestion,    type:"text",   req:false },
  ].filter(Boolean);

  return (
    <>
      <button onClick={onBack}
        style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:V.muted,
          background:"none",border:"none",cursor:"pointer",marginBottom:18,padding:0,
          fontFamily:"Outfit",fontWeight:600}}>
        <ArrowLeft size={13}/> Back
      </button>
      <div style={{marginBottom:16}}>
        <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:15,color:V.text,marginBottom:4}}>
          📋 Organiser requested details
        </div>
        <div style={{fontSize:13,color:V.muted,lineHeight:1.6}}>
          Please fill in the information below to complete your registration.
        </div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:18}}>
        {inputs.map(({key,label,type,req}) => (
          <div key={key}>
            <label style={{display:"block",fontFamily:"Outfit",fontWeight:700,fontSize:13,
              color:V.text,marginBottom:6}}>
              {label}{req && <span style={{color:"#EF4444",marginLeft:3}}>*</span>}
            </label>
            <input className="inp" type={type} placeholder={label}
              value={fields[key]} onChange={e => set(key, e.target.value)}/>
          </div>
        ))}
      </div>
      {err && (
        <div style={{fontSize:12,color:"#EF4444",marginBottom:12,display:"flex",alignItems:"center",gap:4}}>
          <AlertCircle size={11}/>{err}
        </div>
      )}
      <button className="bp" onClick={submit} disabled={busy}
        style={{width:"100%",justifyContent:"center",padding:13,borderRadius:13,fontSize:14}}>
        {busy ? <><RefreshCw size={14} className="spin"/>Saving…</> : <>Continue →</>}
      </button>
    </>
  );
}

// ── Full ticket acquisition modal ─────────────────────────────────────────────
// Steps: typeSelect → guestData (if needed) → choose (if free+offchain) → email → sent
function TicketModal({ event, onWallet, onClose, onEmailSent }) {
  const hasMultipleTypes    = event.ticketTypes && event.ticketTypes.filter(t=>t.enabled!==false).length > 1;
  const enabledTypes        = hasMultipleTypes ? event.ticketTypes.filter(t=>t.enabled!==false) : null;
  const hasGuestData        = event.requiredFields &&
    Object.entries(event.requiredFields).some(([k,v]) => k!=="customQuestion" && v === true);
  const acceptsEmail        = event.acceptsOffchainTickets === true;

  // Determine first step:
  // - multiple types → typeSelect
  // - guest data required → guestData
  // - free event that accepts email → choose (wallet or email)
  // - everything else → go straight to wallet (no modal needed, handled by handleClaim)
  const isFreeEvent  = !event.ticketPrice || event.ticketPrice === "0";
  const firstStep    = hasMultipleTypes ? "typeSelect"
    : hasGuestData                      ? "guestData"
    : (isFreeEvent && acceptsEmail)     ? "choose"
    : "wallet"; // paid event or no email → skip directly

  const [step,       setStep]      = useState(firstStep);
  const [selType,    setSelType]   = useState(enabledTypes?.[0] || null);
  const [guestData,  setGuestData] = useState(null);
  const [email,      setEmail]     = useState("");
  const [sending,    setSending]   = useState(false);
  const [sent,       setSent]      = useState(false);
  const [emailErr,   setEmailErr]  = useState("");

  // If no modal needed (paid, no email, no guest data, no multi-type) → fire wallet immediately
  useEffect(() => {
    if (firstStep === "wallet") { onWallet(null, null); onClose(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isFreeType = !selType?.price || selType?.price === "0";

  const afterTypeSelect = () => {
    if (hasGuestData) setStep("guestData");
    else if (isFreeType && acceptsEmail) setStep("choose");
    else { onWallet(selType?.name); onClose(); }
  };

  const afterGuestData = (data) => {
    setGuestData(data);
    if (isFreeType && acceptsEmail) setStep("choose");
    else { onWallet(selType?.name, data); onClose(); }
  };

  const sendEmail = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr("Please enter a valid email address."); return;
    }
    setSending(true); setEmailErr("");
    try {
      const res = await fetch("/api/send-ticket", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          name:           guestData?.name || undefined,
          email:          email.trim(),
          eventId:        String(event.id),
          eventName:      event.name,
          ticketType:     selType?.name || "Regular",
          organizerEmail: event.organizerEmail || undefined,
          guestFields:    guestData || undefined,
          eventDate:     event.startTime
            ? new Date(event.startTime*1000).toLocaleDateString("en-US",
                {weekday:"long",year:"numeric",month:"long",day:"numeric"})
            : undefined,
          eventLocation: [event.venue,event.city,event.country].filter(Boolean).join(", ")||undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send ticket.");
      setSent(true);
      if (onEmailSent) onEmailSent();
    } catch(err) {
      setEmailErr(err.message || "Failed to send. Please try again.");
    } finally { setSending(false); }
  };

  const gradientHeader = (() => {
    if (selType?.name === "VIP")     return "linear-gradient(135deg,#D97706,#92400E)";
    if (selType?.name === "Sponsor") return "linear-gradient(135deg,#7C3AED,#2563EB)";
    return `linear-gradient(135deg,${V.brand},#5B21B6)`;
  })();

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(10,10,20,.65)",
        backdropFilter:"blur(14px)",display:"flex",alignItems:"center",
        justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400,background:"white",borderRadius:24,
        boxShadow:"0 32px 80px rgba(0,0,0,.18)",overflow:"hidden"}}>

        {/* Header */}
        <div style={{background:gradientHeader,padding:"22px 24px 20px",
          display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:11,fontFamily:"Outfit",fontWeight:700,
              color:"rgba(255,255,255,.65)",letterSpacing:".1em",
              textTransform:"uppercase",marginBottom:4}}>
              {selType?.name ? `${selType.name} Ticket` : "Get Ticket"}
            </div>
            <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:17,
              color:"white",lineHeight:1.2,maxWidth:270}}>{event.name}</div>
          </div>
          <button onClick={onClose} style={{width:32,height:32,borderRadius:"50%",
            background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginLeft:12}}>
            <X size={14} color="white"/>
          </button>
        </div>

        <div style={{padding:24}}>

          {/* ── Step: Type selector ── */}
          {step === "typeSelect" && (
            <>
              <p style={{fontSize:14,color:V.muted,lineHeight:1.65,marginBottom:18,textAlign:"center"}}>
                Choose your ticket type
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:4}}>
                {enabledTypes.map(tt => {
                  const isFree = !tt.price || tt.price === "0";
                  const isSelected = selType?.name === tt.name;
                  const accent = tt.name==="VIP"?"#D97706":tt.name==="Sponsor"?V.brand:V.brand;
                  const accentBg = tt.name==="VIP"?"#FFFBEB":tt.name==="Sponsor"?V.b50:V.b50;
                  const accentBorder = tt.name==="VIP"?"#FDE68A":tt.name==="Sponsor"?V.b100:V.b100;
                  return (
                    <button key={tt.name} onClick={() => setSelType(tt)}
                      style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                        borderRadius:14,border:`1.5px solid ${isSelected?accent:accentBorder}`,
                        background:isSelected?accentBg:"white",
                        cursor:"pointer",textAlign:"left",transition:"all .18s",width:"100%"}}>
                      <div style={{width:40,height:40,borderRadius:11,
                        background:isSelected?accentBg:"white",
                        border:`1px solid ${accentBorder}`,
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Ticket size={18} color={accent}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,
                          color:V.text,marginBottom:2}}>{tt.name}</div>
                        <div style={{fontSize:12,color:V.muted}}>
                          {isFree ? "Free" : `${tt.price} OG`}
                        </div>
                      </div>
                      {isSelected && <CheckCircle size={16} color={accent}/>}
                    </button>
                  );
                })}
              </div>
              <button className="bp" onClick={afterTypeSelect}
                style={{width:"100%",justifyContent:"center",padding:13,
                  borderRadius:13,fontSize:14,marginTop:14,
                  background: selType?.name==="VIP"
                    ?"linear-gradient(135deg,#D97706,#92400E)"
                    :selType?.name==="Sponsor"
                    ?"linear-gradient(135deg,#7C3AED,#2563EB)"
                    :undefined}}>
                Continue with {selType?.name || "ticket"} →
              </button>
            </>
          )}

          {/* ── Step: Guest data ── */}
          {step === "guestData" && (
            <GuestDataForm
              event={event}
              identifier={email || "wallet-user"}
              onSubmit={afterGuestData}
              onBack={() => setStep(hasMultipleTypes?"typeSelect":"choose")}
            />
          )}

          {/* ── Step: Choose wallet/email ── */}
          {step === "choose" && (
            <>
              <p style={{fontSize:14,color:V.muted,lineHeight:1.65,marginBottom:20,textAlign:"center"}}>
                How would you like to receive your ticket?
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button onClick={() => { onWallet(selType?.name, guestData); onClose(); }}
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
                    <div style={{fontSize:12,color:V.muted}}>Mint a soulbound NFT — verifiable on-chain.</div>
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
                    <div style={{fontSize:12,color:V.muted}}>Get a confirmation email — no crypto needed.</div>
                  </div>
                  <ChevronRight size={15} color={V.mutedL}/>
                </button>
              </div>
            </>
          )}

          {/* ── Step: Email form ── */}
          {step === "email" && !sent && (
            <>
              <button onClick={() => { setStep("choose"); setEmailErr(""); }}
                style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:V.muted,
                  background:"none",border:"none",cursor:"pointer",marginBottom:18,padding:0,
                  fontFamily:"Outfit",fontWeight:600}}>
                <ArrowLeft size={13}/> Back
              </button>
              {/* If guest data hasn't been collected yet (no requiredFields), show name here */}
              {!hasGuestData && (
                <div style={{marginBottom:14}}>
                  <label style={{display:"block",fontFamily:"Outfit",fontWeight:700,fontSize:13,
                    color:V.text,marginBottom:6}}>Your Name</label>
                  <input className="inp" placeholder="e.g. Alex Johnson"
                    value={guestData?.name||""}
                    onChange={e => setGuestData(d=>({...d,name:e.target.value}))}/>
                </div>
              )}
              <div style={{marginBottom:18}}>
                <label style={{display:"block",fontFamily:"Outfit",fontWeight:700,fontSize:13,
                  color:V.text,marginBottom:6}}>
                  Email Address <span style={{color:"#EF4444"}}>*</span>
                </label>
                <input className="inp" type="email" placeholder="you@example.com"
                  value={email} onChange={e=>{setEmail(e.target.value);setEmailErr("");}}/>
                {emailErr && (
                  <div style={{fontSize:12,color:"#EF4444",marginTop:5,display:"flex",alignItems:"center",gap:4}}>
                    <AlertCircle size={11}/>{emailErr}
                  </div>
                )}
              </div>
              <button className="bp" onClick={sendEmail} disabled={sending}
                style={{width:"100%",justifyContent:"center",padding:13,borderRadius:13,fontSize:14,gap:8,
                  background:"linear-gradient(135deg,#D97706,#B45309)",
                  boxShadow:"0 2px 10px rgba(217,119,6,.25)"}}>
                {sending?<><RefreshCw size={14} className="spin"/>Sending…</>:<><Mail size={14}/>Send My Ticket</>}
              </button>
            </>
          )}

          {/* ── Step: Sent ── */}
          {step === "email" && sent && (
            <div style={{textAlign:"center",padding:"8px 0 4px"}}>
              <div style={{width:56,height:56,borderRadius:16,background:"#F0FDF4",
                border:"1px solid #86EFAC",display:"flex",alignItems:"center",
                justifyContent:"center",margin:"0 auto 14px"}}>
                <CheckCircle size={26} color="#16A34A"/>
              </div>
              <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:17,color:V.text,marginBottom:6}}>Ticket Sent!</div>
              <p style={{fontSize:13,color:V.muted,lineHeight:1.65,marginBottom:20}}>
                Check <strong>{email}</strong> — your ticket is on its way.
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
  const type = ticket?.ticketMeta?.ticketType || "Regular";
  const bg = type==="VIP"
    ? "linear-gradient(135deg,#D97706,#92400E)"
    : type==="Sponsor"
    ? "linear-gradient(135deg,#7C3AED,#2563EB)"
    : "linear-gradient(135deg,#0D9488,#0F766E)";
  return (
    <div style={{background:bg,borderRadius:18,padding:"18px 20px",display:"flex",
      alignItems:"center",gap:16,boxShadow:"0 4px 20px rgba(13,148,136,.25)"}}>
      <div style={{width:46,height:46,borderRadius:13,background:"rgba(255,255,255,.18)",
        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Ticket size={22} color="white"/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:15,color:"white",marginBottom:3}}>
          🎉 You already have a ticket!
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,.8)",lineHeight:1.5}}>
          {type !== "Regular" && `${type} · `}NFT #{String(ticket.tokenId).padStart(4,"0")}
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
function PurchaseCard({ event, totalSold, wallet, connect, connecting, buying, bought,
  txErr, onClaim, navigate, existingTicket }) {

  const hasMultipleTypes = event.ticketTypes && event.ticketTypes.filter(t=>t.enabled!==false).length > 1;
  const enabledTypes     = hasMultipleTypes ? event.ticketTypes.filter(t=>t.enabled!==false) : null;
  const allFree          = !event.ticketPrice || event.ticketPrice === "0";
  const soldOut          = totalSold >= event.maxTickets;
  const pct              = soldPct(totalSold, event.maxTickets);

  return (
    <div style={{background:"white",borderRadius:20,
      boxShadow:"0 4px 28px rgba(109,40,217,.12),0 0 0 1px #EDE9FE",overflow:"hidden"}}>

      {existingTicket && !bought && (
        <div style={{background:"linear-gradient(90deg,#0D9488,#0F766E)",
          padding:"10px 18px",display:"flex",alignItems:"center",gap:8}}>
          <CheckCircle size={14} color="white"/>
          <span style={{fontFamily:"Outfit",fontWeight:700,fontSize:12,color:"white"}}>
            You own ticket #{String(existingTicket.tokenId).padStart(4,"0")}
            {existingTicket.checkedIn?" · Checked in":""}
          </span>
        </div>
      )}

      <div style={{padding:24}}>
        {/* Price block */}
        <div style={{paddingBottom:18,borderBottom:"1px solid "+V.borderS,marginBottom:18}}>
          {hasMultipleTypes ? (
            <div>
              <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:12,color:V.muted,
                textTransform:"uppercase",letterSpacing:".08em",marginBottom:10}}>
                Available Ticket Tiers
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {enabledTypes.map(tt => {
                  const isFreeType = !tt.price || tt.price === "0";
                  const isVIP = tt.name === "VIP";
                  const isSponsor = tt.name === "Sponsor";
                  const accent = isVIP ? "#D97706" : isSponsor ? V.brand : "#16A34A";
                  const accentBg = isVIP ? "#FFFBEB" : isSponsor ? V.b50 : "#F0FDF4";
                  const accentBorder = isVIP ? "#FDE68A" : isSponsor ? V.b100 : "#BBF7D0";
                  return (
                    <div key={tt.name} style={{display:"flex",alignItems:"center",gap:12,
                      background:accentBg,borderRadius:12,padding:"11px 14px",
                      border:`1.5px solid ${accentBorder}`}}>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:14,color:V.text}}>{tt.name}</div>
                        {isVIP && <div style={{fontSize:11,color:"#92400E",fontWeight:500}}>Premium access</div>}
                        {isSponsor && <div style={{fontSize:11,color:"#5B21B6",fontWeight:500}}>Top-tier sponsor</div>}
                        {!isVIP && !isSponsor && <div style={{fontSize:11,color:"#166534",fontWeight:500}}>General admission</div>}
                      </div>
                      <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:16,
                        color:isFreeType?"#16A34A":accent,textAlign:"right"}}>
                        {isFreeType ? "Free" : `${tt.price} OG`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : allFree ? (
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:42,color:"#16A34A",letterSpacing:"-.02em"}}>Free</div>
              <div style={{fontSize:12,color:V.muted,marginTop:2}}>No cost to attend</div>
            </div>
          ) : (
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:42,color:V.text,letterSpacing:"-.02em"}}>${event.ticketPriceUSD}</div>
              <div style={{fontSize:13,color:V.muted,marginTop:3}}>≈ {event.ticketPrice} OG tokens</div>
            </div>
          )}
        </div>

        {/* Availability */}
        <div style={{marginBottom:20}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:7}}>
            <span style={{fontFamily:"Outfit",fontWeight:600,color:V.muted}}>{totalSold.toLocaleString()} sold</span>
            <span style={{fontFamily:"Outfit",fontWeight:600,
              color:soldOut?"#EF4444":pct>80?"#F59E0B":V.brand}}>
              {soldOut?"Sold out":`${(event.maxTickets-totalSold).toLocaleString()} left`}
            </span>
          </div>
          <div style={{height:6,borderRadius:99,background:V.borderS,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:99,width:pct+"%",transition:"width .6s",
              background:soldOut?"#EF4444":pct>80
                ?"linear-gradient(90deg,#F59E0B,#EF4444)"
                :`linear-gradient(90deg,${V.brand},#5B21B6)`}}/>
          </div>
        </div>

        {/* CTA */}
        {(bought||existingTicket) ? (
          <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:14,
            padding:18,textAlign:"center",marginBottom:14}}>
            <CheckCircle size={28} color="#16A34A" style={{margin:"0 auto 8px"}}/>
            <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:15,color:"#15803D",marginBottom:4}}>
              {bought?"Ticket Minted!":"You Have a Ticket!"}
            </div>
            <div style={{fontSize:12,color:"#166534",marginBottom:14}}>
              {bought?"NFT sent to your wallet"
                :`NFT #${String(existingTicket.tokenId).padStart(4,"0")}${existingTicket.checkedIn?" · Already checked in":" · Ready to use"}`}
            </div>
            <button className="bp" onClick={() => navigate("/tickets")}
              style={{width:"100%",justifyContent:"center",padding:11,fontSize:13}}>
              View My Tickets
            </button>
          </div>
        ) : !wallet && !allFree && !event.acceptsOffchainTickets ? (
          <div style={{marginBottom:14}}>
            <button className="bp" onClick={connect} disabled={connecting}
              style={{width:"100%",justifyContent:"center",padding:13,borderRadius:14,fontSize:14,gap:8,marginBottom:8}}>
              {connecting?<><RefreshCw size={14} className="spin"/>Connecting…</>:<><Wallet size={14}/>Connect Wallet to Buy</>}
            </button>
            <p style={{textAlign:"center",fontSize:11,color:V.mutedL}}>MetaMask required to mint NFT ticket</p>
          </div>
        ) : (
          <div style={{marginBottom:14}}>
            <button className="bp" onClick={onClaim} disabled={buying||soldOut}
              style={{width:"100%",justifyContent:"center",padding:14,borderRadius:14,fontSize:15,gap:8,
                background:(allFree||event.acceptsOffchainTickets)?"linear-gradient(135deg,#16A34A,#15803D)":undefined,
                boxShadow:(allFree||event.acceptsOffchainTickets)?"0 4px 14px rgba(22,163,74,.3)":undefined}}>
              {buying?<><RefreshCw size={14} className="spin"/>Minting…</>
               :soldOut?"Sold Out"
               :(allFree||event.acceptsOffchainTickets)
                 ?<><Ticket size={15}/>Get Ticket</>
                 :<><Ticket size={15}/>Buy Ticket</>}
            </button>
            {event.acceptsOffchainTickets && !allFree===false && (
              <p style={{textAlign:"center",fontSize:11,color:V.muted,marginTop:8}}>
                Wallet or email — your choice
              </p>
            )}
          </div>
        )}

        {txErr && (
          <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:10,
            padding:"10px 12px",marginBottom:14,display:"flex",alignItems:"flex-start",
            gap:8,fontSize:12,color:"#DC2626",wordBreak:"break-word",overflowWrap:"anywhere"}}>
            <AlertCircle size={13} style={{flexShrink:0,marginTop:1}}/>
            <span style={{flex:1}}>{txErr.length>120?txErr.slice(0,120)+"…":txErr}</span>
          </div>
        )}

        <div style={{borderTop:"1px solid "+V.borderS,paddingTop:14,display:"flex",justifyContent:"center",gap:18}}>
          {[{I:Shield,t:"NFT Verified"},{I:Sparkles,t:"Soulbound"}].map(({I,t})=>(
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
  const [event,            setEvent]           = useState(null);
  const [buying,           setBuying]          = useState(false);
  const [bought,           setBought]          = useState(false);
  const [txErr,            setTxErr]           = useState("");
  const [showModal,        setShowModal]       = useState(false);
  const [copied,           setCopied]          = useState(false);
  const [isDesktop,        setIsDesktop]       = useState(window.innerWidth >= 768);
  const [emailTicketCount, setEmailTicketCount]= useState(0);
  const heroRef  = useRef(null);
  const navigate = useNavigate();
  const { eventId } = useParams();

  useEffect(() => {
    const h = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    if (!eventId) return;
    import("../utils/contract").then(m => m.fetchEvent(eventId))
      .then(e => setEvent(e))
      .catch(err => console.error("Failed to fetch event:", err));
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !event) return;
    if (!event.acceptsOffchainTickets) { setEmailTicketCount(0); return; }
    fetch(`/api/ticket-count?eventId=${eventId}`)
      .then(r => r.json())
      .then(d => setEmailTicketCount(d.emailCount || 0))
      .catch(() => {});
  }, [eventId, event]);

  useEffect(() => {
    const h = () => { if (heroRef.current) heroRef.current.style.transform = `translateY(${window.scrollY*.28}px)`; };
    window.addEventListener("scroll", h, {passive:true});
    return () => window.removeEventListener("scroll", h);
  }, []);

  if (!event) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",minHeight:"80vh"}}>
      <div style={{width:34,height:34,borderRadius:"50%",border:`3px solid ${V.b100}`,
        borderTopColor:V.brand,marginBottom:14,animation:"spinA 1s linear infinite"}}/>
      <div style={{color:V.muted,fontFamily:"Outfit",fontWeight:600,fontSize:14}}>Loading from blockchain…</div>
    </div>
  );

  const existingTicket = tickets?.find(t =>
    String(t.eventId ?? t.event?.id) === String(event.id)) ?? null;

  const allFree  = !event.ticketPrice || event.ticketPrice === "0";
  const loc      = [event.venue, event.city, event.state, event.country].filter(Boolean).join(", ");
  const shareUrl = `${window.location.origin}/event/${event.slug || event.id}`;
  const copy = () => navigator.clipboard.writeText(shareUrl)
    .then(() => { setCopied(true); setTimeout(()=>setCopied(false),2000); });

  // ── Duration: count calendar days properly ────────────────────────────────
  const dayCount = event.days && event.days.length > 1
    ? event.days.length
    : calendarDays(event.startTime, event.endTime);
  const durMs = (event.endTime - event.startTime) * 1000;
  const durH  = Math.round(durMs / 36e5 * 10) / 10;
  const durLbl = dayCount > 1
    ? `${dayCount} days`
    : durH >= 1 ? `${durH} hr${durH!==1?"s":""}` : "< 1 hr";

  // ── Price label for stat chip ─────────────────────────────────────────────
  const hasMultipleTypes = event.ticketTypes && event.ticketTypes.filter(t=>t.enabled!==false).length > 1;
  const priceLabel = hasMultipleTypes ? "Multiple tiers"
    : allFree ? "Free" : `$${event.ticketPriceUSD}`;

  const handleClaim = async () => {
    // Always open modal — it handles type selection + guest data + wallet/email choice
    setShowModal(true);
  };

  const mintTicket = async (ticketType, guestData) => {
    if (!requireWallet("Connect your wallet to mint this ticket.")) return;
    setBuying(true); setTxErr("");
    try {
      const { buyTicketOnChain } = await import("../utils/contract");
      // Always register the wallet buyer so they appear in the dashboard guests tab
      if (wallet) {
        await fetch("/api/submit-registration", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            eventId:        String(event.id),
            eventName:      event.name,
            organizerEmail: event.organizerEmail || undefined,
            identifier:     wallet.toLowerCase(),
            fields:         { ...(guestData||{}), ticketType: ticketType||"Regular" },
          }),
        }).catch(()=>{});
      }
      await buyTicketOnChain(event.id, event.name, ticketType || null);
      setBought(true);
      if (onTicketBought) await onTicketBought();
    } catch(err) {
      setTxErr(err?.reason || err?.message || "Transaction failed. Please try again.");
    } finally { setBuying(false); }
  };

  const purchaseCardProps = {
    event,
    totalSold: event.soldTickets + emailTicketCount,
    wallet, connect, connecting, buying, bought, txErr,
    onClaim: handleClaim, navigate, existingTicket,
  };

  const statItems = [
    { icon: Clock,  label:"Duration", value: durLbl },
    { icon: Users,  label:"Capacity", value: event.maxTickets.toLocaleString()+" tickets" },
    { icon: Tag,    label:"Price",    value: priceLabel },
    loc && { icon: Globe, label:"Location", value: event.city || loc },
  ].filter(Boolean);

  return (
    <div style={{paddingTop:62,minHeight:"100vh",background:"#F8F7FF"}}>
      {showModal && (
        <TicketModal
          event={event}
          onWallet={mintTicket}
          onClose={() => setShowModal(false)}
          onEmailSent={() => setEmailTicketCount(c => c+1)}
        />
      )}

      {/* Hero */}
      <div style={{height:360,position:"relative",overflow:"hidden"}}>
        <div ref={heroRef} style={{position:"absolute",inset:"-40px -2px",willChange:"transform",
          background:event.imageURI?`url(${event.imageURI}) center/cover no-repeat`:event.bg}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.1),rgba(0,0,0,.6))"}}/>
        {!event.imageURI && (
          <div style={{position:"absolute",top:"38%",left:"50%",transform:"translate(-50%,-50%)",
            fontSize:76,filter:"drop-shadow(0 8px 32px rgba(0,0,0,.4))",userSelect:"none"}}>
            {event.emoji}
          </div>
        )}
        <button onClick={()=>navigate("/explore")}
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
          {copied?<><CheckCircle size={13}/>Copied!</>:<><Share2 size={13}/>Share</>}
        </button>
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"0 24px 24px"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
            <span style={{background:"rgba(255,255,255,.2)",backdropFilter:"blur(8px)",color:"white",
              padding:"3px 10px",borderRadius:20,fontSize:11,fontFamily:"Outfit",fontWeight:700}}>
              {event.category}
            </span>
            {hasMultipleTypes && (
              <span style={{background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",color:"white",
                padding:"3px 10px",borderRadius:20,fontSize:11,fontFamily:"Outfit",fontWeight:600}}>
                {event.ticketTypes.filter(t=>t.enabled!==false).length} ticket tiers
              </span>
            )}
          </div>
          <h1 style={{fontFamily:"Outfit",fontWeight:900,fontSize:isDesktop?30:24,color:"white",
            lineHeight:1.1,marginBottom:10,textShadow:"0 2px 16px rgba(0,0,0,.3)"}}>
            {event.name}
          </h1>
          <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center"}}>
            {[
              { icon:Calendar, val:formatDate(event.startTime) },
              dayCount > 1 && { icon:Clock, val:`${dayCount} days` },
              (!dayCount || dayCount <= 1) && { icon:Clock, val:formatTime(event.startTime) },
              event.venue && { icon:MapPin, val:event.venue },
            ].filter(Boolean).map(({ icon:Icon, val }) => (
              <div key={val} style={{display:"flex",alignItems:"center",gap:5,
                fontSize:13,color:"rgba(255,255,255,.85)"}}>
                <Icon size={12}/><span style={{fontFamily:"DM Sans",fontWeight:500}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{maxWidth:960,margin:"0 auto",padding:"24px 20px 80px"}}>

        {existingTicket && !bought && (
          <div style={{marginBottom:18}}>
            <AlreadyHasBanner ticket={existingTicket} navigate={navigate}/>
          </div>
        )}

        {/* Stat chips */}
        <div style={{display:"grid",gridTemplateColumns:`repeat(${isDesktop?4:2},1fr)`,
          gap:12,marginBottom:22}}>
          {statItems.map(({icon:Icon,label,value})=>(
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

        <div style={{display:"grid",gridTemplateColumns:isDesktop?"1fr 300px":"1fr",
          gap:22,alignItems:"start"}}>

          {/* LEFT */}
          <div style={{display:"flex",flexDirection:"column",gap:18}}>

            {(event.shortDescription||event.fullDescription) && (
              <div style={{background:"white",borderRadius:18,padding:24,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
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

            {/* Event Details — multi-day aware */}
            <div style={{background:"white",borderRadius:18,padding:24,boxShadow:"0 1px 6px rgba(0,0,0,.05)"}}>
              <h3 style={{fontFamily:"Outfit",fontWeight:800,fontSize:16,color:V.text,marginBottom:18}}>
                Event Details
              </h3>
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {/* Schedule */}
                {event.days && event.days.length > 1 ? (
                  <div>
                    <div style={{fontSize:11,fontFamily:"Outfit",fontWeight:700,color:V.muted,
                      textTransform:"uppercase",letterSpacing:".07em",marginBottom:12}}>
                      Schedule — {event.days.length} Days
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:0}}>
                      {event.days.map((d, i) => (
                        <div key={i} style={{display:"flex",gap:14,alignItems:"stretch"}}>
                          {/* Timeline spine */}
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32,flexShrink:0}}>
                            <div style={{width:32,height:32,borderRadius:10,
                              background:i===0?V.brand:V.b50,
                              border:`2px solid ${i===0?V.brand:V.b100}`,
                              display:"flex",alignItems:"center",justifyContent:"center",
                              flexShrink:0,zIndex:1}}>
                              <span style={{fontFamily:"Outfit",fontWeight:800,fontSize:12,
                                color:i===0?"white":V.brand}}>{i+1}</span>
                            </div>
                            {i < event.days.length - 1 && (
                              <div style={{width:2,flex:1,background:V.b100,margin:"3px 0",minHeight:12}}/>
                            )}
                          </div>
                          {/* Day card */}
                          <div style={{flex:1,background:i===0?V.b50:"white",
                            border:`1px solid ${i===0?V.b100:V.borderS}`,
                            borderRadius:12,padding:"10px 14px",
                            marginBottom: i < event.days.length - 1 ? 8 : 0}}>
                            <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:13,color:V.text,marginBottom:4}}>
                              {i === 0 ? "Day 1 · Opening" : i === event.days.length-1 ? `Day ${i+1} · Closing` : `Day ${i+1}`}
                            </div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
                              {d.date && (
                                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:13,
                                  color:V.text2,fontFamily:"DM Sans"}}>
                                  <Calendar size={11} color={V.brand}/>{d.date}
                                </div>
                              )}
                              {(d.startTime || d.endTime) && (
                                <div style={{display:"flex",alignItems:"center",gap:5,fontSize:13,
                                  color:V.muted,fontFamily:"DM Sans"}}>
                                  <Clock size={11} color={V.mutedL}/>
                                  {d.startTime}{d.endTime ? ` – ${d.endTime}` : ""}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  [
                    { icon:Calendar, label:"Starts", value:formatDate(event.startTime)+" · "+formatTime(event.startTime) },
                    { icon:Clock,    label:"Ends",   value:formatDate(event.endTime)  +" · "+formatTime(event.endTime)   },
                  ].map(({icon:Icon,label,value})=>(
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
                  ))
                )}

                {loc && (
                  <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:34,height:34,borderRadius:10,background:V.b50,
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                      <MapPin size={14} color={V.brand}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,fontFamily:"Outfit",fontWeight:700,color:V.muted,
                        textTransform:"uppercase",letterSpacing:".07em"}}>Location</div>
                      <div style={{fontSize:14,color:V.text2,marginTop:2,fontFamily:"DM Sans"}}>{loc}</div>
                    </div>
                  </div>
                )}

                <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:34,height:34,borderRadius:10,background:V.b50,
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    <Users size={14} color={V.brand}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,fontFamily:"Outfit",fontWeight:700,color:V.muted,
                      textTransform:"uppercase",letterSpacing:".07em"}}>Available</div>
                    <div style={{fontSize:14,color:V.text2,marginTop:2,fontFamily:"DM Sans"}}>
                      {(event.maxTickets-event.soldTickets).toLocaleString()} of {event.maxTickets.toLocaleString()} tickets left
                    </div>
                  </div>
                </div>

                {/* Ticket types breakdown */}
                {hasMultipleTypes && (
                  <div>
                    <div style={{fontSize:11,fontFamily:"Outfit",fontWeight:700,color:V.muted,
                      textTransform:"uppercase",letterSpacing:".07em",marginBottom:10}}>Ticket Types</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8}}>
                      {event.ticketTypes.filter(t=>t.enabled!==false).map(tt => {
                        const isFreeT   = !tt.price || tt.price === "0";
                        return (
                          <div key={tt.name} style={{borderRadius:12,overflow:"hidden",
                            border:"1px solid "+V.borderS,
                            boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
                            <div style={{background:V.surface,padding:"11px 14px",
                              borderBottom:"1px solid "+V.borderS}}>
                              <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:14,color:V.text}}>
                                {tt.name}
                              </div>
                            </div>
                            <div style={{background:"white",padding:"10px 14px"}}>
                              <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:16,
                                color:isFreeT?"#16A34A":V.text}}>
                                {isFreeT ? "Free" : `${tt.price} OG`}
                              </div>
                              <div style={{fontSize:11,color:V.mutedL,marginTop:1}}>per ticket</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Guest data notice */}
                {event.requiredFields && Object.entries(event.requiredFields)
                  .some(([k,v])=>k!=="customQuestion"&&v===true) && (
                  <div style={{display:"flex",gap:10,alignItems:"flex-start",
                    background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:12,padding:"12px 14px"}}>
                    <AlertCircle size={14} color="#D97706" style={{flexShrink:0,marginTop:1}}/>
                    <div style={{fontSize:13,color:"#92400E",lineHeight:1.65}}>
                      The organiser will ask for some details before you get your ticket.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                {icon:Shield,   label:"Soulbound NFT",        bg:"#F5F3FF",color:V.brand},
                {icon:Sparkles, label:"Fraud-proof",          bg:"#F0FDF4",color:"#16A34A"},
                allFree&&event.acceptsOffchainTickets
                  ?{icon:Mail,  label:"Email tickets accepted",bg:"#FFFBEB",color:"#D97706"}
                  :null,
              ].filter(Boolean).map(({icon:Icon,label,bg,color})=>(
                <div key={label} style={{display:"flex",alignItems:"center",gap:7,
                  padding:"7px 13px",borderRadius:20,background:bg,
                  fontSize:12,color,fontFamily:"Outfit",fontWeight:700}}>
                  <Icon size={12}/>{label}
                </div>
              ))}
            </div>

            {!isDesktop && <PurchaseCard {...purchaseCardProps}/>}
          </div>

          {/* RIGHT */}
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