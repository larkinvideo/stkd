import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const BG="#07080F",SURF="#0D0E1C",BOR="#1C1D32",PRI="#6C63FF",ACC="#FF5C5C",TXT="#ECEAF8",MUT="#4A4A6E",DIM="#111222",SUB="#9896B8";
// Calls the /api/chat proxy with the current Supabase session token. Throws on non-2xx.
async function callChat(body){
const{data:{session}}=await supabase.auth.getSession();
if(!session)throw new Error("You need to be logged in.");
const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify(body)});
const d=await r.json().catch(()=>({}));
if(!r.ok)throw new Error(r.status===429?"Daily limit reached, try again tomorrow.":d.error||`Request failed (${r.status})`);
return d;
}
const TC={film:"#FF5C5C",series:"#6C63FF",game:"#00D4AA",book:"#FF9B50",manga:"#FF6BA8",music:"#5CB8FF",podcast:"#A8FF5C"};

function grade(s){
if(s>=9.5)return["Perfect / Near-Perfect","#FFD700"];
if(s>=9.0)return["Excellent","#A78BFA"];
if(s>=8.5)return["Really Good","#818CF8"];
if(s>=7.5)return["Great","#6C63FF"];
if(s>=6.5)return["Good","#5CB8FF"];
if(s>=5.5)return["Decent","#00D4AA"];
if(s>=4.5)return["Mixed","#FF9B50"];
if(s>=3.5)return["Poor","#FF6BA8"];
if(s>=2.5)return["Bad","#FF5C5C"];
if(s>=1.5)return["Terrible","#E53E3E"];
return["Worthless","#991B1B"];
}

function useDb(v,ms){const[d,setD]=useState(v);useEffect(()=>{const t=setTimeout(()=>setD(v),ms);return()=>clearTimeout(t);},[v,ms]);return d;}

const isSafe=t=>!/\b(f+u+c+k+|sh[i1]t|b[i1]tch|c[o0]ck|d[i1]ck|p[o0]rn|nude|kys|rape|n[i1]gg[ae]r?|f[a4@]g+[o0]t|c[u0]nt)\b/i.test(t);

