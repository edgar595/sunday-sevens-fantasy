// Player site: fantasy team, players, Sundays, standings, news.
var fanLoaded=false,onboarded=false,picksTimer,profTimer;
function onDerived(){syncDraft();}
function saveFan(){clearTimeout(picksTimer);picksTimer=setTimeout(savePicks,600);}
async function savePicks(){
  if(!SB||!USER||S.draftGW==null)return;var gw=S.draftGW,p=S.fan.picks[gw];if(!p)return;
  var q=await SB.from("picks").upsert({user_id:USER.id,gw:gw,formation:p.formation,squad:p.squad,captain:p.captain||null,updated_at:new Date().toISOString()},{onConflict:"user_id,gw"});
  if(q.error)toast(/row-level|42501/i.test((q.error.message||"")+(q.error.code||""))?"Gameweek "+gw+" has locked. Your changes count from the next Sunday.":"Couldn’t save your team. Check your connection.");
}
function saveProfileSoon(){clearTimeout(profTimer);profTimer=setTimeout(saveProfile,700);}
async function saveProfile(){
  if(!SB||!USER)return;
  var q=await SB.from("profiles").upsert({user_id:USER.id,manager:S.fan.manager||"",team_name:S.fan.name||"",fav_side:S.teams[S.fan.fav]?S.fan.fav:null,updated_at:new Date().toISOString()},{onConflict:"user_id"});
  if(q.error)toast("Couldn’t save your profile. Try again.");
}
async function loadFan(){
  S.fan={name:"",manager:"",fav:"",picks:{}};S.draft=null;S.draftGW=null;
  if(!SB||!USER)return;
  try{var r=await Promise.all([SB.from("profiles").select("*").eq("user_id",USER.id).maybeSingle(),SB.from("picks").select("*").eq("user_id",USER.id)]);
    var pr=r[0].data;if(pr){S.fan.name=pr.team_name||"";S.fan.manager=pr.manager||"";S.fan.fav=pr.fav_side||"";}
    (r[1].data||[]).forEach(function(p){S.fan.picks[p.gw]={formation:p.formation,squad:p.squad||[],captain:p.captain||null};});}
  catch(e){toast("Couldn’t load your team. Reload to try again.");}
}
function renderAccount(){
  $("acct").innerHTML=USER?'<button class="switch" type="button" data-acct>'+esc(S.fan.manager||"My account")+'</button>':(SB?'<button class="switch" type="button" data-signin data-why="Sign in to pick your team and keep your points.">Sign in</button>':'');
}
function accountSheet(){
  openSheet(head(esc(S.fan.manager||"Your account"),esc(USER.email||""))+'<div class="actions"><button class="btn" type="button" data-profile>Edit profile</button><button class="btn ghost" type="button" data-signout>Sign out</button></div>');
}

