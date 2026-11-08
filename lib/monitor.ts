import { env } from "./runtime.ts";
import { database,readLibrary,readMonitoring } from "./store.ts";
import type { Platform,SourceCheck,Signal } from "./model";
import {platformUrl,parsePublicItems,classify,canonicalItem,type SourceItem} from "./source-utils.ts";
export async function sourceId(artistId:string,p:Platform,url:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(`${artistId}|${p}|${url}`));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("").slice(0,24);}
async function boundedText(response:Response){
 if(!response.body)return "";const reader=response.body.getReader();const decoder=new TextDecoder();let size=0,result="";
 try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>2000000)throw new Error("页面过大，本次未完成检查");result+=decoder.decode(r.value,{stream:true});}return result+decoder.decode();}
 finally{await reader.cancel().catch(()=>{});}
}
async function publicPage(url:string,p:Platform,depth=0):Promise<string>{
 if(depth>1)throw new Error("来源嵌套页面过多");let u=platformUrl(url,p);
 for(let i=0;i<4;i++){
  const r=await fetch(u,{redirect:"manual",signal:AbortSignal.timeout(12000),headers:{"User-Agent":"ShikishiTecho/1.0 (personal collection link monitor)","Accept":"text/html"}});
  if(r.status>=300&&r.status<400){const loc=r.headers.get("location");if(!loc)throw new Error("来源重定向失败");u=platformUrl(new URL(loc,u).href,p);continue;}
  if(!r.ok)throw new Error(`来源返回 HTTP ${r.status}；本次未能检测`);const html=await boundedText(r);
  if(p==="fanbox"){const iframe=html.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1];if(iframe){const target=platformUrl(new URL(iframe,u).href,p);return publicPage(target.href,p,depth+1);}}
  return html;
 }throw new Error("来源重定向次数过多");
}
async function readX(url:string,previous:SourceCheck):Promise<{items:SourceItem[];userId:string}>{
 const token=env.X_API_BEARER_TOKEN;if(!token)throw new Error("X API 尚未配置");const name=platformUrl(url,"x").pathname.split("/")[1];
 const get=async(url:string)=>{const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(`X API HTTP ${r.status}；请检查额度或授权`);const d=await r.json() as any;if(d.errors?.length)throw new Error("X API 返回不完整结果，本次未推进基线");return d;};
 const userId=previous.userId||(await get(`https://api.x.com/2/users/by/username/${encodeURIComponent(name)}`)).data?.id;if(!userId)throw new Error("未找到该 X 用户");
 const endpoint=new URL(`https://api.x.com/2/users/${userId}/tweets`);endpoint.searchParams.set("max_results","10");endpoint.searchParams.set("tweet.fields","created_at");endpoint.searchParams.set("exclude","retweets,replies");
 const data=await get(endpoint.href);
 if(data.meta?.next_token&&previous.initialized){const got=new Set((data.data||[]).map((t:any)=>t.id));if(!previous.seen.some(id=>got.has(id)))throw new Error("更新超过本次读取上限，需打开 X 核对；未推进基线");}
 return {items:(data.data||[]).map((p:any)=>({id:p.id,title:p.text,url:`https://x.com/${name}/status/${p.id}`,publishedAt:p.created_at})),userId};
}
export async function checkSources(){
 const db=database();const now=Date.now();await db.prepare("INSERT OR IGNORE INTO locks (id,until) VALUES ('monitor',0)").run();
 const claim=await db.prepare("UPDATE locks SET until=? WHERE id='monitor' AND until<?").bind(now+240000,now).run();
 if(!claim.meta.changes)return {busy:true,message:"已有检查正在进行，请稍后查看",newCount:0,attempted:0,limited:0};
 try{
  const {library}=await readLibrary();const {checks}=await readMonitoring();const previous=new Map(checks.map(c=>[c.id,c]));const candidates:SourceCheck[]=[];
  for(const a of library.artists.filter(a=>a.monitor))for(const p of ["booth","fanbox","x"] as Platform[]){const url=a.links[p];if(!url)continue;const id=await sourceId(a.id,p,url);candidates.push(previous.get(id)||{id,artistId:a.id,platform:p,url,checkedAt:"",status:"unconfigured",message:"尚未检查",seen:[],initialized:false});}
  candidates.sort((a,b)=>a.checkedAt.localeCompare(b.checkedAt));const due=candidates.filter(c=>!c.checkedAt||now-Date.parse(c.checkedAt)>300000).slice(0,9);let newCount=0,limited=0;
  for(let offset=0;offset<due.length;offset+=3){await Promise.all(due.slice(offset,offset+3).map(async old=>{
   const current:SourceCheck={...old,method:"direct",checkedAt:new Date().toISOString()};
   try{
    if(old.platform==="x"&&!env.X_API_BEARER_TOKEN){current.status="unconfigured";current.message="需配置 X API，当前可打开主页与搜索";limited++;}
    else{
     let items:SourceItem[];
     if(old.platform==="x"){const result=await readX(old.url,old);items=result.items;current.userId=result.userId;}
     else{const html=await publicPage(old.url,old.platform);items=parsePublicItems(html,old.platform,old.url);if(!items.length)throw new Error("未读到可验证的公开条目，页面可能需要登录或由脚本载入");}
     const seen=new Set(old.seen);
     for(const item of items)if(old.initialized&&!seen.has(item.id)){
      const canonical=canonicalItem(item.url,old.platform,old.url);
      const signal:Signal={id:`signal-${await sourceId(old.artistId,old.platform,canonical)}`,artistId:old.artistId,platform:old.platform,title:item.title,url:canonical,kind:classify(item.title,old.platform),discoveredAt:current.checkedAt,publishedAt:item.publishedAt,read:false};
      const saved=await db.prepare("INSERT OR IGNORE INTO signals (id,data,discovered_at,read) VALUES (?,?,?,0)").bind(signal.id,JSON.stringify(signal),signal.discoveredAt).run();newCount+=Number(saved.meta.changes||0);
     }
     current.seen=[...new Set([...items.map(i=>i.id),...old.seen])].slice(0,3000);current.initialized=true;current.status="ok";current.lastSuccess=current.checkedAt;current.sampleCount=items.length;
     current.message=old.initialized?`已检查 ${items.length} 个公开条目，仅覆盖当前可读页面`:`已建立 ${items.length} 个条目的基线，下次起比较新发现`;
    }
   }catch(e){current.status="limited";const message=e instanceof Error?e.message:"";current.message=/[\u4e00-\u9fff]/.test(message)?message:"无法完成公开页面读取，可能受来源访问限制；已保留基线";limited++;}
   await db.prepare("INSERT INTO source_checks (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data").bind(current.id,JSON.stringify(current)).run();
  }));}
  return {busy:false,newCount,attempted:due.length,limited,total:candidates.length,message:due.length?`检查 ${due.length} 个来源，新发现 ${newCount} 条；${limited} 个来源尚不可读取`:"来源刚刚检查过，请 5 分钟后再试"};
 }finally{await db.prepare("UPDATE locks SET until=0 WHERE id='monitor'").run();}
}