async function doSearch(q,type){
const TK="38de5f986a8f2d5419b9b41d47deeb75",RK="2e43cb91529d4758980e0041518dbced";
const all=type==="all",res=[];
try{
if(all||type==="film"){const d=await(await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TK}&query=${encodeURIComponent(q)}`)).json();(d.results||[]).slice(0,4).forEach(m=>res.push({id:"f"+m.id,title:m.title,type:"film",year:m.release_date?.slice(0,4)||"",credit:"",overview:m.overview||"",cover:m.poster_path?`https://image.tmdb.org/t/p/w500${m.poster_path}`:null,tags:[]}));}
}catch{}
try{
if(all||type==="series"){const d=await(await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${TK}&query=${encodeURIComponent(q)}`)).json();(d.results||[]).slice(0,4).forEach(m=>res.push({id:"s"+m.id,title:m.name,type:"series",year:m.first_air_date?.slice(0,4)||"",credit:"",overview:m.overview||"",cover:m.poster_path?`https://image.tmdb.org/t/p/w500${m.poster_path}`:null,tags:[]}));}
}catch{}
try{
if(all||type==="game"){const d=await(await fetch(`https://api.rawg.io/api/games?key=${RK}&search=${encodeURIComponent(q)}&page_size=4`)).json();(d.results||[]).slice(0,4).forEach(g=>res.push({id:"g"+g.id,title:g.name,type:"game",year:g.released?.slice(0,4)||"",credit:"",overview:"",cover:g.background_image||null,tags:(g.genres||[]).slice(0,2).map(x=>x.name)}));}
}catch{}
try{
if(all||type==="book"){const d=await(await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year,cover_i&limit=4`)).json();(d.docs||[]).slice(0,4).forEach(b=>res.push({id:"b"+b.key,title:b.title,type:"book",year:b.first_publish_year?String(b.first_publish_year):"",credit:(b.author_name||[]).join(", "),overview:"",cover:b.cover_i?`https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg`:null,tags:[]}));}
}catch{}
try{
if(all||type==="manga"){const d=await(await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=4&sfw=true`)).json();(d.data||[]).slice(0,4).forEach(m=>res.push({id:"ma"+m.mal_id,title:m.title_english||m.title,type:"manga",year:m.published?.from?.slice(0,4)||"",credit:(m.authors||[]).map(a=>a.name).join(", "),overview:m.synopsis?m.synopsis.slice(0,150)+"…":"",cover:m.images?.jpg?.large_image_url||null,tags:(m.genres||[]).slice(0,2).map(g=>g.name)}));}
}catch{}
try{
if(all||type==="music"){const d=await(await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=album&limit=4`)).json();(d.results||[]).slice(0,4).forEach(m=>res.push({id:"mu"+m.collectionId,title:m.collectionName,type:"music",year:m.releaseDate?.slice(0,4)||"",credit:m.artistName||"",overview:`${m.primaryGenreName||""} · ${m.trackCount||0} tracks`,cover:m.artworkUrl100?.replace("100x100","600x600")||null,tags:[m.primaryGenreName].filter(Boolean)}));}
}catch{}
try{
if(all||type==="podcast"){const d=await(await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=podcast&entity=podcast&limit=4`)).json();(d.results||[]).slice(0,4).forEach(p=>res.push({id:"p"+p.collectionId,title:p.collectionName,type:"podcast",year:p.releaseDate?.slice(0,4)||"",credit:p.artistName||"",overview:`${p.primaryGenreName||""} · ${p.trackCount||0} eps`,cover:p.artworkUrl600||null,tags:[p.primaryGenreName].filter(Boolean)}));}
}catch{}
if(res.length>0)return res;
// AI fallback
const data=await callChat({mode:"search",query:q,type});
const raw=data.content?.map(b=>b.text||"").join("")||"";
const s=raw.indexOf("["),e=raw.lastIndexOf("]");
if(s===-1||e===-1)return[];
return JSON.parse(raw.slice(s,e+1)).map(x=>({...x,id:x.id||"ai"+Math.random().toString(36).slice(2)}));
}

// Components
function Logo(){
return(
<div style={{display:"flex",alignItems:"center",gap:8,userSelect:"none"}}>
<svg width={22} height={30} viewBox="0 0 26 36" fill="none">
<rect x="0" y="0" width="26" height="9" rx="3" fill="#6C63FF"/>
<rect x="0" y="11" width="26" height="9" rx="3" fill="#9060FF" opacity=".75"/>
<rect x="0" y="22" width="26" height="9" rx="3" fill="#FF5C5C" opacity=".45"/>
</svg>
<span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:20,letterSpacing:3,background:"linear-gradient(90deg,#9D96FF,#C87BFF,#FF7070)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>STKD</span>
</div>
);
}

function CoverImg({item,h=200,w="100%",small}){
const[err,setErr]=useState(false);
const tc=TC[item.type]||PRI;
if(item.cover&&!err)return <img src={item.cover} alt={item.title} onError={()=>setErr(true)} style={{width:w,height:h,objectFit:"cover",display:"block",flexShrink:0}}/>;
const fs=small?Math.min(12,60/Math.max(item.title?.length||6,4)):Math.min(18,130/Math.max(item.title?.length||6,6));
return(
<div style={{width:w,height:h,background:`linear-gradient(145deg,${tc}22,${DIM})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flexShrink:0}}>
{!small&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:8,color:tc,textTransform:"uppercase",letterSpacing:2,marginBottom:6,fontWeight:700}}>{item.type}</div>}
<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:fs,color:"rgba(240,237,232,0.9)",textAlign:"center",padding:"0 8px",lineHeight:1.2}}>{item.title}</div>
{!small&&item.credit&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:5}}>{item.credit}</div>}
</div>
);
}

function Pill({value}){
if(value==null)return null;
const[label,color]=grade(value);
return(
<div style={{display:"inline-flex",alignItems:"center",gap:4,background:SURF,border:`1px solid ${color}35`,borderRadius:5,padding:"3px 8px"}}>
<svg width={9} height={9} viewBox="0 0 24 24" fill={color}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
<span style={{fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:12,color}}>{value.toFixed(1)}</span>
</div>
);
}

function RSlider({val,setVal}){
const ref=useRef(null);
const[label,color]=grade(val);
const pct=(val/10)*100;
const calc=useCallback(e=>{const r=ref.current.getBoundingClientRect();const x=e.touches?e.touches[0].clientX:e.clientX;return Math.round(Math.min(1,Math.max(0,(x-r.left)/r.width))*100)/10;},[]);
const onD=e=>{setVal(calc(e));const mv=me=>setVal(calc(me));const up=()=>{window.removeEventListener("mousemove",mv);window.removeEventListener("mouseup",up);};window.addEventListener("mousemove",mv);window.addEventListener("mouseup",up);};
const onT=e=>{setVal(calc(e));const mv=te=>setVal(calc(te));const en=()=>{window.removeEventListener("touchmove",mv);window.removeEventListener("touchend",en);};window.addEventListener("touchmove",mv);window.addEventListener("touchend",en);};
return(
<div>
<div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,padding:"12px 14px",background:`${color}10`,border:`1px solid ${color}30`,borderRadius:10}}>
<span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:46,color,lineHeight:1,minWidth:68}}>{val.toFixed(1)}</span>
<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:18,color}}>{label}</div>
</div>
<div ref={ref} onMouseDown={onD} onTouchStart={onT} style={{position:"relative",height:36,cursor:"ew-resize",userSelect:"none",marginBottom:4}}>
<div style={{position:"absolute",top:"50%",left:0,right:0,height:5,transform:"translateY(-50%)",background:DIM,borderRadius:3}}/>
<div style={{position:"absolute",top:"50%",left:0,width:`${pct}%`,height:5,transform:"translateY(-50%)",background:`linear-gradient(90deg,${color}44,${color})`,borderRadius:3}}/>
<div style={{position:"absolute",top:"50%",left:`${pct}%`,transform:"translate(-50%,-50%)",width:22,height:22,borderRadius:"50%",background:color,boxShadow:`0 0 0 5px ${color}22`}}/>
</div>
<div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
{["0","2","4","6","8","10"].map(n=><span key={n} style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>{n}</span>)}
</div>
</div>
);
}

const HANDLE_RE=/^[a-z0-9_]{3,20}$/;
const cleanHandle=h=>h.toLowerCase().replace(/[^a-z0-9_]/g,"").slice(0,20);
const BANNER_DEFAULT="linear-gradient(135deg,#1a1040,#6C63FF)";
const fromRow=r=>({id:r.id,handle:r.handle,name:r.display_name,displayName:r.display_name,bio:r.bio||"",avatarColor:r.avatar_color||PRI,avatarEmoji:r.avatar_emoji||"",bannerCss:r.banner_css||BANNER_DEFAULT,top6:r.top6||{}});

const PROF_COLS="id,handle,display_name,bio,avatar_color,avatar_emoji";
const initialsOf=n=>(n||"U").split(" ").filter(Boolean).map(w=>w[0]).join("").slice(0,2).toUpperCase()||"U";
function ago(ts){
const s=Math.max(0,(Date.now()-new Date(ts).getTime())/1000);
if(s<60)return"just now";if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;if(s<604800)return`${Math.floor(s/86400)}d ago`;
return new Date(ts).toLocaleDateString();
}
const ratingFromRow=r=>({id:r.media_id,title:r.title,type:r.type,year:r.year||"",credit:r.credit||"",cover:r.cover||null,overview:"",tags:[],userRating:Number(r.rating),status:r.status||null,comment:r.comment||""});
function Avatar({p,size,ring}){
const col=p?.avatar_color||PRI;
return(
<div style={{width:size,height:size,borderRadius:"50%",padding:ring?2:0,background:ring?`linear-gradient(135deg,${col},${PRI})`:"transparent",boxSizing:"border-box",flexShrink:0}}>
<div style={{width:"100%",height:"100%",borderRadius:"50%",background:SURF,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:Math.round(size*(p?.avatar_emoji?0.42:0.3)),color:col,border:ring?"none":`1.5px solid ${col}44`,boxSizing:"border-box"}}>{p?.avatar_emoji||initialsOf(p?.display_name||p?.handle)}</div>
</div>
);
}

function Auth(){
const[mode,setMode]=useState("login");
const[f,setF]=useState({name:"",handle:"",email:"",pw:""});
const[err,setErr]=useState("");
const[info,setInfo]=useState("");
const[busy,setBusy]=useState(false);
const go=async()=>{
if(busy)return;
setErr("");setInfo("");
if(mode==="signup"){
if(!f.name||!f.handle||!f.email||!f.pw){setErr("All fields required.");return;}
if(!HANDLE_RE.test(f.handle)){setErr("Username must be 3–20 letters, numbers or underscores.");return;}
if(f.pw.length<6){setErr("Password must be at least 6 characters.");return;}
setBusy(true);
const{data,error}=await supabase.auth.signUp({email:f.email.trim(),password:f.pw,options:{data:{name:f.name.trim(),handle:f.handle}}});
setBusy(false);
if(error){setErr(error.message);return;}
if(data.user&&data.user.identities?.length===0){setErr("An account with this email already exists. Log in instead.");return;}
if(!data.session){setMode("login");setF(p=>({...p,pw:""}));setInfo("Check your email to confirm your account, then log in.");}
}else{
if(!f.email||!f.pw){setErr("Email and password required.");return;}
setBusy(true);
const{error}=await supabase.auth.signInWithPassword({email:f.email.trim(),password:f.pw});
setBusy(false);
if(error)setErr(error.message);
}
};
const inp={width:"100%",background:DIM,border:`1px solid ${BOR}`,borderRadius:8,padding:"11px 14px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:10};
return(
<div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
<div style={{width:"100%",maxWidth:390}}>
<div style={{textAlign:"center",marginBottom:28}}><Logo/><p style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:MUT,marginTop:10}}>Rate everything. Miss nothing.</p></div>
<div style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:16,padding:"22px 22px 18px"}}>
<div style={{display:"flex",background:DIM,borderRadius:8,padding:3,marginBottom:18,border:`1px solid ${BOR}`}}>
{[["login","Log In"],["signup","Sign Up"]].map(([id,lb])=>(
<button key={id} onClick={()=>{setMode(id);setErr("");setInfo("");}} style={{flex:1,padding:"8px 0",borderRadius:6,fontFamily:"'Barlow',sans-serif",fontWeight:mode===id?700:500,fontSize:13,background:mode===id?SURF:"transparent",color:mode===id?TXT:MUT,border:`1px solid ${mode===id?BOR:"transparent"}`,cursor:"pointer"}}>{lb}</button>
))}
</div>
{mode==="signup"&&<>
<input placeholder="Full name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} style={inp}/>
<input placeholder="Username" value={f.handle} onChange={e=>setF({...f,handle:cleanHandle(e.target.value)})} style={inp}/>
</>}
<input placeholder="Email" type="email" autoComplete="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} style={inp}/>
<input placeholder="Password" type="password" autoComplete={mode==="signup"?"new-password":"current-password"} value={f.pw} onChange={e=>setF({...f,pw:e.target.value})} onKeyDown={e=>e.key==="Enter"&&go()} style={{...inp,marginBottom:0}}/>
{err&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:ACC,marginTop:8}}>{err}</div>}
{info&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:"#4ADE80",marginTop:8}}>{info}</div>}
<button onClick={go} disabled={busy} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:PRI,color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:15,cursor:busy?"wait":"pointer",opacity:busy?0.7:1,marginTop:14}}>{busy?"…":mode==="signup"?"Create Account":"Log In"}</button>
</div>
</div>
</div>
);
}

function Splash({msg,onLogout}){
return(
<div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:20}}>
<Logo/>
{msg?<div style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:ACC,maxWidth:380,textAlign:"center"}}>{msg}</div>:<div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${PRI}`,borderTopColor:"transparent",animation:"spl 0.8s linear infinite"}}/>}
<style>{`@keyframes spl{to{transform:rotate(360deg)}}`}</style>
{onLogout&&<button onClick={onLogout} style={{background:"transparent",border:`1px solid ${BOR}`,color:MUT,padding:"6px 12px",borderRadius:6,fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer"}}>Log out</button>}
</div>
);
}

const BANS=[BANNER_DEFAULT,"linear-gradient(135deg,#1a0808,#FF5C5C)","linear-gradient(135deg,#041420,#5CB8FF)","linear-gradient(135deg,#041408,#00D4AA)","linear-gradient(135deg,#050510,#A78BFA)"];
function Setup({user,initial,onDone,onCancel}){
const[ac,setAc]=useState(initial?.avatarColor||PRI);
const[bid,setBid]=useState(Math.max(0,BANS.indexOf(initial?.bannerCss)));
const[dn,setDn]=useState(initial?.displayName||user.name||"");
const[hd,setHd]=useState(initial?.handle||cleanHandle(user.handle||""));
const[bio,setBio]=useState(initial?.bio||"");
const COLS=[PRI,ACC,"#00D4AA","#FF9B50","#FF6BA8","#5CB8FF","#A78BFA"];
const EMOS=["🎬","🎮","📚","🎵","🔥","⚡","🌊","🎯"];
const[ae,setAe]=useState(initial?.avatarEmoji||"");
const[err,setErr]=useState("");
const[busy,setBusy]=useState(false);
const initials=(dn||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const finish=async()=>{
if(busy)return;
if(!HANDLE_RE.test(hd)){setErr("Username must be 3–20 letters, numbers or underscores.");return;}
setErr("");setBusy(true);
const row={id:user.id,handle:hd,display_name:(dn||user.name||hd).trim(),bio,avatar_color:ac,avatar_emoji:ae,banner_css:BANS[bid],top6:initial?.top6||{}};
const{data,error}=await supabase.from("profiles").upsert(row).select().single();
setBusy(false);
if(error){setErr(error.code==="23505"?"That username is taken. Try another.":error.message);return;}
onDone(fromRow(data));
};
return(
<div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"36px 20px",overflowY:"auto"}}>
<div style={{width:"100%",maxWidth:460}}>
<div style={{textAlign:"center",marginBottom:20}}><Logo/><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:22,color:TXT,marginTop:12}}>{initial?"Edit your profile":"Set up your profile"}</div></div>
<div style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:16,overflow:"hidden"}}>
<div style={{height:90,background:BANS[bid],position:"relative"}}>
<div style={{position:"absolute",bottom:-20,left:16}}>
<div style={{width:40,height:40,borderRadius:"50%",background:ac,border:"3px solid #0D0E1C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:ae?16:12,fontWeight:800,color:"#fff"}}>{ae||initials}</div>
</div>
</div>
<div style={{padding:"28px 18px 18px"}}>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:TXT,fontWeight:700}}>{dn||"Your Name"}</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT,marginBottom:16}}>@{hd||"username"}</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:7}}>Banner</div>
<div style={{display:"flex",gap:6,marginBottom:14}}>{BANS.map((b,i)=><div key={i} onClick={()=>setBid(i)} style={{width:42,height:24,borderRadius:5,background:b,cursor:"pointer",border:`2px solid ${bid===i?PRI:"transparent"}`}}/>)}</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:7}}>Color</div>
<div style={{display:"flex",gap:7,marginBottom:14}}>{COLS.map(col=><div key={col} onClick={()=>setAc(col)} style={{width:24,height:24,borderRadius:"50%",background:col,cursor:"pointer",border:`2px solid ${ac===col?TXT:"transparent"}`}}/>)}</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:7}}>Icon</div>
<div style={{display:"flex",gap:5,marginBottom:16,flexWrap:"wrap"}}>
<div onClick={()=>setAe("")} style={{width:28,height:28,borderRadius:6,background:DIM,border:`1px solid ${!ae?PRI:BOR}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Barlow',sans-serif",fontSize:9,color:MUT}}>Aa</div>
{EMOS.map(e=><div key={e} onClick={()=>setAe(e)} style={{width:28,height:28,borderRadius:6,background:DIM,border:`1px solid ${ae===e?PRI:BOR}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{e}</div>)}
</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:7}}>Display Name</div>
<input value={dn} onChange={e=>setDn(e.target.value)} style={{width:"100%",background:DIM,border:`1px solid ${BOR}`,borderRadius:7,padding:"9px 11px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:7}}>Username</div>
<input value={hd} onChange={e=>setHd(cleanHandle(e.target.value))} style={{width:"100%",background:DIM,border:`1px solid ${BOR}`,borderRadius:7,padding:"9px 11px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:13,outline:"none",boxSizing:"border-box",marginBottom:12}}/>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:7}}>Bio <span style={{textTransform:"none",fontWeight:400}}>(optional)</span></div>
<textarea value={bio} onChange={e=>setBio(e.target.value.slice(0,160))} placeholder="What are you into?" style={{width:"100%",background:DIM,border:`1px solid ${BOR}`,borderRadius:7,padding:"9px 11px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:13,outline:"none",resize:"none",height:64,boxSizing:"border-box",marginBottom:4}}/>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textAlign:"right",marginBottom:14}}>{bio.length}/160</div>
{err&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:ACC,marginBottom:10}}>{err}</div>}
<div style={{display:"flex",gap:7}}>
<button onClick={finish} disabled={busy} style={{flex:1,padding:"11px",borderRadius:8,border:"none",background:PRI,color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:14,cursor:busy?"wait":"pointer",opacity:busy?0.7:1}}>{busy?"Saving…":initial?"Save":"Finish →"}</button>
{onCancel&&<button onClick={onCancel} style={{padding:"11px 14px",borderRadius:8,border:`1px solid ${BOR}`,background:"transparent",color:MUT,fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:13,cursor:"pointer"}}>Cancel</button>}
</div>
</div>
</div>
</div>
</div>
);
}

function MediaCard({item,onOpen,rating}){
const[hov,setHov]=useState(false);
const tc=TC[item.type];
const[lb,col]=rating!=null?grade(rating):["",""];
return(
<div onClick={()=>onOpen(item)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{background:SURF,border:`1px solid ${hov?"#2E3058":BOR}`,borderRadius:8,overflow:"hidden",cursor:"pointer",transition:"all 0.15s",transform:hov?"translateY(-2px)":"none"}}>
<div style={{position:"relative"}}>
<CoverImg item={item} h={195}/>
<div style={{position:"absolute",top:7,left:7,background:"rgba(7,8,15,0.88)",backdropFilter:"blur(4px)",border:`1px solid ${tc}40`,borderRadius:3,padding:"2px 6px",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:8,letterSpacing:1.5,textTransform:"uppercase",color:tc}}>{item.type}</div>
{rating!=null&&<div style={{position:"absolute",top:7,right:7}}><Pill value={rating}/></div>}
</div>
<div style={{padding:"10px 11px 11px"}}>
<div style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:13,color:TXT,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.title}</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,marginBottom:7,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.year}{item.credit?` · ${item.credit}`:""}</div>
<div style={{height:1,background:BOR,marginBottom:7}}/>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,fontWeight:700,color:lb?col:MUT}}>{lb||"Tap to rate"}</div>
</div>
</div>
);
}

