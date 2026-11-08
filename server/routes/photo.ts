import { env } from "../../lib/runtime.ts";
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))return new Response("Not found",{status:404});
 const image=await env.BUCKET?.get(`photos/${id}`);if(!image)return new Response("Not found",{status:404});return new Response(image.body,{headers:{"Content-Type":image.httpMetadata?.contentType||"image/jpeg","Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
}
