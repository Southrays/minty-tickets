/* global BigInt */
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, ZERO_G_CHAIN, PLATFORM_FEE_PCT, OG_TO_USD_RATE } from "./constants";

export const MINTY_ABI = [
  // Events
  "event EventCreated(uint256 indexed eventId, address indexed organizer, uint256 ticketTiers)",
  "event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, uint256 ticketType, address buyer)",
  "event TicketCheckedIn(uint256 indexed tokenId, uint256 indexed eventId)",
  "event TicketBurned(uint256 indexed tokenId, uint256 indexed eventId, address indexed owner)",
  "event CheckInManagerUpdated(address indexed organizer, address indexed manager, bool status)",
  // Views — events() auto-getter cannot return TicketTier[] dynamic array, so it's omitted
  "function events(uint256) external view returns (uint256 id, address organizer, string name, string metadataCid, uint256 startTime, uint256 endTime, uint256 maxTickets, uint256 soldTickets, string imageURI, bytes32 merkleRoot, bool acceptsOffchainTickets)",
  "function tickets(uint256) external view returns (uint256 eventId, uint256 ticketType, string metadataCid, bool checkedIn, uint256 mintTime)",
  "function ownerOf(uint256) external view returns (address)",
  "function getUserTicketIds(address) external view returns (uint256[])",
  "function getOrganizerEvents(address) external view returns (uint256[])",
  "function totalEvents() external view returns (uint256)",
  "function getOrganizerBalance(address) external view returns (uint256)",
  "function isCheckInManager(address,address) external view returns (bool)",
  // Writes
  "function createEvent((string name, string metadataCid, uint256 startTime, uint256 endTime, uint256 maxTickets, string imageURI, bool acceptsOffchainTickets) params, uint256[] prices, uint256[] supplies) external returns (uint256)",
  "function buyTicket(uint256 _eventId, uint256 _ticketType, string _ticketMetaCid) external payable returns (uint256)",
  "function checkIn(uint256,bytes32,uint256,bytes) external",
  "function organizerCheckIn(uint256) external",
  "function burnTicket(uint256) external",
  "function withdrawOrganizerFunds() external",
  "function setCheckInManager(address,bool) external",
  "function updateMerkleRoot(uint256,bytes32) external",
  "function syncOfflineCheckIns(uint256,uint256[]) external",
];

// ─── Category visual mapping ───────────────────────────────────────────────────
const CAT_BG = {
  Music:    "linear-gradient(135deg,#2e1065,#4c1d95,#1e3a5f)",
  Tech:     "linear-gradient(135deg,#064e3b,#065f46,#1e3a5f)",
  Art:      "linear-gradient(135deg,#4a1942,#6b21a8,#1e1b4b)",
  Gaming:   "linear-gradient(135deg,#14532d,#166534,#1a2e05)",
  Comedy:   "linear-gradient(135deg,#451a03,#78350f,#1c1917)",
  Wellness: "linear-gradient(135deg,#1c1917,#44403c,#0c4a6e)",
  Sports:   "linear-gradient(135deg,#1e3a5f,#1e40af,#1e1b4b)",
  default:  "linear-gradient(135deg,#1e1b4b,#312e81,#1e3a5f)",
};
const CAT_EMOJI = { Music:"🎵", Tech:"⚡", Art:"🎨", Gaming:"🎮", Comedy:"😄", Wellness:"🧘", Sports:"⚽", default:"🎪" };

export function catBg(cat)    { return CAT_BG[cat]    || CAT_BG.default; }
export function catEmoji(cat) { return CAT_EMOJI[cat] || CAT_EMOJI.default; }

// ─── Metadata encode/decode ────────────────────────────────────────────────────
export function encodeMetadata(data) {
  try { return "meta:" + btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
  catch { return ""; }
}

export function decodeMetadata(cid) {
  if (!cid || !cid.startsWith("meta:")) return {};
  try { return JSON.parse(decodeURIComponent(escape(atob(cid.slice(5))))); }
  catch { return {}; }
}

function slugifyId(name, id) {
  return name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"") + "-" + id;
}

export function extractEventId(slugOrId) {
  const str = String(slugOrId);
  if (/^\d+$/.test(str)) return str;
  const parts = str.split("-");
  const last = parts[parts.length - 1];
  return /^\d+$/.test(last) ? last : str;
}

