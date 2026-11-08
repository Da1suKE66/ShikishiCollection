import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import {resolve} from "node:path";
import {databaseAdapter,dataDirectory} from "../server/database.ts";

function photoPath(key:string){
 if(!/^photos\/[a-f0-9-]{36}$/.test(key))throw new Error("Invalid photo path");
 return resolve(dataDirectory(),key);
}
const bucket={
 async put(key:string,bytes:Uint8Array,options:{httpMetadata:{contentType:string}}){
  const path=photoPath(key);await mkdir(resolve(dataDirectory(),"photos"),{recursive:true});
  const temporary=path+".tmp-"+crypto.randomUUID();await writeFile(temporary,bytes);await rename(temporary,path);
  await writeFile(path+".json",JSON.stringify(options.httpMetadata));
 },
 async get(key:string){
  try{const path=photoPath(key);const [body,metadata]=await Promise.all([readFile(path),readFile(path+".json","utf8")]);return {body:new Uint8Array(body),httpMetadata:JSON.parse(metadata) as {contentType:string}};}
  catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return null;throw e;}
 }
};
export const env={get DB(){return databaseAdapter();},BUCKET:bucket,get X_API_BEARER_TOKEN(){return process.env.X_API_BEARER_TOKEN;}};