function Modal({item,existing,onClose,onLog}){
const[rat,setRat]=useState(existing?.userRating??5);
const[rev,setRev]=useState(existing?.comment||"");
const[st,setSt]=useState(existing?.status||null);
const[done,setDone]=useState(false);
const[busy,setBusy]=useState(false);
const[err,setErr]=useState("");
const tc=TC[item.type];
const[lb,col]=grade(rat);
const go=async()=>{if(busy)return;setBusy(true);setErr("");try{await onLog({...item,userRating:rat,status:st,comment:rev.trim()});setDone(true);}catch(e){setErr(e.message||"Couldn't save your rating.");}setBusy(false);};
return(
<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(7,8,15,0.93)",backdropFilter:"blur(16px)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:1000,padding:20,overflowY:"auto"}}>
<style>{`@keyframes mI{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}`}</style>
<div onClick={e=>e.stopPropagation()} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:14,width:"100%",maxWidth:560,animation:"mI 0.2s ease",margin:"auto",overflow:"hidden"}}>
<div style={{position:"relative",height:120,overflow:"hidden"}}>
<CoverImg item={item} h={120}/>
<div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(13,14,28,1),transparent 60%)"}}/>
<button onClick={onClose} style={{position:"absolute",top:10,right:10,background:"rgba(0,0,0,0.7)",border:`1px solid ${BOR}`,color:MUT,width:26,height:26,borderRadius:5,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
</div>
<div style={{padding:"0 18px"}}>
<div style={{marginTop:-32,position:"relative",marginBottom:10}}>
<div style={{display:"inline-block",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:9,letterSpacing:2,textTransform:"uppercase",color:tc,background:tc+"14",border:`1px solid ${tc}28`,borderRadius:3,padding:"2px 6px",marginBottom:7}}>{item.type}</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:18,color:TXT,marginBottom:3}}>{item.title}</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT}}>{item.year}{item.credit?` · ${item.credit}`:""}</div>
</div>
{item.overview&&<p style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:SUB,lineHeight:1.7,margin:"0 0 10px"}}>{item.overview}</p>}
</div>
<div style={{borderTop:`1px solid ${BOR}`,padding:"14px 18px"}}>
<div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
{["Completed","In Progress","Plan to","Dropped"].map(s=><button key={s} disabled={done} onClick={()=>setSt(st===s?null:s)} style={{padding:"4px 10px",borderRadius:12,fontSize:11,fontFamily:"'Barlow',sans-serif",fontWeight:600,border:`1px solid ${st===s?tc+"70":BOR}`,background:st===s?tc+"12":DIM,color:st===s?tc:MUT,cursor:done?"default":"pointer"}}>{s}</button>)}
</div>
{!done?<>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:12}}>{existing?"Update Your Rating":"Your Rating"}</div>
<RSlider val={rat} setVal={setRat}/>
<textarea value={rev} onChange={e=>setRev(e.target.value.slice(0,1000))} placeholder="Review (optional)…" style={{width:"100%",background:BG,border:`1px solid ${BOR}`,borderRadius:5,padding:"8px 10px",color:"#C8C4E0",fontFamily:"'Barlow',sans-serif",fontSize:12,resize:"none",height:48,boxSizing:"border-box",outline:"none",marginBottom:10,marginTop:10}}/>
{err&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:ACC,marginBottom:8}}>{err}</div>}
<div style={{display:"flex",gap:7}}>
<button onClick={go} disabled={busy} style={{flex:1,padding:10,borderRadius:6,border:"none",background:PRI,color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:13,cursor:busy?"wait":"pointer",opacity:busy?0.7:1}}>{busy?"Saving…":`Log · ${rat.toFixed(1)} — ${lb}`}</button>
<button onClick={onClose} style={{padding:"10px 13px",borderRadius:6,border:`1px solid ${BOR}`,background:"transparent",color:MUT,fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:12,cursor:"pointer"}}>✕</button>
</div>
</>:<div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 13px",background:"#081508",border:"1px solid #1A3A18",borderRadius:6}}>
<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
<span style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:"#4ADE80",fontWeight:600}}>Logged — {rat.toFixed(1)} · {lb}</span>
</div>}
</div>
</div>
</div>
);
}