function picksFor(gw){var best=null;Object.keys(S.fan.picks).map(Number).forEach(function(k){if(k<=gw&&(best==null||k>best))best=k;});return best==null?null:S.fan.picks[best];}
function syncDraft(){
  if(D.openGW==null){S.draft=null;S.draftGW=null;return;}
  if(S.draftGW!==D.openGW||!S.draft){var p=picksFor(D.openGW);S.draft=p?clone(p):{formation:FORMS[0],squad:[],captain:null};S.draftGW=D.openGW;}
  S.draft.squad=S.draft.squad.filter(function(id){return S.players[id];});
  if(FORMS.indexOf(S.draft.formation)<0){S.draft.formation=FORMS[0];["GK","DEF","MID","FWD"].forEach(function(pos){while(have(pos)>need(pos)){var ids=S.draft.squad.filter(function(id){return S.players[id].pos===pos;});var drop=ids[ids.length-1];S.draft.squad=S.draft.squad.filter(function(x){return x!==drop;});}});}
  if(S.draft.captain&&S.draft.squad.indexOf(S.draft.captain)<0)S.draft.captain=null;
}
function commitDraft(){S.fan.picks[S.draftGW]=clone(S.draft);saveFan();}
function need(pos){if(pos==="GK")return 0;var f=S.draft.formation.split("-").map(Number);return {DEF:f[0],MID:f[1],FWD:f[2]}[pos];}
function have(pos){return S.draft.squad.filter(function(id){return S.players[id].pos===pos;}).length;}
function bank(){return Math.round((BUDGET-S.draft.squad.reduce(function(s,id){return s+(+S.players[id].price);},0))*10)/10;}
function clubCount(t){return S.draft.squad.filter(function(id){return S.players[id].team===t;}).length;}
function complete(){return S.draft&&S.draft.squad.length===SQUAD&&S.draft.captain!=null&&bank()>=0;}
function whyNot(p){
  if(!USER)return "Sign in to pick";
  if(!S.draft)return "Transfers closed";
  if(S.draft.squad.indexOf(p.id)>-1)return "In your team";
  if(have(p.pos)>=need(p.pos))return "No "+POSN[p.pos]+" slot left";
  if(p.price>bank()+1e-9)return "Need "+money(p.price-bank())+" more";
  if(clubCount(p.team)>=MAXSIDE)return "Already "+MAXSIDE+" from "+T(p.team).name;
  return "";
}
function gwPoints(gw){var pk=picksFor(gw);if(!pk)return null;var st=D.stat[gw]||{},tot=0;pk.squad.forEach(function(id){var s=st[id];if(s)tot+=s.pts*(id===pk.captain?2:1);});return tot;}
function renderHeader(){renderAccount();
  var g=D.openGW,el=$("deadline");
  if(!allLoaded()){el.textContent="";return;}
  if(g==null){el.innerHTML=D.gws.length?"<b>No open gameweek.</b> Waiting for new fixtures.":"Fixtures not set yet";return;}
  var i=D.gwInfo[g];el.innerHTML="Gameweek "+g+" deadline: <b>"+(i.deadline?fmtDate(i.date)+", "+esc(i.ko):"date to be set")+"</b>";
}
function nextOpp(tid){return T(tid).short;}
function renderTeam(){
  var html="";
  if(!USER){
    $("rows").innerHTML='<div class="pitch-msg"><p>Sign in to pick your five and start scoring.</p><button class="btn" type="button" data-signin data-why="Sign in to pick your team and keep your points.">Sign in to play</button></div>';
    ["fBank","fCount","fPts"].forEach(function(id){$(id).textContent="–";});$("forms").innerHTML="";$("teamHelp").textContent="";
    $("saveNote").textContent="Your team is saved to your account once you sign in.";$("hist").innerHTML='<li style="color:var(--muted)">Sign in to see your points.</li>';
    if(document.activeElement!==$("teamName"))$("teamName").value="";$("teamName").disabled=true;return;}
  $("teamName").disabled=false;
  if(!S.draft){
    $("rows").innerHTML='<div style="margin:auto;color:var(--chalk);text-align:center;max-width:30ch">'+(allLoaded()?(D.gws.length?"There’s no gameweek open for changes right now.":"Team picking opens once the admin has scheduled a Sunday."):"Loading…")+'</div>';
    ["fBank","fCount"].forEach(function(id){$(id).textContent="–";});
  }else{
    ["FWD","MID","DEF"].forEach(function(pos){
      var ids=S.draft.squad.filter(function(id){return S.players[id].pos===pos;});
      html+='<div class="row">';
      for(var i=0;i<need(pos);i++){var id=ids[i];
        if(id!=null){var p=S.players[id],cap=S.draft.captain===id;
          html+='<button class="slot" data-pid="'+esc(id)+'" aria-label="'+esc(p.name)+', '+POSN[p.pos]+(cap?", captain":"")+'">'+shirt(p.team,p.pos==="GK")+(cap?'<span class="cap">C</span>':"")+'<span class="plate"><span class="nm">'+esc(lastName(p.name))+'</span><span class="sub">'+esc(nextOpp(p.team))+', '+money(p.price)+'</span></span></button>';
        }else html+='<button class="slot empty" data-add="'+pos+'" aria-label="Add a '+POSN[pos]+'">'+emptyShirt()+'<span class="plate"><span class="nm">Add '+POSN[pos]+'</span></span></button>';
      }
      html+='</div>';
    });
    $("rows").innerHTML=html;
    var b=bank();$("fBank").textContent=money(b);$("fBank").className=b<0?"neg":"";
    $("fCount").textContent=S.draft.squad.length+"/"+SQUAD;
  }
  var tot=0;D.doneG.forEach(function(g){var p=gwPoints(g);if(p)tot+=p;});$("fPts").textContent=tot;
  var f=S.draft?S.draft.formation:FORMS[0];
  $("forms").innerHTML=FORMS.map(function(x){return '<button class="chipbtn" data-form="'+x+'" aria-pressed="'+(x===f)+'"'+(S.draft?"":" disabled")+'>'+x+'</button>';}).join("");
  var help="";
  if(S.draft){
    if(bank()<0)help="You’re "+money(-bank())+" over budget. Swap someone for a cheaper player.";
    else if(S.draft.squad.length<SQUAD)help="Tap an empty shirt to add a player. "+(SQUAD-S.draft.squad.length)+" to go.";
    else if(!complete())help="Tap a player and make them captain to finish your team.";
    else help="Team set for gameweek "+S.draftGW+". Captain: "+S.players[S.draft.captain].name+".";
  }
  $("teamHelp").textContent=help;
  $("saveNote").textContent="Your team saves automatically to your account.";
  var rows=D.doneG.slice().reverse().map(function(g){var p=gwPoints(g);return p==null?"":'<li><button data-report="'+g+'">Gameweek '+g+'</button><b>'+p+' pts</b></li>';}).filter(Boolean);
  $("hist").innerHTML=rows.length?rows.join(""):'<li style="color:var(--muted)">No points yet. They’ll show here once results come in for a gameweek you picked a team for.</li>';
  if(document.activeElement!==$("teamName"))$("teamName").value=S.fan.name||"";
}
function rowHTML(p){
  var mine=S.draft&&S.draft.squad.indexOf(p.id)>-1,w=whyNot(p),act;
  if(mine)act='<button class="btn ghost sm" data-remove="'+esc(p.id)+'">Remove</button>';
  else if(w)act='<span class="why">'+esc(w)+'</span>';
  else act='<button class="btn sm" data-addp="'+esc(p.id)+'">Add</button>';
  return '<div class="prow'+(mine?" mine":"")+'">'+shirt(p.team,p.pos==="GK","mini")+'<div class="who"><button data-pid="'+esc(p.id)+'">'+esc(p.name)+'</button><span>'+esc(T(p.team).name)+', '+POSN[p.pos]+'</span></div><span class="num">'+money(p.price)+'</span><span class="num pts-col">'+AG(p.id).pts+'</span><span class="act">'+act+'</span></div>';
}
function renderPlayers(){
  var sel=$("fTeam"),cur=sel.value;
  sel.innerHTML='<option value="">Both sides</option>'+D.teams.map(function(t){return '<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>';}).join("");sel.value=cur;
  var q=$("q").value.trim().toLowerCase(),fp=$("fPos").value,ft=sel.value,so=$("fSort").value;
  var list=D.players.filter(function(p){return(!fp||p.pos===fp)&&(!ft||p.team===ft)&&(!q||p.name.toLowerCase().indexOf(q)>-1);});
  var key={pts:function(p){return -AG(p.id).pts;},form:function(p){return -AG(p.id).form;},price:function(p){return -p.price;},cheap:function(p){return +p.price;},goals:function(p){return -AG(p.id).g;}}[so];
  list.sort(function(a,b){return key(a)-key(b)||a.name.localeCompare(b.name);});
  $("plist").innerHTML='<div class="prow head"><span></span><span>Player</span><span class="num">Price</span><span class="num pts-col">Pts</span><span></span></div>'+
    (list.length?list.map(rowHTML).join(""):'<div class="empty-note">'+(D.players.length?"No players match. Clear the search or filters to see everyone.":'No players registered yet. The admin adds them on the <a href="#admin">Admin</a> page.')+'</div>');
}
function gameChips(r,f){return '<div class="games">'+gamesOf(r).map(function(g,i){var c=g.h>g.a?"hw":g.a>g.h?"aw":"dr";return '<span class="gchip '+c+'" title="Game '+(i+1)+'">'+g.h+'–'+g.a+'</span>';}).join("")+'</div>';}
function sideList(r,tid){var st=r.stats||{},out=[];Object.keys(st).forEach(function(pid){var p=S.players[pid];if(p&&st[pid].side===tid&&+st[pid].g)out.push({n:lastName(p.name),g:+st[pid].g});});
  out.sort(function(a,b){return b.g-a.g;});return out.map(function(x){return esc(x.n)+(x.g>1?" "+x.g:"");}).join(", ")||"No scorers";}
