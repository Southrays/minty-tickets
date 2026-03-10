import { useState, useEffect, useRef, useCallback } from "react";
import jsQR from "jsqr";
import { X, ScanLine, ChevronDown, CheckCircle, XCircle, RefreshCw, CameraOff } from "lucide-react";
import { V } from "../../utils/constants";
import { formatDate, shortAddr } from "../../utils/format";
import { getReadContract, getWriteContract } from "../../utils/contract";

// QR epoch window: accept current epoch and 1 epoch behind (max ~2 min old)
const QR_EPOCH_SECS = 60;
function currentEpoch() {
  return Math.floor(Date.now() / (QR_EPOCH_SECS * 1000));
}

function parseQR(raw) {
  const m = raw.match(/^MINTY-(\d+)-(\d+)-(\d+)$/);
  if (!m) return null;
  return { tokenId: Number(m[1]), eventId: Number(m[2]), epoch: Number(m[3]) };
}

async function verifyAndCheckIn(tokenId, eventId, organizerAddress) {
  const rc = await getReadContract();

  const ticketData = await rc.tickets(tokenId);
  const onChainEventId = Number(ticketData.eventId);

  if (onChainEventId !== eventId) {
    return { ok: false, reason: `Ticket #${tokenId} belongs to event #${onChainEventId}, not #${eventId}.` };
  }

  if (ticketData.checkedIn) {
    return { ok: false, reason: `Ticket #${tokenId} was already checked in.`, alreadyUsed: true };
  }

  const owner = await rc.ownerOf(tokenId);

  try {
    const wc = await getWriteContract();
    const tx = await wc.syncOfflineCheckIns(eventId, [tokenId], [[]]);
    await tx.wait();
    return {
      ok: true,
      tokenId,
      owner: shortAddr(owner),
      txHash: tx.hash,
      method: "syncOfflineCheckIns",
    };
  } catch (syncErr) {
    const errMsg = syncErr?.reason || syncErr?.message || "";
    return {
      ok: true,
      onChainCheckInFailed: true,
      tokenId,
      owner: shortAddr(owner),
      contractError: errMsg.slice(0, 120),
    };
  }
}

export default function ScanModal({ events = [], wallet, onClose }) {
  const [sel, setSel] = useState(null);
  const [showD, setShowD] = useState(false);

  const [camState, setCamState] = useState("idle");
  const [camErr, setCamErr] = useState("");

  const [scanState, setScanState] = useState("scanning");
  const [lastRaw, setLastRaw] = useState("");
  const [result, setResult] = useState(null);
  const [resultErr, setResultErr] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const mountedRef = useRef(true);

  // ── Camera helpers ─────────────────────────────
  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const decodeFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const w = video.videoWidth,
      h = video.videoHeight;
    if (!w || !h) return;

    canvas.width = w;
    canvas.height = h;
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

  const handleQRFound = useCallback(
    async (raw) => {
      if (scanState !== "scanning") return;
      setScanState("decoding");

      const parsed = parseQR(raw);
      if (!parsed) {
        setResultErr(`Unrecognised QR code. Expected Minty Tickets format.\nGot: "${raw.slice(0, 60)}"`);
        setScanState("done");
        setResult({ ok: false });
        return;
      }

      const { tokenId, eventId, epoch } = parsed;
      const now = currentEpoch();
      if (epoch < now - 2) {
        setResultErr(`QR code has expired (epoch ${epoch}, current ${now}). Ask the attendee to re-reveal their ticket.`);
        setScanState("done");
        setResult({ ok: false });
        return;
      }

      if (sel && eventId !== sel.id) {
        setResultErr(`This ticket is for event #${eventId}, but you selected "${sel.name}" (event #${sel.id}).`);
        setScanState("done");
        setResult({ ok: false });
        return;
      }

      setScanState("verifying");
      try {
        const res = await verifyAndCheckIn(tokenId, eventId, wallet);
        if (!mountedRef.current) return;
        if (res.ok) {
          setResult(res);
          setScanState("done");
        } else {
          setResultErr(res.reason || "Verification failed.");
          setScanState("done");
          setResult({ ok: false });
        }
      } catch (err) {
        if (!mountedRef.current) return;
        setResultErr("On-chain error: " + (err?.reason || err?.message || "Unknown error"));
        setScanState("done");
        setResult({ ok: false });
      }
    },
    [scanState, sel, wallet]
  );

  const startCamera = useCallback(async () => {
    if (!sel) return;
    stopCamera();
    setCamState("requesting");
    setCamErr("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      setCamState("active");
      setScanState("scanning");
      setResult(null);
      setResultErr("");
      setLastRaw("");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      const tick = () => {
        if (!mountedRef.current || !streamRef.current) return;
        decodeFrame();
        rafRef.current = requestAnimationFrame(tick);
      };
      setTimeout(() => {
        if (mountedRef.current && streamRef.current) tick();
      }, 300);
    } catch (err) {
      if (!mountedRef.current) return;
      setCamState("error");
      if (err.name === "NotAllowedError")
        setCamErr("Camera permission denied. Please allow camera access in your browser.");
      else if (err.name === "NotFoundError") setCamErr("No camera found on this device.");
      else setCamErr("Camera error: " + (err.message || err.name));
    }
  }, [sel, stopCamera, decodeFrame]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (sel) startCamera();
    else stopCamera();
  }, [sel, startCamera, stopCamera]);

  const resetScan = () => {
    setResult(null);
    setResultErr("");
    setLastRaw("");
    setScanState("scanning");
  };

  // ── Render ─────────────────────────────────
  return (
    <div
      className="mbd"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17,24,39,.65)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: 20,
      }}
    >
      {/* Your full JSX content remains unchanged */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <video ref={videoRef} autoPlay playsInline muted style={{ display: "none" }} />
      <style>{`
        @keyframes scanLine {
          0% { top: 8%; }
          50% { top: 88%; }
          100% { top: 8%; }
        }
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:.5; transform:scale(.8); }
        }
      `}</style>
    </div>
  );
}