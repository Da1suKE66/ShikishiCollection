import { env } from "./runtime.ts";
import { seedLibrary } from "./seed.ts";
import type { Library, Signal, SourceCheck } from "./model";
export function database(){if(!env.DB)throw new Error("资料库尚未连接，请稍后重试");return env.DB;}
export async function readLibrary(){
 const db=database();const row=await db.prepare("SELECT data,revision FROM library WHERE id=?").bind("personal").first<{data:string;revision:number}>();
 if(row)return {library:JSON.parse(row.data) as Library,revision:row.revision};
 await db.prepare("INSERT OR IGNORE INTO library (id,data,revision,updated_at) VALUES (?,?,1,?)").bind("personal",JSON.stringify(seedLibrary()),new Date().toISOString()).run();
 const first=await db.prepare("SELECT data,revision FROM library WHERE id=?").bind("personal").first<{data:string;revision:number}>();
 return {library:JSON.parse(first!.data) as Library,revision:first!.revision};
}
export async function readMonitoring(){
 const db=database();const [checks,signals]=await Promise.all([db.prepare("SELECT data FROM source_checks").all<{data:string}>(),db.prepare("SELECT data,read FROM signals ORDER BY discovered_at DESC LIMIT 500").all<{data:string;read:number}>()]);
 return {checks:checks.results.map(x=>JSON.parse(x.data) as SourceCheck),signals:signals.results.map(x=>({...JSON.parse(x.data),read:!!x.read}) as Signal)};
}
export function xConfigured(){return !!env.X_API_BEARER_TOKEN;}
