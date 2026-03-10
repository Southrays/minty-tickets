// import { useState, useEffect, useRef, useCallback } from "react";
// import { X, Lock, Unlock, Clock, Shield, CheckCircle, AlertCircle, RefreshCw, EyeOff, Wallet } from "lucide-react";
// import QRCode from "../ui/QRCode";
// import { V, CONTRACT_ADDRESS } from "../../utils/constants";
// import { formatDate, formatTime } from "../../utils/format";
// import { useWallet } from "../../context/WalletContext";
// import { signMessage } from "../../utils/contract";

// // QR epoch: changes every 60s so screenshots expire quickly
// const QR_EPOCH = 60;
// const SESSION_SECS = 300; // 5 minutes

// function getQrEpoch() { return Math.floor(Date.now() / (QR_EPOCH * 1000)); }

// export default function TicketModal({ ticket, onClose }) {
//   const { wallet, connect, connecting } = useWallet();

//   // qrState: "hidden" | "signing" | "visible" | "expired"
//   const [qrState,  setQrState]  = useState("hidden");
//   const [secs,     setSecs]     = useState(SESSION_SECS);
//   const [epoch,    setEpoch]    = useState(getQrEpoch());
//   const [signErr,  setSignErr]  = useState("");
//   const ref = useRef(null);

//   // Countdown when QR is visible
//   useEffect(() => {
//     if (qrState !== "visible") return;
//     setSecs(SESSION_SECS);
//     const t = setInterval(() => {
//       setSecs(s => {
//         if (s <= 1) { setQrState("expired"); clearInterval(t); return 0; }
//         return s - 1;
//       });
//     }, 1000);
//     return () => clearInterval(t);
//   }, [qrState]);

//   // Rotate epoch every 60s
//   useEffect(() => {
//     if (qrState !== "visible") return;
//     const t = setInterval(() => setEpoch(getQrEpoch()), 5000);
//     return () => clearInterval(t);
//   }, [qrState]);

//   const handleReveal = async () => {
//     if (!wallet) return;
//     setSignErr(""); setQrState("signing");
//     try {
//       const msg = [
//         "Minty Tickets — Reveal QR Code",
//         "Token ID:  #" + ticket.tokenId,
//         "Event:     " + ticket.event.name,
//         "Timestamp: " + new Date().toISOString().slice(0,19).replace("T"," "),
//         "",
//         "This QR code is valid for 5 minutes only.",
//         "Never share this code — it grants venue entry."
//       ].join("\n");
//       await signMessage(msg, wallet);
//       setQrState("visible");
//     } catch(err) {
//       console.error(err);
//       setSignErr(err.code === 4001 ? "Signature cancelled." : "Signing failed. Please try again.");
//       setQrState("hidden");
//     }
//   };

//   // 3D tilt
//   const onMove = useCallback(e => {
//     if (!ref.current) return;
//     const r  = ref.current.getBoundingClientRect();
//     const dx = (e.clientX - r.left - r.width/2)  / (r.width/2);
//     const dy = (e.clientY - r.top  - r.height/2) / (r.height/2);
//     ref.current.style.transform = `perspective(900px) rotateY(${dx*5}deg) rotateX(${-dy*3.5}deg) scale(1.015)`;
//   }, []);
//   const onLeave = useCallback(() => {
//     if (ref.current) ref.current.style.transform = "perspective(900px) rotateY(0) rotateX(0) scale(1)";
//   }, []);

//   const ev      = ticket.event;
//   const mins    = Math.floor(secs / 60);
//   const ss      = secs % 60;
//   const prog    = secs / SESSION_SECS;
//   const R = 90, C = 2 * Math.PI * R;
//   const qrData  = `MINTY-${ticket.tokenId}-${ev.id}-${epoch}`;
//   const priceLbl = ev.ticketPrice === "0" || !ev.ticketPrice ? "FREE" : "$"+ev.ticketPriceUSD;
//   const locationLine = [ev.venue, ev.city, ev.country].filter(Boolean).join(" · ");

