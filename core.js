// Shared code for player.html and admin.html. Loaded after config.js and supabase-js.
"use strict";
var POSN={GK:"goalkeeper",DEF:"defender",MID:"midfielder",FWD:"forward"};
var POSL=["DEF","MID","FWD"];
var BUDGET=32,FORMS=["2-2-1","2-1-2","1-2-2","3-1-1"];
var GOALPTS={GK:6,DEF:6,MID:5,FWD:4},CSPTS={GK:2,DEF:2,MID:1,FWD:0},MAXSIDE=3,SQUAD=5;
var BONUS=[3,2,1],VOTE_MIN=5;

/* ---------- State ---------- */
var S={votes:{},myVotes:{},loaded:{teams:false,players:false,fixtures:false,news:false},teams:{},players:{},fixtures:{},news:{},canEdit:false,uid:null,
  fan:{name:"",picks:{}},fanLocal:false,draft:null,draftGW:null};
var D={teams:[],players:[],fix:[],gws:[],gwInfo:{},openGW:null,stat:{},agg:{},table:[]};
var $=function(id){return document.getElementById(id);};

/* ---------- Helpers ---------- */
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function money(v){return "£"+(+v).toFixed(1)+"m";}
function clone(o){return JSON.parse(JSON.stringify(o));}
function T(id){return S.teams[id]||{name:"Unknown team",short:"???",color:"#888888",gk:"#cccccc"};}
function okColor(c,d){return /^#[0-9a-f]{6}$/i.test(c||"")?c:d;}
function lastName(n){var p=String(n).trim().split(/\s+/);return p[p.length-1];}
function fmtDate(iso){if(!iso)return "Date to be set";var d=new Date(iso+"T12:00:00");return isNaN(d)?iso:d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});}
function nextSundayISO(){var d=new Date();d.setDate(d.getDate()+((7-d.getDay())%7||7));return iso(d);}
function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function addMin(t,m){var a=t.split(":").map(Number),x=a[0]*60+a[1]+m;return String(Math.floor(x/60)%24).padStart(2,"0")+":"+String(x%60).padStart(2,"0");}

/* ---------- Derived data ---------- */
/* Scoring: 1 point per game played; wins, clean sheets and goals conceded only count in games the player was on the pitch for.
   Goals, assists and cards are totals for the Sunday. Bonus (3/2/1) comes from the players' vote, or from the admin. */
