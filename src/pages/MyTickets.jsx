// import { Wallet, RefreshCw } from "lucide-react";
// import { V } from "../utils/constants";
// import { useWallet } from "../context/WalletContext";
// import { useApp } from "../context/AppContext";
// import TicketModal from "../components/ticket/TicketModal";
// import QRCode from "../components/ui/QRCode";
// import { formatDate } from "../utils/format";
// import { useState } from "react";
// import { Calendar, MapPin, CheckCircle } from "lucide-react";

// export default function MyTicketsPage() {
//   const { wallet, connect, connecting } = useWallet();
//   const { tickets, loadingTickets, refreshTickets } = useApp();
//   const [open, setOpen] = useState(null);

//   if (!wallet) return (
//     <div style={{padding:"80px 24px",display:"flex",alignItems:"center",justifyContent:"center",minHeight:"80vh"}}>
//       <div style={{textAlign:"center",maxWidth:380}}>
//         <div style={{width:70,height:70,borderRadius:20,background:V.b50,border:"1px solid "+V.b100,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
//           <Wallet size={30} color={V.brand}/>
//         </div>
//         <h2 style={{fontFamily:"Outfit",fontWeight:900,fontSize:25,marginBottom:10,color:V.text}}>Your Tickets</h2>
//         <p style={{color:V.muted,marginBottom:24,lineHeight:1.7,fontSize:14}}>
//           Connect your wallet to see your NFT tickets and reveal QR codes.
//         </p>
//         <button className="bp" onClick={connect} disabled={connecting} style={{borderRadius:14,padding:"13px 28px",fontSize:14,gap:10}}>
//           {connecting ? <><RefreshCw size={14} className="spin"/>Connecting…</> : <><Wallet size={15}/>Connect Wallet</>}
//         </button>
//       </div>
//     </div>
//   );

//   return (
//     <div style={{padding:"80px 24px 80px",maxWidth:860,margin:"0 auto"}}>
//       {open && <TicketModal ticket={open} onClose={()=>setOpen(null)}/>}

//       <div className="fu" style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26}}>
//         <div>
//           <h1 style={{fontFamily:"Outfit",fontWeight:900,fontSize:30,color:V.text,marginBottom:4}}>My Tickets</h1>
//           <p style={{color:V.muted,fontSize:14}}>
//             {loadingTickets ? "Loading…" : tickets.length+" ticket"+(tickets.length!==1?"s":"")+" in your wallet"}
//           </p>
//         </div>
//         <button className="bg" onClick={()=>refreshTickets(wallet)} style={{gap:6,color:V.muted,fontSize:13}}>
//           <RefreshCw size={13} className={loadingTickets?"spin":""}/>Refresh
//         </button>
//       </div>

//       {loadingTickets ? (
//         <div style={{textAlign:"center",padding:"60px 0"}}>
//           <div style={{width:32,height:32,borderRadius:"50%",border:"3px solid "+V.b100,borderTopColor:V.brand,margin:"0 auto 14px",animation:"spinA 1s linear infinite"}}/>
//           <div style={{color:V.muted,fontFamily:"Outfit",fontWeight:600}}>Loading from blockchain…</div>
//         </div>
//       ) : tickets.length===0 ? (
//         <div style={{textAlign:"center",padding:"60px 24px",color:V.muted}}>
//           <div style={{fontSize:48,marginBottom:16}}>🎫</div>
//           <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:20,color:V.text,marginBottom:8}}>No tickets yet</div>
//           <div style={{fontSize:14,lineHeight:1.7}}>Buy tickets to events and they will appear here as NFTs.</div>
//         </div>
//       ) : (
//         <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:20}}>
//           {tickets.map((t,i)=>{
//             const ev = t.event;
//             return (
//               <div key={t.tokenId} className="ci fu" style={{animationDelay:i*.07+"s",overflow:"hidden"}} onClick={()=>setOpen(t)}>
//                 {/* Ticket header — gradient */}
//                 <div style={{background:"linear-gradient(135deg,#00C48A,#007050)",padding:"16px 16px 0",display:"flex",alignItems:"center",gap:12}}>
//                   <div style={{background:"rgba(255,255,255,.92)",borderRadius:8,padding:5,flexShrink:0}}>
//                     <QRCode data={"MINTY-"+t.tokenId} size={52} dark="#1F2937"/>
//                   </div>
//                   <div style={{flex:1,minWidth:0}}>
//                     <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:14,color:"white",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.name}</div>
//                     <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:3}}>Token #{t.tokenId}</div>
//                   </div>
//                 </div>
//                 {/* Perforation */}
//                 <div style={{background:"linear-gradient(135deg,#00C48A,#007050)",padding:"0 10px",display:"flex",alignItems:"center"}}>
//                   <div style={{width:12,height:12,borderRadius:"50%",background:"white",flexShrink:0}}/>
//                   <div style={{flex:1,height:0,borderTop:"2px dashed rgba(255,255,255,.35)",margin:"0 3px"}}/>
//                   <div style={{width:12,height:12,borderRadius:"50%",background:"white",flexShrink:0}}/>
//                 </div>
//                 {/* Ticket footer */}
//                 <div style={{padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
//                   <div>
//                     <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:V.muted,marginBottom:3}}>
//                       <Calendar size={10}/>{formatDate(ev.startTime)}
//                     </div>
//                     {ev.city && (
//                       <div style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:V.muted}}>
//                         <MapPin size={10}/>{[ev.city,ev.country].filter(Boolean).join(", ")}
//                       </div>
//                     )}
//                   </div>
//                   {t.checkedIn
//                     ? <span className="bdg bdg-g"><CheckCircle size={9}/>Used</span>
//                     : <span style={{fontSize:11,fontFamily:"Outfit",fontWeight:700,color:V.brand,background:V.b50,border:"1px solid "+V.b100,borderRadius:8,padding:"5px 10px"}}>Tap for QR</span>
//                   }
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }
