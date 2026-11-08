import {z} from "zod";
import {database,readLibrary,readMonitoring} from "../../lib/store.ts";
import {sourceId} from "../../lib/monitor.ts";
import {platformUrl,canonicalItem,classify} from "../../lib/source-utils.ts";
import type {Platform,SourceCheck,Signal} from "../../lib/model.ts";
// Single-user local updater. Do not expose an unauthenticated installation to untrusted users.
export async function GET(){
 try{
  const {library}=await readLibrary();const {checks}=await readMonitoring();const sources=[];
  for(const a of library.artists.filter(a=>a.monitor))for(const platform of ["x","fanbox","booth"] as Platform[]){
   if(!a.links[platform])continue;const id=`web-${await sourceId(a.id,platform,a.links[platform])}`;const check=checks.find(c=>c.id===id);
   sources.push({artistId:a.id,name:a.name,aliases:a.aliases,platform,url:a.links[platform],verifiedSource:a.verifiedSource,checkedAt:check?.checkedAt||null,initialized:check?.initialized||false,knownUrls:check?.seen||[]});
  }
  return Response.json({sources,instructions:"Use official public pages or indexed official posts only. Read publication timestamps from the source, not search crawl times. First successful result establishes a baseline. If blocked or uncertain report limited and preserve previous baseline. Do not read paid content, use login cookies, or invent posts, event dates, accounts or benefits."},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"资料库暂不可用"},{status:503});}
}
const item=z.object({url:z.string().url().max(1000),title:z.string().min(1).max(1000),publishedAt:z.string().datetime().optional()});
const payload=z.object({checks:z.array(z.object({artistId:z.string().max(500),platform:z.enum(["x","fanbox","booth"]),sourceUrl:z.string().url().max(1000),status:z.enum(["ok","limited"]),message:z.string().max(1000),items:z.array(item).max(50)})).max(20)});
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"请求来源不匹配"},{status:403});
 try{
  const text=await request.text();if(text.length>300000)return Response.json({error:"数据过大"},{status:413});
  const parsed=payload.safeParse(JSON.parse(text));if(!parsed.success)return Response.json({error:"检查数据格式错误"},{status:400});
  const {library}=await readLibrary();const {checks}=await readMonitoring();const db=database();let newCount=0;
  const prepared=[];
  // Validate every source and item before writes to avoid partly committing bad input.
  for(const input of parsed.data.checks){
   const a=library.artists.find(a=>a.id===input.artistId&&a.monitor);if(!a||a.links[input.platform]!==input.sourceUrl)return Response.json({error:"来源未登记或已暂停"},{status:400});
   platformUrl(input.sourceUrl,input.platform);if(input.status==="ok"&&!input.items.length)return Response.json({error:"无可验证条目时应记录读取受限"},{status:400});
   const items=input.items.map(i=>({...i,url:canonicalItem(i.url,input.platform,input.sourceUrl)}));
   if(items.some(i=>i.publishedAt&&Date.parse(i.publishedAt)>Date.now()+300000))return Response.json({error:"发布时间不能在未来"},{status:400});
   prepared.push({...input,items,id:`web-${await sourceId(a.id,input.platform,input.sourceUrl)}`});
  }
  for(const input of prepared){
   const old=checks.find(c=>c.id===input.id);const now=new Date().toISOString();const claimId=`research-${input.id}`;
   await db.prepare("INSERT OR IGNORE INTO locks(id,until) VALUES (?,0)").bind(claimId).run();
   const claim=await db.prepare("UPDATE locks SET until=? WHERE id=? AND until<?").bind(Date.now()+60000,claimId,Date.now()).run();if(!claim.meta.changes)continue;
   try{
    const latest=await db.prepare("SELECT data FROM source_checks WHERE id=?").bind(input.id).first<{data:string}>();const previous=latest?JSON.parse(latest.data) as SourceCheck:old;const seen=new Set(previous?.seen||[]);
    if(input.status==="ok"&&previous?.initialized)for(const found of input.items)if(!seen.has(found.url)){
     const signal:Signal={id:`signal-${await sourceId(input.artistId,input.platform,found.url)}`,artistId:input.artistId,platform:input.platform,title:found.title,url:found.url,kind:classify(found.title,input.platform),discoveredAt:now,publishedAt:found.publishedAt,read:false};
     const r=await db.prepare("INSERT OR IGNORE INTO signals(id,data,discovered_at,read) VALUES (?,?,?,0)").bind(signal.id,JSON.stringify(signal),now).run();newCount+=Number(r.meta.changes||0);
    }
    const next:SourceCheck={id:input.id,artistId:input.artistId,platform:input.platform,url:input.sourceUrl,method:"web",checkedAt:now,status:input.status,message:`公开网页核对：${input.message}${!previous?.initialized&&input.status==="ok"?"；已建立首次基线":""}`,initialized:input.status==="ok"||!!previous?.initialized,seen:input.status==="ok"?[...new Set([...input.items.map(i=>i.url),...(previous?.seen||[])])].slice(0,3000):previous?.seen||[],lastSuccess:input.status==="ok"?now:previous?.lastSuccess,sampleCount:input.status==="ok"?input.items.length:previous?.sampleCount};
    await db.prepare("INSERT INTO source_checks(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data").bind(next.id,JSON.stringify(next)).run();
   }finally{await db.prepare("UPDATE locks SET until=0 WHERE id=?").bind(claimId).run();}
  }
  return Response.json({saved:prepared.length,newCount,persisted:true});
 }catch{return Response.json({error:"核对结果未写入，请检查来源与数据后重试"},{status:400});}
}
