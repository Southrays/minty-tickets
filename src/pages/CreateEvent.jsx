import { useState, useRef, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Upload, Shield, CheckCircle, RefreshCw, AlertCircle,
  ExternalLink, Wallet, ChevronDown, X, Plus, Trash2,
  ArrowRight, ArrowLeft, Info, Search,
} from "lucide-react";
import { V, OG_TO_USD_RATE, CATEGORIES } from "../utils/constants";
import { useWallet } from "../context/WalletContext";
import { createEventOnChain } from "../utils/contract";
import { useNavigate } from "react-router-dom";

const TICKET_TYPES_LIST = ["Regular","VIP","Sponsor"];
const TODAY = new Date();
TODAY.setHours(0,0,0,0);

// ─── City dataset with state + country autofill ──────────────────────────────
// Major world cities — typing autofills state/region and country
const CITIES = [
  // United States
  {city:"New York",state:"NY",country:"United States"},{city:"Los Angeles",state:"CA",country:"United States"},
  {city:"Chicago",state:"IL",country:"United States"},{city:"Houston",state:"TX",country:"United States"},
  {city:"Phoenix",state:"AZ",country:"United States"},{city:"Philadelphia",state:"PA",country:"United States"},
  {city:"San Antonio",state:"TX",country:"United States"},{city:"San Diego",state:"CA",country:"United States"},
  {city:"Dallas",state:"TX",country:"United States"},{city:"San Jose",state:"CA",country:"United States"},
  {city:"Austin",state:"TX",country:"United States"},{city:"Jacksonville",state:"FL",country:"United States"},
  {city:"San Francisco",state:"CA",country:"United States"},{city:"Columbus",state:"OH",country:"United States"},
  {city:"Fort Worth",state:"TX",country:"United States"},{city:"Indianapolis",state:"IN",country:"United States"},
  {city:"Charlotte",state:"NC",country:"United States"},{city:"Seattle",state:"WA",country:"United States"},
  {city:"Denver",state:"CO",country:"United States"},{city:"Washington",state:"DC",country:"United States"},
  {city:"Nashville",state:"TN",country:"United States"},{city:"Oklahoma City",state:"OK",country:"United States"},
  {city:"El Paso",state:"TX",country:"United States"},{city:"Boston",state:"MA",country:"United States"},
  {city:"Portland",state:"OR",country:"United States"},{city:"Las Vegas",state:"NV",country:"United States"},
  {city:"Memphis",state:"TN",country:"United States"},{city:"Louisville",state:"KY",country:"United States"},
  {city:"Baltimore",state:"MD",country:"United States"},{city:"Milwaukee",state:"WI",country:"United States"},
  {city:"Miami",state:"FL",country:"United States"},{city:"Atlanta",state:"GA",country:"United States"},
  {city:"Minneapolis",state:"MN",country:"United States"},{city:"Tucson",state:"AZ",country:"United States"},
  {city:"Fresno",state:"CA",country:"United States"},{city:"Sacramento",state:"CA",country:"United States"},
  {city:"Detroit",state:"MI",country:"United States"},{city:"Tampa",state:"FL",country:"United States"},
  {city:"Brooklyn",state:"NY",country:"United States"},{city:"New Orleans",state:"LA",country:"United States"},
  // United Kingdom
  {city:"London",state:"England",country:"United Kingdom"},{city:"Birmingham",state:"England",country:"United Kingdom"},
  {city:"Manchester",state:"England",country:"United Kingdom"},{city:"Leeds",state:"England",country:"United Kingdom"},
  {city:"Glasgow",state:"Scotland",country:"United Kingdom"},{city:"Edinburgh",state:"Scotland",country:"United Kingdom"},
  {city:"Liverpool",state:"England",country:"United Kingdom"},{city:"Bristol",state:"England",country:"United Kingdom"},
  {city:"Sheffield",state:"England",country:"United Kingdom"},{city:"Cardiff",state:"Wales",country:"United Kingdom"},
  {city:"Belfast",state:"Northern Ireland",country:"United Kingdom"},{city:"Nottingham",state:"England",country:"United Kingdom"},
  // Nigeria
  {city:"Lagos",state:"Lagos",country:"Nigeria"},{city:"Abuja",state:"FCT",country:"Nigeria"},
  {city:"Kano",state:"Kano",country:"Nigeria"},{city:"Ibadan",state:"Oyo",country:"Nigeria"},
  {city:"Port Harcourt",state:"Rivers",country:"Nigeria"},{city:"Benin City",state:"Edo",country:"Nigeria"},
  {city:"Kaduna",state:"Kaduna",country:"Nigeria"},{city:"Enugu",state:"Enugu",country:"Nigeria"},
  {city:"Owerri",state:"Imo",country:"Nigeria"},{city:"Calabar",state:"Cross River",country:"Nigeria"},
  {city:"Warri",state:"Delta",country:"Nigeria"},{city:"Jos",state:"Plateau",country:"Nigeria"},
  {city:"Ilorin",state:"Kwara",country:"Nigeria"},{city:"Uyo",state:"Akwa Ibom",country:"Nigeria"},
  {city:"Abeokuta",state:"Ogun",country:"Nigeria"},{city:"Onitsha",state:"Anambra",country:"Nigeria"},
  // Canada
  {city:"Toronto",state:"Ontario",country:"Canada"},{city:"Montreal",state:"Quebec",country:"Canada"},
  {city:"Vancouver",state:"British Columbia",country:"Canada"},{city:"Calgary",state:"Alberta",country:"Canada"},
  {city:"Edmonton",state:"Alberta",country:"Canada"},{city:"Ottawa",state:"Ontario",country:"Canada"},
  {city:"Winnipeg",state:"Manitoba",country:"Canada"},{city:"Quebec City",state:"Quebec",country:"Canada"},
  // Australia
  {city:"Sydney",state:"New South Wales",country:"Australia"},{city:"Melbourne",state:"Victoria",country:"Australia"},
  {city:"Brisbane",state:"Queensland",country:"Australia"},{city:"Perth",state:"Western Australia",country:"Australia"},
  {city:"Adelaide",state:"South Australia",country:"Australia"},{city:"Canberra",state:"ACT",country:"Australia"},
  // Germany
  {city:"Berlin",state:"Berlin",country:"Germany"},{city:"Hamburg",state:"Hamburg",country:"Germany"},
  {city:"Munich",state:"Bavaria",country:"Germany"},{city:"Cologne",state:"NRW",country:"Germany"},
  {city:"Frankfurt",state:"Hesse",country:"Germany"},{city:"Stuttgart",state:"BW",country:"Germany"},
  // France
  {city:"Paris",state:"Île-de-France",country:"France"},{city:"Lyon",state:"Auvergne-Rhône-Alpes",country:"France"},
  {city:"Marseille",state:"PACA",country:"France"},{city:"Toulouse",state:"Occitanie",country:"France"},
  {city:"Nice",state:"PACA",country:"France"},{city:"Bordeaux",state:"Nouvelle-Aquitaine",country:"France"},
  // South Africa
  {city:"Johannesburg",state:"Gauteng",country:"South Africa"},{city:"Cape Town",state:"Western Cape",country:"South Africa"},
  {city:"Durban",state:"KwaZulu-Natal",country:"South Africa"},{city:"Pretoria",state:"Gauteng",country:"South Africa"},
  {city:"Port Elizabeth",state:"Eastern Cape",country:"South Africa"},{city:"Bloemfontein",state:"Free State",country:"South Africa"},
  // India
  {city:"Mumbai",state:"Maharashtra",country:"India"},{city:"Delhi",state:"Delhi",country:"India"},
  {city:"Bangalore",state:"Karnataka",country:"India"},{city:"Hyderabad",state:"Telangana",country:"India"},
  {city:"Chennai",state:"Tamil Nadu",country:"India"},{city:"Kolkata",state:"West Bengal",country:"India"},
  {city:"Pune",state:"Maharashtra",country:"India"},{city:"Ahmedabad",state:"Gujarat",country:"India"},
  // Brazil
  {city:"São Paulo",state:"SP",country:"Brazil"},{city:"Rio de Janeiro",state:"RJ",country:"Brazil"},
  {city:"Brasília",state:"DF",country:"Brazil"},{city:"Salvador",state:"BA",country:"Brazil"},
  {city:"Fortaleza",state:"CE",country:"Brazil"},{city:"Belo Horizonte",state:"MG",country:"Brazil"},
  // Rest of world
  {city:"Tokyo",state:"Tokyo",country:"Japan"},{city:"Osaka",state:"Osaka",country:"Japan"},
  {city:"Seoul",state:"Seoul",country:"South Korea"},{city:"Beijing",state:"Beijing",country:"China"},
  {city:"Shanghai",state:"Shanghai",country:"China"},{city:"Shenzhen",state:"Guangdong",country:"China"},
  {city:"Singapore",state:"",country:"Singapore"},{city:"Dubai",state:"Dubai",country:"United Arab Emirates"},
  {city:"Abu Dhabi",state:"Abu Dhabi",country:"United Arab Emirates"},
  {city:"Cairo",state:"Cairo",country:"Egypt"},{city:"Nairobi",state:"Nairobi",country:"Kenya"},
  {city:"Accra",state:"Greater Accra",country:"Ghana"},{city:"Addis Ababa",state:"Addis Ababa",country:"Ethiopia"},
  {city:"Dar es Salaam",state:"Dar es Salaam",country:"Tanzania"},
  {city:"Amsterdam",state:"North Holland",country:"Netherlands"},{city:"Brussels",state:"Brussels",country:"Belgium"},
  {city:"Vienna",state:"Vienna",country:"Austria"},{city:"Zurich",state:"Zurich",country:"Switzerland"},
  {city:"Geneva",state:"Geneva",country:"Switzerland"},{city:"Stockholm",state:"Stockholm",country:"Sweden"},
  {city:"Oslo",state:"Oslo",country:"Norway"},{city:"Copenhagen",state:"Capital Region",country:"Denmark"},
  {city:"Helsinki",state:"Uusimaa",country:"Finland"},{city:"Warsaw",state:"Masovian",country:"Poland"},
  {city:"Prague",state:"Prague",country:"Czech Republic"},{city:"Budapest",state:"Budapest",country:"Hungary"},
  {city:"Bucharest",state:"Bucharest",country:"Romania"},{city:"Athens",state:"Attica",country:"Greece"},
  {city:"Lisbon",state:"Lisbon",country:"Portugal"},{city:"Madrid",state:"Community of Madrid",country:"Spain"},
  {city:"Barcelona",state:"Catalonia",country:"Spain"},{city:"Rome",state:"Lazio",country:"Italy"},
  {city:"Milan",state:"Lombardy",country:"Italy"},{city:"Istanbul",state:"Istanbul",country:"Turkey"},
  {city:"Moscow",state:"Moscow",country:"Russia"},{city:"St. Petersburg",state:"Saint Petersburg",country:"Russia"},
  {city:"Mexico City",state:"CDMX",country:"Mexico"},{city:"Guadalajara",state:"Jalisco",country:"Mexico"},
  {city:"Monterrey",state:"Nuevo León",country:"Mexico"},
  {city:"Buenos Aires",state:"Buenos Aires",country:"Argentina"},
  {city:"Lima",state:"Lima",country:"Peru"},{city:"Bogotá",state:"Bogotá",country:"Colombia"},
  {city:"Santiago",state:"Santiago",country:"Chile"},{city:"Caracas",state:"Capital District",country:"Venezuela"},
  {city:"Riyadh",state:"Riyadh",country:"Saudi Arabia"},{city:"Jeddah",state:"Makkah",country:"Saudi Arabia"},
  {city:"Doha",state:"Ad Dawhah",country:"Qatar"},{city:"Kuala Lumpur",state:"KL",country:"Malaysia"},
  {city:"Jakarta",state:"Jakarta",country:"Indonesia"},{city:"Bangkok",state:"Bangkok",country:"Thailand"},
  {city:"Ho Chi Minh City",state:"Ho Chi Minh",country:"Vietnam"},{city:"Manila",state:"Metro Manila",country:"Philippines"},
  {city:"Karachi",state:"Sindh",country:"Pakistan"},{city:"Lahore",state:"Punjab",country:"Pakistan"},
  {city:"Dhaka",state:"Dhaka",country:"Bangladesh"},{city:"Colombo",state:"Western",country:"Sri Lanka"},
  {city:"Casablanca",state:"Casablanca-Settat",country:"Morocco"},{city:"Tunis",state:"Tunis",country:"Tunisia"},
  {city:"Algiers",state:"Algiers",country:"Algeria"},{city:"Kampala",state:"Kampala",country:"Uganda"},
  {city:"Kigali",state:"Kigali",country:"Rwanda"},{city:"Lusaka",state:"Lusaka",country:"Zambia"},
  {city:"Harare",state:"Harare",country:"Zimbabwe"},{city:"Maputo",state:"Maputo",country:"Mozambique"},
  {city:"Dakar",state:"Dakar",country:"Senegal"},{city:"Douala",state:"Littoral",country:"Cameroon"},
  {city:"Auckland",state:"Auckland",country:"New Zealand"},{city:"Wellington",state:"Wellington",country:"New Zealand"},
];