function scoreOf(s,pos){var p=s.apps+s.g*GOALPTS[pos]+s.a*3+s.cs*CSPTS[pos]+s.wins;if(pos==="GK"||pos==="DEF")p-=Math.floor(s.conc/4);p-=s.y;p-=s.r*3;p+=s.bonus||0;return p;}
function playedGames(x,n){var gp=Array.isArray(x&&x.gp)?x.gp:null,out=[];for(var i=0;i<n;i++)out.push(gp?!!gp[i]:true);return out;}
function voteCloses(gw){var i=D.gwInfo[gw];if(!i||!i.date)return null;var d=new Date(i.date+"T21:00:00+03:00");d.setUTCDate(d.getUTCDate()+1);return d;}
function voteOpen(gw){var i=D.gwInfo[gw],c=voteCloses(gw);return !!(i&&i.done>0&&c&&Date.now()<c.getTime());}
function fmtWhen(d){return d?d.toLocaleString("en-GB",{weekday:"long",hour:"2-digit",minute:"2-digit",timeZone:"Africa/Nairobi"}):"";}
function bonusFor(gw,r){
  if(r&&r.bonus&&Object.keys(r.bonus).length)return {map:r.bonus,final:true,src:"admin",total:0};
  if(r&&r.motm){var m={};m[r.motm]=3;return {map:m,final:true,src:"admin",total:0};}
  var c=S.votes[gw]||{},st=(r&&r.stats)||{},total=0,ids=Object.keys(c).filter(function(k){return st[k];});
  ids.forEach(function(k){total+=c[k];});
  var c2=voteCloses(gw),closed=c2&&Date.now()>=c2.getTime();
  if(!closed)return {map:{},final:false,src:"open",total:total};
  if(total<VOTE_MIN)return {map:{},final:false,src:"short",total:total};
  var levels=[];ids.forEach(function(k){if(c[k]>0&&levels.indexOf(c[k])<0)levels.push(c[k]);});levels.sort(function(a,b){return b-a;});
  var map={};ids.forEach(function(k){var i=levels.indexOf(c[k]);if(i>-1&&i<BONUS.length)map[k]=BONUS[i];});
  return {map:map,final:true,src:"vote",total:total};
}
function gamesOf(r){return (r&&Array.isArray(r.games)?r.games:[]).filter(function(g){return g&&g.h!=null&&g.a!=null;}).map(function(g){return {h:+g.h||0,a:+g.a||0};});}
function dayScore(r){var h=0,a=0;gamesOf(r).forEach(function(g){if(g.h>g.a)h++;else if(g.a>g.h)a++;});return {h:h,a:a};}
function derive(){
  D.teams=Object.keys(S.teams).map(function(k){return Object.assign({id:k},S.teams[k]);}).sort(function(a,b){return a.name.localeCompare(b.name);});
  D.players=Object.keys(S.players).map(function(k){return Object.assign({id:k},S.players[k]);});
  D.fix=Object.keys(S.fixtures).map(function(k){return Object.assign({id:k},S.fixtures[k]);})
    .sort(function(a,b){return (a.gw-b.gw)||String(a.date).localeCompare(String(b.date))||String(a.ko).localeCompare(String(b.ko));});
  var gws={};D.fix.forEach(function(f){var g=gws[f.gw]||(gws[f.gw]={gw:f.gw,date:f.date,ko:f.ko||"09:00",n:0,done:0});
    if(f.date&&(!g.date||f.date<g.date))g.date=f.date;if(f.ko&&f.ko<g.ko)g.ko=f.ko;g.n++;if(f.result)g.done++;});
  D.gws=Object.keys(gws).map(Number).sort(function(a,b){return a-b;});D.gwInfo=gws;
  var now=Date.now();D.openGW=null;
  D.gws.forEach(function(g){var i=gws[g];i.deadline=i.date?new Date(i.date+"T"+(i.ko||"09:00")):null;
    if(D.openGW==null&&i.done<i.n&&(!i.deadline||i.deadline.getTime()>now))D.openGW=g;});
  D.stat={};D.bonus={};var agg={};D.players.forEach(function(p){agg[p.id]={pts:0,g:0,a:0,cs:0,apps:0,wins:0,gw:{}};});
  var ser={};D.teams.forEach(function(t){ser[t.id]={t:t,p:0,w:0,d:0,l:0,gw:0,gl:0,f:0,a:0};});
  D.fix.forEach(function(f){
    var r=f.result;if(!r)return;var games=gamesOf(r),st=r.stats||{},ds=dayScore(r);
    var h=ser[f.home],a=ser[f.away],hf=0,af=0;games.forEach(function(g){hf+=g.h;af+=g.a;});
    if(h&&a){h.p++;a.p++;h.gw+=ds.h;h.gl+=ds.a;a.gw+=ds.a;a.gl+=ds.h;h.f+=hf;h.a+=af;a.f+=af;a.a+=hf;
      if(ds.h>ds.a){h.w++;a.l++;}else if(ds.a>ds.h){a.w++;h.l++;}else{h.d++;a.d++;}}
    var B=bonusFor(f.gw,r);D.bonus[f.gw]=B;
    Object.keys(st).forEach(function(pid){var p=S.players[pid],x=st[pid];if(!p||!x||!x.side)return;
      var home=x.side===f.home;if(!home&&x.side!==f.away)return;
      var gp=playedGames(x,games.length);
      var s={side:x.side,g:+x.g||0,a:+x.a||0,y:x.y?1:0,r:x.r?1:0,bonus:+B.map[pid]||0,apps:0,wins:0,cs:0,conc:0,games:games.length,gp:gp};
      games.forEach(function(g,i){if(!gp[i])return;var mine=home?g.h:g.a,opp=home?g.a:g.h;s.apps++;s.conc+=opp;if(opp===0)s.cs++;if(mine>opp)s.wins++;});
      if(!s.apps)return;
      s.pts=scoreOf(s,p.pos);
      var bucket=D.stat[f.gw]||(D.stat[f.gw]={});
      if(bucket[pid]){var o=bucket[pid];["g","a","y","r","bonus","apps","wins","cs","conc","pts"].forEach(function(k){o[k]+=s[k];});}else bucket[pid]=s;
      var A=agg[pid];if(A){A.pts+=s.pts;A.g+=s.g;A.a+=s.a;A.apps++;A.cs+=s.cs;A.wins+=s.wins;A.gw[f.gw]=(A.gw[f.gw]||0)+s.pts;}
    });
  });
  var doneG=D.gws.filter(function(g){return gws[g].done>0;});
  Object.keys(agg).forEach(function(k){var A=agg[k],l=doneG.slice(-3);A.form=l.length?l.reduce(function(s,g){return s+(A.gw[g]||0);},0)/l.length:0;});
  D.agg=agg;D.doneG=doneG;
  D.series=Object.keys(ser).map(function(k){return ser[k];}).sort(function(x,y){return y.w-x.w||(y.gw-y.gl)-(x.gw-x.gl)||(y.f-y.a)-(x.f-x.a)||x.t.name.localeCompare(y.t.name);});
  if(typeof onDerived==="function")onDerived();
}
function AG(id){return D.agg[id]||{pts:0,g:0,a:0,cs:0,apps:0,gw:{},form:0};}
/* ---------- Shirts ---------- */
var SHIRT="M18 2 8 6 1 18l9 6 3-4v34h34V20l3 4 9-6-7-12-10-4c-3 5-21 5-24 0Z";
function shirt(tid,isGK,cls){var t=T(tid),fill=isGK?okColor(t.gk,"#cccccc"):okColor(t.color,"#888888");
  return '<svg class="'+(cls||"shirt")+'" viewBox="0 0 60 56" aria-hidden="true"><path d="'+SHIRT+'" fill="'+fill+'" stroke="rgba(0,0,0,.35)" stroke-width="1.5" stroke-linejoin="round"/><path d="M22 3c3 4 13 4 16 0" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/></svg>';}
