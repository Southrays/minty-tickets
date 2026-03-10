import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { V } from "../../utils/constants";
import { formatDate, soldPct } from "../../utils/format";
import { useNavigate } from "react-router-dom";

export default function EventCard({ event }) {
  const pct  = soldPct(event.soldTickets, event.maxTickets);
  const free = !event.ticketPrice || event.ticketPrice === "0";
  const loc  = [event.city, event.state, event.country].filter(Boolean).join(", ") || event.location || "";
  const navigate = useNavigate();

  return (
    <div className="ci" onClick={() => navigate(`/event/${event.id}`)}>
      {/* Gradient banner */}
      <div
        style={{
          height:154,
          background: event.imageURI
            ? `url(${event.imageURI}) center/cover no-repeat`
            : event.bg,
          borderRadius:"18px 18px 0 0",
          position:"relative",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          overflow:"hidden"
        }}
      >
        {!event.imageURI && (
          <span style={{fontSize:48,filter:"drop-shadow(0 4px 14px rgba(0,0,0,.4))"}}>
            {event.emoji}
          </span>
        )}
        
        <div style={{position:"absolute",top:12,left:12,display:"flex",gap:6}}>
          {free && <span className="bdg" style={{background:"rgba(22,163,74,.18)",color:"#16A34A",backdropFilter:"blur(8px)"}}>FREE</span>}
          {event.soldTickets >= event.maxTickets && <span className="bdg" style={{background:"rgba(239,68,68,.18)",color:"#EF4444",backdropFilter:"blur(8px)"}}>SOLD OUT</span>}
        </div>
        <span className="bdg" style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,.3)",color:"white",backdropFilter:"blur(8px)"}}>{event.category}</span>
        {pct>=90 && !free && event.soldTickets<event.maxTickets && (
          <span className="bdg bdg-o" style={{position:"absolute",bottom:12,left:12}}>{100-pct}% left</span>
        )}
      </div>

      {/* Content */}
      <div style={{padding:"15px 17px 17px"}}>
        <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:15,color:V.text,marginBottom:7,lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{event.name}</div>

        {event.shortDescription && (
          <div style={{fontSize:12,color:V.muted,marginBottom:8,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{event.shortDescription}</div>
        )}

        <div style={{display:"flex",alignItems:"center",gap:5,color:V.muted,fontSize:12,marginBottom:3}}>
          <Calendar size={10}/><span>{formatDate(event.startTime)}</span>
        </div>
        {loc && (
          <div style={{display:"flex",alignItems:"center",gap:5,color:V.muted,fontSize:12,marginBottom:12}}>
            <MapPin size={10}/><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{loc}</span>
          </div>
        )}

        {/* Progress bar */}
        <div style={{marginBottom:13}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:V.mutedL,marginBottom:4}}>
            <span>{event.soldTickets.toLocaleString()} sold</span>
            <span>{event.maxTickets.toLocaleString()} max</span>
          </div>
          <div className="pb" style={{height:3}}><div className="pf" style={{width:pct+"%"}}/></div>
        </div>

        {/* Price row */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          {free
            ? <span style={{fontFamily:"Outfit",fontWeight:800,fontSize:17,color:"#16A34A"}}>Free</span>
            : <div>
                <span style={{fontFamily:"Outfit",fontWeight:800,fontSize:17,color:V.text}}>{event.ticketPrice} OG</span>
                {event.ticketPriceUSD && <span style={{fontSize:12,color:V.mutedL,marginLeft:5}}>≈ ${event.ticketPriceUSD}</span>}
              </div>
          }
          <span style={{fontSize:12,fontFamily:"Outfit",fontWeight:600,color:V.brand,display:"flex",alignItems:"center",gap:3}}>
            View <ArrowRight size={12}/>
          </span>
        </div>
      </div>
    </div>
  );
}
