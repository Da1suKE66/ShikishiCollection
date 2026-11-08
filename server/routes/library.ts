import { database,readLibrary,readMonitoring,xConfigured } from "../../lib/store.ts";
import { librarySchema } from "../../lib/model.ts";
export async function GET(){
 
 try{return Response.json({...await readLibrary(),...await readMonitoring(),xConfigured:xConfigured()},{headers:{"Cache-Control":"no-store"}});}
 catch{return Response.json({error:"资料库暂时不可用，请重试"},{status:503});}
}
export async function PUT(request:Request){
 
 if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"请求来源不匹配"},{status:403});
 if(Number(request.headers.get("content-length"))>3000000)return Response.json({error:"文件过大"},{status:413});
 try{
  const raw=await request.text();if(raw.length>3000000)return Response.json({error:"文件过大"},{status:413});
  const body=JSON.parse(raw);const result=librarySchema.safeParse(body.library);
  if(!result.success)return Response.json({error:result.error.issues[0]?.message||"数据格式不正确"},{status:400});
  if(!Number.isSafeInteger(body.revision))return Response.json({error:"缺少版本号"},{status:400});
  const saved=await database().prepare("UPDATE library SET data=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?").bind(JSON.stringify(result.data),new Date().toISOString(),"personal",body.revision).run();
  if(!saved.meta.changes)return Response.json({error:"其他页面已更新资料，请重新加载后再修改"},{status:409});
  return Response.json({revision:body.revision+1});
 }catch{return Response.json({error:"保存失败，请保留当前内容并重试"},{status:500});}
}