function shirtColor(fill,cls){return '<svg class="'+(cls||"mini")+'" viewBox="0 0 60 56" aria-hidden="true"><path d="'+SHIRT+'" fill="'+okColor(fill,"#888888")+'" stroke="rgba(0,0,0,.35)" stroke-width="1.5" stroke-linejoin="round"/></svg>';}
function emptyShirt(){return '<svg class="shirt" viewBox="0 0 60 56" aria-hidden="true"><path d="'+SHIRT+'" fill="rgba(255,255,255,.08)" stroke="rgba(244,246,240,.75)" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round"/><path d="M30 24v16M22 32h16" stroke="rgba(244,246,240,.9)" stroke-width="2.5" stroke-linecap="round"/></svg>';}
function setStatus(msg){$("status").textContent=msg||"";}
function allLoaded(){return S.loaded.teams&&S.loaded.players&&S.loaded.fixtures;}
/* ---------- Sheets ---------- */
var lastFocus=null;
function openSheet(html){lastFocus=document.activeElement;$("sheet").innerHTML=html;$("scrim").classList.add("on");var f=$("sheet").querySelector("input:not([type=hidden]),.x");if(f)f.focus();}
function closeSheet(){$("scrim").classList.remove("on");if(lastFocus&&lastFocus.focus)lastFocus.focus();}
function sheetOpen(){return $("scrim").classList.contains("on");}
function head(title,sub){return '<div class="sheet-h"><div><h2 id="sheetTitle">'+title+'</h2>'+(sub?'<p>'+sub+'</p>':'')+'</div><button class="x" type="button" data-close aria-label="Close">×</button></div>';}
var tt;function toast(m){var t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("on");},2400);}
function busy(form,on){form.querySelectorAll("button").forEach(function(b){b.disabled=on;});}
function formErr(form,msg){var e=form.querySelector(".err");if(e)e.textContent=msg||"";}
var pendingDel=null;
function confirmDelete(msg,fn){pendingDel=fn;var label=/^Clear/.test(msg)?"Clear results":"Delete";
  openSheet(head("Are you sure?")+'<p style="margin:0 0 6px">'+esc(msg)+'</p><p class="err" id="delErr"></p><div class="actions"><button class="btn danger" type="button" id="delYes">'+label+'</button><button class="btn ghost" type="button" data-close>Cancel</button></div>');}
