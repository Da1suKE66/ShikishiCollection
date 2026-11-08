import {DatabaseSync,type SQLInputValue} from "node:sqlite";
import {mkdirSync} from "node:fs";
import {resolve} from "node:path";

let connection:DatabaseSync|undefined;
export function dataDirectory(){return resolve(process.env.DATA_DIR||"data");}
function sqlite(){
 if(connection)return connection;
 const dir=dataDirectory();mkdirSync(dir,{recursive:true});
 connection=new DatabaseSync(resolve(dir,"collection.sqlite"));
 connection.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS library(id TEXT PRIMARY KEY NOT NULL,data TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS locks(id TEXT PRIMARY KEY NOT NULL,until INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS signals(id TEXT PRIMARY KEY NOT NULL,data TEXT NOT NULL,discovered_at TEXT NOT NULL,read INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS source_checks(id TEXT PRIMARY KEY NOT NULL,data TEXT NOT NULL);`);
 return connection;
}
export function databaseAdapter(){
 return {prepare(query:string){
  const statement=sqlite().prepare(query);let values:SQLInputValue[]=[];
  const prepared={bind(...args:SQLInputValue[]){values=args;return prepared;},async first<T>(){return (statement.get(...values) as T|undefined)??null;},async all<T>(){return {results:statement.all(...values) as T[]};},async run(){const result=statement.run(...values);return {meta:{changes:Number(result.changes)}};}};
  return prepared;
 }};
}
export function closeDatabase(){connection?.close();connection=undefined;}
