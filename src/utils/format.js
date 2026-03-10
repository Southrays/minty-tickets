import { OG_TO_USD_RATE } from "./constants";
export const formatDate  = ts => new Date(ts*1000).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
export const formatTime  = ts => new Date(ts*1000).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
export const shortAddr   = a  => a ? a.slice(0,6)+"..."+a.slice(-4) : "";
export const soldPct     = (s,m) => Math.min(100,Math.round((s/m)*100));
export const ogToUSD     = og  => (parseFloat(og||0)*OG_TO_USD_RATE).toFixed(2);
export const slugify     = str => str.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
