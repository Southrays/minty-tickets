import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { X, ScanLine, ChevronDown, CheckCircle, XCircle, RefreshCw, CameraOff, AlertCircle } from "lucide-react";
import { V } from "../../utils/constants";
import { formatDate, shortAddr } from "../../utils/format";
import { getReadContract, getWriteContract } from "../../utils/contract";

const QR_EPOCH_SECS = 60;
const MAX_EPOCH_AGE = 2;

function currentEpoch() { return Math.floor(Date.now() / (QR_EPOCH_SECS * 1000)); }

function parseQR(raw) {
  const m = raw.match(/^MINTY-(\d+)-(\d+)-(\d+)$/);
  if (!m) return null;
  return { tokenId: Number(m[1]), eventId: Number(m[2]), epoch: Number(m[3]) };
}

async function verifyAndCheckIn(tokenId, eventId) {
  const rc = await getReadContract();
  const ticketData = await rc.tickets(tokenId);
  if (Number(ticketData.eventId) !== eventId) {
    return { ok: false, reason: `Ticket #${tokenId} belongs to event #${Number(ticketData.eventId)}, not #${eventId}.` };
  }
  if (ticketData.checkedIn) {
    return { ok: false, alreadyUsed: true, reason: `Ticket #${tokenId} was already checked in.` };
  }
  let owner = "unknown";
  try { owner = shortAddr(await rc.ownerOf(tokenId)); } catch {}
  try {
    const wc = await getWriteContract();
    const tx = await wc.syncOfflineCheckIns(eventId, [tokenId], [[]]);
    const receipt = await tx.wait();
    return { ok: true, tokenId, owner, txHash: receipt.hash };
  } catch (err) {
    return {
      ok: true,
      onChainCheckInFailed: true,
      tokenId,
      owner,
      contractError: (err?.reason || err?.message || "").slice(0, 120),
    };
  }
}

