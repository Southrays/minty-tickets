import { Home, Compass, Ticket, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const ITEMS = [
  { path: "/", label: "Home", Icon: Home },
  { path: "/explore", label: "Explore", Icon: Compass },
  { path: "/tickets", label: "Tickets", Icon: Ticket },
  { path: "/dashboard", label: "Dashboard", Icon: LayoutDashboard }
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:99,background:"rgba(255,255,255,.96)",backdropFilter:"blur(16px)",borderTop:"1px solid var(--border-s)",padding:"6px 0 10px",display:"flex",justifyContent:"space-around"}}>
      {ITEMS.map(({ path, label, Icon }) => (
        <Link
          key={path}
          to={path}
          className={`bni${location.pathname === path ? " act" : ""}`}
          style={{
            display:"flex",
            alignItems:"center",
            gap:9,
            textDecoration:"none",
            color:"inherit"
          }}
        >
          <Icon size={20}/>
          <span>{label}</span>
        </Link>
      ))}
    </div>
  );
}