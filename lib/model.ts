import { z } from "zod";

const short = z.string().max(500);
const note = z.string().max(15000);
const date = z.string().refine(v => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v), "请输入完整有效日期");
const link = z.string().max(1000).refine(v => { if(!v)return true;try { const u=new URL(v);return u.protocol === "https:" && !u.username && !u.password; } catch{return false;} }, "请输入 HTTPS 链接");
const links = z.object({x:link,fanbox:link,booth:link,website:link});
export const artistSchema=z.object({
  id:short, name:short.min(1), aliases:z.array(short).max(30), circle:short,
  works:z.array(short).max(30), category:short, tags:z.array(short).max(30),
  notes:note, links, verifiedSource:link, favorite:z.boolean(), monitor:z.boolean(), color:z.number().int().min(0).max(5),
});
export const collectionSchema=z.object({
  id:short,artistId:short,title:short.min(1),type:z.enum(["手绘色纸","亲签色纸","复制原画","版画","挂画","抱枕","明信片 / 生写","亚克力 / 徽章","套装","其他"]),
  status:z.enum(["待确认","心愿单","已预订","已入手","已转出"]), signature:z.enum(["待确认","直笔签名","手绘 + 亲签","印刷签名","无签名"]),
  price:short,channel:short,date,notes:note,photo:z.string().max(500).refine(v=>!v||/^\/api\/photos\/[a-f0-9-]{36}$/.test(v)),source:link,
});
export const benefitSchema=z.object({
  id:short,artistId:short,title:short,window:short,plans:short,rules:note,
  state:z.enum(["待核对","计划中","支援中","已申领"]),startDate:date,requiredMonths:z.number().int().min(0).max(120),source:link,
});
export const eventSchema=z.object({
  id:short,name:short.min(1),date,endDate:date,dateNote:short,location:short,artistIds:z.array(short).max(200),
  booth:short,notes:note,source:link,confirmed:z.boolean(),
});
export const librarySchema=z.object({
  schemaVersion:z.literal(1),artists:z.array(artistSchema).max(1000),collections:z.array(collectionSchema).max(5000),
  benefits:z.array(benefitSchema).max(1000),events:z.array(eventSchema).max(2000),rawNotes:z.string().max(100000),
}).superRefine((v,c)=>{
  for(const key of ["artists","collections","benefits","events"] as const){
    const ids=v[key].map(x=>x.id);if(new Set(ids).size!==ids.length)c.addIssue({code:"custom",message:`${key} 存在重复 ID`});
  }
  const ids=new Set(v.artists.map(a=>a.id));
  if(v.collections.some(a=>!ids.has(a.artistId))||v.benefits.some(a=>!ids.has(a.artistId))||v.events.some(e=>e.artistIds.some(id=>!ids.has(id))))c.addIssue({code:"custom",message:"存在未关联的画师"});
});
export type Artist=z.infer<typeof artistSchema>;
export type Collection=z.infer<typeof collectionSchema>;
export type Benefit=z.infer<typeof benefitSchema>;
export type EventRecord=z.infer<typeof eventSchema>;
export type Library=z.infer<typeof librarySchema>;
export type Platform="x"|"booth"|"fanbox";
export type SourceCheck={id:string;artistId:string;platform:Platform;url:string;checkedAt:string;status:"ok"|"limited"|"error"|"unconfigured";message:string;seen:string[];initialized:boolean;userId?:string;lastSuccess?:string;sampleCount?:number;method?:"direct"|"web"};
export type Signal={id:string;artistId:string;platform:Platform;title:string;url:string;kind:"上新线索"|"参展线索"|"签名线索"|"新动态";discoveredAt:string;publishedAt?:string;read:boolean};
export type Snapshot={library:Library;revision:number;checks:SourceCheck[];signals:Signal[];xConfigured:boolean};
export function targetDate(b:Benefit){
  if(!b.startDate||!b.requiredMonths)return null;
  const [year,month,day]=b.startDate.split("-").map(Number);
  const d=new Date(Date.UTC(year,month-1+b.requiredMonths,1));
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10);
}
export const collectionTypes=collectionSchema.shape.type.options;
export const collectionStates=collectionSchema.shape.status.options;
export function emptyArtist():Artist{return {id:crypto.randomUUID(),name:"",aliases:[],circle:"",works:[],category:"待整理",tags:[],notes:"",links:{x:"",fanbox:"",booth:"",website:""},verifiedSource:"",favorite:false,monitor:true,color:0};}
