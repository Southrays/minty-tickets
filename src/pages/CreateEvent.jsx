import { useState } from "react";
// import { Upload, Shield, CheckCircle, RefreshCw, AlertCircle, Mail, ExternalLink, Wallet, ChevronDown } from "lucide-react";
import { Shield, CheckCircle, RefreshCw, AlertCircle, Mail, ExternalLink, Wallet, ChevronDown } from "lucide-react";
import { V, OG_TO_USD_RATE, CATEGORIES } from "../utils/constants";
import { useWallet } from "../context/WalletContext";
import { createEventOnChain } from "../utils/contract";
import { useNavigate } from "react-router-dom";

const COUNTRIES = ["United States","United Kingdom","Canada","Australia","Germany","France","Nigeria","South Africa","India","Brazil","Other"];

const INIT = {
  name:"", shortDescription:"", fullDescription:"",
  category:"Music",
  venue:"", city:"", state:"", country:"United States",
  startDate:"", startTime:"20:00", endDate:"", endTime:"23:00",
  ticketPrice:"", maxTickets:"500",
  imageFile:null, imagePreview:null,
  acceptsOffchain:false,
};

function Lbl({children,req}){
  return <label className="lbl">{children}{req && <span style={{color:"#EF4444",fontFamily:"DM Sans",textTransform:"none",marginLeft:4}}>*</span>}</label>;
}

function Err({msg}){
  if(!msg) return null;
  return <div style={{fontSize:12,color:"#EF4444",marginTop:5,display:"flex",alignItems:"center",gap:4}}><AlertCircle size={11}/>{msg}</div>;
}