document.addEventListener("click",async function(e){var b=e.target.closest&&e.target.closest("#delYes");if(!b||!pendingDel)return;
  b.disabled=true;b.textContent="Working…";try{await pendingDel();pendingDel=null;closeSheet();}catch(err){b.disabled=false;b.textContent="Try again";$("delErr").textContent=writeErr(err);}});

function fmtStamp(s){var d=new Date(s);return isNaN(d)?"":d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});}
function newsList(){return Object.keys(S.news||{}).map(function(k){return Object.assign({id:k},S.news[k]);}).sort(function(a,b){return String(b.at).localeCompare(String(a.at));});}
function paras(t){return String(t||"").split(/\n\s*\n/).filter(function(p){return p.trim();}).map(function(p){return '<p>'+esc(p.trim()).replace(/\n/g,"<br>")+'</p>';}).join("");}
function seriesOrder(){var h=D.fix[0]&&D.fix[0].home;return D.teams.slice().sort(function(a,b){return (a.id===h?-1:0)-(b.id===h?-1:0);});}
$("scrim").addEventListener("click",function(e){if(e.target===this)closeSheet();});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&sheetOpen())closeSheet();});
/* ---------- Supabase connection ---------- */
var CFG=window.FPL_CONFIG||{};
var TABLE={teams:"sides",players:"players",fixtures:"sundays",news:"news"};
var SB=null,USER=null;
(function(){var u=CFG.SUPABASE_URL||"",k=CFG.SUPABASE_ANON_KEY||"";
  if(u&&k&&!/YOUR[-_]/i.test(u+k)&&window.supabase&&window.supabase.createClient)SB=window.supabase.createClient(u,k);})();
function fromRow(key,r){
  if(key==="teams")return {name:r.name,short:r.short,color:r.color,gk:r.gk};
  if(key==="players")return {name:r.name,team:r.team,pos:r.pos,price:+r.price};
  if(key==="fixtures")return {gw:+r.gw,date:r.date,ko:String(r.ko||"09:00").slice(0,5),games:+r.games||4,home:r.home,away:r.away,result:r.result||null};
  return {title:r.title,body:r.body,side:r.side||"",at:r.created_at};
}
function toRow(key,d){
  if(key==="teams")return {name:d.name,short:d.short,color:d.color,gk:d.gk||"#F2C230"};
  if(key==="players")return {name:d.name,team:d.team,pos:d.pos,price:d.price};
  if(key==="fixtures")return {gw:d.gw,date:d.date,ko:d.ko,games:d.games||4,home:d.home,away:d.away,result:d.result||null};
  return {title:d.title,body:d.body,side:d.side||null,created_at:d.at||new Date().toISOString()};
}
async function loadTable(key){var q=await SB.from(TABLE[key]).select("*");if(q.error)throw q.error;var o={};(q.data||[]).forEach(function(r){o[r.id]=fromRow(key,r);});S[key]=o;S.loaded[key]=true;}
var reloadTimers={};
function reload(key){clearTimeout(reloadTimers[key]);reloadTimers[key]=setTimeout(async function(){try{await loadTable(key);renderAll();}catch(e){}},250);}
async function startData(){
  var keys=Object.keys(TABLE);
  if(!SB){setStatus("This site isn’t connected to Supabase yet. Add your project URL and anon key to config.js (see the README).");keys.forEach(function(k){S.loaded[k]=true;});renderAll();return;}
  try{await Promise.all(keys.map(loadTable));await loadVotes();setStatus("");}
  catch(e){setStatus("Couldn’t load the league. Check your connection and reload the page.");keys.forEach(function(k){S.loaded[k]=true;});}
  renderAll();
  try{var ch=SB.channel("league");keys.forEach(function(k){ch.on("postgres_changes",{event:"*",schema:"public",table:TABLE[k]},function(){reload(k);});});ch.subscribe();}catch(e){}
}
/* ---------- Bonus votes ---------- */
async function loadVotes(){
  if(!SB)return;
  try{var q=await SB.rpc("vote_counts");if(!q.error){var o={};(q.data||[]).forEach(function(r){(o[r.gw]=o[r.gw]||{})[r.player_id]=+r.votes;});S.votes=o;}}catch(e){}
  var mv={};
  if(USER){try{var m=await SB.from("votes").select("gw,player_id").eq("user_id",USER.id);if(!m.error)(m.data||[]).forEach(function(r){mv[r.gw]=r.player_id;});}catch(e){}}
  S.myVotes=mv;
}
async function castVote(gw,pid){
  if(!SB||!USER)throw {code:"auth"};
  var q=await SB.from("votes").upsert({user_id:USER.id,gw:gw,player_id:pid,created_at:new Date().toISOString()},{onConflict:"user_id,gw"});
  if(q.error)throw q.error;await loadVotes();
}
setInterval(function(){if(SB)loadVotes().then(function(){if(typeof renderAll==="function")renderAll();});},60000);
async function put(key,id,data){
  var row=toRow(key,data),q=id?await SB.from(TABLE[key]).update(row).eq("id",id).select("id"):await SB.from(TABLE[key]).insert(row).select("id");
  if(q.error)throw q.error;if(!q.data||!q.data.length)throw {code:"42501"};reload(key);return q.data[0].id;}
