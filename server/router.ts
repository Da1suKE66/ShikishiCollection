import * as library from "./routes/library.ts";
import * as check from "./routes/check.ts";
import * as research from "./routes/research.ts";
import * as signals from "./routes/signals.ts";
import * as photos from "./routes/photos.ts";
import * as photo from "./routes/photo.ts";
export async function api(request:Request):Promise<Response>{
 const {pathname}=new URL(request.url);const method=request.method;
 if(!["GET","HEAD","OPTIONS"].includes(method)){
  const origin=request.headers.get("origin");
  if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"请求来源不匹配"},{status:403});
 }
 if(pathname==="/api/health"&&method==="GET")return Response.json({ok:true});
 if(pathname==="/api/library"){
  if(method==="GET")return library.GET();if(method==="PUT")return library.PUT(request);
 }
 if(pathname==="/api/check"){
  if(method==="GET")return check.GET();if(method==="POST")return check.POST(request);
 }
 if(pathname==="/api/research"){
  if(method==="GET")return research.GET();if(method==="POST")return research.POST(request);
 }
 if(pathname==="/api/signals"&&method==="PATCH")return signals.PATCH(request);
 if(pathname==="/api/photos"&&method==="POST")return photos.POST(request);
 const id=pathname.match(/^\/api\/photos\/([a-f0-9-]{36})$/)?.[1];
 if(id&&method==="GET")return photo.GET(request,{params:Promise.resolve({id})});
 return Response.json({error:"接口不存在或请求方法不支持"},{status:404});
}
