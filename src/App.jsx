import { useState, useRef, useEffect, useCallback } from "react";

const BG="#07080F",SURF="#0D0E1C",BOR="#1C1D32",PRI="#6C63FF",ACC="#FF5C5C",TXT="#ECEAF8",MUT="#4A4A6E",DIM="#111222",SUB="#9896B8";
const ANTHROPIC_KEY=import.meta.env.VITE_ANTHROPIC_KEY||"";
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
const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,messages:[{role:"user",content:`Search "${q}" across ${type==="all"?"films,series,games,books,manga,music,podcasts":type+"s"}. Return ONLY a JSON array starting [ ending ]. Each: {"id":"x1","title":"title","type":"film|series|game|book|manga|music|podcast","year":"YYYY","credit":"creator","overview":"1-2 sentences","tags":["genre"],"cover":null}`}]})});
const data=await r.json();
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

function Auth({onAuth}){
const[mode,setMode]=useState("login");
const[f,setF]=useState({name:"",handle:"",email:"",pw:""});
const[err,setErr]=useState("");
const go=()=>{
if(mode==="signup"){
if(!f.name||!f.handle||!f.email||!f.pw){setErr("All fields required.");return;}
onAuth({name:f.name,handle:f.handle.toLowerCase(),isNew:true});
}else{
if(!f.email||!f.pw){setErr("Email and password required.");return;}
onAuth({name:"Demo User",handle:"demo",isNew:false});
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
<button key={id} onClick={()=>{setMode(id);setErr("");}} style={{flex:1,padding:"8px 0",borderRadius:6,fontFamily:"'Barlow',sans-serif",fontWeight:mode===id?700:500,fontSize:13,background:mode===id?SURF:"transparent",color:mode===id?TXT:MUT,border:`1px solid ${mode===id?BOR:"transparent"}`,cursor:"pointer"}}>{lb}</button>
))}
</div>
{mode==="signup"&&<>
<input placeholder="Full name" value={f.name} onChange={e=>setF({...f,name:e.target.value})} style={inp}/>
<input placeholder="Username" value={f.handle} onChange={e=>setF({...f,handle:e.target.value.replace(/\s/g,"")})} style={inp}/>
</>}
<input placeholder="Email" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})} style={inp}/>
<input placeholder="Password" type="password" value={f.pw} onChange={e=>setF({...f,pw:e.target.value})} onKeyDown={e=>e.key==="Enter"&&go()} style={{...inp,marginBottom:0}}/>
{err&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:12,color:ACC,marginTop:8}}>{err}</div>}
<button onClick={go} style={{width:"100%",padding:"12px",borderRadius:8,border:"none",background:PRI,color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:14}}>{mode==="signup"?"Create Account":"Log In"}</button>
</div>
</div>
</div>
);
}