// ─── Normalise raw chain event into UI shape ───────────────────────────────────
// NOTE: events() auto-getter does NOT return ticketTiers[] (dynamic array).
// Prices are stored in metadata ticketTypes[].tierIndex/price.
export function normaliseEvent(e) {
  const meta = decodeMetadata(e.metadataCid);
  const cat  = meta.category || "default";

  // Derive display price from metadata ticketTypes (first enabled type)
  const metaTypes  = meta.ticketTypes || null;
  const firstType  = metaTypes?.[0];
  const priceStr   = firstType?.price || "0";
  const price      = parseFloat(priceStr) || 0;

  return {
    id:          Number(e.id),
    organizer:   e.organizer,
    name:        e.name,
    slug:        slugifyId(e.name, Number(e.id)),
    // metadata fields
    shortDescription: meta.shortDescription || "",
    fullDescription:  meta.fullDescription  || "",
    venue:            meta.venue    || "",
    city:             meta.city     || "",
    state:            meta.state    || "",
    country:          meta.country  || "",
    category:         cat,
    days:             meta.days     || null,
    // ticketTypes from metadata — each has: {name, price, supply, tierIndex}
    ticketTypes:      metaTypes,
    requiredFields:   meta.requiredFields || null,
    organizerEmail:   meta.organizerEmail || "",
    // chain fields
    startTime:   Number(e.startTime),
    endTime:     Number(e.endTime),
    // ticketPrice = lowest tier price for display (from metadata)
    ticketPrice:    String(price),
    ticketPriceUSD: (price * OG_TO_USD_RATE).toFixed(2),
    maxTickets:  Number(e.maxTickets),
    soldTickets: Number(e.soldTickets),
    imageURI:    e.imageURI,
    acceptsOffchainTickets: e.acceptsOffchainTickets,
    // UI helpers
    bg:    catBg(cat),
    emoji: catEmoji(cat),
    get location() { return [this.city, this.state, this.country].filter(Boolean).join(", "); },
    tags:  meta.tags || [],
  };
}

// ─── Provider/signer helpers ──────────────────────────────────────────────────
export async function getProvider() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() { return (await getProvider()).getSigner(); }
export const publicProvider = new ethers.JsonRpcProvider(ZERO_G_CHAIN.rpcUrls[0]);

export async function getReadContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, MINTY_ABI, publicProvider);
}

export async function getWriteContract() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const provider = new ethers.BrowserProvider(window.ethereum);
  let chainId = (await provider.send("eth_chainId", [])).toLowerCase();
  const targetChainId = ZERO_G_CHAIN.chainId.toLowerCase();
  if (chainId !== targetChainId) {
    try {
      await window.ethereum.request({ method:"wallet_addEthereumChain", params:[ZERO_G_CHAIN] });
      await new Promise(r => setTimeout(r, 1000));
      chainId = (await provider.send("eth_chainId", [])).toLowerCase();
      if (chainId !== targetChainId) throw new Error("Failed to switch to 0G Galileo Testnet");
    } catch (err) { throw err; }
  }
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, MINTY_ABI, signer);
}