// ── City autocomplete with state/country autofill ────────────────────────────
function CityInput({ value, onSelect }) {
  const [query, setQuery] = useState(value || "");
  const [open,  setOpen]  = useState(false);

  const matches = query.length >= 2
    ? CITIES.filter(c => c.city.toLowerCase().startsWith(query.toLowerCase())).slice(0,8)
    : [];

  const select = c => {
    setQuery(c.city);
    onSelect(c);
    setOpen(false);
  };

  return (
    <div style={{ position:"relative" }}>
      <input className="inp" placeholder="e.g. New York"
        value={query}
        onChange={e => { setQuery(e.target.value); onSelect({ city:e.target.value, state:"", country:"" }); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
      />
      {open && matches.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 5px)", left:0, right:0, zIndex:200,
          background:"white", border:"1px solid "+V.border, borderRadius:12,
          boxShadow:"0 8px 28px rgba(0,0,0,.12)", overflow:"hidden" }}>
          {matches.map((c,i) => (
            <div key={i} onMouseDown={() => select(c)}
              style={{ padding:"10px 14px", cursor:"pointer",
                borderBottom: i < matches.length-1 ? "1px solid "+V.borderS : "none",
                transition:"background .1s" }}
              onMouseEnter={e => e.currentTarget.style.background = V.b50}
              onMouseLeave={e => e.currentTarget.style.background = "white"}>
              <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:14, color:V.text }}>
                {c.city}
              </div>
              <div style={{ fontSize:11, color:V.mutedL, marginTop:1 }}>
                {[c.state, c.country].filter(Boolean).join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


const ALL_COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
  "Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain",
  "Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia",
  "Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso",
  "Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic",
  "Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba",
  "Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini",
  "Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana",
  "Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras",
  "Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania",
  "Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Mauritania",
  "Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco",
  "Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand",
  "Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman",
  "Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines",
  "Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis",
  "Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles",
  "Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia",
  "South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname",
  "Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand",
  "Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey",
  "Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom",
  "United States","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela",
  "Vietnam","Yemen","Zambia","Zimbabwe",
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function SectionHeader({ children, required }) {
  return (
    <div style={{ fontFamily:"Outfit", fontWeight:800, fontSize:13, color:V.muted,
      textTransform:"uppercase", letterSpacing:".08em", marginBottom:18,
      paddingBottom:12, borderBottom:"1px solid "+V.borderS, display:"flex", alignItems:"center", gap:6 }}>
      {children}
      {required && <span style={{ fontSize:10, color:"#EF4444", fontWeight:700, textTransform:"none",
        letterSpacing:0, background:"#FEF2F2", border:"1px solid #FCA5A5",
        borderRadius:5, padding:"1px 6px" }}>required</span>}
    </div>
  );
}

function Lbl({ children, req, hint }) {
  return (
    <div style={{ marginBottom:7 }}>
      <label style={{ fontFamily:"Outfit", fontWeight:700, fontSize:13, color:V.text,
        textTransform:"none", letterSpacing:0, display:"block" }}>
        {children}{req && <span style={{ color:"#EF4444", marginLeft:3 }}>*</span>}
      </label>
      {hint && <div style={{ fontSize:11, color:V.mutedL, marginTop:2 }}>{hint}</div>}
    </div>
  );
}
function Err({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ fontSize:12, color:"#EF4444", marginTop:6, display:"flex",
      alignItems:"center", gap:4 }}>
      <AlertCircle size={11}/>{msg}
    </div>
  );
}
function Toggle({ on, onChange, disabled }) {
  return (
    <button className="ttr" disabled={!!disabled} onClick={() => !disabled && onChange(!on)}
      style={{ background:on?"#7C3AED":"#D1D5DB", cursor:disabled?"not-allowed":"pointer", flexShrink:0 }}>
      <div className="tth" style={{ left:on?25:3 }}/>
    </button>
  );
}

// ── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ["Event Details","Advanced"];
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:32 }}>
      {steps.map((s, i) => (
        <div key={s} style={{ display:"flex", alignItems:"center",
          flex: i < steps.length - 1 ? 1 : "none" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <div style={{ width:30, height:30, borderRadius:"50%", display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:12,
              fontFamily:"Outfit", fontWeight:800,
              background: i < step ? "#16A34A" : i === step ? V.brand : V.border,
              color: i <= step ? "white" : V.mutedL, transition:"all .2s" }}>
              {i < step ? <CheckCircle size={14}/> : i + 1}
            </div>
            <span style={{ fontSize:14, fontFamily:"Outfit", fontWeight:600,
              color: i === step ? V.text : V.mutedL }}>
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex:1, height:2,
              background: i < step ? "#16A34A" : V.border,
              margin:"0 14px", transition:"background .3s" }}/>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Country autocomplete ─────────────────────────────────────────────────────
function CountryInput({ value, onChange }) {
  const [query,   setQuery]   = useState(value || "");
  const [open,    setOpen]    = useState(false);
  const ref = useRef(null);

  const matches = query.length >= 1
    ? ALL_COUNTRIES.filter(c => c.toLowerCase().startsWith(query.toLowerCase())).slice(0,8)
    : [];

  const select = c => { setQuery(c); onChange(c); setOpen(false); };

  return (
    <div style={{ position:"relative" }} ref={ref}>
      <div style={{ position:"relative" }}>
        <Search size={14} style={{ position:"absolute", left:13, top:"50%",
          transform:"translateY(-50%)", color:V.mutedL, pointerEvents:"none" }}/>
        <input className="inp" placeholder="Search country…"
          value={query}
          style={{ paddingLeft:38 }}
          onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setTimeout(() => setOpen(false), 160); }}
        />
        {query && (
          <button onClick={() => { setQuery(""); onChange(""); }}
            style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", cursor:"pointer", color:V.muted,
              display:"flex", padding:2 }}>
            <X size={13}/>
          </button>
        )}
      </div>
      {open && matches.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 5px)", left:0, right:0, zIndex:200,
          background:"white", border:"1px solid "+V.border, borderRadius:12,
          boxShadow:"0 8px 28px rgba(0,0,0,.12)", overflow:"hidden" }}>
          {matches.map(c => (
            <div key={c} onMouseDown={() => select(c)}
              style={{ padding:"11px 14px", cursor:"pointer", fontSize:14,
                fontFamily:"DM Sans", color:V.text, borderBottom:"1px solid "+V.borderS,
                transition:"background .1s" }}
              onMouseEnter={e => e.currentTarget.style.background = V.b50}
              onMouseLeave={e => e.currentTarget.style.background = "white"}>
              {c}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DatePicker wrapper ───────────────────────────────────────────────────────
// customInput MUST be a forwardRef component — react-datepicker passes a ref
// to it internally, and a plain <input> will throw "fn is not a function".
const DateInput = forwardRef(({ value, onClick, placeholder, disabled }, ref) => (
  <input
    ref={ref}
    className="inp"
    value={value || ""}
    onClick={onClick}
    onChange={() => {}} // controlled by DatePicker
    placeholder={placeholder}
    readOnly
    style={{ cursor: disabled ? "not-allowed" : "pointer", width:"100%",
      opacity: disabled ? 0.45 : 1 }}
  />
));
DateInput.displayName = "DateInput";

function StyledDatePicker({ selected, onChange, placeholderText, showTimeSelect,
  timeOnly, minDate, disabled, dateFormat }) {
  return (
    <DatePicker
      selected={selected}
      onChange={onChange}
      placeholderText={placeholderText}
      showTimeSelect={showTimeSelect}
      showTimeSelectOnly={timeOnly}
      timeIntervals={15}
      timeCaption="Time"
      dateFormat={dateFormat || (timeOnly ? "h:mm aa" : "MMM d, yyyy")}
      minDate={timeOnly ? undefined : (minDate !== undefined ? minDate : TODAY)}
      disabled={disabled}
      customInput={<DateInput disabled={disabled}/>}
      popperPlacement="bottom-start"
      popperProps={timeOnly ? { style:{ minWidth:"100%", width:"100%" } } : undefined}
    />
  );
}

// ── Multi-day schedule ────────────────────────────────────────────────────────
function ScheduleSection({ form, setF, errs }) {
  const addDay = () => {
    const last = form.days[form.days.length - 1];
    setF(f => ({
      ...f,
      days: [...f.days, {
        date:      null,
        startTime: form.sameTime ? form.days[0].startTime : last.startTime,
        endTime:   form.sameTime ? form.days[0].endTime   : last.endTime,
      }],
    }));
  };

  const removeDay = idx =>
    setF(f => ({ ...f, days: f.days.filter((_,i) => i !== idx) }));

  const updateDay = (idx, field, value) => {
    setF(f => {
      const days = f.days.map((d, i) => {
        if (i === idx) return { ...d, [field]: value };
        if (f.sameTime && (field==="startTime"||field==="endTime") && idx===0)
          return { ...d, [field]: value };
        return d;
      });
      return { ...f, days };
    });
  };

  const toggleSameTime = val => {
    setF(f => {
      const first = f.days[0];
      const days = val
        ? f.days.map(d => ({ ...d, startTime:first.startTime, endTime:first.endTime }))
        : f.days;
      return { ...f, sameTime:val, days };
    });
  };

  // Minimum date for day N is the date of day N-1 + 1 day
  const minForDay = i => {
    if (i === 0) return TODAY;
    const prev = form.days[i-1].date;
    if (!prev) return TODAY;
    const d = new Date(prev);
    d.setDate(d.getDate() + 1);
    return d;
  };

  return (
    <div>
      {/* Multi-day toggle */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:20, background:V.surface, borderRadius:13, padding:"14px 16px",
        border:"1px solid "+V.borderS }}>
        <div>
          <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:14, color:V.text }}>Multi-day Event</div>
          <div style={{ fontSize:12, color:V.muted, marginTop:2 }}>Spans across multiple dates</div>
        </div>
        <Toggle on={form.isMultiDay} onChange={val =>
          setF(f => ({ ...f, isMultiDay:val, days: val ? f.days : [f.days[0]] }))}/>
      </div>

      {/* Day cards */}
      {form.days.map((day, i) => (
        <div key={i} style={{ background:V.surface, borderRadius:14,
          padding:"18px 18px 16px", marginBottom:12,
          border:"1px solid "+V.borderS }}>
          <div style={{ display:"flex", alignItems:"center",
            justifyContent:"space-between", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:26, height:26, borderRadius:8, background:V.brand+"18",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontFamily:"Outfit", fontWeight:800, color:V.brand }}>
                {i+1}
              </div>
              <span style={{ fontFamily:"Outfit", fontWeight:700, fontSize:14, color:V.text }}>
                {i === 0 ? "Event Day" : `Day ${i+1}`}
              </span>
            </div>
            {form.isMultiDay && i > 0 && (
              <button onClick={() => removeDay(i)}
                style={{ background:"none", border:"none", cursor:"pointer",
                  color:"#EF4444", display:"flex", padding:4 }}>
                <Trash2 size={14}/>
              </button>
            )}
          </div>

          {/* Date */}
          <div style={{ marginBottom:14 }}>
            <Lbl req>Date</Lbl>
            <StyledDatePicker
              selected={day.date}
              onChange={d => updateDay(i,"date",d)}
              placeholderText="Select date…"
              minDate={minForDay(i)}
            />
          </div>

          {/* Start + End time side by side → stacks on mobile */}
          <div className="schedule-time-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <Lbl req>Start Time</Lbl>
              <StyledDatePicker
                selected={day.startTime}
                onChange={d => updateDay(i,"startTime",d)}
                placeholderText="Start…"
                showTimeSelect
                timeOnly
                disabled={form.sameTime && i > 0}
              />
            </div>
            <div>
              <Lbl req>End Time</Lbl>
              <StyledDatePicker
                selected={day.endTime}
                onChange={d => updateDay(i,"endTime",d)}
                placeholderText="End…"
                showTimeSelect
                timeOnly
                disabled={form.sameTime && i > 0}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Controls */}
      {form.isMultiDay && (
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", flexWrap:"wrap", gap:10, marginTop:4 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer",
            opacity: form.days[0].startTime ? 1 : 0.5 }}>
            <input type="checkbox" checked={form.sameTime}
              onChange={e => toggleSameTime(e.target.checked)}
              disabled={!form.days[0].startTime}
              style={{ accentColor:V.brand, width:15, height:15, cursor:"pointer" }}/>
            <span style={{ fontSize:13, color:V.text, fontFamily:"Outfit", fontWeight:600 }}>
              Same time for all days
            </span>
          </label>
          <button onClick={addDay} className="bg"
            style={{ gap:6, fontSize:13, borderRadius:10, color:V.brand }}>
            <Plus size={13}/>Add Another Day
          </button>
        </div>
      )}

      <Err msg={errs?.schedule}/>
    </div>
  );
}