function Setup({user,onDone}){
const[ac,setAc]=useState(PRI);
const[bid,setBid]=useState(0);
const[dn,setDn]=useState(user.name||"");
const[bio,setBio]=useState("");
const BANS=["linear-gradient(135deg,#1a1040,#6C63FF)","linear-gradient(135deg,#1a0808,#FF5C5C)","linear-gradient(135deg,#041420,#5CB8FF)","linear-gradient(135deg,#041408,#00D4AA)","linear-gradient(135deg,#050510,#A78BFA)"];
const COLS=[PRI,ACC,"#00D4AA","#FF9B50","#FF6BA8","#5CB8FF","#A78BFA"];
const EMOS=["🎬","🎮","📚","🎵","🔥","⚡","🌊","🎯"];
const[ae,setAe]=useState("");
const initials=(dn||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const finish=()=>onDone({...user,displayName:dn||user.name,bio,avatarColor:ac,avatarEmoji:ae,bannerCss:BANS[bid],top6:{}});
return(
<div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"36px 20px",overflowY:"auto"}}>
<div style={{width:"100%",maxWidth:460}}>
<div style={{textAlign:"center",marginBottom:20}}><Logo/><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:22,color:TXT,marginTop:12}}>Set up your profile</div></div>
<div style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:16,overflow:"hidden"}}>
<div style={{height:90,background:BANS[bid],position:"relative"}}>
<div style={{position:"absolute",bottom:-20,left:16}}>
<div style={{width:40,height:40,borderRadius:"50%",background:ac,border:"3px solid #0D0E1C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:ae?16:12,fontWeight:800,color:"#fff"}}>{ae||initials}</div>
</div>
</div>
<div style={{padding:"28px 18px 18px"}}>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:TXT,fontWeight:700}}>{dn||"Your Name"}</div>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT,marginBottom:16}}>@{user.handle}</div>
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
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:7}}>Bio <span style={{textTransform:"none",fontWeight:400}}>(optional)</span></div>
<textarea value={bio} onChange={e=>setBio(e.target.value.slice(0,160))} placeholder="What are you into?" style={{width:"100%",background:DIM,border:`1px solid ${BOR}`,borderRadius:7,padding:"9px 11px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:13,outline:"none",resize:"none",height:64,boxSizing:"border-box",marginBottom:4}}/>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textAlign:"right",marginBottom:14}}>{bio.length}/160</div>
<button onClick={finish} style={{width:"100%",padding:"11px",borderRadius:8,border:"none",background:PRI,color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:14,cursor:"pointer"}}>Finish →</button>
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

function Modal({item,onClose,onLog}){
const[rat,setRat]=useState(5);
const[rev,setRev]=useState("");
const[st,setSt]=useState(null);
const[done,setDone]=useState(false);
const tc=TC[item.type];
const[lb,col]=grade(rat);
const go=()=>{setDone(true);onLog({...item,userRating:rat,status:st});};
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
{["Completed","In Progress","Plan to","Dropped"].map(s=><button key={s} onClick={()=>setSt(s)} style={{padding:"4px 10px",borderRadius:12,fontSize:11,fontFamily:"'Barlow',sans-serif",fontWeight:600,border:`1px solid ${st===s?tc+"70":BOR}`,background:st===s?tc+"12":DIM,color:st===s?tc:MUT,cursor:"pointer"}}>{s}</button>)}
</div>
{!done?<>
<div style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,textTransform:"uppercase",letterSpacing:1.5,fontWeight:700,marginBottom:12}}>Your Rating</div>
<RSlider val={rat} setVal={setRat}/>
<textarea value={rev} onChange={e=>setRev(e.target.value)} placeholder="Review (optional)…" style={{width:"100%",background:BG,border:`1px solid ${BOR}`,borderRadius:5,padding:"8px 10px",color:"#C8C4E0",fontFamily:"'Barlow',sans-serif",fontSize:12,resize:"none",height:48,boxSizing:"border-box",outline:"none",marginBottom:10,marginTop:10}}/>
<div style={{display:"flex",gap:7}}>
<button onClick={go} style={{flex:1,padding:10,borderRadius:6,border:"none",background:PRI,color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer"}}>Log · {rat.toFixed(1)} — {lb}</button>
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
const[q,setQ]=useState("");const[type,setType]=useState("all");const[res,setRes]=useState([]);const[loading,setLoading]=useState(false);
const dq=useDb(q,700);
useEffect(()=>{
if(!dq.trim()){setRes([]);return;}
let cancelled=false;
(async()=>{setLoading(true);try{const r=await doSearch(dq,type);if(!cancelled)setRes(r);}catch{if(!cancelled)setRes([]);}if(!cancelled)setLoading(false);})();
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
<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search films, series, games, books, manga, music, podcasts…" style={{width:"100%",background:SURF,border:`1.5px solid #2E3058`,borderRadius:12,padding:"12px 38px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:14,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=PRI+"90"} onBlur={e=>e.target.style.borderColor="#2E3058"}/>
{q&&<button onClick={()=>{setQ("");setRes([]);}} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:DIM,border:"none",color:MUT,cursor:"pointer",width:20,height:20,borderRadius:"50%",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>}
</div>
{!q&&<div style={{display:"flex",gap:5,marginTop:10,flexWrap:"wrap",alignItems:"center"}}><span style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT}}>Try:</span>{SUGGEST.map(s=><button key={s} onClick={()=>setQ(s)} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:12,padding:"3px 10px",fontFamily:"'Barlow',sans-serif",fontSize:11,color:SUB,cursor:"pointer"}}>{s}</button>)}</div>}
</div>
<div style={{display:"flex",gap:0,border:`1px solid ${BOR}`,borderRadius:6,overflow:"hidden",margin:"14px 0",width:"fit-content"}}>
{TYPES.map(t=>{const a=type===t;return<button key={t} onClick={()=>setType(t)} style={{padding:"5px 11px",fontSize:11,fontFamily:"'Barlow',sans-serif",fontWeight:a?700:400,background:a?DIM:"transparent",color:a?TXT:MUT,border:"none",borderRight:`1px solid ${BOR}`,cursor:"pointer"}}>{t==="all"?"All":t.charAt(0).toUpperCase()+t.slice(1)}</button>;})}
</div>
{!q&&<div style={{textAlign:"center",padding:"60px 0"}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:"#1C1D32",letterSpacing:2}}>SEARCH ANYTHING</div><div style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:MUT,marginTop:5}}>Films · Series · Games · Books · Manga · Music · Podcasts</div></div>}
{q&&!loading&&res.length===0&&<div style={{textAlign:"center",padding:"60px 0",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,fontWeight:700,color:"#1C1D32",letterSpacing:2}}>NO RESULTS</div>}
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