function bonusBox(f){
  var r=f.result,B=D.bonus[f.gw]||{map:{},final:false,src:"open",total:0},closes=voteCloses(f.gw),open=voteOpen(f.gw);
  var names=function(m){return Object.keys(m).sort(function(a,b){return m[b]-m[a];}).map(function(k){return S.players[k]?'<b>'+esc(S.players[k].name)+'</b> +'+m[k]:"";}).filter(Boolean).join(", ");};
  if(B.final&&Object.keys(B.map).length)return '<div class="motm">Bonus: '+names(B.map)+(B.src==="vote"?' <span class="prov">('+B.total+' votes)</span>':'')+'</div>';
  if(!open)return '<div class="motm">Bonus: '+(B.src==="short"?"not enough votes, the admin will pick it.":"to be decided by the admin.")+'</div>';
  var st=r.stats||{},played=Object.keys(st).filter(function(k){return S.players[k];}).sort(function(a,b){return S.players[a].name.localeCompare(S.players[b].name);});
  var mine=S.myVotes[f.gw],vc=S.votes[f.gw]||{};
  var html='<div class="vote"><b>Vote for the bonus</b><p class="help" style="margin:2px 0 0">Who was best on Sunday? The top three get 3, 2 and 1 bonus points. Voting closes '+esc(fmtWhen(closes))+'.</p>';
  if(!USER)html+='<button class="btn sm" type="button" data-signin data-why="Sign in to vote for the bonus." style="margin-top:8px">Sign in to vote</button>';
  else html+='<form class="voteForm" data-gw="'+f.gw+'"><select name="pid" aria-label="Your vote"><option value="">Pick a player</option>'+played.map(function(k){return '<option value="'+esc(k)+'"'+(mine===k?" selected":"")+'>'+esc(S.players[k].name)+'</option>';}).join("")+'</select><button class="btn sm" type="submit">'+(mine?"Change vote":"Vote")+'</button></form>';
  if(mine){var ks=Object.keys(vc).filter(function(k){return st[k];}).sort(function(a,b){return vc[b]-vc[a];});
    html+='<ul class="vlist">'+ks.map(function(k){return '<li'+(k===mine?' class="me"':'')+'><span>'+esc(S.players[k].name)+(k===mine?" (your vote)":"")+'</span><b>'+vc[k]+'</b></li>';}).join("")+'</ul>';}
  return html+'</div>';
}
document.addEventListener("submit",async function(e){var form=e.target;if(!form.classList||!form.classList.contains("voteForm"))return;e.preventDefault();
  var gw=+form.dataset.gw,pid=form.elements.pid.value;if(!pid){toast("Pick a player first.");return;}
  busy(form,true);try{await castVote(gw,pid);renderAll();toast("Vote saved for "+S.players[pid].name);}
  catch(err){busy(form,false);toast(/row-level|42501/i.test(((err&&err.message)||"")+((err&&err.code)||""))?"Voting for this Sunday has closed.":"Couldn’t save your vote. Try again.");}});
