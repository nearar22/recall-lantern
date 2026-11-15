import{createAccount,createClient}from"genlayer-js";
import{studioDevnet}from"genlayer-js/chains";
const contract=process.env.CONTRACT_ADDRESS?.trim()||"0x2b42D8C5Af18de58115bdcF3DE0B17099ABda46B",raw=process.env.GENLAYER_PRIVATE_KEY?.trim();
if(!raw)throw new Error("GENLAYER_PRIVATE_KEY is required");
const key=raw.startsWith("0x")?raw:`0x${raw}`,chain={...studioDevnet,id:61997,name:"GenLayer Studio Next",rpcUrls:{default:{http:["https://studio-next.genlayer.com/api"]}}},account=createAccount(key),client=createClient({chain,account}),sleep=ms=>new Promise(r=>setTimeout(r,ms)),id=`recall-lantern-${Date.now().toString(36)}`;
async function finalized(hash){for(let i=0;i<300;i++){const r=await client.getTransaction({hash}).catch(()=>null),s=String(r?.statusName??r?.status??"PENDING").toUpperCase();if(s==="FINALIZED")return r;if(["UNDETERMINED","DECLINED","CANCELED","CANCELLED"].includes(s))throw new Error(`Transaction ended ${s}`);await sleep(3000)}throw new Error("Transaction timed out")}
async function write(label,functionName,args,intelligent=false){const fees=await client.estimateTransactionFees({leaderTimeunitsAllocation:intelligent?500n:180n,validatorTimeunitsAllocation:intelligent?600n:360n}),hash=await client.writeContract({address:contract,functionName,args,fees});console.log(`${label}_TX=${hash}`);const r=await finalized(hash),execution=String(r.txExecutionResultName??r.txExecutionResult),consensus=String(r.resultName??r.result_name);if(execution!=="FINISHED_WITH_RETURN"||consensus==="MAJORITY_DISAGREE")throw new Error(`${label} failed: ${execution} / ${consensus}`);return hash}
const regulator="https://raw.githubusercontent.com/nearar22/recall-lantern/main/frontend/public/demo/regulator-notice.txt";
const manufacturer="https://cdn.jsdelivr.net/gh/nearar22/recall-lantern@main/frontend/public/demo/manufacturer-notice.txt";
const openTx=await write("OPEN","open_case",[id,"Electric kettle","Northstar","K200","LOT-24A",regulator,manufacturer]);
const assessTx=await write("ASSESS","assess_case",[id],true);
const assessed=await client.readContract({address:contract,functionName:"get_case",args:[id],jsonSafeReturn:true});
if(assessed.status!=="ASSESSED"||assessed.assessment?.source_receipts?.length!==2)throw new Error("Live assessment did not persist two source receipts");
const finalTx=await write("FINALIZE","finalize_case",[id]);
const state=await client.readContract({address:contract,functionName:"get_case",args:[id],jsonSafeReturn:true});
console.log(`CASE_ID=${id}\nOPEN_TX=${openTx}\nASSESS_TX=${assessTx}\nFINAL_TX=${finalTx}\nSTATUS=${state.status}\nVERDICT=${state.assessment?.verdict}\nACTION=${state.assessment?.action}\nRECEIPT=${state.final_receipt}`);
if(state.status!=="FINAL"||!state.final_receipt)throw new Error("Live recall lifecycle failed");
