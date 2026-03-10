import { useState } from "react";
import { X, ScanLine, ChevronDown, CheckCircle, RefreshCw } from "lucide-react";
import { V } from "../../utils/constants";
import { formatDate } from "../../utils/format";

export default function ScanModal({ events = [], onClose }) {
  const [sel,     setSel]     = useState(null);
  const [showD,   setShowD]   = useState(false);
  const [scanning,setScanning]= useState(false);
  const [result,  setResult]  = useState(null);
  const [scanInput,setScanInput]=useState("");

  const scan = () => {
    if (!sel) return;
    setScanning(true);
    // TODO: integrate real camera QR scanner (e.g. react-qr-reader)
    // For now simulate a successful scan after 2s
    setTimeout(() => {
      setScanning(false);
      setResult({ valid: true, tokenId: Math.floor(Math.random()*9999) });
    }, 2000);
  };

  return (
    <div className="mbd" onClick={e=>e.target===e.currentTarget&&onClose()}
      style={{position:"fixed",inset:0,background:"rgba(17,24,39,.55)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
      <div className="mdg card" style={{width:"100%",maxWidth:440,padding:28}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
          <div>
            <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:18,color:V.text}}>Scan Tickets</div>
            <div style={{fontSize:13,color:V.muted,marginTop:2}}>Verify attendees at the door</div>
          </div>
          <button className="bg" onClick={onClose} style={{borderRadius:"50%",width:34,height:34,padding:0,justifyContent:"center"}}><X size={16}/></button>
        </div>

        {events.length===0 ? (
          <div style={{textAlign:"center",padding:"28px 0",color:V.muted}}>
            <ScanLine size={36} style={{margin:"0 auto 12px",opacity:.3}}/>
            <div style={{fontFamily:"Outfit",fontWeight:600,fontSize:15,marginBottom:5}}>No events to scan for</div>
            <div style={{fontSize:13}}>Create an event first to use the scanner.</div>
          </div>
        ) : (
          <>
            <div style={{marginBottom:18}}>
              <label className="lbl">Select Event</label>
              <div style={{position:"relative"}}>
                <button onClick={()=>setShowD(!showD)} className="inp"
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",textAlign:"left",gap:10}}>
                  <span style={{color:sel?V.text:V.mutedL,flex:1}}>{sel?sel.name:"Select an event…"}</span>
                  <ChevronDown size={15} color={V.muted}/>
                </button>
                {showD && (
                  <div className="dd" style={{top:"calc(100% + 6px)",left:0,right:0}}>
                    {events.map(ev=>(
                      <div key={ev.id} className="ddi" onMouseDown={()=>{setSel(ev);setShowD(false);setResult(null);}}>
                        <div style={{width:36,height:36,borderRadius:9,background:ev.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{ev.emoji}</div>
                        <div>
                          <div style={{fontFamily:"Outfit",fontWeight:600,fontSize:14,color:V.text}}>{ev.name}</div>
                          <div style={{fontSize:12,color:V.muted}}>{formatDate(ev.startTime)} · {ev.soldTickets} tickets sold</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {sel && !result && (
              <div style={{background:V.surface,borderRadius:16,padding:22,textAlign:"center",marginBottom:16}}>
                <div style={{width:72,height:72,borderRadius:18,background:V.b50,border:"2px dashed "+V.b100,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>
                  {scanning ? <RefreshCw size={26} color={V.brand} className="spin"/> : <ScanLine size={26} color={V.brand}/>}
                </div>
                <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:15,color:V.text,marginBottom:4}}>
                  {scanning ? "Scanning…" : "Ready to scan"}
                </div>
                <div style={{fontSize:13,color:V.muted,marginBottom:14}}>
                  {scanning ? "Verifying on-chain…" : "Point camera at attendee QR code"}
                </div>
                <button className="bp" onClick={scan} disabled={scanning} style={{width:"100%",justifyContent:"center",padding:12}}>
                  {scanning ? "Scanning…" : "Simulate Scan"}
                </button>
                <p style={{fontSize:11,color:V.mutedL,marginTop:10}}>Camera QR scanning coming soon (react-qr-reader)</p>
              </div>
            )}

            {result && (
              <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:14,padding:18,textAlign:"center"}}>
                <CheckCircle size={30} color="#16A34A" style={{margin:"0 auto 9px"}}/>
                <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:16,color:"#15803D",marginBottom:4}}>Valid Ticket</div>
                <div style={{fontSize:13,color:"#166534"}}>Token #{result.tokenId} — checked in successfully</div>
                <button className="bs" onClick={()=>setResult(null)} style={{marginTop:12,width:"100%",justifyContent:"center"}}>
                  Scan Next Ticket
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