function renderFixtures(){
  $("gwbar").innerHTML="";
  if(!D.fix.length){$("matches").innerHTML='<div class="empty-note">No Sundays scheduled yet. The admin sets them up on the <a href="#admin">Admin</a> page.</div>';return;}
  var rank=function(f){return f.gw===D.openGW?0:f.result?1:2;};
  var list=D.fix.slice().sort(function(a,b){var x=rank(a),y=rank(b);if(x!==y)return x-y;return x===1?(b.gw-a.gw):(a.gw-b.gw);});
  $("matches").innerHTML=list.map(function(f){
    var H=T(f.home),A=T(f.away),r=f.result,n=f.games||4,ds=r?dayScore(r):null;
    var mid=r?'<span class="score">'+ds.h+'–'+ds.a+'</span>':'<span class="score ko">'+esc(f.ko||"TBC")+'</span>';
    var body;
    if(r)body='<p class="help" style="margin:10px 0 0">Games won. Game scores:</p>'+gameChips(r,f)+'<div class="scorers"><div>'+sideList(r,f.home)+'</div><div>'+sideList(r,f.away)+'</div></div>'+bonusBox(f);
    else body='<div class="motm">'+n+' games of 15 minutes, first one at '+esc(f.ko||"TBC")+'</div>';
    return '<article class="match"><div class="sun">Gameweek '+f.gw+', '+esc(fmtDate(f.date))+(f.gw===D.openGW?'<span class="tag">Next up</span>':"")+'</div><div class="mline"><div class="t">'+shirt(f.home,false,"mini")+'<span>'+esc(H.name)+'</span></div>'+mid+'<div class="t away"><span>'+esc(A.name)+'</span>'+shirt(f.away,false,"mini")+'</div></div>'+body+'</article>';
  }).join("");
}
function renderStandings(){
  if(!D.teams.length){$("league").innerHTML='<div class="empty-note">No teams yet.</div>';$("leaders").innerHTML="";return;}
  $("league").innerHTML='<table><thead><tr><th>#</th><th>Side</th><th>Sundays</th><th>Won</th><th>Drawn</th><th>Lost</th><th>Games</th><th>Goals</th></tr></thead><tbody>'+D.series.map(function(r,i){return '<tr><td>'+(i+1)+'</td><td>'+esc(r.t.name)+'</td><td>'+r.p+'</td><td><b>'+r.w+'</b></td><td>'+r.d+'</td><td>'+r.l+'</td><td>'+r.gw+'–'+r.gl+'</td><td>'+r.f+'–'+r.a+'</td></tr>';}).join("")+'</tbody></table>';
  var top=D.players.filter(function(p){return AG(p.id).apps;}).sort(function(a,b){return AG(b.id).pts-AG(a.id).pts||AG(b.id).g-AG(a.id).g;}).slice(0,12);
  $("leaders").innerHTML=top.length?'<table><thead><tr><th>#</th><th>Player</th><th>Goals</th><th>Assists</th><th>Pts</th></tr></thead><tbody>'+top.map(function(p,i){var A=AG(p.id);return '<tr><td>'+(i+1)+'</td><td>'+esc(p.name)+'<small>'+esc(T(p.team).name)+', '+POSN[p.pos]+'</small></td><td>'+A.g+'</td><td>'+A.a+'</td><td><b>'+A.pts+'</b></td></tr>';}).join("")+'</tbody></table>':'<div class="empty-note">No results entered yet.</div>';
}

