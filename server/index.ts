import {createServer,type IncomingMessage,type ServerResponse} from "node:http";
import {readFile,stat} from "node:fs/promises";
import {resolve,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {api} from "./router.ts";
import {closeDatabase} from "./database.ts";

const mime:Record<string,string>={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".webp":"image/webp",".ico":"image/x-icon",".woff2":"font/woff2"};
async function body(request:IncomingMessage){
 const chunks:Buffer[]=[];let size=0;
 for await(const part of request){const b=Buffer.from(part);size+=b.length;if(size>5500000)throw new Error("BODY_TOO_LARGE");chunks.push(b);}
 return new Uint8Array(Buffer.concat(chunks));
}
async function send(response:Response,out:ServerResponse){
 out.writeHead(response.status,Object.fromEntries(response.headers));
 if(!response.body){out.end();return;}
 const reader=response.body.getReader();
 try{while(true){const {value,done}=await reader.read();if(done)break;if(!out.write(value))await new Promise<void>(r=>out.once("drain",r));}out.end();}finally{await reader.cancel().catch(()=>{});}
}
export function createApp(options:{clientDirectory?:string}={}){
 const clientDirectory=resolve(options.clientDirectory||fileURLToPath(new URL("../client/",import.meta.url)));
 const allowed=(process.env.ALLOWED_HOSTS||"localhost,127.0.0.1,[::1]").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 return createServer(async(req,out)=>{
  out.setHeader("X-Content-Type-Options","nosniff");
  try{
   const host=req.headers.host||"localhost";
   if(!allowed.includes(new URL(`http://${host}`).hostname.toLowerCase())){out.writeHead(403);out.end("Host not allowed");return;}
   const origin=process.env.APP_ORIGIN?new URL(process.env.APP_ORIGIN).origin:`http://${host}`;
   const url=new URL(req.url||"/",origin);
   if(url.origin!==origin){out.writeHead(403);out.end("Origin not allowed");return;}
   if(url.pathname.startsWith("/api/")){
    const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(", "):v);
    const method=req.method||"GET";const request=new Request(url,{method,headers,body:["GET","HEAD"].includes(method)?undefined:await body(req)});
    const response=await api(request);response.headers.set("Cache-Control",response.headers.get("Cache-Control")||"no-store");await send(response,out);return;
   }
   if(req.method!=="GET"&&req.method!=="HEAD"){out.writeHead(405);out.end();return;}
   const path=resolve(clientDirectory,"."+decodeURIComponent(url.pathname));
   if(path!==clientDirectory&&!path.startsWith(clientDirectory+sep)){out.writeHead(404);out.end();return;}
   let file=path;
   try{if(!(await stat(file)).isFile())file=resolve(clientDirectory,"index.html");}catch{file=extname(path)?path:resolve(clientDirectory,"index.html");}
   const bytes=await readFile(file);
   out.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream","Cache-Control":url.pathname.startsWith("/assets/")?"public, max-age=31536000, immutable":"no-cache"});out.end(req.method==="HEAD"?undefined:bytes);
  }catch(e){if(out.headersSent){out.destroy();return;}const code=(e as NodeJS.ErrnoException).code;const large=e instanceof Error&&e.message==="BODY_TOO_LARGE";out.writeHead(large?413:code==="ENOENT"?404:500,{"Content-Type":"application/json"});out.end(JSON.stringify({error:large?"请求内容过大":code==="ENOENT"?"页面不存在，请先构建前端":"请求未完成，请稍后重试"}));}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=createApp();const port=Number(process.env.PORT||3000);const host=process.env.HOST||"127.0.0.1";
 app.listen(port,host,()=>console.log(`Shikishi Collection: http://${host}:${(app.address() as {port:number}).port}`));
 const stop=()=>{app.close(()=>{closeDatabase();process.exit(0);});setTimeout(()=>process.exit(0),5000).unref();};
 process.once("SIGINT",stop);process.once("SIGTERM",stop);
}
