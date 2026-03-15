import { useState } from "react";
import { Plus, Ticket, Wallet, RefreshCw, LogOut, X, AlertCircle } from "lucide-react";
import { useWallet } from "../../context/WalletContext";
import { shortAddr } from "../../utils/format";
import { V } from "../../utils/constants";
import { Link, useLocation } from "react-router-dom";

// ── Disconnect confirmation modal ──────────────────────────────────────────
function DisconnectModal({ wallet, onConfirm, onCancel }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onCancel()}
      style={{
        position:"fixed",inset:0,zIndex:9999,
        background:"rgba(17,24,39,.5)",
        backdropFilter:"blur(10px)",
        display:"flex",alignItems:"center",justifyContent:"center",
        padding:20,
      }}
    >
      <div
        className="mdg card"
        style={{width:"100%",maxWidth:360,padding:28}}
      >
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:11,background:V.b50,border:"1px solid "+V.b100,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Wallet size={18} color={V.brand}/>
            </div>
            <div>
              <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:16,color:V.text}}>Wallet Connected</div>
              <div style={{fontSize:12,fontFamily:"monospace",color:V.muted,marginTop:1}}>{shortAddr(wallet)}</div>
            </div>
          </div>
          <button
            className="bg"
            onClick={onCancel}
            style={{borderRadius:"50%",width:32,height:32,padding:0,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}
          >
            <X size={14}/>
          </button>
        </div>

        {/* Warning */}
        <div style={{background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:12,padding:"11px 14px",display:"flex",gap:9,marginBottom:20}}>
          <AlertCircle size={14} color="#EF4444" style={{flexShrink:0,marginTop:1}}/>
          <div style={{fontSize:13,color:"#DC2626",lineHeight:1.55}}>
            Disconnecting will remove your wallet session. You'll need to reconnect to buy tickets or manage events.
          </div>
        </div>

        {/* Actions */}
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <button
            className="bp"
            onClick={onConfirm}
            style={{
              width:"100%",justifyContent:"center",padding:13,borderRadius:13,
              background:"linear-gradient(135deg,#EF4444,#DC2626)",
              boxShadow:"0 2px 8px rgba(239,68,68,.25)",
              gap:8,fontSize:14,
            }}
          >
            <LogOut size={14}/> Disconnect Wallet
          </button>
          <button
            className="bg"
            onClick={onCancel}
            style={{width:"100%",justifyContent:"center",padding:12,color:V.muted,fontFamily:"Outfit",fontWeight:600}}
          >
            Keep Connected
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Navbar ─────────────────────────────────────────────────────────────────
export default function Navbar({ isMobile }) {
  const { wallet, connectWeb3Auth, disconnect } = useWallet();
  const location = useLocation();

  const [connecting,     setConnecting]     = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);

  const navItems = [
    { path: "/",          label: "Home"      },
    { path: "/explore",   label: "Explore"   },
    { path: "/tickets",   label: "My Tickets"},
    { path: "/dashboard", label: "Dashboard" },
  ];

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      await connectWeb3Auth();
    } catch (err) {
      // Swallow all errors — MetaMask going behind the browser,
      // user rejecting, or any other failure all just reset the button.
      // The user can simply click again.
      console.warn("Connect cancelled or failed:", err?.message || err);
    } finally {
      // Always reset — button ALWAYS returns to full visible state
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setShowDisconnect(false);
    if (disconnect) disconnect();
  };

  return (
    <>
      {showDisconnect && (
        <DisconnectModal
          wallet={wallet}
          onConfirm={handleDisconnect}
          onCancel={() => setShowDisconnect(false)}
        />
      )}

      <nav style={{
        position:"fixed",top:0,left:0,right:0,zIndex:100,
        background:"rgba(255,255,255,.94)",
        backdropFilter:"blur(16px)",
        borderBottom:"1px solid var(--border-s)",
        padding:"0 24px",height:62,
        display: isMobile ? "flex" : "grid",
        gridTemplateColumns: isMobile ? undefined : "1fr auto 1fr",
        alignItems:"center",
        justifyContent: isMobile ? "space-between" : undefined,
      }}>

        {/* Logo */}
        <Link to="/" style={{display:"flex",alignItems:"center",gap:9,textDecoration:"none",color:"inherit",flexShrink:0}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#7C3AED,#5B21B6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Ticket size={16} color="white" strokeWidth={2.5}/>
          </div>
          <span style={{fontFamily:"Outfit",fontWeight:800,fontSize:18,letterSpacing:"-.02em",color:V.text}}>
            minty<span style={{color:V.brand}}>.</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        {!isMobile && (
          <div style={{display:"flex",alignItems:"center",gap:2}}>
            {navItems.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`nl${location.pathname === path ? " act" : ""}`}
                style={{display:"flex",alignItems:"center",textDecoration:"none",color:"inherit"}}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        {/* Right side */}
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,justifySelf:"end"}}>

          {/* Host Event — hidden on mobile */}
          {!isMobile && (
            <Link
              to="/create"
              className="bs"
              style={{
                borderRadius:12,padding:"8px 16px",
                display:"flex",alignItems:"center",
                fontSize:13,gap:6,
                textDecoration:"none",
                fontFamily:"Outfit",fontWeight:600,
                color:"inherit",
                whiteSpace:"nowrap",
              }}
            >
              <Plus size={14}/> Host Event
            </Link>
          )}

          {/* Wallet button — always has fixed min-width so it never collapses */}
          {wallet ? (
            // Clicking the connected chip opens the disconnect modal
            <button
              onClick={() => setShowDisconnect(true)}
              style={{
                display:"flex",alignItems:"center",gap:7,
                background:V.b50,border:`1px solid ${V.b100}`,
                borderRadius:12,padding:"7px 12px",
                cursor:"pointer",
                fontFamily:"Outfit",fontWeight:600,fontSize:13,
                color:V.brand,
                transition:"all .2s",
                whiteSpace:"nowrap",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "#EDE9FE";
                e.currentTarget.style.borderColor = V.brand;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = V.b50;
                e.currentTarget.style.borderColor = V.b100;
              }}
            >
              <div style={{width:7,height:7,borderRadius:"50%",background:"#16A34A",flexShrink:0}}/>
              {shortAddr(wallet)}
            </button>
          ) : (
            <button
              className="bp"
              onClick={handleConnect}
              disabled={connecting}
              style={{
                borderRadius:12,
                padding:"8px 16px",
                fontSize:13,
                gap:7,
                display:"flex",
                alignItems:"center",
                // Fixed min-width so the button NEVER shrinks when text changes
                minWidth:148,
                justifyContent:"center",
                whiteSpace:"nowrap",
                opacity: connecting ? 0.85 : 1,
                transition:"opacity .2s",
              }}
            >
              {connecting
                ? <><RefreshCw size={13} className="spin"/>Connecting…</>
                : <><Wallet size={13}/>Connect Wallet</>
              }
            </button>
          )}
        </div>
      </nav>
    </>
  );
}