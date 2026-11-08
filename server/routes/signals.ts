import { database } from "../../lib/store.ts";
export async function PATCH(request:Request){
 
 if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"请求来源不匹配"},{status:403});
 try{const {id}=await request.json() as {id?:string};if(typeof id!=="string"||id.length>200)return Response.json({error:"缺少条目 ID"},{status:400});
 if(id==="all")await database().prepare("UPDATE signals SET read=1 WHERE read=0").run();else await database().prepare("UPDATE signals SET read=1 WHERE id=?").bind(id).run();return Response.json({ok:true});}
 catch{return Response.json({error:"更新失败"},{status:500});}
}