// ─── Create event ─────────────────────────────────────────────────────────────
// New contract: createEvent(CreateEventParams struct, uint256[] prices, uint256[] supplies)
// Ticket types: 0=Regular, 1=VIP, 2=Sponsor — stored as tierIndex in metadata
// maxTickets = sum of all tier supplies
export async function createEventOnChain(form) {
  const c = await getWriteContract();

  // Build enabled ticket types in order — tierIndex matches position in arrays
  const enabledTypes = (form.ticketTypes || [])
    .filter(t => t.enabled !== false)
    .map((t, i) => ({ ...t, tierIndex: i }));

  if (enabledTypes.length === 0) throw new Error("At least one ticket type must be enabled.");

  // Prices in wei — 0 is valid for free tiers
  const prices = enabledTypes.map(t => {
    const p = parseFloat(t.price || 0);
    return ethers.parseEther(String(p >= 0 ? p : 0));
  });

  // Supplies per tier
  const supplies = enabledTypes.map(t => {
    const s = parseInt(t.supply || 0);
    if (s < 1) throw new Error(`${t.name} ticket supply must be at least 1.`);
    return s;
  });

  // maxTickets = sum of all supplies
  const maxTickets = supplies.reduce((a, b) => a + b, 0);

  // Encode metadata — store tierIndex on each type so buyTicket knows which index to use
  const meta = encodeMetadata({
    shortDescription: form.shortDescription || "",
    fullDescription:  form.fullDescription  || "",
    venue:            form.venue    || "",
    city:             form.city     || "",
    state:            form.state    || "",
    country:          form.country  || "",
    category:         form.category || "default",
    tags:             form.tags     || [],
    days:             form.days     || null,
    ticketTypes:      enabledTypes, // includes tierIndex
    requiredFields:   form.requiredFields || null,
    organizerEmail:   form.organizerEmail || "",
  });

  const firstDay = form.days?.[0];
  const lastDay  = form.days ? form.days[form.days.length - 1] : null;
  const startDate = firstDay ? firstDay.date : form.startDate;
  const startTime = firstDay ? firstDay.startTime : form.startTime;
  const endDate   = lastDay  ? lastDay.date        : form.endDate;
  const endTime   = lastDay  ? lastDay.endTime      : form.endTime;

  const startTs = Math.floor(new Date(`${startDate}T${startTime}`).getTime() / 1000);
  const endTs   = Math.floor(new Date(`${endDate}T${endTime}`).getTime() / 1000);
  if (!startTs || !endTs) throw new Error("Invalid date or time.");
  if (endTs <= startTs)   throw new Error("End time must be after start time.");

  const params = {
    name:                   form.name,
    metadataCid:            meta,
    startTime:              startTs,
    endTime:                endTs,
    maxTickets,
    imageURI:               form.imageURI || "",
    acceptsOffchainTickets: form.acceptsOffchain || false,
  };

  const tx      = await c.createEvent(params, prices, supplies);
  const receipt = await tx.wait();

  let newId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "EventCreated") { newId = Number(parsed.args.eventId); break; }
    } catch {}
  }
  return { txHash: receipt.hash, eventId: newId };
}

// ─── Buy ticket ───────────────────────────────────────────────────────────────
// New contract: buyTicket(eventId, ticketTypeIndex, metadataCid)
// ticketType is the uint256 index stored in metadata as tierIndex
export async function buyTicketOnChain(eventId, eventName, ticketTypeName = null) {
  const c   = await getWriteContract();

  // Fetch event to get fresh metadata with tierIndex mapping
  const evRaw = await c.events(eventId);
  const meta  = decodeMetadata(evRaw.metadataCid);
  const types = meta.ticketTypes || [];

  // Find the tier by name, fall back to first tier
  const tier = types.find(t => t.name === (ticketTypeName || "Regular")) || types[0];
  if (!tier) throw new Error("No ticket tier found for this event.");

  const tierIndex = tier.tierIndex ?? 0;
  const priceOG   = parseFloat(tier.price || 0);
  const basePrice = ethers.parseEther(String(priceOG >= 0 ? priceOG : 0));
  const fee       = (basePrice * BigInt(PLATFORM_FEE_PCT)) / BigInt(100);
  const total     = basePrice + fee;

  const ticketMeta = encodeMetadata({
    eventId:    Number(eventId),
    eventName,
    ticketType: tier.name || "Regular",
    tierIndex,
  });

  const tx      = await c.buyTicket(eventId, tierIndex, ticketMeta, { value: total });
  const receipt = await tx.wait();

  let tokenId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "TicketMinted") { tokenId = Number(parsed.args.tokenId); break; }
    } catch {}
  }
  return { txHash: receipt.hash, tokenId };
}

// ─── Burn ticket ──────────────────────────────────────────────────────────────
export async function burnTicketOnChain(tokenId) {
  const c  = await getWriteContract();
  const tx = await c.burnTicket(tokenId);
  const r  = await tx.wait();
  return r.hash;
}

// ─── Check-in manager ─────────────────────────────────────────────────────────
export async function setCheckInManager(managerAddress, status) {
  const c  = await getWriteContract();
  const tx = await c.setCheckInManager(managerAddress, status);
  const r  = await tx.wait();
  return r.hash;
}

export async function isCheckInManagerFor(organizerAddr, managerAddr) {
  try {
    const c = await getReadContract();
    return await c.isCheckInManager(organizerAddr, managerAddr);
  } catch { return false; }
}

