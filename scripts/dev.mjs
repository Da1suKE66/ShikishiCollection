import {spawn} from "node:child_process";
const server=spawn(process.execPath,["--env-file-if-exists=.env","--watch","--experimental-strip-types","server/index.ts"],{env:{...process.env,PORT:"3001"},stdio:"inherit"});
const client=spawn(process.execPath,["node_modules/vite/bin/vite.js"],{stdio:"inherit"});
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;server.kill("SIGTERM");client.kill("SIGTERM");process.exitCode=typeof code==="number"?code:0;}
server.on("exit",stop);client.on("exit",stop);process.once("SIGINT",()=>stop());process.once("SIGTERM",()=>stop());
