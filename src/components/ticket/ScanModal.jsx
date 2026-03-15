import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { X, ScanLine, ChevronDown, CheckCircle, XCircle, RefreshCw, Camera, CameraOff, AlertCircle } from "lucide-react";
import { V } from "../../utils/constants";
import { formatDate, shortAddr } from "../../utils/format";
import { getReadContract, getWriteContract } from "../../utils/contract";

// QR epoch window: accept current epoch and 1 epoch behind (max ~2 min old)
const QR_EPOCH_SECS = 60;
function currentEpoch() { return Math.floor(Date.now() / (QR_EPOCH_SECS * 1000)); }
function parseQR(raw) {
  // Format: MINTY-{tokenId}-{eventId}-{epoch}
  const m = raw.match(/^MINTY-(\d+)-(\d+)-(\d+)$/);
  if (!m) return null;
  return { tokenId: Number(m[1]), eventId: Number(m[2]), epoch: Number(m[3]) };
}

// ── Verify a ticket on-chain and call checkIn ──────────────────────────────
async function verifyAndCheckIn(tokenId, eventId, organizerAddress) {
  const rc = await getReadContract();

  // 1. Read ticket data
  const ticketData = await rc.tickets(tokenId);
  const onChainEventId = Number(ticketData.eventId);

  // 2. Verify event matches
  if (onChainEventId !== eventId) {
    return { ok: false, reason: `Ticket #${tokenId} belongs to event #${onChainEventId}, not #${eventId}.` };
  }

  // 3. Already checked in?
  if (ticketData.checkedIn) {
    return { ok: false, reason: `Ticket #${tokenId} was already checked in.`, alreadyUsed: true };
  }

  // 4. Read ticket owner
  const owner = await rc.ownerOf(tokenId);

  // 5. Use organizerCheckIn — works for organizer OR any check-in manager they appointed
  //    The contract allows check-in from 10 hours before event start through event end
  try {
    const wc = await getWriteContract();
    const tx = await wc.organizerCheckIn(tokenId);
    await tx.wait();
    return {
      ok: true,
      tokenId,
      owner: shortAddr(owner),
      txHash: tx.hash,
      method: "organizerCheckIn",
    };
  } catch (orgErr) {
    // organizerCheckIn failed — try syncOfflineCheckIns as fallback
    // (useful if network was briefly down and we're syncing a batch)
    try {
      const wc = await getWriteContract();
      const tx = await wc.syncOfflineCheckIns(eventId, [tokenId]);
      await tx.wait();
      return {
        ok: true,
        tokenId,
        owner: shortAddr(owner),
        txHash: tx.hash,
        method: "syncOfflineCheckIns",
      };
    } catch (syncErr) {
      const errMsg = (syncErr?.reason || syncErr?.message || "").slice(0, 160);
      return {
        ok: false,
        reason: `Check-in failed: ${errMsg || "Make sure you are the organizer or an appointed check-in manager."}`,
      };
    }
  }
}

