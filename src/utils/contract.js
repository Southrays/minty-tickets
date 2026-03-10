/* global BigInt */
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, ZERO_G_CHAIN, PLATFORM_FEE_PCT, OG_TO_USD_RATE } from "./constants";

export const MINTY_ABI = [
  "event EventCreated(uint256 indexed eventId, address indexed organizer)",
  "event TicketMinted(uint256 indexed tokenId, uint256 indexed eventId, address buyer)",
  "event TicketCheckedIn(uint256 indexed tokenId, uint256 indexed eventId)",
  "function events(uint256) external view returns (uint256 id,address organizer,string name,string metadataCid,uint256 startTime,uint256 endTime,uint256 ticketPrice,uint256 maxTickets,uint256 soldTickets,string imageURI,bytes32 merkleRoot,bool acceptsOffchainTickets)",
  "function tickets(uint256) external view returns (uint256 eventId,string metadataCid,bool checkedIn,uint256 mintTime)",
  "function ownerOf(uint256) external view returns (address)",
  "function getUserTicketIds(address) external view returns (uint256[])",
  "function getOrganizerEvents(address) external view returns (uint256[])",
  "function totalEvents() external view returns (uint256)",
  "function createEvent(string,string,uint256,uint256,uint256,uint256,string,bool) external returns (uint256)",
  "function buyTicket(uint256,string) external payable returns (uint256)",
  "function checkIn(uint256,bytes32,uint256,bytes) external",
  "function withdrawOrganizerFunds() external",
  "function updateMerkleRoot(uint256,bytes32) external",
  "function syncOfflineCheckIns(uint256,uint256[],bytes32[][]) external",
];

// ─── Category visual mapping (UI-only, derived from stored category) ──────────
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

// ─── Metadata encode/decode ────────────────────────────────────────────────
// We store rich metadata as JSON in the metadataCid field.
// In production replace with real 0G Storage uploads.
export function encodeMetadata(data) {
  try { return "meta:" + btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
  catch { return ""; }
}

export function decodeMetadata(cid) {
  if (!cid || !cid.startsWith("meta:")) return {};
  try { return JSON.parse(decodeURIComponent(escape(atob(cid.slice(5))))); }
  catch { return {}; }
}

// ─── Normalise a raw chain event into UI shape ────────────────────────────
export function normaliseEvent(e) {
  const meta  = decodeMetadata(e.metadataCid);
  const price = ethers.formatEther(e.ticketPrice !== undefined ? e.ticketPrice : "0");
  const cat   = meta.category || "default";
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
    // chain fields
    startTime:   Number(e.startTime),
    endTime:     Number(e.endTime),
    ticketPrice: price,
    ticketPriceUSD: (parseFloat(price) * OG_TO_USD_RATE).toFixed(2),
    maxTickets:  Number(e.maxTickets),
    soldTickets: Number(e.soldTickets),
    imageURI:    e.imageURI,
    acceptsOffchainTickets: e.acceptsOffchainTickets,
    trending:    false,
    // UI helpers
    bg:    catBg(cat),
    emoji: catEmoji(cat),
    get location() { return [this.city, this.state, this.country].filter(Boolean).join(", "); },
    tags:  meta.tags || [],
  };
}

function slugifyId(name, id) {
  return name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"") + "-" + id;
}

// ─── Provider/signer helpers ─────────────────────────────────────────────
export async function getProvider() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner()        { return (await getProvider()).getSigner(); }
export const publicProvider = new ethers.JsonRpcProvider(ZERO_G_CHAIN.rpcUrls[0]);
export async function getReadContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, MINTY_ABI, publicProvider);
}

export async function getWriteContract() {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new ethers.BrowserProvider(window.ethereum);

  // Normalize for comparison
  let chainId = (await provider.send("eth_chainId", [])).toLowerCase();
  const targetChainId = ZERO_G_CHAIN.chainId.toLowerCase();

  if (chainId !== targetChainId) {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [ZERO_G_CHAIN],
      });

      // Give MetaMask a moment to switch
      await new Promise(resolve => setTimeout(resolve, 1000));

      chainId = (await provider.send("eth_chainId", [])).toLowerCase();
      if (chainId !== targetChainId) {
        throw new Error(
          `Failed to switch to 0G Galileo Testnet (have ${chainId}, want ${targetChainId})`
        );
      }
    } catch (err) {
      console.error("Network switch failed:", err);
      throw err;
    }
  }

  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, MINTY_ABI, signer);
}