async function del(key,id){var q=await SB.from(TABLE[key]).delete().eq("id",id).select("id");if(q.error)throw q.error;if(!q.data||!q.data.length)throw {code:"42501"};reload(key);}
function writeErr(e){var c=e&&e.code,m=(e&&e.message)||"";
  if(c==="42501"||/row-level security|permission denied/i.test(m))return "You don’t have permission to change league data. Only admins can.";
  if(c==="23503")return "This is still used somewhere else, for example players still on this side. Remove those first.";
  if(c==="23505")return "That already exists.";
  return "Couldn’t save. Check your connection and try again.";}

/* ---------- Sign in ---------- */
function redirectURL(){return location.origin+location.pathname;}
async function signInGoogle(){if(!SB)return;var r=await SB.auth.signInWithOAuth({provider:"google",options:{redirectTo:redirectURL()}});if(r&&r.error)toast("Google sign-in isn’t switched on yet. See the README.");}
async function signOut(){if(SB)await SB.auth.signOut();}
function watchAuth(cb){
  if(!SB){cb(null);return;}
  SB.auth.getSession().then(function(r){USER=r&&r.data&&r.data.session?r.data.session.user:null;cb(USER);});
  SB.auth.onAuthStateChange(function(ev,session){var u=session?session.user:null;if((u&&u.id)!==(USER&&USER.id)){USER=u;if(u&&sheetOpen()&&$("sheet").querySelector("[data-google]"))closeSheet();cb(u);}});
}
function signInSheet(why){
  if(!SB){toast("Connect Supabase in config.js first.");return;}
  openSheet(head("Sign in",why?esc(why):"")+'<div class="form"><button class="btn full" type="button" data-google>Continue with Google</button><p class="or">or get a sign-in link by email</p>'+
    '<form class="form" id="emailForm"><input type="email" name="email" placeholder="you@example.com" autocomplete="email" aria-label="Email address"><p class="err"></p><button class="btn ghost full" type="submit">Email me a sign-in link</button></form></div>');
}
document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("[data-google],[data-signin],[data-signout],[data-close]");if(!t)return;
  if(t.hasAttribute("data-google"))signInGoogle();
  else if(t.hasAttribute("data-signin"))signInSheet(t.getAttribute("data-why")||"");
  else if(t.hasAttribute("data-signout"))signOut().then(function(){closeSheet();toast("Signed out");});
  else if(t.hasAttribute("data-close"))closeSheet();
});
document.addEventListener("submit",async function(e){if(e.target.id!=="emailForm")return;e.preventDefault();var f=e.target,em=f.elements.email.value.trim();
  if(!/^\S+@\S+\.\S+$/.test(em))return formErr(f,"Enter a valid email address.");
  busy(f,true);try{var r=await SB.auth.signInWithOtp({email:em,options:{emailRedirectTo:redirectURL()}});if(r.error)throw r.error;f.innerHTML='<p>Check <b>'+esc(em)+'</b> for a sign-in link, then open it on this device.</p>';}
  catch(err){busy(f,false);formErr(f,"Couldn’t send the link. Wait a minute and try again.");}});
