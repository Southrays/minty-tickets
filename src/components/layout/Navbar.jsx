import { Plus, Wallet, Ticket } from "lucide-react";
import { useWallet } from "../../context/WalletContext";
import { shortAddr } from "../../utils/format";
import { V } from "../../utils/constants";
import { Link, useLocation } from "react-router-dom";

export default function Navbar({ isMobile }) {
  const { wallet, connect } = useWallet();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/explore", label: "Explore" },
    { path: "/tickets", label: "My Tickets" },
    { path: "/dashboard", label: "Dashboard" }
  ];

  return (
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"rgba(255,255,255,.94)",backdropFilter:"blur(16px)",borderBottom:"1px solid var(--border-s)",padding:"0 24px",height:62,display:"flex",alignItems:"center",justifyContent:"space-between"}}>

      <Link to="/" style={{display:"flex",alignItems:"center",gap:9, textDecoration:"none", color:"inherit"}}>
        <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#7C3AED,#5B21B6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ticket size={16} color="white" strokeWidth={2.5}/>
        </div>
        <span style={{fontFamily:"Outfit",fontWeight:800,fontSize:18,letterSpacing:"-.02em",color:V.text}}>
          minty<span style={{color:V.brand}}>.</span>
        </span>
      </Link>

      {!isMobile && (
        <div style={{display:"flex",alignItems:"center",gap:2}}>
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`nl${location.pathname === path ? " act" : ""}`}
              style={{
                display:"flex",
                alignItems:"center",
                gap:9,
                textDecoration:"none",
                color:"inherit"
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <Link
          to="/create"
          className={isMobile ? "bg" : "bs"}
          style={{borderRadius:12,padding:isMobile?"7px 12px":"8px 16px",fontSize:13,gap:6, textDecoration:"none", color:"inherit", fontFamily:"Outfit",fontWeight:600,color:isMobile?V.text2:undefined}}
        >
          <Plus size={14}/> Host Event
        </Link>

        {wallet ? (
          <div style={{display:"flex",alignItems:"center",gap:7,background:V.b50,border:`1px solid ${V.b100}`,borderRadius:12,padding:"7px 12px"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:V.brand}}/>
            <span style={{fontFamily:"Outfit",fontWeight:600,fontSize:13,color:V.brand}}>
              {shortAddr(wallet)}
            </span>
          </div>
        ) : (
          <button className="bp" onClick={connect} style={{borderRadius:12,padding:"8px 16px",fontSize:13}}>
            <Wallet size={13}/> Connect
          </button>
        )}
      </div>
    </nav>
  );
}