// ─── Sign a message with the connected wallet (gasless) ──────────────────
export async function signMessage(message, address) {
  return window.ethereum.request({ method:"personal_sign", params:[message, address] });
}

// ─── Create event ─────────────────────────────────────────────────────────
export async function createEventOnChain(form) {
  const c = await getWriteContract();

  const meta = encodeMetadata({
    shortDescription: form.shortDescription || "",
    fullDescription:  form.fullDescription  || "",
    venue:            form.venue    || "",
    city:             form.city     || "",
    state:            form.state    || "",
    country:          form.country  || "",
    category:         form.category || "default",
    tags:             form.tags     || [],
  });

  const startTs = Math.floor(
    new Date(`${form.startDate}T${form.startTime}`).getTime() / 1000
  );

  const endTs = Math.floor(
    new Date(`${form.endDate}T${form.endTime}`).getTime() / 1000
  );

  if (!startTs || !endTs) {
    throw new Error("Invalid date or time.");
  }

  if (endTs <= startTs) {
    throw new Error("End time must be after start time.");
  }
  const priceWei = ethers.parseEther(form.ticketPrice || "0");

  const tx = await c.createEvent(
    form.name,
    meta,
    startTs,
    endTs,
    priceWei,
    parseInt(form.maxTickets) || 100,
    form.imageURI,   // base64 preview; replace with 0G Storage CID in prod
    form.acceptsOffchain || false
  );
  const receipt = await tx.wait();

  // Parse EventCreated log to get the new event ID
  let newId = null;
  for (const log of receipt.logs) {
    try {
      const parsed = c.interface.parseLog(log);
      if (parsed?.name === "EventCreated") { newId = Number(parsed.args.eventId); break; }
    } catch {}
  }
  return { txHash: receipt.hash, eventId: newId };
}

// ─── Buy ticket ───────────────────────────────────────────────────────────
export async function buyTicketOnChain(eventId, eventName) {
  const c   = await getWriteContract();
  const evt = await c.events(eventId);
  const base  = evt.ticketPrice;
  const total = (base * BigInt(100 + Number(PLATFORM_FEE_PCT))) / BigInt(100);

  const ticketMeta = encodeMetadata({ eventId: Number(eventId), eventName });
  const tx     = await c.buyTicket(eventId, ticketMeta, { value: total });
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

// ─── Fetch all events ─────────────────────────────────────────────────────
export async function fetchAllEvents(limit = 200) {
  const c     = await getReadContract();
  const total = Math.min(Number(await c.totalEvents()), limit);
  const out   = [];
  for (let i = 1; i <= total; i++) {
    try {
      const e = await c.events(i);
      out.push(normaliseEvent(e));
    } catch {}
  }
  return out.reverse();
}

// ─── Fetch single event ────────────────────────────────────────────────────
export async function fetchEvent(eventId) {
  const c = await getReadContract();
  const e = await c.events(eventId);
  return normaliseEvent(e);
}

// ─── Fetch user tickets ───────────────────────────────────────────────────
export async function fetchUserTickets(userAddr) {
  const c   = await getReadContract();
  const ids = await c.getUserTicketIds(userAddr);
  const out = [];
  for (const id of ids) {
    try {
      const t = await c.tickets(id);
      const e = await c.events(t.eventId);
      const ev = normaliseEvent(e);
      out.push({
        tokenId:   Number(id),
        eventId:   Number(t.eventId),
        checkedIn: t.checkedIn,
        mintTime:  Number(t.mintTime),
        event:     ev,
      });
    } catch {}
  }
  return out;
}

// ─── Fetch organizer events ───────────────────────────────────────────────
export async function fetchOrganizerEvents(organizerAddr) {
  const c   = await getReadContract();
  const ids = await c.getOrganizerEvents(organizerAddr);
  const out = [];
  for (const id of ids) {
    try {
      const e = await c.events(id);
      out.push(normaliseEvent(e));
    } catch {}
  }
  return out.reverse();
}

// ─── Withdraw funds ────────────────────────────────────────────────────────
export async function withdrawOrganizerFunds() {
  const c  = await getWriteContract();
  const tx = await c.withdrawOrganizerFunds();
  const r  = await tx.wait();
  return r.hash;
}
