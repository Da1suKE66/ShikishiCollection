import { checkSources } from "../../lib/monitor.ts";
import { database } from "../../lib/store.ts";
// Single-user self-hosted installation; same-origin checks protect browser mutations.
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"请求来源不匹配"},{status:403});
 try{return Response.json(await checkSources(),{headers:{"Cache-Control":"no-store"}});}
 catch{return Response.json({error:"本次检查未完成，已保留原有记录"},{status:503});}
}
export async function GET(){
 try{const db=database();const latest=await db.prepare("SELECT discovered_at FROM signals ORDER BY discovered_at DESC LIMIT 1").first<{discovered_at:string}>();const n=await db.prepare("SELECT count(*) AS n FROM source_checks").first<{n:number}>();return Response.json({sourceCount:n?.n||0,latestDiscovery:latest?.discovered_at||null},{headers:{"Cache-Control":"no-store"}});}
 catch{return Response.json({error:"资料库不可用"},{status:503});}
}