export default function ScanModal({ events = [], onClose }) {
  const [sel,       setSel]       = useState(null);
  const [showD,     setShowD]     = useState(false);
  const [camState,  setCamState]  = useState("idle");
  const [camErr,    setCamErr]    = useState("");
  const [scanState, setScanState] = useState("scanning");
  const [lastRaw,   setLastRaw]   = useState("");
  const [result,    setResult]    = useState(null);
  const [resultErr, setResultErr] = useState("");
  const [processing,setProcessing]= useState(false);

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const mountedRef = useRef(true);
  // Keep latest values accessible in callbacks without re-creating them
  const selRef        = useRef(sel);
  const lastRawRef    = useRef(lastRaw);
  const processingRef = useRef(processing);
  const scanStateRef  = useRef(scanState);

  useEffect(() => { selRef.current        = sel;        }, [sel]);
  useEffect(() => { lastRawRef.current    = lastRaw;    }, [lastRaw]);
  useEffect(() => { processingRef.current = processing; }, [processing]);
  useEffect(() => { scanStateRef.current  = scanState;  }, [scanState]);

  const stopCamera = useCallback(() => {
    if (rafRef.current)    { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);

  const handleQRFound = useCallback(async (raw) => {
    setProcessing(true);
    setScanState("decoding");

    const parsed = parseQR(raw);
    if (!parsed) {
      setResultErr(`Unrecognised QR.\nGot: "${raw.slice(0, 60)}${raw.length > 60 ? "…" : ""}"`);
      setResult({ ok: false });
      setScanState("done");
      setProcessing(false);
      return;
    }

    const { tokenId, eventId, epoch } = parsed;
    const now = currentEpoch();
    if (epoch < now - MAX_EPOCH_AGE) {
      setResultErr(`QR expired (epoch ${epoch}, now ${now}). Ask attendee to re-reveal.`);
      setResult({ ok: false });
      setScanState("done");
      setProcessing(false);
      return;
    }

    const currentSel = selRef.current;
    if (currentSel && eventId !== currentSel.id) {
      setResultErr(`Ticket is for event #${eventId}, not "${currentSel.name}" (#${currentSel.id}).`);
      setResult({ ok: false });
      setScanState("done");
      setProcessing(false);
      return;
    }

    setScanState("verifying");
    try {
      const res = await verifyAndCheckIn(tokenId, eventId);
      if (!mountedRef.current) return;
      setResult(res);
      if (!res.ok) setResultErr(res.reason || "Verification failed.");
      setScanState("done");
    } catch (err) {
      if (!mountedRef.current) return;
      setResultErr("On-chain error: " + (err?.reason || err?.message || "Unknown"));
      setResult({ ok: false });
      setScanState("done");
    } finally {
      setProcessing(false);
    }
  }, []); // no state deps — reads via refs

  const decodeFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    if (processingRef.current || scanStateRef.current !== "scanning") return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    const code = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
    if (!code || code.data === lastRawRef.current) return;

    setLastRaw(code.data);
    handleQRFound(code.data);
  }, [handleQRFound]); // stable — reads mutable state via refs

  const startCamera = useCallback(async () => {
    const currentSel = selRef.current;
    if (!currentSel) return;
    stopCamera();
    setCamState("requesting");
    setCamErr("");
    setResult(null);
    setResultErr("");
    setLastRaw("");
    setScanState("scanning");
    setProcessing(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      setCamState("active");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const tick = () => {
        if (!mountedRef.current || !streamRef.current) return;
        decodeFrame();
        rafRef.current = requestAnimationFrame(tick);
      };
      setTimeout(() => { if (mountedRef.current && streamRef.current) tick(); }, 400);

    } catch (err) {
      if (!mountedRef.current) return;
      setCamState("error");
      if      (err.name === "NotAllowedError") setCamErr("Camera permission denied. Allow access in your browser settings.");
      else if (err.name === "NotFoundError")   setCamErr("No camera found on this device.");
      else                                     setCamErr("Camera error: " + (err.message || err.name));
    }
  }, [stopCamera, decodeFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { mountedRef.current = false; stopCamera(); };
  }, [stopCamera]);

  // Start/stop camera when event selection changes
  useEffect(() => {
    if (sel) startCamera();
    else     stopCamera();
  }, [sel, startCamera, stopCamera]);

  const resetScan = () => {
    setResult(null);
    setResultErr("");
    setLastRaw("");
    setScanState("scanning");
    setProcessing(false);
  };

  return (
    <div className="mbd" onClick={e => e.target === e.currentTarget && onClose()}
      style={{position:"fixed",inset:0,background:"rgba(17,24,39,.65)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>

      <div className="mdg card" style={{width:"100%",maxWidth:480,overflow:"hidden"}}>

        <div style={{padding:"22px 24px 0",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div>
            <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:18,color:V.text}}>Scan Tickets</div>
            <div style={{fontSize:13,color:V.muted,marginTop:2}}>Verify attendees at the door</div>
          </div>
          <button className="bg" onClick={onClose} style={{borderRadius:"50%",width:34,height:34,padding:0,justifyContent:"center"}}><X size={16}/></button>
        </div>

        <div style={{padding:"0 24px 24px"}}>
          {events.length === 0 ? (
            <div style={{textAlign:"center",padding:"32px 0",color:V.muted}}>
              <ScanLine size={36} style={{margin:"0 auto 12px",opacity:.3}}/>
              <div style={{fontFamily:"Outfit",fontWeight:600,fontSize:15,marginBottom:5}}>No events to scan</div>
              <div style={{fontSize:13}}>Create an event first.</div>
            </div>
          ) : (
            <>
              <div style={{marginBottom:16}}>
                <label className="lbl">Event</label>
                <div style={{position:"relative"}}>
                  <button onClick={() => setShowD(p => !p)} className="inp"
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",textAlign:"left",gap:10}}>
                    <span style={{color:sel?V.text:V.mutedL,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {sel ? sel.name : "Select an event…"}
                    </span>
                    <ChevronDown size={15} color={V.muted}/>
                  </button>
                  {showD && (
                    <div className="dd" style={{top:"calc(100% + 6px)",left:0,right:0}}>
                      {events.map(ev => (
                        <div key={ev.id} className="ddi"
                          onMouseDown={() => { setSel(ev); setShowD(false); resetScan(); }}>
                          <div style={{width:36,height:36,borderRadius:9,background:ev.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{ev.emoji}</div>
                          <div>
                            <div style={{fontFamily:"Outfit",fontWeight:600,fontSize:14,color:V.text}}>{ev.name}</div>
                            <div style={{fontSize:12,color:V.muted}}>{formatDate(ev.startTime)} · {ev.soldTickets} sold</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {sel && (
                <div>
                  <canvas ref={canvasRef} style={{display:"none"}}/>

                  <div style={{borderRadius:16,overflow:"hidden",background:"#0a0a14",position:"relative",aspectRatio:"4/3",marginBottom:14}}>
                    {camState === "active" && (
                      <video ref={videoRef} autoPlay playsInline muted
                        style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    )}
                    {camState === "requesting" && (
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14}}>
                        <RefreshCw size={30} color={V.brand} className="spin"/>
                        <div style={{fontFamily:"Outfit",fontWeight:600,fontSize:14,color:"white"}}>Requesting camera…</div>
                      </div>
                    )}
                    {camState === "error" && (
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:24,textAlign:"center"}}>
                        <CameraOff size={34} color="#EF4444"/>
                        <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:"white"}}>Camera unavailable</div>
                        <div style={{fontSize:12,color:"#9CA3AF",lineHeight:1.6}}>{camErr}</div>
                        <button className="bp" onClick={startCamera} style={{borderRadius:11,padding:"9px 20px",fontSize:13}}>Try Again</button>
                      </div>
                    )}
                    {camState === "active" && (
                      <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
                        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"62%",aspectRatio:"1"}}>
                          {[
                            {top:0,left:0,borderTop:"3px solid",borderLeft:"3px solid"},
                            {top:0,right:0,borderTop:"3px solid",borderRight:"3px solid"},
                            {bottom:0,left:0,borderBottom:"3px solid",borderLeft:"3px solid"},
                            {bottom:0,right:0,borderBottom:"3px solid",borderRight:"3px solid"},
                          ].map((s,i) => (
                            <div key={i} style={{position:"absolute",width:22,height:22,borderColor:"rgba(0,196,138,.85)",borderRadius:3,...s}}/>
                          ))}
                          {scanState === "scanning" && (
                            <div style={{position:"absolute",left:0,right:0,height:2,background:"rgba(0,196,138,.75)",boxShadow:"0 0 8px rgba(0,196,138,.9)",animation:"scanLine 1.8s ease-in-out infinite"}}/>
                          )}
                        </div>
                        <div style={{position:"absolute",bottom:14,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)",borderRadius:20,padding:"7px 18px",display:"flex",alignItems:"center",gap:8,whiteSpace:"nowrap"}}>
                          {scanState === "scanning" && (<><div style={{width:8,height:8,borderRadius:"50%",background:"#00C48A",animation:"pulse 1.2s ease-in-out infinite"}}/><span style={{color:"white",fontSize:12,fontFamily:"Outfit",fontWeight:600}}>Scanning…</span></>)}
                          {scanState === "decoding"  && (<><RefreshCw size={13} color="white"   className="spin"/><span style={{color:"white",  fontSize:12,fontFamily:"Outfit",fontWeight:600}}>Decoding QR…</span></>)}
                          {scanState === "verifying" && (<><RefreshCw size={13} color="#A78BFA" className="spin"/><span style={{color:"#A78BFA",fontSize:12,fontFamily:"Outfit",fontWeight:600}}>Verifying on-chain…</span></>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {scanState === "done" && result?.ok && (
                    <div style={{marginBottom:12}}>
                      {result.onChainCheckInFailed ? (
                        <div style={{background:"#FFFBEB",border:"1px solid #FCD34D",borderRadius:14,padding:18}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                            <div style={{width:40,height:40,borderRadius:11,background:"#FEF3C7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><CheckCircle size={20} color="#D97706"/></div>
                            <div>
                              <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:15,color:"#92400E"}}>Valid — Manual Check-in</div>
                              <div style={{fontSize:12,color:"#B45309",marginTop:2}}>On-chain checkIn needs AI signer backend</div>
                            </div>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                            {[{l:"Token ID",v:"#"+result.tokenId},{l:"Holder",v:result.owner}].map(({l,v}) => (
                              <div key={l} style={{background:"rgba(0,0,0,.05)",borderRadius:8,padding:"8px 10px"}}>
                                <div style={{fontSize:9,color:"#92400E",fontFamily:"Outfit",fontWeight:800,textTransform:"uppercase",letterSpacing:".1em",marginBottom:2}}>{l}</div>
                                <div style={{fontSize:13,fontFamily:"Outfit",fontWeight:700,color:"#78350F"}}>{v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:14,padding:18}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                            <div style={{width:42,height:42,borderRadius:12,background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><CheckCircle size={22} color="#16A34A"/></div>
                            <div>
                              <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:16,color:"#15803D"}}>Checked In!</div>
                              <div style={{fontSize:12,color:"#166534",marginTop:2}}>Verified and marked on-chain ✓</div>
                            </div>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                            {[{l:"Token ID",v:"#"+result.tokenId},{l:"Holder",v:result.owner}].map(({l,v}) => (
                              <div key={l} style={{background:"rgba(0,0,0,.04)",borderRadius:8,padding:"8px 10px"}}>
                                <div style={{fontSize:9,color:"#166534",fontFamily:"Outfit",fontWeight:800,textTransform:"uppercase",letterSpacing:".1em",marginBottom:2}}>{l}</div>
                                <div style={{fontSize:13,fontFamily:"Outfit",fontWeight:700,color:"#15803D"}}>{v}</div>
                              </div>
                            ))}
                          </div>
                          {result.txHash && (
                            <div style={{fontSize:10,fontFamily:"monospace",color:"#16A34A",marginTop:10,background:"rgba(0,0,0,.04)",borderRadius:7,padding:"5px 9px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              Tx: {result.txHash}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {scanState === "done" && result && !result.ok && (
                    <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:14,padding:18,marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <div style={{width:38,height:38,borderRadius:11,background:"#FEE2E2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          {result.alreadyUsed ? <AlertCircle size={20} color="#EF4444"/> : <XCircle size={20} color="#EF4444"/>}
                        </div>
                        <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:15,color:"#DC2626"}}>
                          {result.alreadyUsed ? "Already Used" : "Invalid Ticket"}
                        </div>
                      </div>
                      <div style={{fontSize:13,color:"#B91C1C",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{resultErr}</div>
                    </div>
                  )}

                  {scanState === "done" && (
                    <button className="bp" onClick={resetScan} style={{width:"100%",justifyContent:"center",padding:12,borderRadius:13}}>
                      <ScanLine size={14}/> Scan Next Ticket
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scanLine { 0%{top:6%} 50%{top:90%} 100%{top:6%} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
      `}</style>
    </div>
  );
}