function playerSheet(id){
  var p=S.players[id];if(!p)return;var A=AG(id),mine=S.draft&&S.draft.squad.indexOf(id)>-1,w=whyNot(Object.assign({id:id},p));
  var recent=D.doneG.slice(-3).map(function(g){return '<tr><td></td><td>Gameweek '+g+'</td><td>'+(A.gw[g]!=null?A.gw[g]+' pts':'<span style="color:var(--muted)">Didn’t play</span>')+'</td></tr>';}).join("");
  var acts;
  if(mine)acts=(S.draft.captain===id?'<button class="btn" disabled>Captain</button>':'<button class="btn" data-captain="'+esc(id)+'">Make captain</button>')+'<button class="btn ghost" data-remove="'+esc(id)+'">Remove from team</button>';
  else acts=w?'<p class="help" style="margin:0">'+esc(w)+'.</p>':'<button class="btn" data-addp="'+esc(id)+'">Add to team</button>';
  openSheet(head(esc(p.name),esc(T(p.team).name)+", "+POSN[p.pos])+
    '<div class="statgrid"><div class="fact"><span>Price</span><b>'+money(p.price)+'</b></div><div class="fact"><span>Points</span><b>'+A.pts+'</b></div><div class="fact"><span>Goals</span><b>'+A.g+'</b></div><div class="fact"><span>Assists</span><b>'+A.a+'</b></div></div>'+
    '<p class="help" style="margin:0 0 12px">Played '+A.apps+' Sunday'+(A.apps===1?"":"s")+', on the winning side in '+A.wins+' games. '+(p.pos==="GK"||p.pos==="DEF"?A.cs+" clean-sheet games.":"")+'</p>'+
    (recent?'<table class="brk"><tbody>'+recent+'</tbody></table>':"")+'<div class="actions">'+acts+'</div>');
}
function pickerSheet(pos){
  var list=D.players.filter(function(p){return p.pos===pos;}).sort(function(a,b){return AG(b.id).pts-AG(a.id).pts||b.price-a.price;});
  openSheet(head("Add a "+POSN[pos],"Money left: "+money(bank())+". Sorted by points.")+'<div class="plist">'+(list.length?list.map(rowHTML).join(""):'<div class="empty-note">No '+POSN[pos]+'s registered yet.</div>')+'</div>');
}
function reportSheet(gw){
  var pk=picksFor(gw);if(!pk)return;var st=D.stat[gw]||{},tot=0;
  var rows=pk.squad.map(function(id){var p=S.players[id];if(!p)return "";var s=st[id],cap=id===pk.captain;
    if(!s)return '<tr><td>'+esc(p.name)+(cap?" (C)":"")+'<small class="dnp">Didn’t play</small></td><td>0</td></tr>';
    var bits=[];if(s.g)bits.push(s.g+" goal"+(s.g>1?"s":""));if(s.a)bits.push(s.a+" assist"+(s.a>1?"s":""));if(s.side!==p.team)bits.push("played for "+T(s.side).name);if(s.wins)bits.push(s.wins+" game"+(s.wins>1?"s":"")+" won");if(s.cs&&CSPTS[p.pos])bits.push(s.cs+" clean sheet"+(s.cs>1?"s":""));if(s.bonus)bits.push(s.bonus+" bonus");if(s.games)bits.unshift("played "+s.apps+" of "+s.games+" game"+(s.games>1?"s":""));if(s.y)bits.push("yellow");if(s.r)bits.push("red");
    var v=s.pts*(cap?2:1);tot+=v;return '<tr><td>'+esc(p.name)+(cap?" (C)":"")+'<small>'+(bits.join(", ")||"Played")+'</small></td><td><b>'+v+'</b></td></tr>';}).join("");
  openSheet(head("Gameweek "+gw+": "+tot+" pts",esc(fmtDate(D.gwInfo[gw]&&D.gwInfo[gw].date)))+'<table class="brk rep"><tbody>'+rows+'</tbody></table><p class="help">Captain’s points are doubled. Players who didn’t play score zero.'+((D.bonus[gw]&&!D.bonus[gw].final)?" Bonus points are added once voting closes.":"")+'</p><div class="actions"><button class="btn ghost" data-close>Done</button></div>');
}

