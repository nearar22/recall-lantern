import React,{useCallback,useEffect,useMemo,useState}from"react";
import{createRoot}from"react-dom/client";
import{createClient}from"genlayer-js";
import{studioDevnet}from"genlayer-js/chains";
import{createTransactionKit}from"@genlayer/transaction-kit";
import{GenLayerTransactionPanel}from"@genlayer/transaction-kit-react";
import{blankCase,canChallenge,clean,remaining,short,verdictTone}from"./model.mjs";
import"./styles.css";

const ADDRESS=import.meta.env.VITE_CONTRACT_ADDRESS||"";
const LIVE_ID=import.meta.env.VITE_DEMO_CASE_ID||"kettle-24-demo";
const RPC=import.meta.env.VITE_GENLAYER_RPC_URL||"https://studio-next.genlayer.com/api";
const CHAIN_ID=Number(import.meta.env.VITE_GENLAYER_CHAIN_ID||61997);
const CHAIN={...studioDevnet,id:CHAIN_ID,name:"GenLayer Studio Next",rpcUrls:{default:{http:[RPC]}}};
const EXPLORER="https://explorer-studio-dev.genlayer.com";
const initial={caseId:LIVE_ID,product:"Electric kettle",brand:"Northstar",model:"K200",lot:"LOT-24A",regulator:"https://example.gov/recalls/kettle-k200",manufacturer:"https://manufacturer.example/safety/k200"};

function Barcode({value}){const seed=[...String(value||"RECALL")].reduce((a,c)=>a+c.charCodeAt(0),0);return <div className="barcode" aria-label={`Barcode for ${value}`}>{Array.from({length:38},(_,i)=><i key={i} style={{width:`${1+(seed+i*7)%4}px`}}/> )}</div>}
function Field({label,value,onChange,wide=false}){return <label className={wide?"wide":""}><span>{label}</span><input value={value} onChange={e=>onChange(e.target.value)}/></label>}
function SourceLane({number,name,source}){return <article className="source-lane"><b>{number}</b><div><small>{name}</small><a href={source?.url||"#"} target="_blank" rel="noreferrer">{source?.host||"waiting for source"}</a></div><span className={source?.available===false?"lamp off":"lamp"}/><code>{source?.sha256?short(source.sha256,9):"NO RECEIPT"}</code></article>}

