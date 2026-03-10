import { Wallet, AlertCircle, X } from "lucide-react";
import { useWallet } from "../../context/WalletContext";
import { V } from "../../utils/constants";

export default function WalletPrompt() {
  const { showPrompt, setShowPrompt, promptMsg, connect } = useWallet();
  if (!showPrompt) return null;
  return (
    <div className="mbd" onClick={e => e.target===e.currentTarget && setShowPrompt(false)}
      style={{position:"fixed",inset:0,background:"rgba(17,24,39,.5)",backdropFilter:"blur(12px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:999,padding:"0 16px 20px"}}>
      <div className="msh card" style={{width:"100%",maxWidth:460,padding:28}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#7C3AED,#5B21B6)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Wallet size={20} color="white"/>
            </div>
            <div>
              <div style={{fontFamily:"Outfit",fontWeight:700,fontSize:17,color:V.text}}>Connect Wallet</div>
              <div style={{fontSize:13,color:V.muted}}>Required for this action</div>
            </div>
          </div>
          <button className="bg" onClick={() => setShowPrompt(false)} style={{borderRadius:"50%",width:34,height:34,padding:0,justifyContent:"center"}}><X size={16}/></button>
        </div>
        <div style={{background:V.b50,border:`1px solid ${V.b100}`,borderRadius:12,padding:"12px 14px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
          <AlertCircle size={15} color={V.brand}/>
          <span style={{fontSize:13,color:"#5B21B6"}}>{promptMsg}</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button className="bp" onClick={connect} style={{borderRadius:12,padding:14,fontSize:15,width:"100%",justifyContent:"center",gap:10}}>
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" width={20} alt=""/>
            Connect with MetaMask
          </button>
          <button className="bg" onClick={() => setShowPrompt(false)} style={{width:"100%",justifyContent:"center",padding:12,color:V.muted,fontFamily:"Outfit",fontWeight:600}}>Maybe later</button>
        </div>
        <p style={{textAlign:"center",marginTop:14,fontSize:12,color:V.mutedL}}>Browse events freely — wallet only needed to buy tickets.</p>
      </div>
    </div>
  );
}