//   return (
//     <div className="mbd" onClick={e => e.target === e.currentTarget && onClose()}
//       style={{position:"fixed",inset:0,background:"rgba(10,10,20,.75)",backdropFilter:"blur(20px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}}>

//       <div className="mdg" style={{width:"100%",maxWidth:500}}>
//         {/* Close */}
//         <div style={{display:"flex",justifyContent:"flex-end",marginBottom:10}}>
//           <button className="bg" onClick={onClose}
//             style={{borderRadius:"50%",width:36,height:36,padding:0,justifyContent:"center",background:"rgba(255,255,255,.12)",color:"white"}}>
//             <X size={16}/>
//           </button>
//         </div>

//         {/* THE TICKET */}
//         <div ref={ref} className="t3d" onMouseMove={onMove} onMouseLeave={onLeave}>
//           <div style={{borderRadius:26,overflow:"hidden",boxShadow:"0 28px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.10)"}}>

//             {/* Holographic sheen */}
//             <div className="hs" style={{position:"absolute",inset:0,zIndex:4,pointerEvents:"none",opacity:.5,borderRadius:26}}/>

//             {/* ── TOP: QR + identity ── */}
//             <div style={{background:"linear-gradient(160deg,#00C48A 0%,#008F65 55%,#006B4D 100%)",padding:"28px 26px 0",position:"relative"}}>

//               {/* Corner punch holes */}
//               {[{top:-10,left:-10},{top:-10,right:-10}].map((s,i)=>(
//                 <div key={i} style={{position:"absolute",width:20,height:20,borderRadius:"50%",background:"rgba(10,10,20,.75)",zIndex:5,...s}}/>
//               ))}

//               {/* Top row: event name + token id */}
//               <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
//                 <div>
//                   <div style={{fontSize:9,fontFamily:"Outfit",fontWeight:800,letterSpacing:".15em",color:"rgba(255,255,255,.55)",textTransform:"uppercase",marginBottom:5}}>NFT TICKET</div>
//                   <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:20,color:"white",lineHeight:1.15,maxWidth:280}}>{ev.name}</div>
//                 </div>
//                 <div style={{background:"rgba(0,0,0,.3)",borderRadius:9,padding:"4px 11px",flexShrink:0,marginLeft:12}}>
//                   <div style={{fontSize:9,color:"rgba(255,255,255,.5)",fontFamily:"Outfit",fontWeight:700,letterSpacing:".1em",textAlign:"center"}}>TOKEN</div>
//                   <div style={{fontFamily:"Outfit",fontWeight:900,fontSize:16,color:"white",letterSpacing:".04em"}}>
//                     #{String(ticket.tokenId).padStart(4,"0")}
//                   </div>
//                 </div>
//               </div>

//               {/* QR area — centered, large */}
//               <div style={{display:"flex",justifyContent:"center",marginBottom:22}}>
//                 <div style={{position:"relative",width:210,height:210}}>
//                   {/* Progress ring */}
//                   {qrState==="visible" && (
//                     <svg width={210} height={210} style={{position:"absolute",inset:0,zIndex:2,pointerEvents:"none"}}>
//                       <circle cx={105} cy={105} r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth={4}/>
//                       <circle cx={105} cy={105} r={R} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={4}
//                         strokeDasharray={C} strokeDashoffset={C*(1-prog)} strokeLinecap="round"
//                         transform="rotate(-90 105 105)" style={{transition:"stroke-dashoffset 1s linear"}}/>
//                     </svg>
//                   )}