export default function CreateEventPage({ onCreated }) {
  const { wallet, connect, connecting } = useWallet();
  const [form, setF] = useState(INIT);
  const [errs, setE] = useState({});
  const [busy, setBusy] = useState(false);
  const [txErr, setTxErr] = useState("");
  const [done, setDone] = useState(null);
  const [emailNotice, setEN] = useState(false);
  const navigate = useNavigate();

  const set = (k,v) => setF(f => {
    const n = {...f,[k]:v};
    if(k==="ticketPrice" && v && v!=="0") n.acceptsOffchain=false;
    return n;
  });
  const isFree = !form.ticketPrice || form.ticketPrice==="0";

  // const upload = e => {
  //   const f=e.target.files[0]; setE(p=>({...p,image:""}));
  //   if(!f) return;
  //   if(f.size>5*1024*1024){setE(p=>({...p,image:"Image must be under 5MB."}));return;}
  //   const r=new FileReader();
  //   r.onload=ev=>{set("imagePreview",ev.target.result);set("imageFile",f);};
  //   r.readAsDataURL(f);
  // };

  const validate = () => {
    const e={};
    if(!form.name.trim())              e.name="Event name is required.";
    if(!form.shortDescription.trim())  e.shortDesc="Short description is required.";
    if(!form.venue.trim())             e.venue="Venue name is required.";
    if(!form.city.trim())              e.city="City is required.";
    if(!form.startDate)                e.startDate="Start date is required.";
    if(!form.endDate)                  e.endDate="End date is required.";
    if(!form.maxTickets||parseInt(form.maxTickets)<1) e.maxTickets="Enter max ticket supply (at least 1).";
    setE(e); return Object.keys(e).length===0;
  };

  const submit = async () => {
    if(!validate()) return;
    setBusy(true);
    setTxErr("");
    try {
      // Image upload to storage is not yet configured.
      // imageURI is passed as an empty string for now — the event will
      // show its category gradient/emoji instead of a photo until
      // 0G Storage integration is wired up.
      const {txHash, eventId} = await createEventOnChain({ ...form, imageURI: "" });
      const shareUrl = `${window.location.origin}/event/${eventId}`;
      setDone({txHash, eventId, shareUrl});
      if(onCreated) await onCreated();
    } catch(err) {
      console.error(err);
      setTxErr(err?.reason || err?.message || "Transaction failed.");
    } finally {
      setBusy(false);
    }
  };

  // Not connected
  if(!wallet) return (
    <div style={{padding:"80px 24px",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"80vh"}}>
      <div style={{textAlign:"center",maxWidth:400}}>
        <div style={{width:64,height:64,borderRadius:18,background:V.b50,border:"1px solid "+V.b100,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
          <Wallet size={28} color={V.brand}/>
        </div>
        <h2 style={{fontFamily:"Outfit",fontWeight:900,fontSize:26,color:V.text,marginBottom:10}}>Connect to Host</h2>
        <p style={{color:V.muted,lineHeight:1.7,marginBottom:26,fontSize:15}}>
          You need a connected wallet to create events and collect revenue on-chain.
        </p>
        <button className="bp" onClick={connect} disabled={connecting} style={{borderRadius:14,padding:"13px 28px",fontSize:15,gap:10}}>
          {connecting ? <><RefreshCw size={15} className="spin"/>Connecting…</> : <><Wallet size={16}/>Connect Wallet</>}
        </button>
        <p style={{marginTop:14,fontSize:12,color:V.mutedL}}>MetaMask required · 0G Galileo Testnet</p>
      </div>
    </div>
  );

  // Success screen
  if(done) return (
    <div style={{padding:"80px 24px",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"80vh"}}>
      <div className="mdg card" style={{width:"100%",maxWidth:460,padding:38,textAlign:"center"}}>
        <div style={{width:60,height:60,borderRadius:17,background:"#F0FDF4",border:"1px solid #86EFAC",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
          <CheckCircle size={28} color="#16A34A"/>
        </div>
        <h2 style={{fontFamily:"Outfit",fontWeight:900,fontSize:24,color:V.text,marginBottom:8}}>Event Created!</h2>
        <p style={{color:V.muted,lineHeight:1.7,marginBottom:14,fontSize:14}}>Your event is live on the 0G blockchain.</p>
        <div style={{background:V.surface,border:"1px solid "+V.border,borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:10,marginBottom:18,textAlign:"left"}}>
          <div style={{flex:1,fontSize:12,fontFamily:"monospace",color:V.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{done.shareUrl}</div>
          <button className="bg" style={{flexShrink:0,padding:"5px 10px",gap:4,fontSize:12,color:V.brand}} onClick={()=>navigator.clipboard.writeText(done.shareUrl)}>
            <ExternalLink size={12}/>Copy
          </button>
        </div>
        <button className="bp" onClick={() => navigate("/dashboard")} style={{width:"100%",justifyContent:"center",padding:13,marginBottom:10}}>
          View in Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div style={{padding:"80px 24px 80px",maxWidth:680,margin:"0 auto"}}>
      {emailNotice && (
        <div className="mbd" onClick={e=>e.target===e.currentTarget&&setEN(false)}
          style={{position:"fixed",inset:0,background:"rgba(17,24,39,.4)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
          <div className="mdg card" style={{width:"100%",maxWidth:400,padding:28}}>
            <div style={{width:46,height:46,borderRadius:13,background:"#FFFBEB",border:"1px solid #FCD34D",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
              <Mail size={22} color="#D97706"/>
            </div>
            <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:17,color:V.text,marginBottom:8}}>Email Tickets Enabled</div>
            <p style={{fontSize:14,color:V.muted,lineHeight:1.7,marginBottom:18}}>
              Attendees can get a ticket without a wallet via email. These are <strong>off-chain only</strong> — for venue entry, not verifiable on-chain.
            </p>
            <button className="bp" onClick={()=>setEN(false)} style={{width:"100%",justifyContent:"center",padding:12}}>Got it</button>
          </div>
        </div>
      )}

      <div className="fu" style={{marginBottom:28}}>
        <h1 style={{fontFamily:"Outfit",fontWeight:900,fontSize:32,color:V.text,marginBottom:6}}>Host an Event</h1>
        <p style={{color:V.muted,fontSize:15}}>Create your event and start selling NFT tickets on the 0G blockchain.</p>
      </div>

      <div className="fu2 card" style={{padding:30}}>

        {/* EVENT INFO */}
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:13,color:V.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:16,paddingBottom:10,borderBottom:"1px solid "+V.borderS}}>
            Event Information
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <Lbl req>Event Name</Lbl>
              <input className="inp" placeholder="e.g. Neon Frequency Festival 2025" value={form.name} onChange={e=>set("name",e.target.value)}/>
              <Err msg={errs.name}/>
            </div>
            <div>
              <Lbl req>Short Description</Lbl>
              <input className="inp" placeholder="One-line summary shown on event cards" value={form.shortDescription} onChange={e=>set("shortDescription",e.target.value)}/>
              <Err msg={errs.shortDesc}/>
            </div>
            <div>
              <Lbl>Full Description <span style={{fontFamily:"DM Sans",fontSize:12,textTransform:"none",fontWeight:400,color:V.mutedL}}>(optional)</span></Lbl>
              <textarea className="inp" placeholder="Describe the full event experience, lineup, agenda, or anything else…" value={form.fullDescription} onChange={e=>set("fullDescription",e.target.value)} style={{minHeight:90,resize:"vertical",lineHeight:1.6}}/>
            </div>
            <div>
              <Lbl>Category</Lbl>
              <div style={{position:"relative"}}>
                <select className="inp" value={form.category} onChange={e=>set("category",e.target.value)} style={{cursor:"pointer",appearance:"none",paddingRight:36}}>
                  {CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={15} style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",color:V.mutedL,pointerEvents:"none"}}/>
              </div>
            </div>
          </div>
        </div>

        {/* EVENT IMAGE */}
        {/* <div style={{marginBottom:28}}>
          <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:13,color:V.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:6,paddingBottom:10,borderBottom:"1px solid "+V.borderS}}>
            Event Image <span style={{fontFamily:"DM Sans",fontSize:11,textTransform:"none",fontWeight:400,color:V.mutedL,letterSpacing:0}}>(optional — preview only for now)</span>
          </div>
          <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:10,padding:"9px 13px",marginBottom:12,display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#92400E"}}>
            <AlertCircle size={13} style={{flexShrink:0}}/>
            Image preview works but won't be stored on-chain yet. Your event will show its category colour until storage is connected.
          </div>
          <label htmlFor="imgup" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,height:form.imagePreview?200:130,border:"2px dashed "+(errs.image?"#FCA5A5":form.imagePreview?"#A3E635":V.border),borderRadius:16,cursor:"pointer",background:form.imagePreview?"#000":V.surface,transition:"all .2s",overflow:"hidden",position:"relative"}}
            onMouseEnter={e=>{if(!form.imagePreview)e.currentTarget.style.borderColor=V.brand;}}
            onMouseLeave={e=>{if(!form.imagePreview)e.currentTarget.style.borderColor=errs.image?"#FCA5A5":V.border;}}>
            {form.imagePreview ? (
              <>
                <img src={form.imagePreview} alt="" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0}}/>
                <div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,.65)",borderRadius:7,padding:"4px 10px",fontSize:11,color:"white",fontFamily:"Outfit",fontWeight:600}}>Click to change</div>
              </>
            ) : (
              <>
                <Upload size={22} color={errs.image?"#EF4444":V.mutedL}/>
                <div style={{fontFamily:"Outfit",fontWeight:600,fontSize:14,color:errs.image?"#EF4444":V.muted}}>Upload event image</div>
                <div style={{fontSize:12,color:V.mutedL}}>PNG, JPG, GIF · max 5 MB · preview only</div>
              </>
            )}
          </label>
          <input id="imgup" type="file" accept="image/*" style={{display:"none"}} onChange={upload}/>
          <Err msg={errs.image}/>
        </div> */}

        {/* LOCATION */}
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:13,color:V.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:16,paddingBottom:10,borderBottom:"1px solid "+V.borderS}}>
            Location
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <Lbl req>Venue Name</Lbl>
              <input className="inp" placeholder="e.g. Madison Square Garden" value={form.venue} onChange={e=>set("venue",e.target.value)}/>
              <Err msg={errs.venue}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
              <div>
                <Lbl req>City</Lbl>
                <input className="inp" placeholder="e.g. New York" value={form.city} onChange={e=>set("city",e.target.value)}/>
                <Err msg={errs.city}/>
              </div>
              <div>
                <Lbl>State / Province</Lbl>
                <input className="inp" placeholder="e.g. NY" value={form.state} onChange={e=>set("state",e.target.value)}/>
              </div>
            </div>
            <div>
              <Lbl>Country</Lbl>
              <div style={{position:"relative"}}>
                <select className="inp" value={form.country} onChange={e=>set("country",e.target.value)} style={{cursor:"pointer",appearance:"none",paddingRight:36}}>
                  {COUNTRIES.map(c=><option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={15} style={{position:"absolute",right:13,top:"50%",transform:"translateY(-50%)",color:V.mutedL,pointerEvents:"none"}}/>
              </div>
            </div>
          </div>
        </div>

        {/* DATE & TIME */}
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:13,color:V.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:16,paddingBottom:10,borderBottom:"1px solid "+V.borderS}}>
            Date & Time
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
            <div>
              <Lbl req>Start Date</Lbl>
              <input type="date" className="inp" value={form.startDate} onChange={e=>set("startDate",e.target.value)} style={{cursor:"pointer"}}/>
              <Err msg={errs.startDate}/>
            </div>
            <div>
              <Lbl req>Start Time</Lbl>
              <input type="time" className="inp" value={form.startTime} onChange={e=>set("startTime",e.target.value)} style={{cursor:"pointer"}}/>
            </div>
            <div>
              <Lbl req>End Date</Lbl>
              <input type="date" className="inp" value={form.endDate} onChange={e=>set("endDate",e.target.value)} style={{cursor:"pointer"}}/>
              <Err msg={errs.endDate}/>
            </div>
            <div>
              <Lbl req>End Time</Lbl>
              <input type="time" className="inp" value={form.endTime} onChange={e=>set("endTime",e.target.value)} style={{cursor:"pointer"}}/>
            </div>
          </div>
        </div>

        {/* TICKETS */}
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:13,color:V.muted,textTransform:"uppercase",letterSpacing:".08em",marginBottom:16,paddingBottom:10,borderBottom:"1px solid "+V.borderS}}>
            Ticket Information
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div>
              <Lbl>Ticket Price (OG tokens)</Lbl>
              <div style={{position:"relative"}}>
                <input className="inp" placeholder="0  — leave empty for a free event" type="number" min="0" step="0.001" value={form.ticketPrice} onChange={e=>set("ticketPrice",e.target.value)}
                  style={{paddingRight:form.ticketPrice&&form.ticketPrice!=="0"?136:16}}/>
                {form.ticketPrice&&form.ticketPrice!=="0" && (
                  <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:12,color:V.muted,fontFamily:"Outfit",fontWeight:600}}>
                    ≈ ${(parseFloat(form.ticketPrice)*OG_TO_USD_RATE).toFixed(2)} USD
                  </span>
                )}
              </div>
              {isFree && <div style={{fontSize:12,color:"#16A34A",marginTop:5,display:"flex",alignItems:"center",gap:4}}><CheckCircle size={12}/>This event is free</div>}
            </div>
            <div>
              <Lbl req>Max Ticket Supply</Lbl>
              <input className="inp" placeholder="e.g. 500" type="number" min="1" value={form.maxTickets} onChange={e=>set("maxTickets",e.target.value)}/>
              <Err msg={errs.maxTickets}/>
            </div>

            {/* Email tickets toggle */}
            <div style={{background:V.surface,borderRadius:13,padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",opacity:isFree?1:.45}}>
              <div style={{flex:1,minWidth:0,paddingRight:14}}>
                <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:V.text,marginBottom:3}}>Accept Email Tickets</div>
                <div style={{fontSize:12,color:V.muted,lineHeight:1.55}}>
                  {isFree?"Let guests attend without a wallet — they receive an email confirmation.":"Only available for free events."}
                </div>
              </div>
              <button className="ttr" disabled={!isFree}
                onClick={()=>{if(!isFree)return;if(form.acceptsOffchain){set("acceptsOffchain",false);}else{setEN(true);set("acceptsOffchain",true);}}}
                style={{background:form.acceptsOffchain?"#7C3AED":"#D1D5DB",cursor:isFree?"pointer":"not-allowed"}}>
                <div className="tth" style={{left:form.acceptsOffchain?25:3}}/>
              </button>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div style={{background:V.b50,border:"1px solid "+V.b100,borderRadius:12,padding:"11px 14px",display:"flex",gap:9,marginBottom:22}}>
          <Shield size={14} color={V.brand} style={{flexShrink:0,marginTop:1}}/>
          <div style={{fontSize:13,color:"#5B21B6",lineHeight:1.6}}>
            All tickets are soulbound ERC-721 NFTs — they cannot be resold or transferred, preventing scalping.
          </div>
        </div>

        {txErr && (
          <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:12,padding:"12px 14px",marginBottom:18,display:"flex",alignItems:"center",gap:9,fontSize:13,color:"#DC2626"}}>
            <AlertCircle size={14}/>{txErr}
          </div>
        )}

        <button className="bp" onClick={submit} disabled={busy||!form.name} style={{width:"100%",justifyContent:"center",padding:14,borderRadius:14,fontSize:15}}>
          {busy ? <><RefreshCw size={15} className="spin"/>Creating event on 0G…</> : <>Create Event on 0G Blockchain</>}
        </button>
        <p style={{textAlign:"center",marginTop:12,fontSize:12,color:V.mutedL}}>
          This will open MetaMask to confirm the transaction.
        </p>
      </div>
    </div>
  );
}