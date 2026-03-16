import { useState, useEffect } from "react";
import { Search, MapPin, X, RefreshCw } from "lucide-react";
import { CATEGORIES, V } from "../utils/constants";
import { useApp } from "../context/AppContext";
import EventCard from "../components/events/EventCard";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ExplorePage({ setSelectedEvent }) {
  const { events, loadingEvents, refreshEvents } = useApp();
  const [locQuery, setLocQuery] = useState("");
  const [evQuery,  setEvQuery]  = useState("");
  const [cat,      setCat]      = useState("All");
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const refreshSafe = async () => {
    if (loading) return;
    setLoading(true);
    await refreshEvents();
    setLoading(false);
  };

  // Pre-fill event search from URL param (from homepage search bar)
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setEvQuery(q);
  }, [searchParams]);

  // Filter events based on all three criteria
  useEffect(() => {
    let r = events;

    // Category filter
    if (cat !== "All") r = r.filter(e => e.category === cat);

    // Location filter — match against city, state, country, venue fields
    if (locQuery.trim()) {
      const lq = locQuery.trim().toLowerCase();
      r = r.filter(e =>
        (e.city    || "").toLowerCase().includes(lq) ||
        (e.state   || "").toLowerCase().includes(lq) ||
        (e.country || "").toLowerCase().includes(lq) ||
        (e.venue   || "").toLowerCase().includes(lq)
      );
    }

    // Event/keyword filter — name, category, venue, description, tags
    if (evQuery.trim()) {
      const q = evQuery.trim().toLowerCase();
      r = r.filter(e =>
        (e.name              || "").toLowerCase().includes(q) ||
        (e.category          || "").toLowerCase().includes(q) ||
        (e.venue             || "").toLowerCase().includes(q) ||
        (e.shortDescription  || "").toLowerCase().includes(q) ||
        (e.city              || "").toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    setResults(r);
  }, [events, locQuery, evQuery, cat]);

  return (
    <div style={{ padding:"80px 24px 80px", maxWidth:1000, margin:"0 auto" }}>
      <div className="fu" style={{ display:"flex", alignItems:"flex-end",
        justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:10 }}>
        <div>
          <h1 style={{ fontFamily:"Outfit", fontSize:32, fontWeight:900,
            color:V.text, marginBottom:4 }}>Explore Events</h1>
          <p style={{ color:V.muted, fontSize:15 }}>
            Find events by location, name, or category.
          </p>
        </div>
        <button className="bg" onClick={refreshSafe}
          style={{ gap:6, color:V.muted, fontSize:13 }}>
          <RefreshCw size={13} className={loadingEvents?"spin":""}/>Refresh
        </button>
      </div>

      {/* Search panel */}
      <div className="fu2 card" style={{
        padding:    isMobile ? "14px 0" : 22,
        marginBottom: 26,
        boxShadow:  isMobile ? "none" : undefined,
        border:     isMobile ? "none" : undefined,
        background: isMobile ? "transparent" : undefined,
        borderRadius: isMobile ? 0 : undefined,
      }}>
        {/* Category pills */}
        <style>{`
          .explore-cats { display:flex; gap:7px; overflow-x:auto; padding-bottom:3px; margin-bottom:16px; }
          .explore-cats::-webkit-scrollbar { display:none; }
          .explore-cats { -ms-overflow-style:none; scrollbar-width:none; }
        `}</style>
        <div className="explore-cats">
          {CATEGORIES.map(c => (
            <button key={c} className={`cp${cat===c?" act":""}`}
              onClick={() => setCat(c)}
              style={{ fontSize:12, padding:"6px 14px", flexShrink:0 }}>
              {c}
            </button>
          ))}
        </div>

        {/* Search inputs */}
        <div style={{ display:"grid",
          gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:14 }}>

          {/* Location — free text, filters against actual event location fields */}
          <div>
            <label className="lbl">Location</label>
            <div style={{ position:"relative" }}>
              <MapPin size={14} style={{ position:"absolute", left:12, top:"50%",
                transform:"translateY(-50%)", color:V.mutedL, pointerEvents:"none" }}/>
              <input className="inp"
                placeholder="City, country…"
                style={{ paddingLeft:36, paddingRight: locQuery ? 36 : 14 }}
                value={locQuery}
                onChange={e => setLocQuery(e.target.value)}/>
              {locQuery && (
                <button onClick={() => setLocQuery("")}
                  style={{ position:"absolute", right:10, top:"50%",
                    transform:"translateY(-50%)", background:"none",
                    border:"none", cursor:"pointer", color:V.mutedL,
                    display:"flex", padding:2 }}>
                  <X size={13}/>
                </button>
              )}
            </div>
          </div>

          {/* Event search */}
          <div>
            <label className="lbl">Search Events</label>
            <div style={{ position:"relative" }}>
              <Search size={14} style={{ position:"absolute", left:12, top:"50%",
                transform:"translateY(-50%)", color:V.mutedL, pointerEvents:"none" }}/>
              <input className="inp"
                placeholder="Event name, artist, venue…"
                style={{ paddingLeft:36, paddingRight: evQuery ? 36 : 14 }}
                value={evQuery}
                onChange={e => setEvQuery(e.target.value)}/>
              {evQuery && (
                <button onClick={() => setEvQuery("")}
                  style={{ position:"absolute", right:10, top:"50%",
                    transform:"translateY(-50%)", background:"none",
                    border:"none", cursor:"pointer", color:V.mutedL,
                    display:"flex", padding:2 }}>
                  <X size={13}/>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {loadingEvents ? (
        <div style={{ textAlign:"center", padding:"60px 0" }}>
          <div style={{ width:32, height:32, borderRadius:"50%",
            border:`3px solid ${V.b100}`, borderTopColor:V.brand,
            margin:"0 auto 14px", animation:"spinA 1s linear infinite" }}/>
          <div style={{ color:V.muted, fontFamily:"Outfit", fontWeight:600 }}>
            Loading events…
          </div>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", marginBottom:18, flexWrap:"wrap", gap:8 }}>
            <div style={{ fontFamily:"Outfit", fontWeight:700,
              fontSize:16, color:V.text }}>
              {results.length === 0
                ? "No events found"
                : `${results.length} event${results.length !== 1 ? "s" : ""}`}
              {(locQuery || evQuery || cat !== "All") && (
                <button onClick={() => { setLocQuery(""); setEvQuery(""); setCat("All"); }}
                  style={{ marginLeft:10, fontSize:12, color:V.brand, background:"none",
                    border:"none", cursor:"pointer", fontFamily:"Outfit", fontWeight:600 }}>
                  Clear filters ×
                </button>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div style={{ textAlign:"center", padding:"60px 0", color:V.muted }}>
              <Search size={40} style={{ margin:"0 auto 14px", opacity:.2 }}/>
              <div style={{ fontFamily:"Outfit", fontWeight:600, fontSize:16,
                marginBottom:8 }}>No events match your search</div>
              <div style={{ fontSize:14 }}>
                Try different keywords or{" "}
                <button className="bg" style={{ color:V.brand, fontWeight:600 }}
                  onClick={() => { setLocQuery(""); setEvQuery(""); setCat("All"); }}>
                  clear filters
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:20 }}>
              {results.map(ev => (
                <EventCard key={ev.id} event={ev} onClick={setSelectedEvent}/>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}