function Browse({logged,onLog,onOpen}){
const[q,setQ]=useState("");const[type,setType]=useState("all");const[res,setRes]=useState([]);const[loading,setLoading]=useState(false);const[aiErr,setAiErr]=useState("");
const dq=useDb(q,700);
useEffect(()=>{
if(!dq.trim()){setRes([]);return;}
let cancelled=false;
(async()=>{setLoading(true);setAiErr("");try{const r=await doSearch(dq,type);if(!cancelled)setRes(r);}catch(e){if(!cancelled){setRes([]);setAiErr(e.message||"");}}if(!cancelled)setLoading(false);})();
return()=>{cancelled=true;};
},[dq,type]);
const TYPES=["all","film","series","game","book","manga","music","podcast"];
const SUGGEST=["Parasite","Breaking Bad","Hollow Knight","Dune","Brat","Berserk","Squid Game","Serial"];
return(
<div>
<div style={{borderBottom:`1px solid ${BOR}`,padding:"36px 0 28px"}}>
<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:3,color:PRI,textTransform:"uppercase",marginBottom:8}}>Universal Media Tracker</div>
<h1 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:"clamp(26px,5vw,44px)",color:TXT,margin:"0 0 8px",lineHeight:1.06}}>Rate Everything.<br/>Miss Nothing.</h1>
<p style={{color:SUB,fontSize:13,lineHeight:1.6,margin:"0 0 18px",maxWidth:400}}>Search any film, series, game, book, manga, album or podcast.</p>
<div style={{position:"relative",maxWidth:480}}>
{loading?<div style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",width:13,height:13,borderRadius:"50%",border:`2px solid ${PRI}`,borderTopColor:"transparent",animation:"sp 0.8s linear infinite"}}/>:<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={MUT} strokeWidth={2} style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)"}}><circle cx={11} cy={11} r={8}/><line x1={21} y1={21} x2={16.65} y2={16.65}/></svg>}
<style>{`@keyframes sp{to{transform:translateY(-50%) rotate(360deg)}}`}</style>
<input value={q} maxLength={500} onChange={e=>setQ(e.target.value)} placeholder="Search films, series, games, books, manga, music, podcasts…" style={{width:"100%",background:SURF,border:`1.5px solid #2E3058`,borderRadius:12,padding:"12px 38px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:14,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=PRI+"90"} onBlur={e=>e.target.style.borderColor="#2E3058"}/>
{q&&<button onClick={()=>{setQ("");setRes([]);}} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:DIM,border:"none",color:MUT,cursor:"pointer",width:20,height:20,borderRadius:"50%",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
</div>
{!q&&<div style={{display:"flex",gap:5,marginTop:10,flexWrap:"wrap",alignItems:"center"}}><span style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT}}>Try:</span>{SUGGEST.map(s=><button key={s} onClick={()=>setQ(s)} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:12,padding:"3px 10px",fontFamily:"'Barlow',sans-serif",fontSize:11,color:SUB,cursor:"pointer"}}>{s}</button>)}</div>}
</div>
<div style={{display:"flex",gap:0,border:`1px solid ${BOR}`,borderRadius:6,overflow:"hidden",margin:"14px 0",width:"fit-content"}}>
{TYPES.map(t=>{const a=type===t;return<button key={t} onClick={()=>setType(t)} style={{padding:"5px 11px",fontSize:11,fontFamily:"'Barlow',sans-serif",fontWeight:a?700:400,background:a?DIM:"transparent",color:a?TXT:MUT,border:"none",borderRight:`1px solid ${BOR}`,cursor:"pointer"}}>{t==="all"?"All":t.charAt(0).toUpperCase()+t.slice(1)}</button>;})}
</div>
{!q&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:"#1C1D32",letterSpacing:2}}>SEARCH ANYTHING</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:MUT,marginTop:5}}>Films · Series · Games · Books · Manga · Music · Podcasts</div></div>}
{q&&!loading&&res.length===0&&<div style={{textAlign:"center",padding:"60px 0",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:"#1C1D32",letterSpacing:2}}>NO RESULTS{aiErr&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:13,fontWeight:500,letterSpacing:0,color:ACC,marginTop:8}}>{aiErr}</div>}</div>}
{res.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:12,paddingBottom:100}}>{res.map(item=><MediaCard key={item.id} item={item} onOpen={onOpen} rating={logged[item.id]?.userRating}/>)}</div>}
</div>
);
}

function MyProfile({profile,logged,onEdit}){
const init=(profile.displayName||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const items=Object.values(logged||{});
const avg=items.length?(items.reduce((s,i)=>s+(i.userRating||0),0)/items.length).toFixed(1):null;
return(
<div style={{paddingBottom:80}}>
<div style={{height:140,background:profile.bannerCss||"linear-gradient(135deg,#1a1040,#6C63FF)",position:"relative"}}>
<div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(7,8,15,0.8),transparent)"}}/>
<button onClick={onEdit} style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.6)",border:`1px solid ${BOR}`,color:SUB,borderRadius:7,padding:"6px 11px",fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:11,cursor:"pointer"}}>Edit Profile</button>
</div>
<div style={{padding:"0 20px"}}>
<div style={{marginTop:-28,marginBottom:12,display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
<div style={{width:56,height:56,borderRadius:"50%",background:profile.avatarColor||PRI,border:"3px solid #07080F",display:"flex",alignItems:"center",justifyContent:"center",fontSize:profile.avatarEmoji?20:15,fontWeight:800,color:"#fff"}}>{profile.avatarEmoji||init}</div>
<div style={{display:"flex",gap:7}}>
<div style={{textAlign:"center",background:SURF,border:`1px solid ${BOR}`,borderRadius:8,padding:"6px 11px"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:17,color:TXT}}>{items.length}</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>Stacked</div></div>
{avg&&<div style={{textAlign:"center",background:SURF,border:`1px solid ${BOR}`,borderRadius:8,padding:"6px 11px"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:17,color:PRI}}>{avg}</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>Avg</div></div>}
</div>
</div>
<div style={{marginBottom:18}}><div style={{fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:17,color:TXT}}>{profile.displayName||profile.name}</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT}}>@{profile.handle}</div>{profile.bio&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:SUB,marginTop:5,lineHeight:1.6}}>{profile.bio}</div>}</div>
<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,color:TXT,letterSpacing:0.5,marginBottom:10}}>MY STACK</div>
{["film","series","game","book","manga","music","podcast"].map(type=>{
const its=items.filter(i=>i.type===type);if(!its.length)return null;const tc=TC[type];
return(<div key={type} style={{marginBottom:13}}>
<div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}><div style={{width:3,height:11,borderRadius:2,background:tc}}/><div style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:11,color:tc,textTransform:"uppercase",letterSpacing:1}}>{type}</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT}}>{its.length}</div></div>
{its.map(item=>(
<div key={item.id} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",background:SURF,border:`1px solid ${BOR}`,borderRadius:7,marginBottom:4}}>
<div style={{width:28,height:40,borderRadius:4,overflow:"hidden",flexShrink:0}}><CoverImg item={item} h={40} w={28} small/></div>
<div style={{flex:1,minWidth:0}}><div style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:13,color:TXT,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.title}</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>{item.year}{item.credit?` · ${item.credit}`:""}</div></div>
<Pill value={item.userRating}/>
</div>
))}
</div>);
})}
{!items.length&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:"#1C1D32",letterSpacing:1}}>NOTHING STACKED YET</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT,marginTop:4}}>Search and rate media to build your stack</div></div>}
</div>
</div>
);
}