// ── Ticket types ─────────────────────────────────────────────────────────────
function TicketTypesSection({ form, setF, errs }) {
  const isFree = !form.ticketTypes || form.ticketTypes.every(t => !t.price || t.price === "0");

  const updateTypePrice = (name, price) =>
    setF(f => ({ ...f, ticketTypes: f.ticketTypes.map(t => t.name===name?{...t,price}:t) }));

  const toggleType = (name, on) =>
    setF(f => ({ ...f, ticketTypes: f.ticketTypes.map(t => t.name===name?{...t,enabled:on}:t) }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      {/* Multiple types toggle */}
      <div style={{ background:V.surface, borderRadius:13, padding:"14px 16px",
        border:"1px solid "+V.borderS }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          marginBottom: form.useMultipleTypes ? 16 : 0 }}>
          <div>
            <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:14, color:V.text }}>
              Multiple Ticket Types
            </div>
            <div style={{ fontSize:12, color:V.muted, marginTop:2 }}>Add VIP or Sponsor tiers</div>
          </div>
          <Toggle on={form.useMultipleTypes} onChange={val =>
            setF(f => ({
              ...f, useMultipleTypes:val,
              ticketTypes: val
                ? TICKET_TYPES_LIST.map((n,i) => ({ name:n, enabled:i===0, price:i===0?f.basePrice:"" }))
                : [{ name:"Regular", enabled:true, price:f.basePrice||"" }],
            }))}/>
        </div>

        {form.useMultipleTypes && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {form.ticketTypes.map((tt, i) => (
              <div key={tt.name} style={{ display:"flex", alignItems:"center", gap:12,
                background:"white", borderRadius:11, padding:"12px 14px",
                border:"2px solid "+(tt.enabled?V.b100:V.borderS), transition:"border .2s" }}>
                {i === 0 ? (
                  <div style={{ width:20, height:20, borderRadius:6, background:V.brand+"20",
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <CheckCircle size={12} color={V.brand}/>
                  </div>
                ) : (
                  <input type="checkbox" checked={tt.enabled}
                    onChange={e => toggleType(tt.name, e.target.checked)}
                    style={{ accentColor:V.brand, width:17, height:17,
                      cursor:"pointer", flexShrink:0 }}/>
                )}
                <span style={{ fontFamily:"Outfit", fontWeight:700, fontSize:14,
                  color:V.text, minWidth:70 }}>
                  {tt.name}
                  {tt.name==="Regular" && (
                    <span style={{ fontSize:10, color:V.mutedL, fontWeight:400, marginLeft:5 }}>
                      (base)
                    </span>
                  )}
                </span>
                <div style={{ flex:1, position:"relative" }}>
                  <input className="inp" placeholder={tt.enabled?"Price in OG (0 = free)":"—"}
                    type="number" min="0" step="0.001"
                    disabled={!tt.enabled}
                    value={tt.price}
                    onChange={e => updateTypePrice(tt.name, e.target.value)}
                    style={{ paddingRight: tt.price&&tt.price!=="0"?110:14,
                      opacity:tt.enabled?1:.4, pointerEvents:tt.enabled?"auto":"none" }}/>
                  {tt.enabled && tt.price && tt.price!=="0" && (
                    <span style={{ position:"absolute", right:12, top:"50%",
                      transform:"translateY(-50%)", fontSize:11, color:V.mutedL,
                      fontFamily:"Outfit", fontWeight:600 }}>
                      ≈${(parseFloat(tt.price||0)*OG_TO_USD_RATE).toFixed(2)}
                    </span>
                  )}
                </div>
                {tt.enabled && (!tt.price||tt.price==="0") && (
                  <span style={{ fontSize:11, color:"#16A34A", fontFamily:"Outfit",
                    fontWeight:700, flexShrink:0 }}>FREE</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Single price */}
      {!form.useMultipleTypes && (
        <div>
          <Lbl hint="Leave empty or 0 for a free event">Ticket Price (OG tokens)</Lbl>
          <div style={{ position:"relative" }}>
            <input className="inp" placeholder="0 — free event" type="number"
              min="0" step="0.001" value={form.basePrice}
              onChange={e => {
                const p = e.target.value;
                setF(f => ({ ...f, basePrice:p,
                  ticketTypes:[{ name:"Regular", enabled:true, price:p }] }));
              }}
              style={{ paddingRight: form.basePrice&&form.basePrice!=="0"?110:14 }}/>
            {form.basePrice && form.basePrice!=="0" && (
              <span style={{ position:"absolute", right:12, top:"50%",
                transform:"translateY(-50%)", fontSize:11, color:V.mutedL,
                fontFamily:"Outfit", fontWeight:600 }}>
                ≈${(parseFloat(form.basePrice||0)*OG_TO_USD_RATE).toFixed(2)} USD
              </span>
            )}
          </div>
          {isFree && (
            <div style={{ fontSize:12, color:"#16A34A", marginTop:7,
              display:"flex", alignItems:"center", gap:4 }}>
              <CheckCircle size={12}/>This event is free
            </div>
          )}
        </div>
      )}

      {/* Max tickets */}
      <div>
        <Lbl req>Max Ticket Supply</Lbl>
        <input className="inp" placeholder="e.g. 500" type="number" min="1"
          value={form.maxTickets}
          onChange={e => setF(f => ({ ...f, maxTickets:e.target.value }))}/>
        <Err msg={errs?.maxTickets}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Event Details
// ─────────────────────────────────────────────────────────────────────────────
function Step1({ form, setF, errs, uploadErr, setUploadErr, uploading }) {
  const pickImage = e => {
    const f = e.target.files[0];
    setUploadErr("");
    if (!f) return;
    if (!f.type.startsWith("image/")) { setUploadErr("Please select an image file."); return; }
    const MAX = 2 * 1024 * 1024;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      if (f.size <= MAX) {
        setF(ff => ({ ...ff, imagePreview:dataUrl, imageFile:f })); return;
      }
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 1920;
        let {width,height} = img;
        if (width>MAX_DIM||height>MAX_DIM) {
          if (width>=height) { height=Math.round(height*MAX_DIM/width); width=MAX_DIM; }
          else               { width=Math.round(width*MAX_DIM/height); height=MAX_DIM; }
        }
        canvas.width=width; canvas.height=height;
        canvas.getContext("2d").drawImage(img,0,0,width,height);
        let lo=0.1,hi=0.92,bestUrl=null,bestBlob=null,iter=0;
        const step = () => {
          if (iter>=4) {
            if (bestUrl) setF(ff=>({...ff,imagePreview:bestUrl,
              imageFile:new File([bestBlob],f.name.replace(/\.[^.]+$/,".jpg"),{type:"image/jpeg"})}));
            else setUploadErr("Could not compress image under 2MB.");
            return;
          }
          iter++;
          canvas.toBlob(blob=>{
            if(!blob){hi=(lo+hi)/2;step();return;}
            const r2=new FileReader();
            r2.onload=e2=>{
              if(blob.size<=MAX){bestUrl=e2.target.result;bestBlob=blob;lo=(lo+hi)/2;}
              else hi=(lo+hi)/2;
              step();
            };
            r2.readAsDataURL(blob);
          },"image/jpeg",(lo+hi)/2);
        };
        step();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(f);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:30 }}>

      {/* ─ Event Info ─ */}
      <section>
        <SectionHeader>Event Info</SectionHeader>
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div>
            <Lbl req>Event Name</Lbl>
            <input className="inp" placeholder="e.g. Neon Frequency Festival 2025"
              value={form.name} onChange={e => setF(f=>({...f,name:e.target.value}))}/>
            <Err msg={errs.name}/>
          </div>
          <div>
            <Lbl req>Short Description</Lbl>
            <input className="inp" placeholder="One-line summary shown on event cards"
              value={form.shortDescription}
              onChange={e => setF(f=>({...f,shortDescription:e.target.value}))}/>
            <Err msg={errs.shortDesc}/>
          </div>
          <div>
            <Lbl>
              Full Description{" "}
              <span style={{ fontSize:11, fontWeight:400, color:V.mutedL }}>(optional)</span>
            </Lbl>
            <textarea className="inp" placeholder="Describe the full event experience…"
              value={form.fullDescription}
              onChange={e => setF(f=>({...f,fullDescription:e.target.value}))}
              style={{ minHeight:90, resize:"vertical", lineHeight:1.7 }}/>
          </div>
          <div>
            <Lbl>Category</Lbl>
            <div style={{ position:"relative" }}>
              <select className="inp" value={form.category}
                onChange={e => setF(f=>({...f,category:e.target.value}))}
                style={{ cursor:"pointer", appearance:"none", paddingRight:40 }}>
                {CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
              </select>
              <ChevronDown size={15} style={{ position:"absolute", right:14,
                top:"50%", transform:"translateY(-50%)",
                color:V.mutedL, pointerEvents:"none" }}/>
            </div>
          </div>
        </div>
      </section>

      {/* ─ Event Image (required) ─ */}
      <section>
        <SectionHeader>Event Image <span style={{ color:"#EF4444", fontWeight:800 }}>*</span></SectionHeader>
        {form.imagePreview ? (
          <div style={{ position:"relative", height:200, borderRadius:16,
            overflow:"hidden", border:"2px solid #A3E635" }}>
            <img src={form.imagePreview} alt=""
              style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            <button onClick={() => setF(f=>({...f,imagePreview:null,imageFile:null}))}
              style={{ position:"absolute", top:12, right:12,
                background:"rgba(239,68,68,.9)", border:"none", borderRadius:9,
                padding:"6px 11px", cursor:"pointer", display:"flex",
                alignItems:"center", gap:5, color:"white",
                fontSize:12, fontFamily:"Outfit", fontWeight:600 }}>
              <X size={12}/>Remove
            </button>
            <div style={{ position:"absolute", bottom:12, left:12,
              background:"rgba(0,0,0,.55)", borderRadius:7,
              padding:"5px 11px", color:"white",
              fontSize:11, fontFamily:"Outfit", fontWeight:600 }}>
              ✓ Will upload when you create the event
            </div>
          </div>
        ) : (
          <label htmlFor="imgup"
            style={{ display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", gap:10, height:140,
              border:"2px dashed "+(uploadErr||errs.image?"#FCA5A5":V.border),
              borderRadius:16, cursor:"pointer", background:V.surface,
              transition:"border-color .2s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=V.brand; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor=uploadErr||errs.image?"#FCA5A5":V.border; }}>
            <Upload size={24} color={uploadErr||errs.image?"#EF4444":V.mutedL}/>
            <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:14,
              color:uploadErr||errs.image?"#EF4444":V.muted }}>
              Upload event image
            </div>
            <div style={{ fontSize:12, color:V.mutedL }}>
              PNG, JPG, GIF · auto-compressed to 2 MB
            </div>
          </label>
        )}
        <input id="imgup" type="file" accept="image/*"
          style={{ display:"none" }} onChange={pickImage}/>
        {(uploadErr||errs.image) && <Err msg={uploadErr||errs.image}/>}
        {uploading && (
          <div style={{ display:"flex", alignItems:"center", gap:7,
            marginTop:8, fontSize:13, color:V.brand }}>
            <RefreshCw size={13} className="spin"/>Uploading image…
          </div>
        )}
      </section>

      {/* ─ Location ─ */}
      <section>
        <SectionHeader>Location</SectionHeader>
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          <div>
            <Lbl req>Venue Name</Lbl>
            <input className="inp" placeholder="e.g. Madison Square Garden"
              value={form.venue}
              onChange={e => setF(f=>({...f,venue:e.target.value}))}/>
            <Err msg={errs.venue}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              <Lbl req>City</Lbl>
              <CityInput
                value={form.city}
                onSelect={c => setF(f => ({
                  ...f,
                  city:    c.city,
                  state:   c.state  || f.state,
                  country: c.country || f.country,
                }))}
              />
              <Err msg={errs.city}/>
            </div>
            <div>
              <Lbl>State / Region</Lbl>
              <input className="inp" placeholder="e.g. NY or Lagos"
                value={form.state}
                onChange={e => setF(f=>({...f,state:e.target.value}))}/>
            </div>
          </div>
          <div>
            <Lbl>Country</Lbl>
            <CountryInput
              value={form.country}
              onChange={c => setF(f=>({...f,country:c}))}
            />
          </div>
        </div>
      </section>

      {/* ─ Schedule ─ */}
      <section>
        <SectionHeader>Schedule</SectionHeader>
        <ScheduleSection form={form} setF={setF} errs={errs}/>
      </section>

      {/* ─ Tickets ─ */}
      <section>
        <SectionHeader>Tickets</SectionHeader>
        <TicketTypesSection form={form} setF={setF} errs={errs}/>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Advanced Settings
// ─────────────────────────────────────────────────────────────────────────────
function Step2({ form, setF }) {
  const isFree = !form.basePrice || form.basePrice === "0";
  const FIELDS = [
    { key:"email",    label:"Email Address",  icon:"✉️" },
    { key:"name",     label:"Full Name",       icon:"👤" },
    { key:"phone",    label:"Phone Number",    icon:"📱" },
    { key:"location", label:"City / Location", icon:"📍" },
  ];

  const toggleField = key =>
    setF(f => ({ ...f, requiredFields:{ ...f.requiredFields, [key]:!f.requiredFields[key] } }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:28 }}>

      {/* Off-chain tickets */}
      <section>
        <SectionHeader>Off-chain Tickets</SectionHeader>
        <div style={{ background:V.surface, borderRadius:13, padding:"16px 18px",
          border:"1px solid "+V.borderS, opacity:isFree?1:.5 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:14, color:V.text }}>
                Accept Email Tickets
              </div>
              <div style={{ fontSize:12, color:V.muted, marginTop:3 }}>
                {isFree
                  ? "Guests attend without a wallet — they receive a confirmation email."
                  : "Only available for free events."}
              </div>
            </div>
            <Toggle on={form.acceptsOffchain} disabled={!isFree}
              onChange={val => setF(f=>({...f,acceptsOffchain:val}))}/>
          </div>
        </div>
      </section>

      {/* Guest data */}
      <section>
        <SectionHeader>Guest Data Collection</SectionHeader>
        <div style={{ background:V.surface, borderRadius:13, padding:"16px 18px",
          marginBottom:16, border:"1px solid "+V.borderS }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <div style={{ fontFamily:"Outfit", fontWeight:700, fontSize:14, color:V.text }}>
                Collect Guest Information
              </div>
              <div style={{ fontSize:12, color:V.muted, marginTop:3 }}>
                Request data from attendees when they get a ticket
              </div>
            </div>
            <Toggle on={form.collectGuestData}
              onChange={val => setF(f=>({...f,collectGuestData:val}))}/>
          </div>
        </div>

        {form.collectGuestData && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {FIELDS.map(({ key, label, icon }) => (
                <div key={key} onClick={() => toggleField(key)}
                  style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"13px 14px", borderRadius:12,
                    border:"2px solid "+(form.requiredFields[key]?V.brand:V.border),
                    background:form.requiredFields[key]?V.b50:"white",
                    cursor:"pointer", transition:"all .15s" }}>
                  <span style={{ fontSize:17 }}>{icon}</span>
                  <span style={{ fontFamily:"Outfit", fontWeight:600, fontSize:13,
                    color:form.requiredFields[key]?V.brand:V.text, flex:1 }}>{label}</span>
                  {form.requiredFields[key] && <CheckCircle size={14} color={V.brand}/>}
                </div>
              ))}
            </div>
            <div>
              <Lbl hint="Guests will answer this when getting a ticket">
                Custom Question{" "}
                <span style={{ fontSize:11, fontWeight:400, color:V.mutedL }}>(optional)</span>
              </Lbl>
              <input className="inp" placeholder="e.g. How did you hear about this event?"
                value={form.requiredFields.customQuestion||""}
                onChange={e => setF(f=>({...f,requiredFields:{...f.requiredFields,customQuestion:e.target.value}}))}/>
            </div>
            <div>
              <Lbl hint="We'll email you a summary of guest registrations">
                Your Notification Email
              </Lbl>
              <input className="inp" placeholder="you@example.com" type="email"
                value={form.organizerEmail||""}
                onChange={e => setF(f=>({...f,organizerEmail:e.target.value}))}/>
              <div style={{ fontSize:11, color:V.mutedL, marginTop:6,
                display:"flex", alignItems:"center", gap:4 }}>
                <Info size={10}/>Guest data is also viewable in your Dashboard under each event.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Notice */}
      <div style={{ background:V.b50, border:"1px solid "+V.b100, borderRadius:13,
        padding:"13px 16px", display:"flex", gap:10 }}>
        <Shield size={15} color={V.brand} style={{ flexShrink:0, marginTop:1 }}/>
        <div style={{ fontSize:13, color:"#5B21B6", lineHeight:1.7 }}>
          All tickets are soulbound ERC-721 NFTs — they cannot be resold or transferred,
          preventing scalping.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
const INIT = {
  name:"", shortDescription:"", fullDescription:"",
  category:"Music",
  imageFile:null, imagePreview:null,
  venue:"", city:"", state:"", country:"",
  isMultiDay:false, sameTime:false,
  days:[{ date:null, startTime:null, endTime:null }],
  useMultipleTypes:false,
  basePrice:"",
  ticketTypes:[{ name:"Regular", enabled:true, price:"" }],
  maxTickets:"500",
  acceptsOffchain:false,
  collectGuestData:false,
  requiredFields:{ email:false, name:false, phone:false, location:false, customQuestion:"" },
  organizerEmail:"",
};

export default function CreateEventPage({ onCreated }) {
  const { wallet, connect, connecting } = useWallet();
  const [step,      setStep]     = useState(0);
  const [form,      setF]        = useState(INIT);
  const [errs,      setE]        = useState({});
  const [busy,      setBusy]     = useState(false);
  const [uploading, setUploading]= useState(false);
  const [uploadErr, setUploadErr]= useState("");
  const [txErr,     setTxErr]    = useState("");
  const [done,      setDone]     = useState(null);
  const navigate = useNavigate();

  const uploadImage = async (file) => {
    const ext = file.name.split(".").pop();
    const filename    = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const contentType = file.type || "image/jpeg";
    const res = await fetch(
      `/api/upload-image?filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(contentType)}`,
      { method:"POST", headers:{"Content-Type":contentType}, body:file }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Image upload failed.");
    return data.url;
  };

  // Convert Date objects from the date pickers to string format for contract
  const dayToStrings = (day) => {
    const date     = day.date ? `${day.date.getFullYear()}-${String(day.date.getMonth()+1).padStart(2,"0")}-${String(day.date.getDate()).padStart(2,"0")}` : "";
    const startTime = day.startTime ? `${String(day.startTime.getHours()).padStart(2,"0")}:${String(day.startTime.getMinutes()).padStart(2,"0")}` : "00:00";
    const endTime   = day.endTime   ? `${String(day.endTime.getHours()).padStart(2,"0")}:${String(day.endTime.getMinutes()).padStart(2,"0")}` : "23:59";
    return { date, startTime, endTime };
  };

  const validate1 = () => {
    const e = {};
    if (!form.name.trim())             e.name      = "Event name is required.";
    if (!form.shortDescription.trim()) e.shortDesc = "Short description is required.";
    if (!form.imageFile)               e.image     = "An event image is required.";
    if (!form.venue.trim())            e.venue     = "Venue name is required.";
    if (!form.city.trim())             e.city      = "City is required.";
    if (!form.days[0]?.date)           e.schedule  = "Start date is required.";
    if (!form.days[0]?.startTime)      e.schedule  = (e.schedule||"") || "Start time is required.";
    if (!form.days[0]?.endTime)        e.schedule  = (e.schedule||"") || "End time is required.";
    if (!form.maxTickets || parseInt(form.maxTickets) < 1)
      e.maxTickets = "Enter max ticket supply (at least 1).";
    setE(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate1()) setStep(1); };
  const back = () => setStep(0);

  const submit = async () => {
    setBusy(true); setTxErr(""); setUploadErr("");
    try {
      let imageURI = "";
      if (form.imageFile) {
        setUploading(true);
        try { imageURI = await uploadImage(form.imageFile); }
        catch (err) { setUploadErr(err.message); setBusy(false); setUploading(false); return; }
        setUploading(false);
      }

      // Convert Date picker objects → string format for contract
      const stringDays = form.days.map(dayToStrings);

      const requiredFields = form.collectGuestData ? {
        email:          form.requiredFields.email,
        name:           form.requiredFields.name,
        phone:          form.requiredFields.phone,
        location:       form.requiredFields.location,
        customQuestion: form.requiredFields.customQuestion || "",
      } : null;

      const { txHash, eventId } = await createEventOnChain({
        ...form,
        days: stringDays,
        // Fallback single-day fields for contract.js
        startDate: stringDays[0].date,
        startTime: stringDays[0].startTime,
        endDate:   stringDays[stringDays.length-1].date,
        endTime:   stringDays[stringDays.length-1].endTime,
        imageURI,
        requiredFields,
        organizerEmail: form.collectGuestData ? form.organizerEmail : "",
      });

      const shareUrl = `${window.location.origin}/event/${form.name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}-${eventId}`;
      setDone({ txHash, eventId, shareUrl });
      if (onCreated) await onCreated();
    } catch (err) {
      setTxErr(err?.reason || err?.message || "Transaction failed.");
    } finally { setBusy(false); setUploading(false); }
  };

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!wallet) return (
    <div style={{ padding:"80px 24px", display:"flex", alignItems:"center",
      justifyContent:"center", minHeight:"80vh" }}>
      <div style={{ textAlign:"center", maxWidth:400 }}>
        <div style={{ width:64, height:64, borderRadius:18, background:V.b50,
          border:"1px solid "+V.b100, display:"flex", alignItems:"center",
          justifyContent:"center", margin:"0 auto 18px" }}>
          <Wallet size={28} color={V.brand}/>
        </div>
        <h2 style={{ fontFamily:"Outfit", fontWeight:900, fontSize:26,
          color:V.text, marginBottom:10 }}>Connect to Host</h2>
        <p style={{ color:V.muted, lineHeight:1.7, marginBottom:26, fontSize:15 }}>
          You need a connected wallet to create events and collect revenue on-chain.
        </p>
        <button className="bp" onClick={connect} disabled={connecting}
          style={{ borderRadius:14, padding:"13px 28px", fontSize:15, gap:10 }}>
          {connecting
            ? <><RefreshCw size={15} className="spin"/>Connecting…</>
            : <><Wallet size={16}/>Connect Wallet</>}
        </button>
      </div>
    </div>
  );

  // ── Success ────────────────────────────────────────────────────────────────
  if (done) return (
    <div style={{ padding:"80px 24px", display:"flex", alignItems:"center",
      justifyContent:"center", minHeight:"80vh" }}>
      <div className="mdg card" style={{ width:"100%", maxWidth:460,
        padding:42, textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:18, background:"#F0FDF4",
          border:"1px solid #86EFAC", display:"flex", alignItems:"center",
          justifyContent:"center", margin:"0 auto 20px" }}>
          <CheckCircle size={30} color="#16A34A"/>
        </div>
        <h2 style={{ fontFamily:"Outfit", fontWeight:900, fontSize:26,
          color:V.text, marginBottom:10 }}>Event Created!</h2>
        <p style={{ color:V.muted, lineHeight:1.7, marginBottom:18, fontSize:14 }}>
          Your event is live on the 0G blockchain.
        </p>
        <div style={{ background:V.surface, border:"1px solid "+V.border,
          borderRadius:12, padding:"12px 16px", display:"flex",
          alignItems:"center", gap:10, marginBottom:20, textAlign:"left" }}>
          <div style={{ flex:1, fontSize:12, fontFamily:"monospace", color:V.muted,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {done.shareUrl}
          </div>
          <button className="bg"
            style={{ flexShrink:0, padding:"6px 11px", gap:4, fontSize:12, color:V.brand }}
            onClick={() => navigator.clipboard.writeText(done.shareUrl)}>
            <ExternalLink size={12}/>Copy
          </button>
        </div>
        <button className="bp" onClick={() => navigate("/dashboard")}
          style={{ width:"100%", justifyContent:"center", padding:14 }}>
          View in Dashboard
        </button>
      </div>
    </div>
  );

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"80px 24px 100px", maxWidth:700, margin:"0 auto" }}>
      <div className="fu" style={{ marginBottom:30 }}>
        <h1 style={{ fontFamily:"Outfit", fontWeight:900, fontSize:34,
          color:V.text, marginBottom:8 }}>Host an Event</h1>
        <p style={{ color:V.muted, fontSize:15 }}>
          Create your event and start selling NFT tickets on the 0G blockchain.
        </p>
      </div>

      <div className="fu2 card create-event-card" style={{ padding:"34px 32px" }}>
        <StepBar step={step}/>

        {step === 0 && (
          <Step1 form={form} setF={setF} errs={errs}
            uploadErr={uploadErr} setUploadErr={setUploadErr} uploading={uploading}/>
        )}
        {step === 1 && <Step2 form={form} setF={setF}/>}

        {txErr && (
          <div style={{ background:"#FEF2F2", border:"1px solid #FCA5A5",
            borderRadius:12, padding:"13px 16px", marginTop:22,
            display:"flex", alignItems:"center", gap:9, fontSize:13, color:"#DC2626" }}>
            <AlertCircle size={14}/>{txErr}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display:"flex", gap:12, marginTop:28,
          justifyContent: step===0 ? "flex-end" : "space-between" }}>
          {step === 1 && (
            <button className="bg" onClick={back}
              style={{ gap:6, padding:"13px 22px", borderRadius:13, fontSize:14 }}>
              <ArrowLeft size={14}/>Back
            </button>
          )}
          {step === 0 ? (
            <button className="bp" onClick={next}
              style={{ padding:"13px 26px", borderRadius:13, gap:8, fontSize:14 }}>
              Next: Advanced Settings<ArrowRight size={14}/>
            </button>
          ) : (
            <button className="bp" onClick={submit} disabled={busy}
              style={{ flex:1, justifyContent:"center",
                padding:14, borderRadius:14, fontSize:15 }}>
              {uploading
                ? <><RefreshCw size={15} className="spin"/>Uploading image…</>
                : busy
                  ? <><RefreshCw size={15} className="spin"/>Creating on 0G…</>
                  : <>Create Event on 0G Blockchain</>}
            </button>
          )}
        </div>

        {step === 1 && (
          <p style={{ textAlign:"center", marginTop:12,
            fontSize:12, color:V.mutedL }}>
            This will open MetaMask to confirm the transaction.
          </p>
        )}
      </div>

      {/* react-datepicker theme override — matches project style */}
      <style>{`
        /* ── Calendar (date picker) ── */
        .react-datepicker { border:1px solid ${V.border}!important; border-radius:16px!important; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,.13)!important; font-family:'DM Sans',sans-serif!important; }
        .react-datepicker__header { background:${V.b50}!important; border-bottom:1px solid ${V.border}!important; padding:14px 0 8px!important; }
        .react-datepicker__current-month { color:${V.text}!important; font-family:'Outfit',sans-serif!important; font-weight:800!important; font-size:14px!important; }
        .react-datepicker__day-names { margin-top:4px!important; }
        .react-datepicker__day-name { font-size:11px!important; color:${V.mutedL}!important; font-weight:700!important; width:2.2rem!important; line-height:2.2rem!important; }
        .react-datepicker__month { margin:6px!important; }
        .react-datepicker__day { border-radius:8px!important; font-size:13px!important; color:${V.text}!important; width:2.2rem!important; line-height:2.2rem!important; margin:1px!important; }
        .react-datepicker__day:hover { background:${V.b50}!important; color:${V.brand}!important; }
        .react-datepicker__day--selected,.react-datepicker__day--keyboard-selected { background:${V.brand}!important; color:white!important; font-weight:700!important; }
        .react-datepicker__day--disabled { color:${V.mutedL}!important; opacity:.4; cursor:not-allowed!important; }
        .react-datepicker__navigation { top:12px!important; }
        .react-datepicker__navigation-icon::before { border-color:${V.brand}!important; border-width:2px 2px 0 0!important; width:8px!important; height:8px!important; }

        /* ── Time-only dropdown — fills input width ── */
        .react-datepicker__time-only { border-radius:16px!important; overflow:hidden; width:100%!important; }
        .react-datepicker__time-only .react-datepicker__time { background:white!important; width:100%!important; }
        .react-datepicker__time-only .react-datepicker__time-box { width:100%!important; }
        .react-datepicker__time-only .react-datepicker__time-list-item { font-size:14px!important; color:${V.text}!important; padding:10px 18px!important; height:auto!important; }
        .react-datepicker__time-only .react-datepicker__time-list-item:hover { background:${V.b50}!important; color:${V.brand}!important; }
        .react-datepicker__time-only .react-datepicker__time-list-item--selected { background:${V.brand}!important; color:white!important; font-weight:700!important; }
        .react-datepicker__time-only .react-datepicker__header--time { padding:10px 0!important; }

        /* ── Shared ── */
        .react-datepicker__triangle { display:none!important; }
        .react-datepicker-wrapper { width:100%!important; }
        .react-datepicker__input-container { width:100%!important; }

        /* ── Mobile — stack schedule grid, remove card shadow/padding ── */
        @media (max-width: 540px) {
          .create-event-card { padding:20px 16px!important; box-shadow:none!important; border-radius:0!important; border-left:none!important; border-right:none!important; }
          .schedule-time-grid { grid-template-columns:1fr!important; }
          .react-datepicker { font-size:13px!important; }
          .react-datepicker__day-name,.react-datepicker__day { width:2rem!important; line-height:2rem!important; }
        }
      `}</style>
    </div>
  );
}