function Takes(){
const SEED=[
{id:1,u:"cinematica_v",av:"CV",take:"Breaking Bad is overrated. The Wire does everything it does but with more humanity.",ref:"Series",up:342,dn:89,replies:[{id:1,u:"serieshead",t:"BB is about ego, The Wire is about systems. Different goals."}]},
{id:2,u:"ludomancer",av:"LM",take:"Elden Ring is FromSoft's worst game. Dark Souls 1 has more interesting design in two hours.",ref:"Games",up:218,dn:201,replies:[]},
{id:3,u:"freq_witch",av:"FW",take:"Brat is the most culturally significant album of the 2020s and it's not even close.",ref:"Music",up:509,dn:122,replies:[{id:1,u:"melomaniac_r",t:"Kendrick's output this year says otherwise."}]},
];
const[takes,setTakes]=useState(SEED);const[nt,setNt]=useState("");const[nm,setNm]=useState("");const[err,setErr]=useState("");const[ok,setOk]=useState(false);const[openR,setOR]=useState({});const[repO,setRepO]=useState({});const[repI,setRepI]=useState({});
const heat=t=>t.up/(t.up+t.dn+1);
const post=()=>{if(!isSafe(nt)){setErr("Please keep it respectful.");return;}if(nt.trim().length<20){setErr("At least 20 characters.");return;}setTakes(t=>[{id:Date.now(),u:"you",av:"YO",take:nt.trim(),ref:nm.trim()||"General",up:0,dn:0,replies:[]},...t]);setNt("");setNm("");setErr("");setOk(true);setTimeout(()=>setOk(false),3000);};
const vote=(id,d)=>setTakes(t=>t.map(tk=>tk.id===id?{...tk,[d==="up"?"up":"dn"]:tk[d==="up"?"up":"dn"]+1}:tk));
const reply=tid=>{const text=(repI[tid]||"").trim();if(!isSafe(text)||text.length<5)return;setTakes(t=>t.map(tk=>tk.id===tid?{...tk,replies:[...tk.replies,{id:Date.now(),u:"you",t:text}]}:tk));setRepI(r=>({...r,[tid]:""}));};
return(
<div style={{maxWidth:660,margin:"0 auto",padding:"24px 0 80px"}}>
<div style={{marginBottom:18}}><div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,fontWeight:700,letterSpacing:3,color:ACC,textTransform:"uppercase",marginBottom:5}}>Community</div><h2 style={{fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:24,color:TXT,margin:0}}>Hot Takes</h2></div>
<div style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
<textarea value={nt} onChange={e=>{setNt(e.target.value);setErr("");}} placeholder="Your hot take about any film, series, game, book, manga, or music…" style={{width:"100%",background:BG,border:`1px solid ${err?ACC:BOR}`,borderRadius:6,padding:"8px 10px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:13,resize:"none",height:66,boxSizing:"border-box",outline:"none",marginBottom:6}}/>
<div style={{display:"flex",gap:7}}>
<input value={nm} onChange={e=>setNm(e.target.value)} placeholder="Media reference…" style={{flex:1,background:BG,border:`1px solid ${BOR}`,borderRadius:6,padding:"6px 9px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:12,outline:"none"}}/>
<button onClick={post} style={{background:ACC,border:"none",borderRadius:6,padding:"6px 14px",color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>Post</button>
</div>
{err&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:ACC,marginTop:5}}>{err}</div>}
{ok&&<div style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:"#4ADE80",marginTop:5}}>✓ Posted.</div>}
</div>
<div style={{display:"flex",flexDirection:"column",gap:8}}>
{[...takes].sort((a,b)=>heat(b)-heat(a)).map(take=>{const h=heat(take);const hc=h>0.75?ACC:h>0.5?PRI:"#555";
return(
<div key={take.id} style={{background:SURF,border:`1px solid ${BOR}`,borderRadius:10,overflow:"hidden"}}>
<div style={{padding:"12px 13px 10px"}}>
<div style={{display:"flex",gap:8}}>
<div style={{width:27,height:27,borderRadius:"50%",background:`${hc}22`,border:`1.5px solid ${hc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Barlow',sans-serif",fontWeight:800,fontSize:8,color:hc,flexShrink:0}}>{take.av}</div>
<div style={{flex:1}}>
<div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}><span style={{fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:12,color:TXT}}>@{take.u}</span><span style={{fontFamily:"'Barlow',sans-serif",fontSize:10,color:MUT,background:DIM,border:`1px solid ${BOR}`,padding:"1px 5px",borderRadius:8}}>{take.ref}</span>{h>0.75&&<span style={{fontFamily:"'Barlow',sans-serif",fontSize:9,fontWeight:700,color:ACC}}>🔥</span>}</div>
<p style={{fontFamily:"'Barlow',sans-serif",fontSize:13,color:TXT,margin:0,lineHeight:1.6,fontStyle:"italic"}}>"{take.take}"</p>
</div>
</div>
</div>
<div style={{borderTop:`1px solid ${BOR}`,padding:"7px 13px",display:"flex",gap:7,alignItems:"center"}}>
<button onClick={()=>vote(take.id,"up")} style={{display:"flex",alignItems:"center",gap:3,background:DIM,border:`1px solid ${BOR}`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:11,fontWeight:700,color:"#4ADE80"}}><svg width={9} height={9} viewBox="0 0 24 24" fill="#4ADE80"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg>{take.up}</button>
<button onClick={()=>vote(take.id,"down")} style={{display:"flex",alignItems:"center",gap:3,background:DIM,border:`1px solid ${BOR}`,borderRadius:5,padding:"3px 8px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:11,fontWeight:700,color:ACC}}><svg width={9} height={9} viewBox="0 0 24 24" fill={ACC}><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/></svg>{take.dn}</button>
{take.replies.length>0&&<button onClick={()=>setOR(r=>({...r,[take.id]:!r[take.id]}))} style={{background:"transparent",border:"none",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT,padding:0}}>{take.replies.length} {take.replies.length===1?"reply":"replies"}</button>}
<button onClick={()=>setRepO(r=>({...r,[take.id]:!r[take.id]}))} style={{marginLeft:"auto",background:"transparent",border:`1px solid ${BOR}`,borderRadius:5,padding:"3px 9px",cursor:"pointer",fontFamily:"'Barlow',sans-serif",fontSize:11,color:MUT}}>Debate</button>
</div>
{openR[take.id]&&take.replies.map(r=><div key={r.id} style={{padding:"7px 13px 7px 40px",borderTop:`1px solid ${BOR}`,background:BG}}><span style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:TXT,fontWeight:700}}>@{r.u} </span><span style={{fontFamily:"'Barlow',sans-serif",fontSize:11,color:"#C8C4E0"}}>{r.t}</span></div>)}
{repO[take.id]&&<div style={{borderTop:`1px solid ${BOR}`,padding:"8px 13px",background:BG,display:"flex",gap:6}}><input value={repI[take.id]||""} onChange={e=>setRepI(r=>({...r,[take.id]:e.target.value}))} placeholder="Reply…" onKeyDown={e=>e.key==="Enter"&&reply(take.id)} style={{flex:1,background:SURF,border:`1px solid ${BOR}`,borderRadius:6,padding:"6px 9px",color:TXT,fontFamily:"'Barlow',sans-serif",fontSize:12,outline:"none"}}/><button onClick={()=>reply(take.id)} style={{background:PRI,border:"none",borderRadius:6,padding:"6px 10px",color:"#fff",fontFamily:"'Barlow',sans-serif",fontWeight:700,fontSize:11,cursor:"pointer"}}>→</button></div>}
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
const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":ANTHROPIC_KEY,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:700,system:"You are Stkd's AI media agent. Help users find specific media and give recommendations. Keep responses concise. Format recs as: Title (Type, Year) — reason.",messages:[...hist,{role:"user",content:txt}]})});
const d=await res.json();
setMsgs(m=>[...m,{role:"assistant",text:d.content?.map(b=>b.text||"").join("")||"Sorry, try again!"}]);
}catch{setMsgs(m=>[...m,{role:"assistant",text:"Connection error."}]);}
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