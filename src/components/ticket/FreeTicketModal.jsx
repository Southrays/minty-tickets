// import { useState } from "react";
// import { X, Wallet, Mail, CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
// import { V } from "../../utils/constants";
// import { useWallet } from "../../context/WalletContext";

// export default function FreeTicketModal({ event, onClose }) {
//   const { wallet, requireWallet } = useWallet();
//   const [mode,setMode]=useState(null); const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);
//   const submitEmail=() => { if(!name.trim()||!email.trim()) return; setBusy(true); setTimeout(()=>{setBusy(false);setDone(true);},2000); };
//   if(done) return (
//     <div className="mbd" onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(17,24,39,.5)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
//       <div className="mdg card" style={{width:"100%",maxWidth:400,padding:36,textAlign:"center"}}>
//         <div style={{fontSize:48,marginBottom:16}}>✉️</div>
//         <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:22,color:V.text,marginBottom:8}}>Ticket sent!</div>
//         <div style={{fontSize:14,color:V.muted,lineHeight:1.7,marginBottom:24}}>Your confirmation was sent to <strong>{email}</strong>. Show it at the venue entrance.</div>
//         <button className="bp" onClick={onClose} style={{width:"100%",justifyContent:"center",padding:13}}>Done</button>
//       </div>
//     </div>
//   );
//   return (
//     <div className="mbd" onClick={e=>e.target===e.currentTarget&&onClose()} style={{position:"fixed",inset:0,background:"rgba(17,24,39,.5)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
//       <div className="mdg card" style={{width:"100%",maxWidth:420,padding:28}}>
//         <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
//           <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:18,color:V.text}}>Claim Free Ticket</div>
//           <button className="bg" onClick={onClose} style={{borderRadius:"50%",width:34,height:34,padding:0,justifyContent:"center"}}><X size={16}/></button>
//         </div>
//         {!mode ? (
//           <div style={{display:"flex",flexDirection:"column",gap:12}}>
//             <p style={{fontSize:14,color:V.muted,marginBottom:6,lineHeight:1.7}}>How would you like to receive your ticket for <strong style={{color:V.text}}>{event.name}</strong>?</p>
//             <button onClick={()=>{if(!requireWallet("Connect your wallet to claim an NFT ticket.")) return; setMode("wallet");}} className="bs" style={{width:"100%",justifyContent:"flex-start",padding:"14px 18px",borderRadius:14,gap:14}}>
//               <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#7C3AED,#5B21B6)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Wallet size={18} color="white"/></div>
//               <div style={{textAlign:"left"}}><div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:V.text}}>Wallet NFT Ticket</div><div style={{fontSize:12,color:V.muted}}>Receive as an NFT in your wallet</div></div>
//             </button>
//             <button onClick={()=>setMode("email")} className="bs" style={{width:"100%",justifyContent:"flex-start",padding:"14px 18px",borderRadius:14,gap:14}}>
//               <div style={{width:36,height:36,borderRadius:10,background:"#F0FDF4",border:"1px solid #86EFAC",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Mail size={18} color="#16A34A"/></div>
//               <div style={{textAlign:"left"}}><div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:V.text}}>Email Ticket</div><div style={{fontSize:12,color:V.muted}}>Confirmation email — no wallet needed</div></div>
//             </button>
//           </div>
//         ) : mode==="wallet" ? (
//           <div style={{textAlign:"center",padding:"12px 0"}}>
//             <CheckCircle size={40} color={V.brand} style={{margin:"0 auto 12px"}}/>
//             <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:18,color:V.text,marginBottom:8}}>NFT Ticket Minted!</div>
//             <div style={{fontSize:14,color:V.muted,marginBottom:20}}>Your ticket NFT has been sent to your wallet.</div>
//             <button className="bp" onClick={onClose} style={{width:"100%",justifyContent:"center",padding:12}}>View My Tickets</button>
//           </div>
//         ) : (
//           <div style={{display:"flex",flexDirection:"column",gap:14}}>
//             <button className="bg" onClick={()=>setMode(null)} style={{alignSelf:"flex-start",padding:"4px 8px",fontSize:13}}>← Back</button>
//             <div><label className="lbl">Full Name</label><input className="inp" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/></div>
//             <div><label className="lbl">Email Address</label><input className="inp" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
//             <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:12,padding:"10px 14px",fontSize:12,color:"#92400E",lineHeight:1.6,display:"flex",gap:8}}>
//               <AlertCircle size={14} style={{flexShrink:0,marginTop:1}}/><span>This is an off-chain ticket — not an NFT. For venue entry only, not verifiable on-chain.</span>
//             </div>
//             <button className="bp" onClick={submitEmail} disabled={busy||!name||!email} style={{width:"100%",justifyContent:"center",padding:13}}>
//               {busy?<><RefreshCw size={14} className="spin"/>Sending…</>:<>Send My Ticket</>}
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