// ── ScanModal ──────────────────────────────────────────────────────────────
export default function ScanModal({ events = [], wallet, onClose }) {
  const [sel,      setSel]      = useState(null);
  const [showD,    setShowD]    = useState(false);

  // Check-in manager: enter an organizer address to load their events
  const [orgInput,    setOrgInput]    = useState("");
  const [orgEvents,   setOrgEvents]   = useState(null);  // null = not loaded
  const [orgLoading,  setOrgLoading]  = useState(false);
  const [orgErr,      setOrgErr]      = useState("");

  const loadOrgEvents = async () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(orgInput.trim())) {
      setOrgErr("Enter a valid wallet address (0x…)"); return;
    }
    setOrgLoading(true); setOrgErr(""); setOrgEvents(null); setSel(null);
    try {
      const { fetchOrganizerEvents, isCheckInManagerFor } = await import("../../utils/contract");
      const [evs, isMgr] = await Promise.all([
        fetchOrganizerEvents(orgInput.trim()),
        wallet ? isCheckInManagerFor(orgInput.trim(), wallet) : Promise.resolve(false),
      ]);
      if (!isMgr) {
        setOrgErr("You are not a check-in manager for this organizer.");
        setOrgEvents(null);
      } else {
        setOrgEvents(evs.filter(e => { const now = Date.now()/1000; return now >= e.startTime && now <= e.endTime + 86400; }));
        if (!evs.length) setOrgErr("This organizer has no active events.");
      }
    } catch (e) { setOrgErr(e?.message || "Failed to load events."); }
    finally { setOrgLoading(false); }
  };

  // Combine own events + loaded organizer events for dropdown
  const allEvents = orgEvents !== null ? orgEvents : events;

  // camera states: "idle" | "requesting" | "active" | "error"
  const [camState, setCamState] = useState("idle");
  const [camErr,   setCamErr]   = useState("");

  // scan states: "scanning" | "decoding" | "verifying" | "done"
  const [scanState, setScanState] = useState("scanning");
  const setScan = (s) => { scanStateRef.current = s; setScanState(s); };
  const [lastRaw,    setLastRaw]    = useState("");
  const [result,     setResult]     = useState(null);  // { ok, tokenId, owner, txHash, ... }
  const [resultErr,  setResultErr]  = useState("");

  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);
  const rafRef     = useRef(null);
  const mountedRef = useRef(true);
  // Ref mirror of scanState so callbacks never go stale
  const scanStateRef = useRef("scanning");

  // ── 1. stopCamera (no deps on other callbacks) ────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount — defined after stopCamera so the ref is available
  useEffect(() => { return () => { mountedRef.current = false; stopCamera(); }; }, [stopCamera]);

  // ── 2. handleQRFound (no deps on other callbacks) ─────────────────────
  const handleQRFound = useCallback(async (raw) => {
    if (scanStateRef.current !== "scanning") return;
    setScan("decoding");

    const parsed = parseQR(raw);
    if (!parsed) {
      setResultErr(`Unrecognised QR code. Expected Minty Tickets format.\nGot: "${raw.slice(0, 60)}"`);
      setScan("done"); setResult({ ok: false }); return;
    }

    const { tokenId, eventId, epoch } = parsed;

    const now = currentEpoch();
    if (epoch < now - 2) {
      setResultErr(`QR code has expired (epoch ${epoch}, current ${now}). Ask the attendee to re-reveal their ticket.`);
      setScan("done"); setResult({ ok: false }); return;
    }

    if (sel && eventId !== sel.id) {
      setResultErr(`This ticket is for event #${eventId}, but you selected "${sel.name}" (event #${sel.id}).`);
      setScan("done"); setResult({ ok: false }); return;
    }

    setScan("verifying");
    try {
      const res = await verifyAndCheckIn(tokenId, eventId, wallet);
      if (!mountedRef.current) return;
      if (res.ok) { setResult(res); setScan("done"); }
      else { setResultErr(res.reason || "Verification failed."); setScan("done"); setResult({ ok: false }); }
    } catch (err) {
      if (!mountedRef.current) return;
      setResultErr("On-chain error: " + (err?.reason || err?.message || "Unknown error"));
      setScan("done"); setResult({ ok: false });
    }
  }, [sel, wallet]);

  // ── 3. decodeFrame (depends on handleQRFound) ─────────────────────────
  const decodeFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return;

    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);

    const code = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });
    if (!code) return;

    const raw = code.data;
    if (raw === lastRaw) return;
    setLastRaw(raw);
    handleQRFound(raw);
  }, [lastRaw, handleQRFound]);

  // ── 4. startCamera (depends on stopCamera + decodeFrame) ──────────────
  const startCamera = useCallback(async () => {
    if (!sel) return;
    stopCamera();
    setCamState("requesting"); setCamErr("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

      streamRef.current = stream;
      setCamState("active");
      setScan("scanning");
      setResult(null); setResultErr(""); setLastRaw("");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      const tick = () => {
        if (!mountedRef.current || !streamRef.current) return;
        decodeFrame();
        rafRef.current = requestAnimationFrame(tick);
      };
      setTimeout(() => { if (mountedRef.current && streamRef.current) tick(); }, 300);

    } catch (err) {
      if (!mountedRef.current) return;
      setCamState("error");
      if (err.name === "NotAllowedError") setCamErr("Camera permission denied. Please allow camera access in your browser.");
      else if (err.name === "NotFoundError") setCamErr("No camera found on this device.");
      else setCamErr("Camera error: " + (err.message || err.name));
    }
  }, [sel, stopCamera, decodeFrame]);

  // Start/stop camera when selected event changes
  useEffect(() => {
    if (sel) startCamera();
    else stopCamera();
  }, [sel, startCamera, stopCamera]);

  const resetScan = () => {
    setResult(null); setResultErr(""); setLastRaw(""); setScan("scanning");
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="mbd" onClick={e => e.target === e.currentTarget && onClose()}
      style={{position:"fixed",inset:0,background:"rgba(17,24,39,.65)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
      <div className="mdg card" style={{width:"100%",maxWidth:480}}>

        {/* Header */}
        <div style={{padding:"22px 24px 0",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div>
            <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:18,color:V.text}}>Scan Tickets</div>
            <div style={{fontSize:13,color:V.muted,marginTop:2}}>Verify attendees at the door</div>
          </div>
          <button className="bg" onClick={onClose} style={{borderRadius:"50%",width:34,height:34,padding:0,justifyContent:"center"}}><X size={16}/></button>
        </div>

        <div style={{padding:"0 24px 24px"}}>
          {allEvents.length === 0 ? (
            <div style={{textAlign:"center",padding:"28px 0",color:V.muted}}>
              <ScanLine size={36} style={{margin:"0 auto 12px",opacity:.3}}/>
              <div style={{fontFamily:"Outfit",fontWeight:600,fontSize:15,marginBottom:5}}>No events to scan</div>
              <div style={{fontSize:13}}>Create an event first to use the scanner.</div>
            </div>
          ) : (
            <>
              {/* Check-in manager: scan for another organizer */}
              <div style={{marginBottom:12,background:V.b50,borderRadius:12,padding:"10px 12px",border:"1px solid "+V.b100}}>
                <div style={{fontSize:11,fontFamily:"Outfit",fontWeight:700,color:V.brand,textTransform:"uppercase",letterSpacing:".07em",marginBottom:8}}>
                  Scan for another organizer
                </div>
                <div style={{display:"flex",gap:8}}>
                  <input className="inp" placeholder="Organizer wallet 0x…"
                    value={orgInput} onChange={e=>{setOrgInput(e.target.value);setOrgErr("");}}
                    style={{flex:1,fontSize:12,padding:"7px 10px"}}/>
                  <button className="bp" onClick={loadOrgEvents} disabled={orgLoading||!orgInput}
                    style={{padding:"7px 12px",borderRadius:10,fontSize:12,gap:4,flexShrink:0}}>
                    {orgLoading?<RefreshCw size={12} className="spin"/>:"Load"}
                  </button>
                </div>
                {orgErr && <div style={{fontSize:11,color:"#EF4444",marginTop:6,display:"flex",alignItems:"center",gap:4}}><AlertCircle size={10}/>{orgErr}</div>}
                {orgEvents!==null && !orgErr && (
                  <div style={{fontSize:11,color:"#16A34A",marginTop:6}}>✓ {orgEvents.length} active event{orgEvents.length!==1?"s":""} loaded</div>
                )}
                {orgEvents!==null && (
                  <button className="bg" onClick={()=>{setOrgEvents(null);setOrgInput("");setSel(null);setOrgErr("");}}
                    style={{fontSize:11,marginTop:6,gap:4,color:V.muted}}>
                    <X size={10}/>Clear — show my events
                  </button>
                )}
              </div>

              {/* Event selector */}
              <div style={{marginBottom:16,position:"relative",zIndex:100}}>
                <label className="lbl">Select Event to Scan</label>
                <div style={{position:"relative"}}>
                  <button onClick={() => setShowD(!showD)} className="inp"
                    style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",textAlign:"left",gap:10,width:"100%"}}>
                    {sel ? (
                      <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
                        <div style={{width:28,height:28,borderRadius:7,background:sel.imageURI?`url(${sel.imageURI}) center/cover`:sel.bg,flexShrink:0,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {!sel.imageURI && sel.emoji}
                        </div>
                        <span style={{color:V.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"Outfit",fontWeight:600,fontSize:14}}>
                          {sel.name}
                        </span>
                      </div>
                    ) : (
                      <span style={{color:V.mutedL,flex:1}}>Select an event…</span>
                    )}
                    <ChevronDown size={15} color={V.muted} style={{flexShrink:0,transform:showD?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                  </button>

                  {showD && (
                    <div style={{
                      position:"absolute",top:"calc(100% + 6px)",left:0,right:0,
                      background:"#FFFFFF",
                      border:"1px solid "+V.border,
                      borderRadius:14,
                      boxShadow:"0 8px 32px rgba(0,0,0,.16)",
                      zIndex:200,
                      overflow:"hidden",
                      maxHeight:280,
                      overflowY:"auto",
                    }}>
                      {allEvents.map((ev, i) => (
                        <div key={ev.id}
                          onMouseDown={() => { setSel(ev); setShowD(false); setResult(null); setResultErr(""); setLastRaw(""); setScan("scanning"); }}
                          style={{
                            display:"flex",alignItems:"center",gap:12,
                            padding:"12px 14px",
                            cursor:"pointer",
                            borderBottom: i < allEvents.length - 1 ? "1px solid "+V.borderS : "none",
                            background: sel?.id === ev.id ? V.b50 : "#fff",
                            transition:"background .12s",
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = V.b50}
                          onMouseLeave={e => e.currentTarget.style.background = sel?.id === ev.id ? V.b50 : "#fff"}
                        >
                          <div style={{
                            width:40,height:40,borderRadius:10,flexShrink:0,
                            background:ev.imageURI?`url(${ev.imageURI}) center/cover`:ev.bg,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:20,
                          }}>
                            {!ev.imageURI && ev.emoji}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:V.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {ev.name}
                            </div>
                            <div style={{fontSize:12,color:V.muted,marginTop:2}}>
                              {formatDate(ev.startTime)} · {ev.soldTickets} ticket{ev.soldTickets!==1?"s":""} sold
                            </div>
                          </div>
                          {sel?.id === ev.id && (
                            <CheckCircle size={16} color={V.brand} style={{flexShrink:0}}/>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Camera viewport — shown once an event is selected */}
              {sel && (
                <div>
                  {/* Video area */}
                  <div style={{borderRadius:16,overflow:"hidden",background:"#111",position:"relative",aspectRatio:"4/3",marginBottom:14}}>
                    {/* Hidden canvas for frame capture */}
                    <canvas ref={canvasRef} style={{display:"none"}}/>

                    {/* Video feed */}
                    {(camState==="active") && (
                      <video ref={videoRef} autoPlay playsInline muted
                        style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
                    )}

                    {/* Overlay states */}
                    {camState==="requesting" && (
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#111",gap:12}}>
                        <RefreshCw size={28} color={V.brand} className="spin"/>
                        <div style={{fontFamily:"Outfit",fontWeight:600,fontSize:14,color:"white"}}>Requesting camera…</div>
                      </div>
                    )}

                    {camState==="error" && (
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#111",gap:12,padding:20,textAlign:"center"}}>
                        <CameraOff size={32} color="#EF4444"/>
                        <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:14,color:"white"}}>Camera Error</div>
                        <div style={{fontSize:12,color:"#9CA3AF",lineHeight:1.6}}>{camErr}</div>
                        <button className="bp" onClick={startCamera} style={{borderRadius:11,padding:"8px 18px",fontSize:13}}>
                          <Camera size={13}/> Try Again
                        </button>
                      </div>
                    )}

                    {/* Scanning overlay (crosshair + status) */}
                    {camState==="active" && (
                      <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
                        {/* Scan region box */}
                        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"62%",aspectRatio:"1",borderRadius:14}}>
                          {/* Corner brackets */}
                          {[{top:0,left:0,borderTop:"3px solid",borderLeft:"3px solid"},{top:0,right:0,borderTop:"3px solid",borderRight:"3px solid"},{bottom:0,left:0,borderBottom:"3px solid",borderLeft:"3px solid"},{bottom:0,right:0,borderBottom:"3px solid",borderRight:"3px solid"}].map((s,i)=>(
                            <div key={i} style={{position:"absolute",width:20,height:20,borderColor:"rgba(0,196,138,.85)",borderRadius:2,...s}}/>
                          ))}
                          {/* Scan line */}
                          {scanState==="scanning" && (
                            <div style={{position:"absolute",left:0,right:0,height:2,background:"rgba(0,196,138,.7)",boxShadow:"0 0 6px rgba(0,196,138,.8)",animation:"scanLine 1.8s ease-in-out infinite"}}/>
                          )}
                        </div>

                        {/* Status pill */}
                        <div style={{position:"absolute",bottom:14,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.65)",backdropFilter:"blur(8px)",borderRadius:20,padding:"6px 16px",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:7}}>
                          {scanState==="scanning" ? (
                            <><div style={{width:7,height:7,borderRadius:"50%",background:"#00C48A",animation:"pulse 1.2s ease-in-out infinite"}}/><span style={{color:"white",fontSize:12,fontFamily:"Outfit",fontWeight:600}}>Scanning…</span></>
                          ) : scanState==="decoding" ? (
                            <><RefreshCw size={12} color="white" className="spin"/><span style={{color:"white",fontSize:12,fontFamily:"Outfit",fontWeight:600}}>Decoding QR…</span></>
                          ) : scanState==="verifying" ? (
                            <><RefreshCw size={12} color="#A78BFA" className="spin"/><span style={{color:"#A78BFA",fontSize:12,fontFamily:"Outfit",fontWeight:600}}>Verifying on-chain…</span></>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Result card */}
                  {scanState==="done" && result && result.ok && (
                    <div style={{borderRadius:14,overflow:"hidden",marginBottom:10}}>
                      <div style={{background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:14,padding:18}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                          <div style={{width:42,height:42,borderRadius:12,background:"#DCFCE7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <CheckCircle size={22} color="#16A34A"/>
                          </div>
                          <div>
                            <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:16,color:"#15803D"}}>Checked In!</div>
                            <div style={{fontSize:12,color:"#166534",marginTop:2}}>Ticket verified and marked on-chain</div>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                          {[{l:"Token ID",v:"#"+result.tokenId},{l:"Owner",v:result.owner}].map(({l,v})=>(
                            <div key={l} style={{background:"rgba(0,0,0,.04)",borderRadius:8,padding:"8px 10px"}}>
                              <div style={{fontSize:9,color:"#166534",fontFamily:"Outfit",fontWeight:800,textTransform:"uppercase",letterSpacing:".1em",marginBottom:2}}>{l}</div>
                              <div style={{fontSize:13,fontFamily:"Outfit",fontWeight:700,color:"#15803D"}}>{v}</div>
                            </div>
                          ))}
                        </div>
                        {result.txHash && (
                          <div style={{fontSize:11,fontFamily:"monospace",color:"#16A34A",background:"rgba(0,0,0,.04)",borderRadius:7,padding:"5px 9px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            Tx: {result.txHash}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error result */}
                  {scanState==="done" && result && !result.ok && (
                    <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:14,padding:18,marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <div style={{width:38,height:38,borderRadius:11,background:"#FEE2E2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <XCircle size={20} color="#EF4444"/>
                        </div>
                        <div style={{fontFamily:"Outfit",fontWeight:800,fontSize:15,color:"#DC2626"}}>Invalid Ticket</div>
                      </div>
                      <div style={{fontSize:13,color:"#B91C1C",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{resultErr}</div>
                    </div>
                  )}

                  {/* Scan next / re-scan button */}
                  {scanState==="done" && (
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

      {/* Inline keyframes for scan line + pulse */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 8%; }
          50%  { top: 88%; }
          100% { top: 8%; }
        }
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:.5; transform:scale(.8); }
        }
      `}</style>
    </div>
  );
}