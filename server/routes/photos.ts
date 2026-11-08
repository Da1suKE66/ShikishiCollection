import { env } from "../../lib/runtime.ts";
export async function POST(request:Request){
 
 if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"请求来源不匹配"},{status:403});
 if(Number(request.headers.get("content-length"))>5500000)return Response.json({error:"图片不能超过 5MB"},{status:413});
 if(!env.BUCKET)return Response.json({error:"照片存储暂不可用"},{status:503});
 try{const form=await request.formData();const file=form.get("file");if(!(file instanceof File)||file.size>5000000)return Response.json({error:"请选择 5MB 以内的图片"},{status:400});
 const b=new Uint8Array(await file.arrayBuffer());const png=b[0]===137&&b[1]===80&&b[2]===78&&b[3]===71;const jpg=b[0]===255&&b[1]===216&&b[2]===255;const webp=String.fromCharCode(...b.slice(0,4))==="RIFF"&&String.fromCharCode(...b.slice(8,12))==="WEBP";
 if(!png&&!jpg&&!webp)return Response.json({error:"仅支持 JPG、PNG、WebP 图片"},{status:400});
 const id=crypto.randomUUID();await env.BUCKET.put(`photos/${id}`,b,{httpMetadata:{contentType:png?"image/png":jpg?"image/jpeg":"image/webp"}});return Response.json({url:`/api/photos/${id}`});}
 catch{return Response.json({error:"上传失败，请重试"},{status:500});}
}
