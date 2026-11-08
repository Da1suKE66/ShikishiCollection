import test from "node:test";
import assert from "node:assert/strict";
import {platformUrl,parsePublicItems,classify,canonicalItem} from "../lib/source-utils.ts";
import {targetDate,librarySchema} from "../lib/model.ts";
import {seedLibrary} from "../lib/seed.ts";
import {fixtureLibrary} from "./fixtures/library.ts";
test("source URLs reject lookalike hosts, credentials, local targets and item pages",()=>{
 for(const [v,p] of [["https://booth.pm.evil.test/","booth"],["https://artist.booth.pm@127.0.0.1/","booth"],["http://artist.booth.pm/","booth"],["https://artist.booth.pm:8443/","booth"],["https://artist.booth.pm/items/1","booth"],["https://api.fanbox.cc/creator.list","fanbox"],["https://x.com/artist/status/123","x"]])assert.throws(()=>platformUrl(v,p));
 assert.equal(platformUrl("https://artist.booth.pm/","booth").hostname,"artist.booth.pm");
 assert.equal(platformUrl("https://www.fanbox.cc/@artist","fanbox").pathname,"/@artist");
});
test("BOOTH parser deduplicates links and ignores unrelated external items",()=>{
 const parsed=parsePublicItems(`<a href="/items/123"><img alt="色紙" /></a><a href="/items/123">直筆色紙 &amp; canvas</a><a href="https://evil.test/items/999">bad</a><a href="https://booth.pm/ja/items/456">C108 新刊</a>`,"booth","https://artist.booth.pm/");
 assert.equal(parsed.length,2);assert.equal(parsed[0].id,"123");assert.equal(parsed[1].url,"https://booth.pm/ja/items/456");
});
test("FANBOX parser ignores other creators and does not fabricate JS-only content",()=>{
 assert.deepEqual(parsePublicItems('<script>loadPosts()</script>',"fanbox","https://www.fanbox.cc/@artist"),[]);
 const got=parsePublicItems('<a href="/@artist/posts/123">お知らせ</a><a href="/@other/posts/456">別作者</a>',"fanbox","https://www.fanbox.cc/@artist");
 assert.equal(got.length,1);assert.equal(got[0].id,"123");
});
test("classification creates unconfirmed leads",()=>{
 assert.equal(classify("C108 お品書き","x"),"参展线索");assert.equal(classify("直筆サイン色紙","fanbox"),"签名线索");assert.equal(classify("new item","booth"),"上新线索");
});
test("calendar-month estimate clamps month end and never assumes an unknown start",()=>{
 const b=fixtureLibrary().benefits[0];assert.equal(targetDate(b),null);assert.equal(targetDate({...b,startDate:"2026-01-31",requiredMonths:1}),"2026-02-28");assert.equal(targetDate({...b,startDate:"2027-12-31",requiredMonths:2}),"2028-02-29");
});
test("new installations contain no private notes or seed records",()=>{
 const seed=seedLibrary();assert.equal(librarySchema.safeParse(seed).success,true);assert.deepEqual(seed,{schemaVersion:1,artists:[],collections:[],benefits:[],events:[],rawNotes:""});
});
test("invalid calendar dates and orphan references cannot enter the library",()=>{
 const seed=fixtureLibrary();seed.events[0].date="2026-02-30";assert.equal(librarySchema.safeParse(seed).success,false);seed.events[0].date="";seed.collections[0].artistId="missing";assert.equal(librarySchema.safeParse(seed).success,false);
});

test("item ownership and canonical URLs keep platform deduplication consistent",()=>{
 assert.equal(canonicalItem("https://twitter.com/shiratamacaron/status/123?ref=share","x","https://x.com/shiratamacaron"),"https://x.com/shiratamacaron/status/123");
 assert.equal(canonicalItem("https://artist.booth.pm/items/456","booth","https://artist.booth.pm/"),"https://booth.pm/ja/items/456");
 assert.equal(canonicalItem("https://artist.fanbox.cc/posts/789","fanbox","https://artist.fanbox.cc/"),"https://www.fanbox.cc/@artist/posts/789");
 assert.throws(()=>canonicalItem("https://x.com/other/status/123","x","https://x.com/shiratamacaron"));
 assert.throws(()=>canonicalItem("https://www.fanbox.cc/@other/posts/789","fanbox","https://artist.fanbox.cc/"));
});