const TAKE_COLS=`id,text,media_title,created_at,user_id,profiles!takes_user_id_fkey(${PROF_COLS}),take_votes(user_id,vote)`;
const fetchTakes=()=>supabase.from("takes").select(TAKE_COLS).order("created_at",{ascending:false}).limit(100);
function Takes({me}){
const[takes,setTakes]=useState([]);const[loading,setLoading]=useState(true);const[loadErr,setLoadErr]=useState("");
const[nt,setNt]=useState("");const[nm,setNm]=useState("");const[err,setErr]=useState("");const[ok,setOk]=useState(false);const[busy,setBusy]=useState(false);
const applyTakes=useCallback(({data,error})=>{if(error)setLoadErr(error.message);else{setTakes(data);setLoadErr("");}setLoading(false);},[]);
const load=()=>fetchTakes().then(applyTakes);
useEffect(()=>{let live=true;fetchTakes().then(r=>{if(live)applyTakes(r);});return()=>{live=false;};},[applyTakes]);
const counts=t=>({up:t.take_votes.filter(v=>v.vote==="agree").length,dn:t.take_votes.filter(v=>v.vote==="disagree").length,mine:t.take_votes.find(v=>v.user_id===me.id)?.vote||null});
const heat=({up,dn})=>up/(up+dn+1);
const post=async()=>{
if(busy)return;const text=nt.trim();
if(!isSafe(text)||!isSafe(nm)){setErr("Please keep it respectful.");return;}
if(text.length<20){setErr("At least 20 characters.");return;}
if(text.length>280){setErr("280 characters max.");return;}
setBusy(true);
const{data,error}=await supabase.from("takes").insert({text,media_title:nm.trim()||null}).select(TAKE_COLS).single();
setBusy(false);
if(error){setErr(error.message);return;}
setTakes(t=>[data,...t]);setNt("");setNm("");setErr("");setOk(true);setTimeout(()=>setOk(false),3000);
};
const vote=async(take,v)=>{
const mine=take.take_votes.find(x=>x.user_id===me.id);
const next=mine?.vote===v?null:v;
setTakes(ts=>ts.map(t=>t.id!==take.id?t:{...t,take_votes:[...t.take_votes.filter(x=>x.user_id!==me.id),...(next?[{user_id:me.id,vote:next}]:[])]}));
const q=supabase.from("take_votes");
const{error}=!next?await q.delete().eq("take_id",take.id).eq("user_id",me.id):mine?await q.update({vote:next}).eq("take_id",take.id).eq("user_id",me.id):await q.insert({take_id:take.id,vote:next});
if(error)load();
};
const del=async take=>{
if(!window.confirm("Delete this take?"))return;
const{error}=await supabase.from("takes").delete().eq("id",take.id);
if(error){setLoadErr(error.message);return;}
setTakes(ts=>ts.filter(t=>t.id!==take.id));
};
return(
<div style={{maxWidth:660,margin:"0 auto",padding:"24px 0 80px"}}>
<div style={{marginBottom:18}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:3,color:ACC,textTransform:"uppercase",marginBottom:5}}>Community</div><h2 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:24,color:TXT,margin:0}}>Hot Takes</h2></div>
<div style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
<textarea value={nt} maxLength={280} onChange={e=>{setNt(e.target.value);setErr("");}} placeholder="Your hot take about any film, series, game, book, manga, or music…" style={{width:"100%",background:BG,border:`1px solid ${err?ACC:BOR}`,borderRadius:6,padding:"8px 10px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:13,resize:"none",height:66,boxSizing:"border-box",outline:"none",marginBottom:6}}/>
<div style={{display:"flex",gap:7,alignItems:"center"}}>
<input value={nm} maxLength={100} onChange={e=>setNm(e.target.value)} placeholder="Media reference…" style={{flex:1,minWidth:0,background:BG,border:`1px solid ${BOR}`,borderRadius:6,padding:"6px 9px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:12,outline:"none"}}/>
<span style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:nt.length>260?ACC:MUT}}>{nt.length}/280</span>
<button onClick={post} disabled={busy} style={{background:ACC,border:"none",borderRadius:6,padding:"6px 14px",color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,cursor:busy?"wait":"pointer",opacity:busy?0.7:1}}>{busy?"…":"Post"}</button>
</div>
{err&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:ACC,marginTop:5}}>{err}</div>}
{ok&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:"#4ADE80",marginTop:5}}>✓ Posted.</div>}
</div>
{loadErr&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:ACC,marginBottom:10}}>{loadErr}</div>}
{loading&&<div style={{textAlign:"center",padding:"40px 0",fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT}}>Loading…</div>}
{!loading&&!takes.length&&!loadErr&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:"#1C1D32",letterSpacing:1}}>NO TAKES YET</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT,marginTop:4}}>Be the first to start an argument.</div></div>}
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{takes.map(take=>{const c=counts(take);const h=heat(c);const hc=h>0.75?ACC:h>0.5?PRI:"#555";const p=take.profiles;
return(
<div key={take.id} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:10,overflow:"hidden"}}>
<div style={{padding:"12px 13px 10px"}}>
<div style={{display:"flex",gap:8}}>
<div style={{width:27,height:27,borderRadius:"50%",background:`${hc}22`,border:`1.5px solid ${hc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:p?.avatar_emoji?12:8,color:hc,flexShrink:0}}>{p?.avatar_emoji||initialsOf(p?.display_name||p?.handle)}</div>
<div style={{flex:1,minWidth:0}}>
<div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3,flexWrap:"wrap"}}><span style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,color:TXT}}>@{p?.handle||"unknown"}</span><span style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,background:DIM,border:`1px solid ${BOR}`,padding:"1px 5px",borderRadius:8}}>{take.media_title||"General"}</span>{h>0.75&&<span style={{fontFamily:"'Barlow',sans-serif",fontSize:9,fontWeight:700,color:ACC}}>🔥</span>}<span style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>{ago(take.created_at)}</span></div>
<p style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:TXT,margin:0,lineHeight:1.6,fontStyle:"italic",overflowWrap:"anywhere"}}>"{take.text}"</p>
</div>
</div>
</div>
<div style={{borderTop:`1px solid ${BOR}`,padding:"7px 13px",display:"flex",gap:7,alignItems:"center"}}>
<button onClick={()=>vote(take,"agree")} title="Agree" style={{display:"flex",alignItems:"center",gap:3,background:c.mine==="agree"?"#4ADE8018":DIM,border:`1px solid ${c.mine==="agree"?"#4ADE8060":BOR}`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:11,fontWeight:700,color:"#4ADE80"}}><svg width={9} height={9} viewBox="0 0 24 24" fill="#4ADE80"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg>{c.up}</button>
<button onClick={()=>vote(take,"disagree")} title="Disagree" style={{display:"flex",alignItems:"center",gap:3,background:c.mine==="disagree"?`${ACC}18`:DIM,border:`1px solid ${c.mine==="disagree"?ACC+"60":BOR}`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:11,fontWeight:700,color:ACC}}><svg width={9} height={9} viewBox="0 0 24 24" fill={ACC}><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg>{c.dn}</button>
{take.user_id===me.id&&<button onClick={()=>del(take)} style={{marginLeft:"auto",background:"transparent",border:`1px solid ${BOR}`,borderRadius:5,padding:"3px 9px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT}}>Delete</button>}
</div>
</div>
);
})}
</div>
</div>
);
}

const PHILOSOPHY={
"Perfect":"Nothing could be added, removed or changed without making it worse. Fewer than 1% of all media qualifies.",
"Near-Perfect":"Almost flawless. One or two moments barely fall short — invisible against the whole.",
"Excellent":"Exceptional work. Real imperfections exist but sit inside an outstanding vision.",
"Really Good":"Clearly above average. You'd recommend it to almost anyone who likes the genre.",
"Great":"More right than wrong. Has real weaknesses but the overall experience is positive.",
"Good":"Does what it set out to do. Weaknesses are outweighed by what works.",
"Decent":"Competent enough to finish but leaves little lasting impression.",
"Mixed":"Genuine qualities make the failures worse. You can see what it could have been.",
"Poor":"Fails in significant ways throughout. Fundamental failures of craft or design.",
"Bad":"Fails on most key dimensions. Redeeming qualities are rare and insufficient.",
"Terrible":"Doesn't just fail — actively harms. Damages franchises, careers, or genres.",
"Worthless":"No value, no craft, no reason to exist. Warn others.",
};
const TIER_RANGES=[
{label:"Perfect",min:10,max:10},{label:"Near-Perfect",min:9.5,max:9.9},{label:"Excellent",min:9.0,max:9.4},
{label:"Really Good",min:8.5,max:8.9},{label:"Great",min:7.5,max:8.4},{label:"Good",min:6.5,max:7.4},
{label:"Decent",min:5.5,max:6.4},{label:"Mixed",min:4.5,max:5.4},{label:"Poor",min:3.5,max:4.4},
{label:"Bad",min:2.5,max:3.4},{label:"Terrible",min:1.5,max:2.4},{label:"Worthless",min:0,max:1.4},
];
const DESC_BY_TYPE={
"Perfect":{film:"Every frame intentional. A new benchmark for cinema.",series:"No wasted episode, no unearned moment.",game:"Every system serves every other.",book:"Language and structure inseparable from meaning.",manga:"Panels don't just tell the story — they are the story.",music:"Not a note out of place.",podcast:"Every episode essential."},
"Near-Perfect":{film:"Among the finest ever made in its genre.",series:"Exceptional almost every episode.",game:"Near-flawless, one system slightly undercooked.",book:"Brilliant with one passage that slightly breaks the spell.",manga:"A defining work with one arc that doesn't match the peaks.",music:"Extraordinary, one track that doesn't fully belong.",podcast:"As close to perfect as a podcast gets."},
"Excellent":{film:"Outstanding filmmaking, earns full recommendation.",series:"Consistently strong with brilliance.",game:"Excellent design, one mechanic underdeveloped.",book:"Exceptional writing, memorable.",manga:"Brilliant art, mostly excellent storytelling.",music:"A great album with one or two weaker tracks.",podcast:"Consistently excellent."},
"Really Good":{film:"A strong film with one notable weakness.",series:"Strong overall, one weak storyline.",game:"Very good design, one system underdelivers.",book:"Well-written with a sagging middle.",manga:"Very good art, one underperforming arc.",music:"Very good with some filler.",podcast:"Strong voice, some padded episodes."},
"Great":{film:"Genuinely good. Memorable scenes, clear POV.",series:"More good than bad, compelling leads.",game:"Fun and well-made, core loop works.",book:"Engaging, some structural issues.",manga:"Consistent and enjoyable.",music:"More great songs than weak ones.",podcast:"Worth subscribing to."},
"Good":{film:"Competent, delivers despite weak spots.",series:"Watchable, the good outweighs mediocre.",game:"Solid, core promise delivered.",book:"Worthwhile, characters have dimension.",manga:"Enjoyable, clear visual identity.",music:"Decent, about half the tracks land.",podcast:"Does the job adequately."},
"Decent":{film:"Watchable, not memorable.",series:"Gets by on premise or cast.",game:"Adequately covers its genre.",book:"Readable, not rewarding.",manga:"Follows the formula comfortably.",music:"Background listening at best.",podcast:"Passable, topic carries it."},
"Mixed":{film:"As frustrating as enjoyable.",series:"Uneven in ways that matter.",game:"Great ideas, poor execution.",book:"Interesting concept, inconsistent execution.",manga:"Real potential, unrealised.",music:"A few highlights, otherwise frustrating.",podcast:"Standout episodes, too many unprepared."},
"Poor":{film:"Significant failures in writing or direction.",series:"Writing consistently fails the premise.",game:"Fundamentally flawed systems.",book:"Prose or structure works against the story.",manga:"Stilted art or incoherent storytelling.",music:"Poor production, weak songwriting.",podcast:"Poorly researched, badly structured."},
"Bad":{film:"Fails on most levels.",series:"Collapses under its own weight.",game:"Broken design, even fans won't enjoy it.",book:"Bad prose, incoherent structure.",manga:"Art and story fail to engage.",music:"Actively bad, no coherent identity.",podcast:"No research, no structure, no insight."},
"Terrible":{film:"A disgrace to the craft.",series:"Every episode makes things worse.",game:"Unplayable by any standard.",book:"Harmful to the reader's time.",manga:"A comprehensive embarrassment.",music:"Actively unlistenable.",podcast:"Dangerous or worthless."},
"Worthless":{film:"No value whatsoever.",series:"Shouldn't exist.",game:"A scam.",book:"Worthless across every dimension.",manga:"Below amateur in art and story.",music:"Noise with intent to deceive.",podcast:"Actively harmful to the listener."},
};

function ScaleGuide({onClose}){
const[sel,setSel]=useState(null);
const active=sel!=null?TIER_RANGES[sel]:null;
return(
<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(7,8,15,0.93)",backdropFilter:"blur(16px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,overflowY:"auto"}}>
<div onClick={e=>e.stopPropagation()} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:14,width:"100%",maxWidth:680,margin:"auto",overflow:"hidden",display:"flex",flexDirection:"column",maxHeight:"88vh"}}>
<div style={{padding:"18px 22px 12px",borderBottom:`1px solid ${BOR}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
<div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:19,color:TXT}}>The Stkd Scale</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT,marginTop:2}}>Tap any tier for the full breakdown.</div></div>
<button onClick={onClose} style={{background:DIM,border:`1px solid ${BOR}`,color:MUT,width:26,height:26,borderRadius:5,cursor:"pointer",fontSize:13}}>✕</button>
</div>
<div style={{display:"flex",flex:1,overflow:"hidden"}}>
<div style={{width:160,borderRight:`1px solid ${BOR}`,overflowY:"auto",flexShrink:0}}>
{TIER_RANGES.map((r,i)=>{const[,col]=grade(r.min);return(
<button key={i} onClick={()=>setSel(i===sel?null:i)} style={{width:"100%",padding:"8px 12px",display:"flex",alignItems:"center",gap:8,background:sel===i?`${col}12`:"transparent",border:"none",borderBottom:`1px solid ${BOR}`,cursor:"pointer",textAlign:"left"}}>
<div style={{width:6,height:6,borderRadius:"50%",background:col,flexShrink:0}}/>
<div><div style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:10,color:sel===i?col:TXT}}>{r.label}</div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,color:col}}>{r.max===10?"10":`${r.min}–${r.max}`}</div></div>
</button>
);})}
</div>
<div style={{flex:1,overflowY:"auto",padding:18}}>
{!active?TIER_RANGES.map((r,i)=>{const[,col]=grade(r.min);return(
<div key={i} onClick={()=>setSel(i)} style={{padding:"8px 0",borderBottom:`1px solid ${BOR}`,cursor:"pointer",display:"flex",gap:12,alignItems:"flex-start"}}>
<div style={{width:38,flexShrink:0,textAlign:"right"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:17,color:col}}>{r.max===10?"10":`${r.min}+`}</div></div>
<div style={{width:3,background:col,borderRadius:2,alignSelf:"stretch",flexShrink:0}}/>
<div><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:13,color:col}}>{r.label}</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:SUB}}>{PHILOSOPHY[r.label]?.slice(0,60)}…</div></div>
</div>
);}):(()=>{
const[,col]=grade(active.min);
return(
<div>
<button onClick={()=>setSel(null)} style={{background:"transparent",border:"none",color:MUT,cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:11,marginBottom:12,padding:0}}>← All tiers</button>
<div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:12}}>
<span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:42,color:col}}>{active.max===10?"10":`${active.min}–${active.max}`}</span>
<span style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:19,color:col}}>{active.label}</span>
</div>
<div style={{background:`${col}10`,border:`1px solid ${col}30`,borderLeft:`4px solid ${col}`,borderRadius:"0 8px 8px 0",padding:"11px 13px",marginBottom:12}}>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:9,color:col,letterSpacing:1,textTransform:"uppercase",fontWeight:700,marginBottom:5}}>Philosophy</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:"#D4D0F0",lineHeight:1.75}}>{PHILOSOPHY[active.label]}</div>
</div>
<div style={{display:"flex",flexDirection:"column",gap:6}}>
{Object.entries(DESC_BY_TYPE[active.label]||{}).map(([type,text])=>(
<div key={type} style={{display:"flex",gap:9,padding:"8px 11px",background:DIM,borderRadius:6,border:`1px solid ${BOR}`}}>
<div style={{width:48,flexShrink:0}}><span style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:9,color:TC[type]||MUT,background:(TC[type]||MUT)+"14",padding:"2px 5px",borderRadius:3,textTransform:"uppercase"}}>{type}</span></div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:"#B8B4D8",lineHeight:1.6}}>{text}</div>
</div>
))}
</div>
</div>
);
})()}
</div>
</div>
</div>
</div>
);
}

