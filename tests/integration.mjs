import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {resolve,join} from "node:path";
import {fixtureLibrary} from "./fixtures/library.ts";

const directory=await mkdtemp(join(tmpdir(),"shikishi-integration-"));
process.env.DATA_DIR=directory;
const {createApp}=await import("../server/index.ts");
const {closeDatabase}=await import("../server/database.ts");
let app;
async function start(){app=createApp({clientDirectory:resolve("dist/client")});await new Promise(r=>app.listen(0,"127.0.0.1",r));return `http://127.0.0.1:${app.address().port}`;}
async function stop(){if(app){app.closeAllConnections();await new Promise(r=>app.close(r));app=undefined;}closeDatabase();}
try{
 let base=await start();
 const request=(path,options={})=>fetch(base+path,{...options,headers:{origin:base,...options.headers}});
 const get=async()=>{const r=await request("/api/library");assert.equal(r.status,200);return r.json();};
 const put=(library,revision,headers={})=>request("/api/library",{method:"PUT",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify({library,revision})});
 const page=await request("/");assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes("Shikishi Collection"));assert.ok(!html.includes("signin-with-chatgpt"));
 assert.equal((await request("/api/access")).status,404);
 const initial=await get();assert.equal(initial.library.artists.length,0);assert.equal(initial.library.rawNotes,"");
 const fixture=fixtureLibrary();const saved=await put(fixture,initial.revision);assert.equal(saved.status,200);const revision=(await saved.json()).revision;
 assert.equal((await put(fixture,initial.revision)).status,409);
 const malformed=structuredClone(fixture);malformed.collections[0].artistId="missing";assert.equal((await put(malformed,revision)).status,400);
 assert.equal((await put(fixture,revision,{origin:"https://other.example"})).status,403);
 const form=new FormData();const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmK0AAAAASUVORK5CYII=","base64");form.set("file",new File([png],"sample.png",{type:"image/png"}));
 const uploaded=await request("/api/photos",{method:"POST",body:form});assert.equal(uploaded.status,200);const {url}=await uploaded.json();
 const image=await request(url);assert.equal(image.status,200);assert.equal(image.headers.get("content-type"),"image/png");assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
 const invalidForm=new FormData();invalidForm.set("file",new File(["<svg></svg>"],"bad.svg",{type:"image/svg+xml"}));assert.equal((await request("/api/photos",{method:"POST",body:invalidForm})).status,400);
 fixture.collections[0].photo=url;fixture.collections[0].status="已入手";assert.equal((await put(fixture,revision)).status,200);
 assert.equal((await request("/api/photos/..%2F..%2Fcollection.sqlite")).status,404);
 assert.equal((await request("/api/check",{method:"POST",headers:{origin:"https://other.example"}})).status,403);
 assert.equal((await request("/api/research",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({checks:[]})})).status,200);
 assert.equal((await request("/api/signals",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:"all"})})).status,200);
 const exported=(await get()).library;assert.deepEqual(exported,fixture);
 await stop();base=await start();
 const persisted=await get();assert.equal(persisted.library.collections[0].status,"已入手");assert.equal(persisted.library.collections[0].photo,url);assert.equal((await request(url)).status,200);
 assert.equal((await request("/api/health")).status,200);
 console.log("PASS: anonymous self-hosted startup, empty library, CRUD, schema validation, revision conflicts, origin checks, uploads, invalid file rejection, import/export shape, background writer and persistence across restart");
}finally{await stop();await rm(directory,{recursive:true,force:true});}