// ─── Organizer direct check-in ────────────────────────────────────────────────
export async function organizerCheckIn(tokenId) {
  const c  = await getWriteContract();
  const tx = await c.organizerCheckIn(tokenId);
  const r  = await tx.wait();
  return r.hash;
}

// ─── Fetch events ─────────────────────────────────────────────────────────────
export async function fetchAllEvents(limit = 200) {
  const freshProvider = new ethers.JsonRpcProvider(ZERO_G_CHAIN.rpcUrls[0]);
  const c     = new ethers.Contract(CONTRACT_ADDRESS, MINTY_ABI, freshProvider);
  const total = Math.min(Number(await c.totalEvents()), limit);
  const out   = [];
  for (let i = 1; i <= total; i++) {
    try { out.push(normaliseEvent(await c.events(i))); } catch {}
  }
  return out.reverse();
}

export async function fetchEvent(slugOrId) {
  const freshProvider = new ethers.JsonRpcProvider(ZERO_G_CHAIN.rpcUrls[0]);
  const c = new ethers.Contract(CONTRACT_ADDRESS, MINTY_ABI, freshProvider);
  const id = extractEventId(slugOrId);
  const e  = await c.events(id);
  return normaliseEvent(e);
}

// ─── Fetch user tickets ───────────────────────────────────────────────────────
export async function fetchUserTickets(userAddr) {
  const c   = await getReadContract();
  const ids = await c.getUserTicketIds(userAddr);
  const out = [];
  for (const id of ids) {
    try {
      const t  = await c.tickets(id);
      const ev = normaliseEvent(await c.events(t.eventId));
      const ticketMeta = decodeMetadata(t.metadataCid);
      out.push({
        tokenId:    Number(id),
        eventId:    Number(t.eventId),
        checkedIn:  t.checkedIn,
        mintTime:   Number(t.mintTime),
        // ticketType from on-chain (uint256 index) + name from metadata
        ticketTypeIndex: Number(t.ticketType),
        ticketMeta,
        event: ev,
      });
    } catch {}
  }
  return out;
}

// ─── Fetch organizer events ───────────────────────────────────────────────────
export async function fetchOrganizerEvents(organizerAddr) {
  const freshProvider = new ethers.JsonRpcProvider(ZERO_G_CHAIN.rpcUrls[0]);
  const c   = new ethers.Contract(CONTRACT_ADDRESS, MINTY_ABI, freshProvider);
  const ids = await c.getOrganizerEvents(organizerAddr);
  const out = [];
  for (const id of ids) {
    try { out.push(normaliseEvent(await c.events(id))); } catch {}
  }
  return out.reverse();
}

// ─── Get organizer balance ────────────────────────────────────────────────────
export async function getOrganizerBalance(organizerAddr) {
  try {
    const c   = await getReadContract();
    const bal = await c.getOrganizerBalance(organizerAddr);
    return ethers.formatEther(bal);
  } catch (err) {
    console.warn("[balance] ethers call failed:", err?.message);
  }
  // Raw eth_call fallback
  try {
    const iface = new ethers.Interface(["function getOrganizerBalance(address) view returns (uint256)"]);
    const data  = iface.encodeFunctionData("getOrganizerBalance", [organizerAddr]);
    const res   = await fetch("https://evmrpc-testnet.0g.ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"eth_call", params:[{ to:CONTRACT_ADDRESS, data },"latest"] }),
    }).then(r => r.json());
    if (res.error || !res.result || res.result === "0x") return "unsupported";
    const decoded = iface.decodeFunctionResult("getOrganizerBalance", res.result);
    return ethers.formatEther(decoded[0]);
  } catch (err) {
    console.error("[balance] raw eth_call failed:", err?.message);
    return "unsupported";
  }
}

// ─── Withdraw ─────────────────────────────────────────────────────────────────
export async function withdrawOrganizerFunds() {
  const c  = await getWriteContract();
  const tx = await c.withdrawOrganizerFunds();
  const r  = await tx.wait();
  return r.hash;
}

// ─── Sign message ─────────────────────────────────────────────────────────────
export async function signMessage(message, address) {
  return window.ethereum.request({ method:"personal_sign", params:[message, address] });
}