function Agent({onClose}){
const[msgs,setMsgs]=useState([{role:"assistant",text:"Hey! I'm the Stkd AI Agent. I can help you find any film, series, game, book, manga, album or podcast, or give recommendations. What are you looking for?"}]);
const[input,setInput]=useState("");const[loading,setLoading]=useState(false);const bot=useRef(null);
useEffect(()=>{bot.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
const send=async()=>{
if(!input.trim()||loading)return;const txt=input.trim();setInput("");setMsgs(m=>[...m,{role:"user",text:txt}]);setLoading(true);
try{
const hist=msgs.map(m=>({role:m.role==="assistant"?"assistant":"user",content:m.text}));
const d=await callChat({mode:"chat",messages:[...hist,{role:"user",content:txt}]});
setMsgs(m=>[...m,{role:"assistant",text:d.content?.map(b=>b.text||"").join("")||"Sorry, try again!"}]);
}catch(e){setMsgs(m=>[...m,{role:"assistant",text:e.message||"Connection error."}]);}
setLoading(false);
};
return(
<div style={{position:"fixed",bottom:84,right:22,width:340,background:SURF,border:"1px solid #2E3058",borderRadius:16,boxShadow:"0 24px 60px rgba(108,99,255,0.22)",zIndex:500,overflow:"hidden",display:"flex",flexDirection:"column"}}>
<div style={{padding:"11px 13px 9px",borderBottom:`1px solid ${BOR}`,background:`linear-gradient(135deg,${PRI}18,${ACC}10)`,display:"flex",alignItems:"center",gap:10}}>
<div style={{width:28,height:28,borderRadius:7,background:`linear-gradient(135deg,${PRI},${ACC})`,display:"flex",alignItems:"center",justifyContent:"center"}}><svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={3}/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg></div>
<div style={{flex:1}}><div style={{fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:13,color:TXT}}>AI Agent</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>Find & discover any media</div></div>
<button onClick={onClose} style={{background:"transparent",border:"none",color:MUT,cursor:"pointer",fontSize:16}}>✕</button>
</div>
<div style={{height:240,overflowY:"auto",padding:"11px",display:"flex",flexDirection:"column",gap:8}}>
{msgs.map((m,i)=>(
<div key={i} style={{display:"flex",gap:7,flexDirection:m.role==="user"?"row-reverse":"row"}}>
{m.role==="assistant"?<div style={{width:20,height:20,borderRadius:5,background:`linear-gradient(135deg,${PRI},${ACC})`,flexShrink:0}}/>:<div style={{width:20,height:20,borderRadius:"50%",background:ACC+"22",border:`1px solid ${ACC}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:7,color:ACC,flexShrink:0}}>YOU</div>}
<div style={{maxWidth:"83%",background:m.role==="user"?`${PRI}18`:DIM,border:`1px solid ${m.role==="user"?PRI+"30":BOR}`,borderRadius:m.role==="user"?"9px 2px 9px 9px":"2px 9px 9px 9px",padding:"7px 10px"}}>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:m.role==="user"?TXT:"#C8C4E0",lineHeight:1.65,whiteSpace:"pre-wrap"}}>{m.text}</div>
</div>
</div>
))}
{loading&&<div style={{display:"flex",gap:7}}><div style={{width:20,height:20,borderRadius:5,background:`linear-gradient(135deg,${PRI},${ACC})`}}/><div style={{background:DIM,border:`1px solid ${BOR}`,borderRadius:"2px 9px 9px 9px",padding:"8px 11px",display:"flex",gap:3}}>{[0,1,2].map(d=><div key={d} style={{width:4,height:4,borderRadius:"50%",background:PRI,opacity:.7,animation:`bn 1s ${d*.15}s infinite`}}/>)}<style>{`@keyframes bn{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-4px)}}`}</style></div></div>}
<div ref={bot}/>
</div>
<div style={{borderTop:`1px solid ${BOR}`,padding:"8px 10px",display:"flex",gap:7}}>
<input value={input} maxLength={500} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder="Ask about any media…" style={{flex:1,background:BG,border:`1px solid ${BOR}`,borderRadius:7,padding:"7px 10px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:12,outline:"none"}} onFocus={e=>e.target.style.borderColor=PRI+"60"} onBlur={e=>e.target.style.borderColor=BOR}/>
<button onClick={send} disabled={!input.trim()||loading} style={{background:input.trim()&&!loading?PRI:DIM,border:"none",borderRadius:7,padding:"0 12px",color:input.trim()&&!loading?"#fff":MUT,cursor:input.trim()&&!loading?"pointer":"not-allowed",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:13,flexShrink:0}}>↑</button>
</div>
</div>
);
}

const SectionHead=({children,n})=><div style={{display:"flex",gap:6,alignItems:"center",margin:"14px 0 7px"}}><div style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5}}>{children}</div>{n!=null&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>{n}</div>}</div>;
const PersonRow=({p,mutual,children})=>(
<div style={{background:SURF,border:`1px solid ${mutual?PRI+"40":BOR}`,borderRadius:11,padding:"13px 15px",display:"flex",alignItems:"center",gap:11,marginBottom:6}}>
<Avatar p={p} size={42} ring={mutual}/>
<div style={{flex:1,minWidth:0}}>
<div style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:13,color:TXT}}>{p?.display_name||p?.handle}</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT}}>@{p?.handle}</div>
{p?.bio&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:SUB,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.bio}</div>}
</div>
<div style={{display:"flex",gap:5}}>{children}</div>
</div>
);

// Friendships involving the current user, plus recent ratings from accepted friends.
async function fetchSocial(meId){
const{data:fs,error:e1}=await supabase.from("friendships").select(`id,status,created_at,requester,addressee,req:profiles!friendships_requester_fkey(${PROF_COLS}),adr:profiles!friendships_addressee_fkey(${PROF_COLS})`).order("created_at",{ascending:false});
if(e1)return{error:e1};
const ids=fs.filter(f=>f.status==="accepted").map(f=>f.requester===meId?f.addressee:f.requester);
if(!ids.length)return{fs,rs:[]};
const{data:rs,error:e2}=await supabase.from("ratings").select(`id,media_id,title,type,year,cover,credit,rating,comment,status,updated_at,user_id,profiles(${PROF_COLS})`).in("user_id",ids).order("updated_at",{ascending:false}).limit(50);
if(e2)return{error:e2};
return{fs,rs};
}
function Friends({me}){
const[sub,setSub]=useState("feed");
const[rels,setRels]=useState([]);const[feed,setFeed]=useState([]);
const[loading,setLoading]=useState(true);const[err,setErr]=useState("");
const[q,setQ]=useState("");const[found,setFound]=useState(null);const[msg,setMsg]=useState("");const[busy,setBusy]=useState(false);
const applySocial=useCallback(({fs,rs,error})=>{if(error)setErr(error.message);else{setRels(fs);setFeed(rs);setErr("");}setLoading(false);},[]);
const load=()=>fetchSocial(me.id).then(applySocial);
useEffect(()=>{let live=true;fetchSocial(me.id).then(r=>{if(live)applySocial(r);});return()=>{live=false;};},[me.id,applySocial]);
const other=f=>f.requester===me.id?f.adr:f.req;
const incoming=rels.filter(f=>f.status==="pending"&&f.addressee===me.id);
const sent=rels.filter(f=>f.status==="pending"&&f.requester===me.id);
const friends=rels.filter(f=>f.status==="accepted");
const act=async(fn,okMsg)=>{if(busy)return;setBusy(true);setMsg("");const{error}=await fn();setBusy(false);if(error){setMsg(error.code==="23505"?"There's already a request between you two.":error.message);return;}if(okMsg)setMsg(okMsg);await load();};
const find=async()=>{
const h=cleanHandle(q);setMsg("");
if(!h){setFound(null);return;}
const{data,error}=await supabase.from("profiles").select(PROF_COLS).eq("handle",h).maybeSingle();
if(error){setMsg(error.message);return;}
setFound(data||"none");
};
const relWith=id=>rels.find(f=>other(f)?.id===id);
const send=p=>act(()=>supabase.from("friendships").insert({addressee:p.id}),`Request sent to @${p.handle}.`);
const accept=f=>act(()=>supabase.from("friendships").update({status:"accepted"}).eq("id",f.id));
const remove=(f,label)=>{if(label&&!window.confirm(label))return;act(()=>supabase.from("friendships").delete().eq("id",f.id));};
const btn=(primary)=>({padding:"5px 13px",borderRadius:16,fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:10,cursor:busy?"wait":"pointer",border:`1px solid ${primary?PRI:BOR}`,background:primary?`${PRI}18`:DIM,color:primary?PRI:MUT,flexShrink:0});
return(
<div style={{maxWidth:540,margin:"0 auto",padding:"24px 0 80px"}}>
<div style={{marginBottom:16}}>
<div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,fontWeight:700,letterSpacing:3,color:PRI,textTransform:"uppercase",marginBottom:5}}>Social</div>
<h2 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:22,color:TXT,margin:"0 0 4px"}}>Stacked with Friends</h2>
<p style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT,margin:0}}>Invite-only. Friends see each other's ratings.</p>
</div>
<div style={{display:"flex",gap:0,marginBottom:18,background:DIM,borderRadius:8,padding:3,border:`1px solid ${BOR}`}}>
{[["feed","Feed"],["people",`People${incoming.length?` · ${incoming.length}`:""}`]].map(([id,label])=>(
<button key={id} onClick={()=>setSub(id)} style={{flex:1,padding:"7px 0",borderRadius:6,fontFamily:"'Barlow',sans-serif",fontWeight:sub===id?700:500,fontSize:11,background:sub===id?SURF:"transparent",color:sub===id?TXT:id==="people"&&incoming.length?PRI:MUT,border:`1px solid ${sub===id?BOR:"transparent"}`,cursor:"pointer"}}>{label}</button>
))}
</div>
{err&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:ACC,marginBottom:10}}>{err}</div>}
{loading&&<div style={{textAlign:"center",padding:"40px 0",fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT}}>Loading…</div>}
{!loading&&sub==="feed"&&<div>
{friends.length>0&&<div style={{display:"flex",gap:9,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
{friends.map(f=>{const p=other(f);return(
<div key={f.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flexShrink:0}}>
<Avatar p={p} size={44} ring/>
<span style={{fontFamily:"'Barlow',sans-serif",fontSize:9,color:MUT,maxWidth:44,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{(p?.display_name||p?.handle||"").split(" ")[0]}</span>
</div>
);})}
</div>}
{!friends.length&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:"#1C1D32",letterSpacing:1}}>NO FRIENDS YET</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT,marginTop:4}}>Find people by @handle in the <span onClick={()=>setSub("people")} style={{color:PRI,cursor:"pointer"}}>People</span> tab.</div></div>}
{friends.length>0&&!feed.length&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,fontWeight:700,color:"#1C1D32",letterSpacing:1}}>NOTHING HERE YET</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT,marginTop:4}}>Your friends haven't rated anything yet.</div></div>}
<div style={{display:"flex",flexDirection:"column",gap:9}}>
{feed.map(r=>{
const p=r.profiles;const completed=r.status==="Completed";const rating=Number(r.rating);const[lb,col]=grade(rating);
return(
<div key={r.id} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:11,overflow:"hidden"}}>
<div style={{padding:"11px 13px 0",display:"flex",alignItems:"center",gap:9}}>
<Avatar p={p} size={34} ring/>
<div style={{flex:1,minWidth:0}}><div style={{display:"flex",gap:5,flexWrap:"wrap"}}><span style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,color:TXT}}>{p?.display_name||p?.handle}</span><span style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:completed?"#4ADE80":PRI,fontWeight:600}}>{completed?"completed":"rated"}</span></div><span style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>{ago(r.updated_at)}</span></div>
<Pill value={rating}/>
</div>
<div style={{margin:"9px 13px",background:DIM,borderRadius:7,padding:"9px 11px",border:`1px solid ${BOR}`,display:"flex",gap:9,alignItems:"center"}}>
<div style={{width:28,height:40,borderRadius:4,overflow:"hidden",flexShrink:0}}><CoverImg item={{title:r.title,type:r.type,cover:r.cover,credit:r.credit}} h={40} w={28} small/></div>
<div style={{flex:1,minWidth:0}}><div style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,color:TXT,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.title}</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}><span style={{color:TC[r.type],textTransform:"uppercase",fontWeight:700,fontSize:9,letterSpacing:1}}>{r.type}</span>{r.year?` · ${r.year}`:""}{lb&&<span style={{color:col,fontWeight:600}}> · {lb}</span>}</div></div>
</div>
{r.comment&&<div style={{margin:"0 13px 9px",fontFamily:"'Barlow',sans-serif",fontSize:12,color:"#B8B4D8",lineHeight:1.6,overflowWrap:"anywhere"}}>{r.comment}</div>}
<div style={{borderTop:`1px solid ${BOR}`,padding:"7px 13px",display:"flex",alignItems:"center",gap:12}}>
<span style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,marginLeft:"auto"}}>@{p?.handle}</span>
</div>
</div>
);
})}
</div>
</div>}
{!loading&&sub==="people"&&<div>
<div style={{background:`${PRI}10`,border:`1px solid ${PRI}30`,borderRadius:8,padding:"9px 13px",marginBottom:12,display:"flex",gap:7,alignItems:"center"}}>
<svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={PRI} strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx={9} cy={7} r={4}/></svg>
<span style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:PRI}}>Invite-only: ratings are shared once <strong>both of you accept</strong>.</span>
</div>
<div style={{display:"flex",gap:7}}>
<input value={q} onChange={e=>{setQ(e.target.value);setFound(null);}} onKeyDown={e=>e.key==="Enter"&&find()} placeholder="Find by exact @handle" style={{flex:1,minWidth:0,background:SURF,border:`1px solid ${BOR}`,borderRadius:8,padding:"9px 12px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:13,outline:"none"}}/>
<button onClick={find} style={{background:PRI,border:"none",borderRadius:8,padding:"0 14px",color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Find</button>
</div>
{msg&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:/^Request sent/.test(msg)?"#4ADE80":ACC,marginTop:7}}>{msg}</div>}
{found==="none"&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT,marginTop:9}}>No one with that handle.</div>}
{found&&found!=="none"&&<div style={{marginTop:9}}>{(()=>{
if(found.id===me.id)return <PersonRow p={found}><span style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>That's you</span></PersonRow>;
const f=relWith(found.id);
return(
<PersonRow p={found} mutual={f?.status==="accepted"}>
{!f&&<button disabled={busy} onClick={()=>send(found)} style={btn(true)}>Add friend</button>}
{f?.status==="accepted"&&<span style={{fontFamily:"'Barlow',sans-serif",fontSize:10,fontWeight:700,color:PRI}}>FRIENDS</span>}
{f?.status==="pending"&&f.requester===me.id&&<span style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT}}>Requested</span>}
{f?.status==="pending"&&f.addressee===me.id&&<><button disabled={busy} onClick={()=>accept(f)} style={btn(true)}>Accept</button><button disabled={busy} onClick={()=>remove(f)} style={btn(false)}>Decline</button></>}
</PersonRow>
);
})()}</div>}
{incoming.length>0&&<><SectionHead n={incoming.length}>Requests</SectionHead>{incoming.map(f=>(
<PersonRow key={f.id} p={other(f)}><button disabled={busy} onClick={()=>accept(f)} style={btn(true)}>Accept</button><button disabled={busy} onClick={()=>remove(f)} style={btn(false)}>Decline</button></PersonRow>
))}</>}
<SectionHead n={friends.length}>Friends</SectionHead>
{!friends.length&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:MUT}}>No friends yet. Search for someone's @handle above.</div>}
{friends.map(f=>{const p=other(f);return(
<PersonRow key={f.id} p={p} mutual><button disabled={busy} onClick={()=>remove(f,`Remove @${p?.handle} as a friend?`)} style={btn(false)}>Remove</button></PersonRow>
);})}
{sent.length>0&&<><SectionHead n={sent.length}>Sent</SectionHead>{sent.map(f=>(
<PersonRow key={f.id} p={other(f)}><button disabled={busy} onClick={()=>remove(f)} style={btn(false)}>Cancel</button></PersonRow>
))}</>}
</div>}
</div>
);
}

export default function App(){
const[st,setSt]=useState("loading");
const[loadErr,setLoadErr]=useState("");
const[user,setUser]=useState(null);
const[prof,setProf]=useState(null);
const[tab,setTab]=useState("browse");
const[sel,setSel]=useState(null);
const[logged,setLogged]=useState({});
const[agent,setAgent]=useState(false);
useEffect(()=>{
let uid=null;
const loadProfile=async u=>{
setLoadErr("");setSt("loading");
setUser({id:u.id,email:u.email,name:u.user_metadata?.name||"",handle:u.user_metadata?.handle||""});
const{data,error}=await supabase.from("profiles").select("*").eq("id",u.id).maybeSingle();
if(uid!==u.id)return;
if(error){setLoadErr(`Couldn't load your profile: ${error.message}`);return;}
if(!data){setSt("setup");return;}
const{data:rs,error:re}=await supabase.from("ratings").select("*").eq("user_id",u.id).order("updated_at",{ascending:false});
if(uid!==u.id)return;
if(re){setLoadErr(`Couldn't load your ratings: ${re.message}`);return;}
setLogged(Object.fromEntries(rs.map(r=>[r.media_id,ratingFromRow(r)])));
setProf(fromRow(data));setSt("app");
};
// Session is persisted by supabase-js; INITIAL_SESSION fires on load with any stored session.
const{data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
const u=session?.user;
if(!u){uid=null;setUser(null);setProf(null);setLogged({});setTab("browse");setSel(null);setAgent(false);setLoadErr("");setSt("auth");return;}
if(u.id===uid)return; // token refresh / user update for the same account
uid=u.id;
// Defer Supabase calls out of the auth callback to avoid deadlocking the auth lock.
setTimeout(()=>loadProfile(u),0);
});
return()=>{uid=null;subscription.unsubscribe();};
},[]);
const logout=()=>supabase.auth.signOut();
const onLog=async item=>{
const row={user_id:prof.id,media_id:String(item.id).slice(0,200),title:(item.title||"Untitled").slice(0,300),type:item.type,year:item.year?String(item.year).slice(0,10):null,cover:item.cover&&item.cover.length<=1000?item.cover:null,credit:item.credit?item.credit.slice(0,300):null,rating:item.userRating,comment:item.comment||null,status:item.status||null};
const{data,error}=await supabase.from("ratings").upsert(row,{onConflict:"user_id,media_id"}).select().single();
if(error)throw new Error(error.message);
setLogged(prev=>({...prev,[data.media_id]:{...ratingFromRow(data),overview:item.overview||"",tags:item.tags||[]}}));
};
const init=prof?(prof.displayName||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase():"";
const TABS=[{id:"browse",lb:"Browse"},{id:"profile",lb:"My Profile"},{id:"friends",lb:"Friends"},{id:"takes",lb:"Hot Takes"}];
const fonts=<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800&family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet"/>;
if(st==="loading")return(<>{fonts}<Splash msg={loadErr} onLogout={loadErr?logout:null}/></>);
if(st==="auth")return(<>{fonts}<Auth/></>);
if(st==="setup")return(<>{fonts}<Setup user={user} initial={prof} onDone={p=>{setProf(p);setSt("app");}} onCancel={prof?()=>setSt("app"):null}/></>);
return(
<div style={{minHeight:"100vh",background:BG}}>
<link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,500;0,600;0,700;0,800&family=Barlow+Condensed:wght@700;800&display=swap" rel="stylesheet"/>
<style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#2E3058;border-radius:2px}`}</style>
<header style={{position:"sticky",top:0,zIndex:100,background:`${BG}F8`,backdropFilter:"blur(20px)",borderBottom:`1px solid ${BOR}`}}>
<div style={{maxWidth:1200,margin:"0 auto",padding:"0 18px",height:52,display:"flex",alignItems:"center",gap:14}}>
<Logo/>
<div style={{display:"flex",gap:2}}>
{TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"5px 11px",borderRadius:6,fontFamily:"'Barlow',sans-serif",fontWeight:tab===t.id?700:500,fontSize:12,background:tab===t.id?DIM:"transparent",color:tab===t.id?TXT:MUT,border:tab===t.id?`1px solid ${BOR}`:"1px solid transparent",cursor:"pointer"}}>{t.lb}</button>)}
</div>
<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:7}}>
<div onClick={()=>setTab("profile")} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:5,padding:"3px 8px",borderRadius:14,border:`1px solid ${BOR}`,background:SURF}}>
<div style={{width:20,height:20,borderRadius:"50%",background:prof?.avatarColor||PRI,display:"flex",alignItems:"center",justifyContent:"center",fontSize:prof?.avatarEmoji?10:7,fontWeight:800,color:"#fff"}}>{prof?.avatarEmoji||init}</div>
<span style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:SUB}}>@{prof?.handle}</span>
</div>
<button onClick={logout} style={{background:"transparent",border:`1px solid ${BOR}`,color:MUT,padding:"4px 9px",borderRadius:6,fontFamily:"'Barlow',sans-serif",fontWeight:600,fontSize:11,cursor:"pointer"}}>Log out</button>
</div>
</div>
</header>
<div style={{maxWidth:1200,margin:"0 auto",padding:"0 18px"}}>
{tab==="browse"&&<Browse logged={logged} onLog={onLog} onOpen={setSel}/>}
{tab==="profile"&&prof&&<MyProfile profile={prof} logged={logged} onEdit={()=>setSt("setup")}/>}
{tab==="friends"&&prof&&<Friends me={prof}/>}
{tab==="takes"&&prof&&<Takes me={prof}/>}
</div>
<button onClick={()=>setAgent(v=>!v)} style={{position:"fixed",bottom:22,right:22,width:48,height:48,borderRadius:"50%",background:`linear-gradient(135deg,${PRI},${ACC})`,border:"none",cursor:"pointer",boxShadow:`0 4px 20px ${PRI}50`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:600}}>
{agent?<svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>:<svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><circle cx={12} cy={12} r={3}/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>}
</button>
{agent&&<Agent onClose={()=>setAgent(false)}/>}
{sel&&<Modal key={sel.id} item={sel} existing={logged[sel.id]} onClose={()=>setSel(null)} onLog={onLog}/>}
</div>
);
}