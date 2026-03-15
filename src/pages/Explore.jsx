import { useState, useEffect } from "react";
import { Search, MapPin, Globe, X, ChevronRight, RefreshCw } from "lucide-react";
import { CATEGORIES, LOCATIONS, V } from "../utils/constants";
import { useApp } from "../context/AppContext";
import EventCard from "../components/events/EventCard";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ExplorePage({ setSelectedEvent }) {
  const { events, loadingEvents, refreshEvents } = useApp();
  const [lq,      setLq]      = useState("");
  const [eq,      setEq]      = useState("");
  const [showD,   setShowD]   = useState(false);
  const [selL,    setSelL]    = useState(null);
  const [cat,     setCat]     = useState("All");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const refreshSafe = async () => {
    if (loading) return;
    setLoading(true);
    await refreshEvents();
    setLoading(false);
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setEq(q);
  }, [searchParams]);

  const fLocs = LOCATIONS.filter(l =>
    !lq || `${l.city} ${l.state}`.toLowerCase().includes(lq.toLowerCase())
  );

  useEffect(() => {
    let r = events;
    if (selL) r = r.filter(e => (e.city || e.location || "").includes(selL.city));
    if (cat !== "All") r = r.filter(e => e.category === cat);
    if (eq) {
      const q = eq.toLowerCase();
      r = r.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.category || "").toLowerCase().includes(q) ||
        (e.venue || "").toLowerCase().includes(q) ||
        (e.shortDescription || "").toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    setResults(r);
  }, [events, selL, eq, cat]);

  return (
    <div style={{ padding:"80px 24px 80px", maxWidth:1000, margin:"0 auto" }}>
      <div className="fu" style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"Outfit", fontSize:32, fontWeight:900, color:V.text, marginBottom:4 }}>Explore Events</h1>
          <p style={{ color:V.muted, fontSize:15 }}>Find events by location, name, or category.</p>
        </div>
        <button className="bg" onClick={refreshSafe} style={{ gap:6, color:V.muted, fontSize:13 }}>
          <RefreshCw size={13} className={loadingEvents?"spin":""}/>Refresh
        </button>
      </div>

      {/* Search panel */}
      <div className="fu2 card" style={{ padding:22, marginBottom:26 }}>
        {/* Category pills */}
        <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:3, marginBottom:16 }}>
          {CATEGORIES.map(c => (
            <button key={c} className={`cp${cat===c?" act":""}`}
              onClick={() => setCat(c)} style={{ fontSize:12, padding:"6px 14px", flexShrink:0 }}>{c}</button>
          ))}
        </div>

        {/* ── Search inputs — stack on mobile, side-by-side on desktop ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:14 }}>

          {/* Location */}
          <div style={{ position:"relative" }}>
            <label className="lbl">Location</label>
            <div style={{ position:"relative" }}>
              <MapPin size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:V.mutedL, pointerEvents:"none" }}/>
              <input className="inp" placeholder="City or region" style={{ paddingLeft:36 }}
                value={selL ? `${selL.city}, ${selL.state}` : lq}
                onChange={e => { setLq(e.target.value); setSelL(null); setShowD(true); }}
                onFocus={() => setShowD(true)}
                onBlur={() => setTimeout(() => setShowD(false), 180)}
              />
              {selL && (
                <button onClick={() => { setSelL(null); setLq(""); }}
                  style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:V.muted }}>
                  <X size={13}/>
                </button>
              )}
            </div>
            {showD && (
              <div className="dd" style={{ top:"calc(100% + 5px)", left:0, right:0, zIndex:50 }}>
                {fLocs.map(loc => (
                  <div key={loc.city} className="ddi" onMouseDown={() => { setSelL(loc); setShowD(false); }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:V.surface2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{loc.flag}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"Outfit", fontWeight:600, fontSize:13, color:V.text }}>{loc.city}</div>
                      <div style={{ fontSize:11, color:V.muted }}>{loc.state}</div>
                    </div>
                    <ChevronRight size={12} color={V.mutedL}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Keyword */}
          <div>
            <label className="lbl">Keyword</label>
            <div style={{ position:"relative" }}>
              <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:V.mutedL, pointerEvents:"none" }}/>
              <input className="inp" placeholder="Artist, venue, keywords…" style={{ paddingLeft:36 }}
                value={eq} onChange={e => setEq(e.target.value)}/>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {loadingEvents ? (
        <div style={{ textAlign:"center", padding:"60px 0" }}>
          <div style={{ width:32, height:32, borderRadius:"50%", border:`3px solid ${V.b100}`, borderTopColor:V.brand, margin:"0 auto 14px", animation:"spinA 1s linear infinite" }}/>
          <div style={{ color:V.muted, fontFamily:"Outfit", fontWeight:600 }}>Loading from blockchain…</div>
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 20px", color:V.muted }}>
          <Globe size={40} style={{ margin:"0 auto 14px", opacity:.25 }}/>
          <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:18, marginBottom:6 }}>
            {events.length === 0 ? "No events on-chain yet" : "No events match your search"}
          </div>
          <div style={{ fontSize:14, marginBottom:18 }}>
            {events.length === 0 ? "Be the first to host an event!" : "Try a different search or browse all."}
          </div>
          <button className="bp" onClick={() => navigate("/create")} style={{ borderRadius:13, padding:"11px 22px" }}>
            Host an Event
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom:18, color:V.muted, fontSize:14 }}>
            <strong style={{ color:V.text }}>{results.length}</strong> event{results.length!==1?"s":""}
            {selL && <span style={{ color:V.brand }}> in {selL.city}</span>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20 }}>
            {results.map(ev => <EventCard key={ev.id} event={ev} onClick={setSelectedEvent}/>)}
          </div>
        </>
      )}
    </div>
  );
}