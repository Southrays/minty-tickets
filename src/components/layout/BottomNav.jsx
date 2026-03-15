import { Home, Compass, Ticket, LayoutDashboard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { V } from "../../utils/constants";

const ITEMS = [
  { path: "/",          label: "Home",      Icon: Home          },
  { path: "/explore",   label: "Explore",   Icon: Compass       },
  { path: "/tickets",   label: "Tickets",   Icon: Ticket        },
  { path: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:99,
      background:"rgba(255,255,255,.96)", backdropFilter:"blur(16px)",
      borderTop:"1px solid var(--border-s)",
      padding:"6px 0 10px",
      display:"flex", justifyContent:"space-around",
    }}>
      {ITEMS.map(({ path, label, Icon }) => {
        const active = location.pathname === path;
        return (
          <Link key={path} to={path}
            style={{
              display:"flex", flexDirection:"column",
              alignItems:"center", gap:3,
              padding:"8px 18px", borderRadius:12,
              textDecoration:"none",
              color: active ? V.brand : "var(--muted-l)",
              fontFamily:"Outfit", fontWeight: active ? 700 : 600,
              fontSize:11, letterSpacing:".02em",
              transition:"color .15s",
            }}>
            <Icon size={20} strokeWidth={active ? 2.5 : 2}
              color={active ? V.brand : "var(--muted-l)"}/>
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}