function addPlayer(id){var p=S.players[id];if(!p||!S.draft)return;var w=whyNot(Object.assign({id:id},p));if(w){toast(w);return;}S.draft.squad.push(id);commitDraft();renderAll();toast(p.name+" added");}
function removePlayer(id){S.draft.squad=S.draft.squad.filter(function(x){return x!==id;});if(S.draft.captain===id)S.draft.captain=null;commitDraft();renderAll();toast(S.players[id].name+" removed");}
function setFormation(f){if(!S.draft)return;S.draft.formation=f;var removed=[];
  ["DEF","MID","FWD"].forEach(function(pos){while(have(pos)>need(pos)){var ids=S.draft.squad.filter(function(id){return S.players[id].pos===pos;}),drop=ids[ids.length-1];removed.push(lastName(S.players[drop].name));S.draft.squad=S.draft.squad.filter(function(x){return x!==drop;});if(S.draft.captain===drop)S.draft.captain=null;}});
  commitDraft();renderAll();if(removed.length)toast("Removed "+removed.join(" and ")+" to fit "+f);}
var newsFilter="all";
function fmtStamp(s){var d=new Date(s);return isNaN(d)?"":d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});}
function newsList(){return Object.keys(S.news||{}).map(function(k){return Object.assign({id:k},S.news[k]);}).sort(function(a,b){return String(b.at).localeCompare(String(a.at));});}
function paras(t){return String(t||"").split(/\n\s*\n/).filter(function(p){return p.trim();}).map(function(p){return '<p>'+esc(p.trim()).replace(/\n/g,"<br>")+'</p>';}).join("");}
function seriesOrder(){var h=D.fix[0]&&D.fix[0].home;return D.teams.slice().sort(function(a,b){return (a.id===h?-1:0)-(b.id===h?-1:0);});}
function renderNews(){
  var fav=S.fan.fav&&S.teams[S.fan.fav]?S.fan.fav:null;
  if(newsFilter!=="all"&&!S.teams[newsFilter])newsFilter="all";
  $("newsChips").innerHTML=[["all","All news"]].concat(D.teams.map(function(t){return [t.id,t.name];})).map(function(c){return '<button class="chipbtn" data-newsf="'+esc(c[0])+'" aria-pressed="'+(newsFilter===c[0])+'">'+esc(c[1])+(c[0]===fav?" (your side)":"")+'</button>';}).join("");
  var list=newsList().filter(function(n){return newsFilter==="all"||n.side===newsFilter;});
  $("newsList").innerHTML=list.length?list.map(function(n,i){var t=n.side&&S.teams[n.side];
    return '<article class="story'+(i===0?" lead":"")+'" style="--side:'+(t?okColor(t.color,"#888888"):"var(--line)")+'"><div class="story-meta">'+(t?'<span class="side-tag">'+esc(t.name)+'</span>':'')+'<span>'+esc(fmtStamp(n.at))+'</span></div><h2>'+esc(n.title)+'</h2>'+paras(n.body)+'</article>';}).join("")
    :'<div class="empty-note">'+(newsFilter==="all"?"No news yet. Check back after Sunday.":"No stories about this side yet.")+'</div>';
  var g=D.openGW,i=g!=null?D.gwInfo[g]:null;
  $("nNext").innerHTML=i?'<b>'+esc(fmtDate(i.date))+'</b><span>Gameweek '+g+'. First game at '+esc(i.ko)+', when team changes lock.</span>':'<span>No Sunday scheduled yet.</span>';
  var ord=seriesOrder(),ser={};(D.series||[]).forEach(function(r){ser[r.t.id]=r;});
  if(ord.length>=2){var a=ser[ord[0].id]||{w:0,d:0,p:0},b=ser[ord[1].id]||{w:0,d:0,p:0};
    $("nSeries").innerHTML='<div class="seriesline"><span>'+shirtColor(ord[0].color,"mini")+esc(ord[0].name)+'</span><span class="snum">'+a.w+'–'+b.w+'</span><span>'+esc(ord[1].name)+shirtColor(ord[1].color,"mini")+'</span></div><span class="help">'+(a.p?a.p+" Sunday"+(a.p>1?"s":"")+" played"+(a.d?", "+a.d+" drawn":"")+".":"The season starts this Sunday.")+'</span>';}
  else $("nSeries").innerHTML='<span class="help">Sides not set up yet.</span>';
  var tl;
  if(!USER)tl='<span class="help">Sign in to pick your team.</span><button class="btn sm" type="button" data-signin style="margin-top:10px">Sign in</button>';
  else if(!S.draft)tl='<span class="help">Team picking opens when a Sunday is scheduled.</span>';
  else{var n=S.draft.squad.length;tl='<b>'+esc(S.fan.name||"Your team")+'</b><span class="help">'+(n<SQUAD?n+" of "+SQUAD+" players picked.":(S.draft.captain?"Ready for gameweek "+S.draftGW+".":"Pick a captain to finish."))+'</span><a class="btn sm" href="#team" style="margin-top:10px;text-decoration:none">'+(n?"Edit your team":"Pick your team")+'</a>';}
  $("nTeam").innerHTML=tl;
  $("profileLine").innerHTML=!USER?"":(fav?'You support <b>'+esc(T(fav).name)+'</b>. ':'')+'<button class="linkbtn" type="button" data-profile>'+(S.fan.manager?"Edit profile":"Set up your profile")+'</button>';
  maybeOnboard();
}
function maybeOnboard(){
  if(!USER||!fanLoaded||onboarded||!allLoaded()||D.teams.length<1||sheetOpen())return;
  if(!S.fan.fav||!S.fan.manager){onboarded=true;profileSheet(true);}
}
function profileSheet(first){
  var f=S.fan;
  openSheet(head(first?"Welcome to Sunday Sevens Fantasy":"Your profile",first?"Tell us who you are before you pick your team.":"")+
    '<form class="form" id="profileForm"><div><label class="fld" for="pfName">Your name</label><input type="text" id="pfName" name="manager" maxlength="30" value="'+esc(f.manager||"")+'" placeholder="What should we call you?"></div>'+
    '<div><label class="fld" for="pfTeam">Fantasy team name</label><input type="text" id="pfTeam" name="team" maxlength="28" value="'+esc(f.name||"")+'" placeholder="Name your team"></div>'+
    '<fieldset class="favpick"><legend class="fld">Which side do you support?</legend>'+D.teams.map(function(t){return '<label class="fav"><input type="radio" name="fav" value="'+esc(t.id)+'"'+(f.fav===t.id?" checked":"")+'>'+shirtColor(t.color,"shirt")+'<span>'+esc(t.name)+'</span></label>';}).join("")+'</fieldset>'+
    '<p class="err"></p><div class="actions"><button class="btn" type="submit">'+(first?"Start playing":"Save profile")+'</button></div></form>');
}