//                   {/* QR or locked state */}
//                   <div style={{position:"absolute",inset:10,borderRadius:16,overflow:"hidden",background:"white",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}>
//                     {qrState==="visible" ? (
//                       <QRCode data={qrData} size={170} dark="#1F2937"/>
//                     ) : qrState==="signing" ? (
//                       <div style={{textAlign:"center",padding:20}}>
//                         <RefreshCw size={32} color={V.brand} className="spin" style={{margin:"0 auto 12px"}}/>
//                         <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:13,color:V.text}}>Sign in MetaMask…</div>
//                       </div>
//                     ) : qrState==="expired" ? (
//                       <div style={{textAlign:"center",padding:20}}>
//                         <EyeOff size={32} color={V.mutedL} style={{margin:"0 auto 10px"}}/>
//                         <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:13,color:V.muted}}>QR Expired</div>
//                         <div style={{fontSize:11,color:V.mutedL,marginTop:4}}>Tap to re-reveal</div>
//                       </div>
//                     ) : (
//                       <div style={{textAlign:"center",padding:20}}>
//                         <Lock size={32} color={V.mutedL} style={{margin:"0 auto 10px"}}/>
//                         <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:13,color:V.muted}}>QR Hidden</div>
//                         <div style={{fontSize:11,color:V.mutedL,marginTop:4}}>Sign to reveal</div>
//                       </div>
//                     )}
//                   </div>
//                 </div>
//               </div>

//               {/* Epoch badge */}
//               {qrState==="visible" && (
//                 <div style={{textAlign:"center",marginBottom:16}}>
//                   <span style={{background:"rgba(0,0,0,.25)",borderRadius:8,padding:"3px 11px",fontSize:10,fontFamily:"monospace",color:"rgba(255,255,255,.6)"}}>
//                     epoch·{epoch} · rotates every {QR_EPOCH}s
//                   </span>
//                 </div>
//               )}
//             </div>

//             {/* ── PERFORATION ── */}
//             <div style={{background:"linear-gradient(160deg,#008F65,#006B4D)",display:"flex",alignItems:"center",padding:"0 10px"}}>
//               {[...Array(22)].map((_,i)=>(
//                 <div key={i} style={{flex:1,height:i===0||i===21?0:0,margin:i===0||i===21?"0 0":"0 1px"}}/>
//               ))}
//               <div style={{position:"relative",width:"100%",height:0}}>
//                 <div style={{position:"absolute",left:-16,top:"50%",transform:"translateY(-50%)",width:16,height:16,borderRadius:"50%",background:"rgba(10,10,20,.75)"}}/>
//                 <div style={{position:"absolute",right:-16,top:"50%",transform:"translateY(-50%)",width:16,height:16,borderRadius:"50%",background:"rgba(10,10,20,.75)"}}/>
//                 <div style={{width:"100%",height:0,borderTop:"2px dashed rgba(255,255,255,.3)"}}/>
//               </div>
//             </div>

//             {/* ── BOTTOM: event details ── */}
//             <div style={{background:"linear-gradient(160deg,#006B4D,#004D38)",padding:"18px 26px 22px"}}>
//               {/* Corner punch holes */}
//               {[{bottom:-10,left:-10},{bottom:-10,right:-10}].map((s,i)=>(
//                 <div key={i} style={{position:"absolute",width:20,height:20,borderRadius:"50%",background:"rgba(10,10,20,.75)",zIndex:5,...s}}/>
//               ))}

//               <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 18px",marginBottom:14}}>
//                 {[
//                   {l:"DATE",        v:formatDate(ev.startTime)},
//                   {l:"TIME",        v:formatTime(ev.startTime)},
//                   {l:"PRICE",       v:priceLbl},
//                   {l:"VALID FOR",   v:"1 Attendee"},
//                 ].map(({l,v})=>(
//                   <div key={l}>
//                     <div style={{fontSize:8,fontFamily:"Outfit",fontWeight:800,letterSpacing:".14em",color:"rgba(255,255,255,.45)",textTransform:"uppercase"}}>{l}</div>
//                     <div style={{fontSize:13,fontFamily:"Outfit",fontWeight:700,color:"white",marginTop:2}}>{v}</div>
//                   </div>
//                 ))}
//               </div>

//               {locationLine && (
//                 <div style={{borderTop:"1px solid rgba(255,255,255,.15)",paddingTop:12,marginBottom:12}}>
//                   <div style={{fontSize:8,fontFamily:"Outfit",fontWeight:800,letterSpacing:".14em",color:"rgba(255,255,255,.45)",textTransform:"uppercase",marginBottom:3}}>VENUE</div>
//                   <div style={{fontSize:12,fontFamily:"Outfit",fontWeight:600,color:"rgba(255,255,255,.85)"}}>{locationLine}</div>
//                 </div>
//               )}

