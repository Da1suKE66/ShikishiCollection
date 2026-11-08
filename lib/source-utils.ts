import type { Platform, Signal } from "./model";
export function platformUrl(value:string,platform:Platform){
 const u=new URL(value);if(u.protocol!=="https:"||u.port||u.username||u.password)throw new Error("来源网址无效");const h=u.hostname.toLowerCase();
 const ok=platform==="x"?["x.com","www.x.com","twitter.com","www.twitter.com"].includes(h):platform==="booth"?h==="booth.pm"||h.endsWith(".booth.pm"):h==="fanbox.cc"||h.endsWith(".fanbox.cc");
 if(!ok)throw new Error("来源域名与平台不匹配");u.hash="";
 if(platform==="x"&&!/^\/[a-zA-Z0-9_]{1,15}\/?$/.test(u.pathname))throw new Error("请填写 X 个人主页");
 if(platform==="booth"&&(h==="booth.pm"||h==="www.booth.pm"||!/^(\/(ja|en|zh-cn|zh-tw|ko))?\/?$/.test(u.pathname)))throw new Error("请填写 BOOTH 店铺主页（xxx.booth.pm）");
 if(platform==="fanbox"&&!(/^\/@[a-zA-Z0-9_-]+\/?$/.test(u.pathname)||(/^\/?$/.test(u.pathname)&&!["www.fanbox.cc","fanbox.cc"].includes(h))))throw new Error("请填写 FANBOX 创作者主页");
 return u;
}
export type SourceItem={id:string;title:string;url:string;publishedAt?:string};
function clean(v:string){return v.replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\s+/g," ").trim().slice(0,500);}
export function parsePublicItems(html:string,platform:"booth"|"fanbox",base:string):SourceItem[]{
 const normalized=html.replace(/\\\//g,"/");const items=new Map<string,SourceItem>();const baseUrl=new URL(base);
 for(const a of normalized.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  let u:URL;try{u=new URL(a[1].replace(/&amp;/g,"&"),base);}catch{continue;}
  if(u.protocol!=="https:")continue;
  const match=platform==="booth"?u.pathname.match(/\/(?:ja\/|en\/)?items\/(\d+)(?:\/|$)/):u.pathname.match(/\/(?:@([a-zA-Z0-9_-]+)\/)?posts\/(\d+)(?:\/|$)/);
  if(!match)continue;
  if(platform==="booth"&&u.hostname!==baseUrl.hostname&&u.hostname!=="booth.pm")continue;
  if(platform==="fanbox"){
   if(!["www.fanbox.cc","fanbox.cc",baseUrl.hostname].includes(u.hostname))continue;
   const owner=baseUrl.pathname.match(/^\/@([^/]+)/)?.[1]||baseUrl.hostname.split(".")[0];if(match[1]&&match[1]!==owner)continue;
  }
  const id=match[platform==="booth"?1:2];const imageTitle=a[2].match(/\balt=["']([^"']+)["']/i)?.[1];const title=clean(a[2])||clean(imageTitle||"")||`${platform==="booth"?"商品":"公开投稿"} #${id}`;
  const url=platform==="booth"?`https://booth.pm/ja/items/${id}`:u.href;
  if(!items.has(id)||items.get(id)!.title.startsWith("商品 #"))items.set(id,{id,title,url});
 }
 return [...items.values()].slice(0,100);
}
export function classify(title:string,p:Platform):Signal["kind"]{
 if(/コミケ|comiket|comitia|comic1|c\d{2,3}\b|参展|出展|参加|お品書き|サンクリ|俺の嫁/i.test(title))return "参展线索";
 if(/直筆|サイン|色紙|签名|手描き|手绘|先着|抽選/i.test(title))return "签名线索";
 return p==="booth"?"上新线索":"新动态";
}
export function canonicalItem(value:string,platform:Platform,source:string){
 const u=new URL(value);const owner=platformUrl(source,platform);
 if(u.protocol!=="https:"||u.port||u.username||u.password)throw new Error("条目网址无效");
 if(platform==="x"){
  const name=owner.pathname.split("/")[1];
  if(!["x.com","www.x.com","twitter.com","www.twitter.com"].includes(u.hostname))throw new Error("条目域名不符");
  const m=u.pathname.match(/^\/([a-zA-Z0-9_]+)\/status\/(\d+)\/?$/);
  if(!m||m[1].toLowerCase()!==name.toLowerCase())throw new Error("推文不属于登记的画师");return `https://x.com/${name.toLowerCase()}/status/${m[2]}`;
 }
 if(platform==="booth"){
  if(![owner.hostname,"booth.pm","www.booth.pm"].includes(u.hostname))throw new Error("商品来源不符");
  const m=u.pathname.match(/^\/(?:ja\/|en\/|zh-cn\/|zh-tw\/|ko\/)?items\/(\d+)\/?$/);if(!m)throw new Error("不是商品链接");return `https://booth.pm/ja/items/${m[1]}`;
 }
 const slug=owner.pathname.match(/^\/@([^/]+)/)?.[1]||owner.hostname.split(".")[0];
 if(![`${slug}.fanbox.cc`,"www.fanbox.cc","fanbox.cc"].includes(u.hostname))throw new Error("投稿来源不符");
 const m=u.pathname.match(/^\/(?:@([a-zA-Z0-9_-]+)\/)?posts\/(\d+)\/?$/);
 if(!m||(m[1]&&m[1]!==slug)||(!m[1]&&u.hostname!==`${slug}.fanbox.cc`))throw new Error("投稿不属于登记的画师");return `https://www.fanbox.cc/@${slug}/posts/${m[2]}`;
}