function App(){
 const[wallet,setWallet]=useState("");const[form,setForm]=useState(initial);const[record,setRecord]=useState({...blankCase,id:LIVE_ID});const[action,setAction]=useState(null);const[notice,setNotice]=useState("");const[challengeUrl,setChallengeUrl]=useState("");const[challengeReason,setChallengeReason]=useState("");const[busy,setBusy]=useState(false);
 const client=useMemo(()=>createClient({chain:CHAIN}),[]),kit=useMemo(()=>wallet&&window.ethereum?createTransactionKit({chain:CHAIN,provider:window.ethereum,account:wallet}):null,[wallet]);
 const set=(key,value)=>setForm(old=>({...old,[key]:value}));
 const connect=async()=>{if(!window.ethereum)return setNotice("A browser wallet is required for writes. Public recall records remain readable.");try{const[a]=await window.ethereum.request({method:"eth_requestAccounts"}),chainId=`0x${CHAIN_ID.toString(16)}`;try{await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId}]})}catch(error){if(error?.code!==4902)throw error;await window.ethereum.request({method:"wallet_addEthereumChain",params:[{chainId,chainName:CHAIN.name,rpcUrls:[RPC],nativeCurrency:{name:"GEN",symbol:"GEN",decimals:18}}]})}setWallet(a);setNotice("")}catch(error){setNotice(error?.message||"Wallet connection did not complete.")}};
 const load=useCallback(async(id=form.caseId)=>{if(!ADDRESS||!id.trim())return;setBusy(true);try{const value=clean(await client.readContract({address:ADDRESS,functionName:"get_case",args:[id.trim()],jsonSafeReturn:true}));setRecord(value);setForm(old=>({...old,caseId:value.id,product:value.product,brand:value.brand,model:value.model,lot:value.lot,regulator:value.sources?.[0]?.url||old.regulator,manufacturer:value.sources?.[1]?.url||old.manufacturer}));setNotice("")}catch{setNotice("No on-chain case was found for that label ID.")}finally{setBusy(false)}},[client,form.caseId]);
 useEffect(()=>{if(!ADDRESS)return;let alive=true;client.readContract({address:ADDRESS,functionName:"get_case",args:[LIVE_ID],jsonSafeReturn:true}).then(v=>{if(alive)setRecord(clean(v))}).catch(()=>{});return()=>{alive=false}},[client]);
 const write=next=>{if(!ADDRESS)return setNotice("Contract deployment is not configured yet.");if(!kit)return setNotice("Connect a Studio Next wallet before writing.");setAction(next)};
 const tx=useMemo(()=>{if(!ADDRESS||!action)return null;const base={kind:"write",address:ADDRESS};if(action==="open")return{...base,method:"open_case",args:[form.caseId.trim(),form.product.trim(),form.brand.trim(),form.model.trim(),form.lot.trim(),form.regulator.trim(),form.manufacturer.trim()]};if(action==="assess")return{...base,method:"assess_case",args:[form.caseId.trim()]};if(action==="challenge")return{...base,method:"challenge_case",args:[form.caseId.trim(),challengeUrl.trim(),challengeReason.trim()]};return{...base,method:"finalize_case",args:[form.caseId.trim()]}},[action,challengeReason,challengeUrl,form]);
 const done=status=>{if(status.phase==="finalized"){setAction(null);if(status.successful)setTimeout(()=>void load(form.caseId),1200);else setNotice(`Transaction failed: ${status.executionResultName||status.statusName||"rejected"}.`)}};
 const assessment=record.assessment||{},tone=verdictTone(assessment.verdict),receipts=assessment.source_receipts||[],challengeAllowed=canChallenge(record,wallet);
 return <div className="app">
  <nav className="rail"><div className="sigil"><span>R</span><i/></div><div className="vertical">RECALL LANTERN / FIELD UNIT 01</div><div className="network"><span className="lamp"/>STUDIO NEXT<br/>{CHAIN_ID}</div></nav>
  <main>
   <header><div><small>CONSUMER SAFETY INSTRUMENT</small><strong>RECALL<br/>LANTERN</strong></div><div className="system"><span>AUTHORITY PAIR</span><b>2 / 2</b><span>CONSENSUS MODE</span><b>VALIDATOR</b></div><button onClick={connect}>{wallet?short(wallet):"CONNECT WALLET"}</button></header>
   {notice&&<div className="notice"><span>{notice}</span><button onClick={()=>setNotice("")}>CLOSE</button></div>}
   <section className="workbench">
    <div className="scanner">
     <div className="scanner-head"><span>01 · CAPTURE LABEL</span><em className={busy?"sweep active":"sweep"}/></div>
     <div className="label-card">
      <div className="punch"/><div className="label-title"><small>ITEM UNDER INSPECTION</small><input value={form.product} onChange={e=>set("product",e.target.value)}/></div>
      <div className="identity-grid"><Field label="BRAND" value={form.brand} onChange={v=>set("brand",v)}/><Field label="MODEL" value={form.model} onChange={v=>set("model",v)}/><Field label="LOT / BATCH" value={form.lot} onChange={v=>set("lot",v)} wide/></div>
      <Barcode value={`${form.brand}${form.model}${form.lot}`}/><div className="case-line"><span>CASE ID</span><input value={form.caseId} onChange={e=>set("caseId",e.target.value)}/></div>
     </div>
     <div className="authority-rack"><div className="rack-title"><span>02 · LOCK AUTHORITIES</span><b>HOSTS MUST DIFFER</b></div><label><i>R</i><span>REGULATOR NOTICE</span><input value={form.regulator} onChange={e=>set("regulator",e.target.value)}/></label><label><i>M</i><span>MANUFACTURER NOTICE</span><input value={form.manufacturer} onChange={e=>set("manufacturer",e.target.value)}/></label></div>
     <div className="controls"><button className="primary" onClick={()=>write("open")}>OPEN CASE <span>↗</span></button><button onClick={()=>void load(form.caseId)}>{busy?"READING…":"LOAD CASE"}</button><button disabled={record.status!=="READY"} onClick={()=>write("assess")}>RUN CONSENSUS</button></div>
    </div>
    <aside className={`signal ${tone}`}>
     <div className="signal-top"><span>03 · DECISION SIGNAL</span><b>{record.status||"READY"}</b></div>
     <div className="beacon"><i/><i/><i/><div><small>VERDICT</small><strong>{assessment.verdict||"WAITING"}</strong></div></div>
     <div className="hazard"><div><span>HAZARD LOAD</span><b>{String(assessment.hazard??0).padStart(2,"0")}</b></div><meter min="0" max="100" value={assessment.hazard||0}/></div>
     <p>{assessment.summary||"Lock an exact product identity to two independent notices, then ask validators to determine whether the item is covered."}</p>
     <div className="action-stamp"><small>RECOMMENDED ACTION</small><strong>{assessment.action||"NO SIGNAL"}</strong></div>
     <div className="matched">{["PRODUCT","BRAND","MODEL","LOT"].map(f=><span className={assessment.matched_fields?.includes(f)?"hit":""} key={f}>{f}</span>)}</div>
     {record.status==="ASSESSED"&&<div className="appeal-clock"><span>OWNER REVIEW WINDOW</span><b>{remaining(record.appeal_deadline)}</b></div>}
     {(record.status==="ASSESSED"||record.status==="CHALLENGED")&&<button className="finalize" onClick={()=>write("finalize")}>FINALIZE RECEIPT</button>}
    </aside>
   </section>
   <section className="receipts"><div className="section-title"><span>04 · SOURCE RECEIPTS</span><h2>Two authorities. No blended provenance.</h2></div><div className="lanes"><SourceLane number="A" name="REGULATOR" source={receipts[0]||record.sources?.[0]}/><SourceLane number="B" name="MANUFACTURER" source={receipts[1]||record.sources?.[1]}/>{receipts[2]&&<SourceLane number="C" name="CHALLENGE AUTHORITY" source={receipts[2]}/>}</div>{assessment.evidence?.length>0&&<div className="quotes">{assessment.evidence.map((row,i)=><blockquote key={i}><b>0{row.source_index+1}</b><q>{row.quote}</q></blockquote>)}</div>}</section>
   <section className="challenge"><div><span>05 · CORRECTION PATH</span><h2>A third authority can reopen the beam once.</h2><p>Only the case owner can challenge during the protected window. The third source must use a new host, and the original assessment stays in history.</p></div><div className="challenge-form"><label><span>THIRD AUTHORITY URL</span><input value={challengeUrl} onChange={e=>setChallengeUrl(e.target.value)} placeholder="https://consumer-authority.example/notice"/></label><label><span>WHAT CHANGED?</span><textarea value={challengeReason} onChange={e=>setChallengeReason(e.target.value)} placeholder="Point to the conflicting model, lot, or correction."/></label><button disabled={!challengeAllowed} onClick={()=>write("challenge")}>{challengeAllowed?"CHALLENGE WITH NEW SOURCE":"CHALLENGE LOCKED"}</button></div></section>
   <footer><span>RECALL LANTERN · EXACT LABELS, ATTRIBUTED SOURCES</span>{ADDRESS?<a href={`${EXPLORER}/address/${ADDRESS}`} target="_blank" rel="noreferrer">CONTRACT {short(ADDRESS)} ↗</a>:<b>DEPLOYMENT PENDING</b>}</footer>
  </main>
  {action&&kit&&tx&&<div className="modal"><div><div className="modal-head"><b>GENLAYER TRANSACTION · {action.toUpperCase()}</b><button onClick={()=>setAction(null)}>×</button></div><GenLayerTransactionPanel kit={kit} tx={tx} network={CHAIN.name} theme="light" trackUntil="finalized" onDone={done}/></div></div>}
 </div>
}
createRoot(document.getElementById("root")).render(<App/>);