function renderAll(){derive();renderHeader();renderTeam();renderPlayers();renderFixtures();renderStandings();renderNews();}

/* ---------- Events ---------- */
document.addEventListener("click",function(e){
  var t=e.target.closest&&e.target.closest("button");if(!t)return;var d=t.dataset;
  if(d.add){pickerSheet(d.add);return;}
  if(d.addp!=null){var inS=t.closest("#sheet");addPlayer(d.addp);if(inS)closeSheet();return;}
  if(d.remove!=null){removePlayer(d.remove);if(t.closest("#sheet"))closeSheet();return;}
  if(d.captain!=null){S.draft.captain=d.captain;commitDraft();renderAll();closeSheet();toast(S.players[d.captain].name+" is captain");return;}
  if(d.pid!=null){playerSheet(d.pid);return;}
  if(d.form){setFormation(d.form);return;}
  if(d.report){reportSheet(+d.report);return;}
  if(d.newsf){newsFilter=d.newsf;renderNews();return;}
  if(t.hasAttribute("data-profile")){profileSheet(false);return;}
  if(t.hasAttribute("data-acct")){accountSheet();return;}
});
document.addEventListener("submit",function(e){var form=e.target;if(form.id!=="profileForm")return;e.preventDefault();
  var m=form.elements.manager.value.trim(),tn=form.elements.team.value.trim(),c=form.querySelector("input[name=fav]:checked");
  if(!m)return formErr(form,"Enter your name.");if(!tn)return formErr(form,"Give your fantasy team a name.");if(!c)return formErr(form,"Pick the side you support.");
  S.fan.manager=m;S.fan.name=tn;S.fan.fav=c.value;saveProfile();closeSheet();renderAll();toast("Welcome, "+m);});
$("teamName").addEventListener("input",function(){S.fan.name=this.value;saveProfileSoon();});
["q","fPos","fTeam","fSort"].forEach(function(id){$(id).addEventListener("input",renderPlayers);});

/* ---------- Routing ---------- */
var VIEWS=["news","team","players","fixtures","standings","rules"];
function route(){var v=location.hash.replace("#","");if(VIEWS.indexOf(v)<0)v="news";
  VIEWS.forEach(function(x){$("v-"+x).classList.toggle("on",x===v);});
  document.querySelectorAll("nav a").forEach(function(a){if(a.dataset.view===v)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  window.scrollTo(0,0);}
window.addEventListener("hashchange",route);

/* ---------- Start ---------- */
route();renderAll();
watchAuth(async function(){fanLoaded=false;onboarded=false;await loadFan();await loadVotes();fanLoaded=true;renderAll();});
startData();
setInterval(function(){var before=D.openGW;derive();if(D.openGW!==before)renderAll();},60000);
