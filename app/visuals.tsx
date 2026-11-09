import type { CSSProperties } from "react";
export const palettes=[
 ["#e5eade","#72846a","#ccd6bc"],["#f0e0dc","#b6796d","#e4c5bd"],["#e3e5ee","#7c80a5","#c5c8e1"],
 ["#eae3d4","#a28c65","#d9c9a9"],["#e0e9e7","#628980","#bdd4ce"],["#eee0e6","#ab7d92","#dbbdce"],
];
export function Monogram({name,color=0,large=false}:{name:string;color?:number;large?:boolean}){
 const p=palettes[color]||palettes[0];
 return <span className={`monogram ${large?"large":""}`} style={{"--wash":p[0],"--pigment":p[1]} as CSSProperties}>{name.match(/[\u3040-\u30ff\u4e00-\u9fff]/)?.[0]||name.slice(0,1).toUpperCase()}</span>;
}
export function ArtistCover({name,color=0}:{name:string;color?:number}){
 const p=palettes[color]||palettes[0];
 return <div className="artist-cover" style={{"--wash":p[0],"--pigment":p[1],"--soft":p[2]} as CSSProperties} aria-hidden="true">
   <div className="cover-circle"/>
   <svg viewBox="0 0 280 160" fill="none"><path d="M155 157c-22-25-24-58-10-85m-4 27c-29-1-38-15-37-25 22-2 36 8 37 25zm-3 22c-26 2-41-6-47-18 23-6 41 1 47 18zm7-49c-8-19-2-38 12-48 10 20 6 36-12 48zm-4 31c21-17 42-15 52-8-14 16-35 18-52 8zm2 30c27-20 48-17 57-10-17 14-37 18-57 10z" stroke="currentColor" strokeWidth="1.2"/><path d="M148 82c3-18 24-36 37-31-3 18-16 28-37 31Z" stroke="currentColor" strokeWidth="1.2"/><circle cx="196" cy="34" r="2" fill="currentColor"/><path d="m93 43 3 8 8 2-8 3-3 8-2-8-8-3 8-2 2-8Z" fill="currentColor" opacity=".5"/></svg>
   <span className="cover-signature">{name}</span>
 </div>;
}
export function PaperArt(){return <div className="paper-art" aria-hidden="true"><div className="paper-back"/><div className="paper-front"><svg viewBox="0 0 220 210" fill="none"><circle cx="110" cy="92" r="52" fill="#e6e9db"/><path d="M105 177c-9-42-5-77 24-103m-23 57c-29-2-49-23-45-40 31 0 45 14 45 40zm3-20c-18-30-7-58 9-65 15 21 9 42-9 65zm10-24c16-25 46-30 62-19-13 27-39 30-62 19zm-15 57c19-28 49-28 62-13-15 23-40 26-62 13Z" stroke="#5b725f" strokeWidth="1.5"/><path d="m42 61 3 9 9 2-9 3-3 9-3-9-9-3 9-2 3-9Z" fill="#bd805f"/><circle cx="172" cy="122" r="3" fill="#bd805f"/></svg><span className="paper-seal">蔵</span></div><span className="paper-tape"/></div>;}