//               <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:"1px solid rgba(255,255,255,.15)",paddingTop:10}}>
//                 <div style={{display:"flex",alignItems:"center",gap:6}}>
//                   {ticket.checkedIn
//                     ? <><CheckCircle size={11} color="#D1FAE5"/><span style={{fontSize:9,fontFamily:"Outfit",fontWeight:800,color:"#D1FAE5",letterSpacing:".1em"}}>CHECKED IN</span></>
//                     : <><Shield size={11} color="rgba(255,255,255,.5)"/><span style={{fontSize:9,fontFamily:"Outfit",fontWeight:800,color:"rgba(255,255,255,.5)",letterSpacing:".1em"}}>SOULBOUND NFT</span></>
//                   }
//                 </div>
//                 <div style={{fontSize:9,fontFamily:"monospace",color:"rgba(255,255,255,.3)"}}>{CONTRACT_ADDRESS.slice(0,14)}…</div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* ── REVEAL PANEL ── */}
//         <div style={{marginTop:14}}>
//           {!wallet ? (
//             <div style={{background:"rgba(255,255,255,.08)",borderRadius:16,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14}}>
//               <div>
//                 <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:"white",marginBottom:3}}>Wallet Required</div>
//                 <div style={{fontSize:12,color:"rgba(255,255,255,.55)"}}>Connect wallet to reveal QR code</div>
//               </div>
//               <button className="bp" onClick={connect} disabled={connecting} style={{borderRadius:12,padding:"9px 18px",fontSize:13,flexShrink:0}}>
//                 {connecting ? <><RefreshCw size={13} className="spin"/>Connecting…</> : <><Wallet size={13}/>Connect</>}
//               </button>
//             </div>
//           ) : qrState==="visible" ? (
//             <div style={{background:"rgba(0,196,138,.1)",border:"1px solid rgba(0,196,138,.3)",borderRadius:16,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
//               <div style={{display:"flex",alignItems:"center",gap:8}}>
//                 <Unlock size={15} color="#00C48A"/>
//                 <span style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:"white"}}>QR Active</span>
//               </div>
//               <div style={{display:"flex",alignItems:"center",gap:8}}>
//                 <Clock size={13} color={secs<60?"#EF4444":"#00C48A"}/>
//                 <span style={{fontFamily:"Outfit",fontWeight:800,fontSize:20,color:secs<60?"#EF4444":"#00C48A",fontVariantNumeric:"tabular-nums"}}>
//                   {String(mins).padStart(2,"0")}:{String(ss).padStart(2,"0")}
//                 </span>
//               </div>
//             </div>
//           ) : (
//             <div style={{display:"flex",flexDirection:"column",gap:10}}>
//               <button className="bp" onClick={handleReveal} disabled={qrState==="signing"}
//                 style={{width:"100%",justifyContent:"center",padding:14,borderRadius:14,fontSize:14,gap:8}}>
//                 {qrState==="signing"
//                   ? <><RefreshCw size={15} className="spin"/>Waiting for signature…</>
//                   : qrState==="expired"
//                     ? <><RefreshCw size={15}/>Re-reveal QR (sign again)</>
//                     : <><Lock size={15}/>Reveal QR Code (Valid for 5 mins)</>
//                 }
//               </button>
//               {signErr && (
//                 <div style={{background:"rgba(239,68,68,.15)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,padding:"10px 14px",fontSize:12,color:"#FCA5A5",display:"flex",gap:7}}>
//                   <AlertCircle size={13} style={{flexShrink:0,marginTop:1}}/>{signErr}
//                 </div>
//               )}
//               <p style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,.35)"}}>
//                 A gasless wallet signature is required · QR rotates every {QR_EPOCH}s · Screenshots expire
//               </p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
