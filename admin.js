// Admin site: sides, players, Sundays, results and news. Only accounts listed in the admins table can make changes.
var sub="teams";
function teamOptions(sel,blank){return (blank?'<option value="">'+blank+'</option>':"")+D.teams.map(function(t){return '<option value="'+esc(t.id)+'"'+(t.id===sel?" selected":"")+'>'+esc(t.name)+'</option>';}).join("");}
function teamFormHTML(t){t=t||{};return '<div><label class="fld">Team name</label><input type="text" name="name" maxlength="40" required value="'+esc(t.name||"")+'"></div>'+
  '<div><label class="fld">Short code (3 letters, shown on the pitch)</label><input type="text" name="short" maxlength="4" required value="'+esc(t.short||"")+'" style="text-transform:uppercase"></div>'+
  '<div><label class="fld">Shirt colour</label><input type="color" name="color" value="'+okColor(t.color,"#3BA7E0")+'"><input type="hidden" name="gk" value="'+okColor(t.gk,"#F2C230")+'"></div>'+
  '<p class="err"></p>';}
function playerFormHTML(p){p=p||{};return '<div><label class="fld">Full name</label><input type="text" name="name" maxlength="40" required value="'+esc(p.name||"")+'"></div>'+
  '<div><label class="fld">Usual side</label><select name="team" required>'+teamOptions(p.team,"Choose a side")+'</select></div>'+
  '<div class="pair"><div><label class="fld">Position</label><select name="pos">'+POSL.map(function(x){return '<option value="'+x+'"'+(x===p.pos?" selected":"")+'>'+POSN[x].charAt(0).toUpperCase()+POSN[x].slice(1)+'</option>';}).join("")+'</select></div>'+
  '<div><label class="fld">Price (£m)</label><input type="number" name="price" min="3" max="15" step="0.5" required value="'+(p.price!=null?p.price:"5.0")+'"></div></div><p class="err"></p>';}
function fixFormHTML(f){f=f||{};var g=f.gw||(D.gws.length?D.gws[D.gws.length-1]+1:1);
  var h=f.home||(D.teams[0]&&D.teams[0].id),a=f.away||(D.teams[1]&&D.teams[1].id);
  return '<div class="pair"><div><label class="fld">Gameweek</label><input type="number" name="gw" min="1" max="99" required value="'+g+'"></div><div><label class="fld">Sunday</label><input type="date" name="date" required value="'+esc(f.date||nextSundayISO())+'"></div></div>'+
  '<div class="pair"><div><label class="fld">First game starts</label><input type="time" name="ko" required value="'+esc(f.ko||"09:00")+'"></div><div><label class="fld">Games that day</label><input type="number" name="games" min="1" max="10" value="'+(f.games||4)+'"></div></div>'+
  '<div class="pair"><div><label class="fld">Side one</label><select name="home" required>'+teamOptions(h,"Choose")+'</select></div>'+
  '<div><label class="fld">Side two</label><select name="away" required>'+teamOptions(a,"Choose")+'</select></div></div><p class="err"></p>';}
function renderAdmin(){
  var allowed=S.canEdit;
  $("adminBody").style.display=allowed?"":"none";
  $("adminLede").textContent=allowed?"Set up the two sides, register players, schedule Sundays and enter the four game scores after each one. Everyone playing the fantasy game sees changes straight away.":"Only league admins can change teams, players, fixtures and results. Ask whoever runs the league to give you editor access.";
  if(!allowed)return;
  document.querySelectorAll("[data-sub]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.sub===sub));});
  document.querySelectorAll("#adminBody .sub").forEach(function(s){s.style.display=s.id==="s-"+sub?"":"none";});
  // teams
  if(!$("teamForm").dataset.ready){$("teamForm").innerHTML=teamFormHTML()+'<button class="btn" type="submit">Add side</button>';$("teamForm").dataset.ready=1;}
  var pc={};D.players.forEach(function(p){pc[p.team]=(pc[p.team]||0)+1;});
  $("aTeams").innerHTML=D.teams.length?D.teams.map(function(t){return '<div class="arow">'+shirtColor(t.color)+'<div class="who"><b>'+esc(t.name)+'</b><span>'+esc(t.short)+', '+(pc[t.id]||0)+' players</span></div><div class="btns"><button class="btn ghost sm" data-editteam="'+esc(t.id)+'">Edit</button></div></div>';}).join(""):'<div class="empty-note">No sides yet. Add Wazee and Vijana with the form.</div>';
  // players
  var pf=$("playerForm");var keep=pf.elements.team?pf.elements.team.value:"";
  pf.innerHTML=playerFormHTML({team:keep,pos:pf.elements.pos?pf.elements.pos.value:"GK",price:pf.elements.price?pf.elements.price.value:"5.0",name:pf.elements.name?pf.elements.name.value:""})+'<button class="btn" type="submit">Add player</button>';
  var bt=$("bTeam"),bv=bt.value;bt.innerHTML=teamOptions(bv,"Choose a team");bt.value=bv;
  var at=$("aPTeam"),av=at.value;at.innerHTML=teamOptions(av,"All teams");at.value=av;
  var q=$("aPQ").value.trim().toLowerCase();
  var pl=D.players.filter(function(p){return(!at.value||p.team===at.value)&&(!q||p.name.toLowerCase().indexOf(q)>-1);})
    .sort(function(a,b){return T(a.team).name.localeCompare(T(b.team).name)||POSL.indexOf(a.pos)-POSL.indexOf(b.pos)||a.name.localeCompare(b.name);});
  $("aPlayers").innerHTML=pl.length?pl.map(function(p){return '<div class="arow">'+shirt(p.team,p.pos==="GK","mini")+'<div class="who"><b>'+esc(p.name)+'</b><span>'+esc(T(p.team).name)+', '+POSN[p.pos]+', '+money(p.price)+'</span></div><div class="btns"><button class="btn ghost sm" data-editplayer="'+esc(p.id)+'">Edit</button></div></div>';}).join(""):'<div class="empty-note">'+(D.teams.length?"No players here yet. Add them one at a time or paste a whole squad.":"Add a side first, then register its players.")+'</div>';
  // fixtures
  var ff=$("fixForm");if(!ff.dataset.ready||ff.dataset.teams!==String(D.teams.length)){ff.innerHTML=fixFormHTML()+'<button class="btn" type="submit">Add fixture</button>';ff.dataset.ready=1;ff.dataset.teams=String(D.teams.length);}
  if(!D.fix.length){$("aFix").innerHTML='<div class="empty-note">'+(D.teams.length>1?"No Sundays scheduled yet. Add one, or schedule a run of Sundays.":"Add both sides before setting up Sundays.")+'</div>';return;}
  var html="",last=null;
  D.fix.forEach(function(f){
    if(f.gw!==last){last=f.gw;var i=D.gwInfo[f.gw];html+='<div class="gwhead">Gameweek '+f.gw+(i.date?", "+esc(fmtDate(i.date)):"")+'<span class="tag'+(i.done===i.n?" done":"")+'">'+(i.done===i.n?"Result in":"Awaiting result")+'</span></div>';}
    var r=f.result,ds=r?dayScore(r):null;
    html+='<div class="frow"><div class="m">'+esc(T(f.home).name)+' '+(r?ds.h+'–'+ds.a:"v")+' '+esc(T(f.away).name)+'<span>'+(f.games||4)+' games from '+esc(f.ko||"")+(r?", game scores "+gamesOf(r).map(function(g){return g.h+"–"+g.a;}).join(", "):"")+'</span></div><div class="btns" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><button class="btn sm'+(r?" ghost":"")+'" data-result="'+esc(f.id)+'">'+(r?"Edit result":"Enter result")+'</button><button class="btn ghost sm" data-editfix="'+esc(f.id)+'">Edit</button></div></div>';
  });
  $("aFix").innerHTML=html;
}

function readTeam(form,selfId){
  var name=form.elements.name.value.trim(),short=form.elements.short.value.trim().toUpperCase();
  if(!name)return {err:"Enter a team name."};
  if(!/^[A-Z0-9]{2,4}$/.test(short))return {err:"Use 2 to 4 letters or numbers for the short code."};
  var clash=D.teams.filter(function(t){return t.id!==selfId&&(t.short===short||t.name.toLowerCase()===name.toLowerCase());})[0];
  if(clash)return {err:clash.short===short?"Another team already uses "+short+".":"There’s already a team called "+clash.name+"."};
  return {data:{name:name,short:short,color:okColor(form.elements.color.value,"#3BA7E0"),gk:okColor(form.elements.gk.value,"#F2C230")}};
}
function readPlayer(form){
  var name=form.elements.name.value.trim(),team=form.elements.team.value,pos=form.elements.pos.value,price=Math.round(parseFloat(form.elements.price.value)*2)/2;
  if(!name)return {err:"Enter the player’s name."};
  if(!S.teams[team])return {err:"Choose the player’s usual side."};
  if(POSL.indexOf(pos)<0)return {err:"Choose a position."};
  if(!(price>=3&&price<=15))return {err:"Set a price between £3.0m and £15.0m."};
  return {data:{name:name,team:team,pos:pos,price:price}};
}
function readFix(form){
  var gw=parseInt(form.elements.gw.value,10),date=form.elements.date.value,ko=form.elements.ko.value,games=parseInt(form.elements.games.value,10)||4,home=form.elements.home.value,away=form.elements.away.value;
  if(!(gw>=1))return {err:"Enter a gameweek number."};
  if(!date)return {err:"Choose the Sunday."};
  if(!ko)return {err:"Set the time of the first game."};
  if(!(games>=1&&games<=10))return {err:"Set between 1 and 10 games."};
  if(!S.teams[home]||!S.teams[away])return {err:"Choose both sides."};
  if(home===away)return {err:"Pick two different sides."};
  return {data:{gw:gw,date:date,ko:ko,games:games,home:home,away:away}};
}

function teamSheet(id){var t=S.teams[id];openSheet(head("Edit "+esc(t.name))+'<form class="form" id="editTeamForm" data-id="'+esc(id)+'">'+teamFormHTML(t)+'<div class="actions"><button class="btn" type="submit">Save changes</button><button class="btn danger" type="button" data-delteam="'+esc(id)+'">Delete team</button></div></form>');}
function playerEditSheet(id){var p=S.players[id];openSheet(head("Edit "+esc(p.name))+'<form class="form" id="editPlayerForm" data-id="'+esc(id)+'">'+playerFormHTML(p)+'<div class="actions"><button class="btn" type="submit">Save changes</button><button class="btn danger" type="button" data-delplayer="'+esc(id)+'">Delete player</button></div></form>');}
function fixSheet(id){var f=S.fixtures[id];openSheet(head("Edit fixture")+'<form class="form" id="editFixForm" data-id="'+esc(id)+'">'+fixFormHTML(f)+(f.result?'<p class="help" style="margin:0">This match has a result. Changing the teams clears it.</p>':"")+'<div class="actions"><button class="btn" type="submit">Save changes</button><button class="btn danger" type="button" data-delfix="'+esc(id)+'">Delete fixture</button></div></form>');}

function resultSheet(id){
  var f=S.fixtures[id],r=f.result||{},st=r.stats||{},n=Math.max(f.games||4,gamesOf(r).length),gs=gamesOf(r),H=T(f.home),A=T(f.away);
  var rows="";for(var i=0;i<n;i++){var g=gs[i]||{};rows+='<div class="grow"><span>Game '+(i+1)+'</span><input type="number" min="0" max="30" data-gh="'+i+'" aria-label="Game '+(i+1)+' '+esc(H.name)+'" value="'+(g.h!=null?g.h:"")+'"><span>–</span><input type="number" min="0" max="30" data-ga="'+i+'" aria-label="Game '+(i+1)+' '+esc(A.name)+'" value="'+(g.a!=null?g.a:"")+'"></div>';}
  var pl=D.players.slice().sort(function(a,b){return T(a.team).name.localeCompare(T(b.team).name)||POSL.indexOf(a.pos)-POSL.indexOf(b.pos)||a.name.localeCompare(b.name);});
  var prow=pl.map(function(p){var x=st[p.id],side=x?x.side:(f.result?"":(p.team===f.home||p.team===f.away?p.team:""));x=x||{};
    return '<div class="stat-row" data-sp="'+esc(p.id)+'" data-usual="'+esc(p.team)+'"><span class="pn">'+esc(p.name)+'<small>'+p.pos+'</small></span><select data-k="side" aria-label="'+esc(p.name)+' played for"><option value="">Didn’t play</option><option value="'+esc(f.home)+'"'+(side===f.home?" selected":"")+'>'+esc(H.name)+'</option><option value="'+esc(f.away)+'"'+(side===f.away?" selected":"")+'>'+esc(A.name)+'</option></select><input type="number" min="0" max="30" data-k="g" aria-label="'+esc(p.name)+' goals" value="'+(+x.g||0)+'"><input type="number" min="0" max="30" data-k="a" aria-label="'+esc(p.name)+' assists" value="'+(+x.a||0)+'"><input type="checkbox" data-k="y" aria-label="'+esc(p.name)+' yellow card"'+(x.y?" checked":"")+'><input type="checkbox" data-k="r" aria-label="'+esc(p.name)+' red card"'+(x.r?" checked":"")+'></div>';}).join("");
  openSheet(head("Sunday’s results","Gameweek "+f.gw+", "+esc(fmtDate(f.date)))+
    '<form class="form" id="resultForm" data-id="'+esc(id)+'"><div class="grow hd"><span></span><span>'+esc(H.short)+'</span><span></span><span>'+esc(A.short)+'</span></div>'+rows+
    '<p class="help" style="margin:0">Leave a game blank if it wasn’t played.</p>'+
    '<div class="res-team"><h3>Who played</h3><p class="help" style="margin:0 0 8px">Everyone starts on their usual side. Change it for anyone who switched, and set “Didn’t play” for anyone who missed it. Goals and assists are totals for the whole day.</p>'+
    '<div class="stat-row hd"><span>Player</span><span>Played for</span><span>Goals</span><span>Assists</span><span>Yel</span><span>Red</span></div>'+(prow||'<p class="help">No players registered yet.</p>')+'</div>'+
    '<div><label class="fld" for="motm">Man of the match</label><select id="motm" name="motm"><option value="">Not chosen</option>'+pl.map(function(p){return '<option value="'+esc(p.id)+'"'+(r.motm===p.id?" selected":"")+'>'+esc(p.name)+'</option>';}).join("")+'</select></div>'+
    '<p class="err"></p><div class="actions"><button class="btn" type="submit">Save results</button>'+(f.result?'<button class="btn danger" type="button" data-clearres="'+esc(id)+'">Clear results</button>':"")+'</div></form>');
}
function genSheet(){
  var start=D.gws.length?D.gws[D.gws.length-1]+1:1,last=D.fix.length?D.fix[D.fix.length-1].date:null,d0=nextSundayISO();
  if(last&&last>=d0){var d=new Date(last+"T12:00:00");d.setDate(d.getDate()+7);d0=iso(d);}
  openSheet(head("Schedule Sundays","One gameweek per Sunday, "+esc(D.teams[0].name)+" v "+esc(D.teams[1].name)+"."+(D.fix.length?" Adds after the "+D.fix.length+" already scheduled.":""))+
    '<form class="form" id="genForm"><div class="pair"><div><label class="fld">First gameweek number</label><input type="number" name="gw" min="1" value="'+start+'" required></div><div><label class="fld">First Sunday</label><input type="date" name="date" value="'+d0+'" required></div></div>'+
    '<div class="pair"><div><label class="fld">How many Sundays</label><input type="number" name="count" min="1" max="52" value="10" required></div><div><label class="fld">Games each Sunday</label><input type="number" name="games" min="1" max="10" value="4" required></div></div>'+
    '<div class="pair"><div><label class="fld">First game starts</label><input type="time" name="ko" value="09:00" required></div><div><label class="fld">Skip a week between?</label><select name="every"><option value="7">No, every Sunday</option><option value="14">Yes, every other Sunday</option></select></div></div>'+
    '<p class="err"></p><div class="actions"><button class="btn" type="submit">Schedule Sundays</button></div></form>');
}
function roundRobin(ids){var a=ids.slice();if(a.length%2)a.push(null);var n=a.length,rounds=[];for(var r=0;r<n-1;r++){var m=[];for(var i=0;i<n/2;i++){var x=a[i],y=a[n-1-i];if(x&&y)m.push(r%2?[y,x]:[x,y]);}rounds.push(m);a.splice(1,0,a.pop());}return rounds;}
document.addEventListener("submit",async function(e){
  var form=e.target;if(!/^(teamForm|editTeamForm|playerForm|editPlayerForm|bulkForm|fixForm|editFixForm|resultForm|genForm)$/.test(form.id))return;e.preventDefault();if(!SB){toast("Connect Supabase in config.js first.");return;}
  formErr(form,"");
  try{
    if(form.id==="teamForm"||form.id==="editTeamForm"){
      var id=form.dataset.id||null,r=readTeam(form,id);if(r.err)return formErr(form,r.err);
      busy(form,true);await put("teams",id,r.data);busy(form,false);
      if(id){closeSheet();toast(r.data.name+" saved");}else{form.reset();form.elements.color.value="#3BA7E0";form.elements.gk.value="#F2C230";toast(r.data.name+" added");}
    }else if(form.id==="playerForm"||form.id==="editPlayerForm"){
      var pid=form.dataset.id||null,rp=readPlayer(form);if(rp.err)return formErr(form,rp.err);
      busy(form,true);await put("players",pid,rp.data);busy(form,false);
      if(pid){closeSheet();toast(rp.data.name+" saved");}else{form.elements.name.value="";form.elements.name.focus();toast(rp.data.name+" added");}
    }else if(form.id==="bulkForm"){
      var team=form.elements.team.value;if(!S.teams[team])return formErr(form,"Choose the team these players belong to.");
      var lines=form.elements.list.value.split(/\n/).map(function(l){return l.trim();}).filter(Boolean),rows=[],bad=[];
      var alias={GK:"DEF",GOALKEEPER:"DEF",KEEPER:"DEF",DEF:"DEF",DEFENDER:"DEF",D:"DEF",MID:"MID",MIDFIELDER:"MID",M:"MID",FWD:"FWD",FORWARD:"FWD",STRIKER:"FWD",F:"FWD",ST:"FWD"};
      lines.forEach(function(l,i){var parts=l.split(",").map(function(x){return x.trim();});var pos=alias[(parts[1]||"").toUpperCase()],price=Math.round(parseFloat(parts[2])*2)/2;
        if(!parts[0]||!pos||!(price>=3&&price<=15))bad.push(i+1);else rows.push({name:parts[0],team:team,pos:pos,price:price});});
      if(!lines.length)return formErr(form,"Paste at least one player.");
      if(bad.length)return formErr(form,"Check line"+(bad.length>1?"s ":" ")+bad.join(", ")+". Each line needs a name, a position (DEF, MID or FWD) and a price between 3 and 15.");
      busy(form,true);for(var i=0;i<rows.length;i++)await put("players",null,rows[i]);busy(form,false);
      form.elements.list.value="";toast(rows.length+" player"+(rows.length>1?"s":"")+" added to "+T(team).name);
    }else if(form.id==="fixForm"||form.id==="editFixForm"){
      var fid=form.dataset.id||null,rf=readFix(form);if(rf.err)return formErr(form,rf.err);
      var clash=D.fix.filter(function(x){return x.id!==fid&&x.gw===rf.data.gw&&[x.home,x.away].some(function(t){return t===rf.data.home||t===rf.data.away;});})[0];
      if(clash)return formErr(form,"One of these teams already plays in gameweek "+rf.data.gw+".");
      if(fid){var old=S.fixtures[fid];if(old.result&&old.home===rf.data.home&&old.away===rf.data.away)rf.data.result=old.result;}
      busy(form,true);await put("fixtures",fid,rf.data);busy(form,false);
      if(fid){closeSheet();toast("Fixture saved");}else toast(T(rf.data.home).name+" v "+T(rf.data.away).name+" added");
    }else if(form.id==="resultForm"){
      var xid=form.dataset.id,f=S.fixtures[xid],games=[],bad=false;
      form.querySelectorAll("[data-gh]").forEach(function(el){var i=+el.dataset.gh,av=form.querySelector('[data-ga="'+i+'"]').value,hv=el.value;
        if(hv===""&&av==="")return;if(hv===""||av===""){bad=true;return;}games.push({h:parseInt(hv,10)||0,a:parseInt(av,10)||0});});
      if(bad)return formErr(form,"Each game needs a score for both sides, or leave both blank.");
      if(!games.length)return formErr(form,"Enter the score of at least one game.");
      var stats={},gh=0,ga=0,th=0,ta=0;games.forEach(function(g){th+=g.h;ta+=g.a;});
      form.querySelectorAll("[data-sp]").forEach(function(row){var pid=row.dataset.sp,side=row.querySelector('[data-k=side]').value;if(!side)return;
        var g=parseInt(row.querySelector('[data-k=g]').value,10)||0,a=parseInt(row.querySelector('[data-k=a]').value,10)||0;
        stats[pid]={side:side,g:g,a:a,y:row.querySelector('[data-k=y]').checked?1:0,r:row.querySelector('[data-k=r]').checked?1:0};
        if(side===f.home)gh+=g;else ga+=g;});
      var motm=form.elements.motm.value||null;
      if(motm&&!stats[motm])return formErr(form,"Man of the match is marked as not playing. Set which side they played for.");
      if(gh>th||ga>ta)return formErr(form,"More goals are credited to players than were scored. "+T(f.home).short+" "+gh+" of "+th+", "+T(f.away).short+" "+ga+" of "+ta+".");
      var body=clone(f);body.games=Math.max(f.games||4,games.length);body.result={games:games,stats:stats,motm:motm};
      busy(form,true);await put("fixtures",xid,body);busy(form,false);closeSheet();var ds=dayScore(body.result);toast("Saved: "+T(f.home).short+" "+ds.h+"–"+ds.a+" "+T(f.away).short+" in games won");
    }else if(form.id==="genForm"){
      var g0=parseInt(form.elements.gw.value,10),d0=form.elements.date.value,ko=form.elements.ko.value,count=parseInt(form.elements.count.value,10)||0,ng=parseInt(form.elements.games.value,10)||4,every=+form.elements.every.value||7;
      if(D.teams.length<2)return formErr(form,"Add both sides first.");
      if(!(g0>=1)||!d0||!ko||!(count>=1&&count<=52))return formErr(form,"Fill in the gameweek, Sunday, time and how many Sundays (up to 52).");
      var taken=D.gws.filter(function(g){return g>=g0&&g<g0+count;});
      if(taken.length)return formErr(form,"Gameweek "+taken[0]+" already exists. Start from gameweek "+(D.gws[D.gws.length-1]+1)+".");
      busy(form,true);form.querySelector("[type=submit]").textContent="Scheduling "+count+" Sundays…";
      for(var k=0;k<count;k++){var d=new Date(d0+"T12:00:00");d.setDate(d.getDate()+k*every);await put("fixtures",null,{gw:g0+k,date:iso(d),ko:ko,games:ng,home:D.teams[0].id,away:D.teams[1].id});}
      closeSheet();toast(count+" Sundays scheduled");
    }
  }catch(err){busy(form,false);formErr(form,writeErr(err));}
});

document.addEventListener("input",function(e){
  var row=e.target.closest&&e.target.closest("[data-sp]");
  if(row&&e.target.dataset.k!=="side"){var v=e.target.type==="checkbox"?e.target.checked:(parseInt(e.target.value,10)||0)>0,sel=row.querySelector("[data-k=side]");
    if(v&&!sel.value){var u=row.dataset.usual;sel.value=[].some.call(sel.options,function(o){return o.value===u;})?u:sel.options[1].value;}}
});
function newsFormHTML(n){n=n||{};return '<div><label class="fld">Headline</label><input type="text" name="title" maxlength="90" value="'+esc(n.title||"")+'"></div>'+
  '<div><label class="fld">About</label><select name="side"><option value="">Both sides</option>'+D.teams.map(function(t){return '<option value="'+esc(t.id)+'"'+(n.side===t.id?" selected":"")+'>'+esc(t.name)+'</option>';}).join("")+'</select></div>'+
  '<div><label class="fld">Story</label><textarea name="body" placeholder="Leave a blank line between paragraphs.">'+esc(n.body||"")+'</textarea></div><p class="err"></p>';}
function renderAdminNews(){
  if(!S.canEdit)return;var nf=$("newsForm"),key=D.teams.map(function(t){return t.id+":"+t.name;}).join("|");
  if(nf.dataset.teams!==key){var keep={title:nf.elements.title?nf.elements.title.value:"",body:nf.elements.body?nf.elements.body.value:"",side:nf.elements.side?nf.elements.side.value:""};nf.innerHTML=newsFormHTML(keep)+'<button class="btn" type="submit">Post story</button>';nf.dataset.teams=key;}
  var l=newsList();
  $("aNews").innerHTML=l.length?l.map(function(n){var t=n.side&&S.teams[n.side];return '<div class="arow">'+(t?shirtColor(t.color):'<span></span>')+'<div class="who"><b>'+esc(n.title)+'</b><span>'+esc(fmtStamp(n.at))+(t?", about "+esc(t.name):"")+'</span></div><div class="btns"><button class="btn ghost sm" data-editnews="'+esc(n.id)+'">Edit</button><button class="btn ghost sm" data-delnews="'+esc(n.id)+'">Delete</button></div></div>';}).join(""):'<div class="empty-note">No stories yet. Post the first one with the form.</div>';
}

/* ---------- Access ---------- */
S.authChecked=false;
async function checkAdmin(u){S.canEdit=false;S.authChecked=false;renderAll();
  if(u&&SB){try{var q=await SB.from("admins").select("user_id").eq("user_id",u.id).maybeSingle();S.canEdit=!!(q.data);}catch(e){}}
  S.authChecked=true;renderAll();}
function renderGate(){
  var g=$("gate"),body=$("adminBody"),acct=$("acct");
  acct.innerHTML=USER?'<button class="switch" type="button" data-signout>Sign out</button>':'';
  var show=false;
  if(!SB)g.innerHTML='<div class="panel gate"><h2>Connect Supabase first</h2><p>Open <code>config.js</code> and paste in your Supabase project URL and anon key, then reload. The README walks you through it.</p></div>';
  else if(!S.authChecked)g.innerHTML='<p class="help">Checking your account…</p>';
  else if(!USER)g.innerHTML='<div class="panel gate"><h2>Admin sign in</h2><form class="form" id="adminLogin" autocomplete="on"><div><label class="fld" for="alUser">Username</label><input type="text" id="alUser" name="username" autocomplete="username" required></div><div><label class="fld" for="alPass">Password</label><input type="password" id="alPass" name="password" autocomplete="current-password" required style="width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:6px;background:var(--paper)"></div><p class="err"></p><button class="btn" type="submit">Sign in</button></form></div>';
  else if(!S.canEdit)g.innerHTML='<div class="panel gate"><h2>This account isn’t an admin yet</h2><p>You’re signed in as <b>'+esc(USER.email||"")+'</b>. To make it an admin, open the SQL editor in Supabase and run:</p><pre class="code">insert into public.admins (user_id)\nvalues (\''+esc(USER.id)+'\');</pre><p class="help">Then reload this page.</p><button class="btn ghost" type="button" data-signout style="margin-top:8px">Sign out</button></div>';
  else{g.innerHTML="";show=true;}
  body.style.display=show?"":"none";$("adminLede").style.display=show?"":"none";
}
function renderAll(){derive();renderAdmin();renderAdminNews();renderGate();}

/* ---------- Username and password sign-in ----------
   Usernames map to Supabase accounts. The password is checked by Supabase and is never stored in this code. */
var ADMIN_DOMAIN="sundaysevens.app";
function adminEmail(u){u=String(u||"").trim().toLowerCase();return u.indexOf("@")>-1?u:u+"@"+ADMIN_DOMAIN;}
document.addEventListener("submit",async function(e){
  if(e.target.id!=="adminLogin")return;e.preventDefault();
  var f=e.target,u=f.elements.username.value,pw=f.elements.password.value;
  if(!u.trim()||!pw)return formErr(f,"Enter your username and password.");
  busy(f,true);
  try{var r=await SB.auth.signInWithPassword({email:adminEmail(u),password:pw});if(r.error)throw r.error;}
  catch(err){busy(f,false);f.elements.password.value="";formErr(f,"Wrong username or password.");}
});

/* ---------- Events ---------- */
document.addEventListener("click",function(e){
  var t=e.target.closest&&e.target.closest("button");if(!t)return;var d=t.dataset;
  if(d.sub){sub=d.sub;renderAdmin();return;}
  if(d.editteam){teamSheet(d.editteam);return;}
  if(d.editplayer){playerEditSheet(d.editplayer);return;}
  if(d.editfix){fixSheet(d.editfix);return;}
  if(d.result){resultSheet(d.result);return;}
  if(t.id==="genBtn"){if(D.teams.length<2){toast("Add both sides first");return;}genSheet();return;}
  if(d.delteam){var tid=d.delteam,np=D.players.filter(function(p){return p.team===tid;}).length,nf=D.fix.filter(function(f){return f.home===tid||f.away===tid;}).length;
    if(np||nf){toast("Move or delete its "+np+" players and "+nf+" fixtures first");return;}
    confirmDelete("Delete "+S.teams[tid].name+"? This can’t be undone.",function(){return del("teams",tid).then(function(){toast("Team deleted");});});return;}
  if(d.delplayer){var did=d.delplayer,used=D.fix.some(function(f){return f.result&&f.result.stats&&f.result.stats[did];});
    confirmDelete("Delete "+S.players[did].name+"?"+(used?" Their points in past results will be lost.":"")+" This can’t be undone.",function(){return del("players",did).then(function(){toast("Player deleted");});});return;}
  if(d.delfix){var xid=d.delfix;confirmDelete("Delete this Sunday"+(S.fixtures[xid].result?" and its results":"")+"? This can’t be undone.",function(){return del("fixtures",xid).then(function(){toast("Sunday deleted");});});return;}
  if(d.clearres){var cid=d.clearres;confirmDelete("Clear this Sunday’s results? Fantasy points from it will be removed.",function(){var b=clone(S.fixtures[cid]);delete b.result;return put("fixtures",cid,b).then(function(){toast("Result cleared");});});return;}
  if(d.editnews){var n=S.news[d.editnews];if(!n)return;openSheet(head("Edit story")+'<form class="form" id="editNewsForm" data-id="'+esc(d.editnews)+'">'+newsFormHTML(n)+'<div class="actions"><button class="btn" type="submit">Save changes</button></div></form>');return;}
  if(d.delnews){var id=d.delnews;confirmDelete("Delete the story “"+(S.news[id]?S.news[id].title:"")+"”? This can’t be undone.",function(){return del("news",id).then(function(){toast("Story deleted");});});return;}
});
document.addEventListener("submit",async function(e){var form=e.target;
  if(form.id!=="newsForm"&&form.id!=="editNewsForm")return;e.preventDefault();if(!SB)return;
  var id=form.dataset.id||null,ti=form.elements.title.value.trim(),bo=form.elements.body.value.trim(),sd=form.elements.side.value;
  if(!ti)return formErr(form,"Write a headline.");if(!bo)return formErr(form,"Write the story.");
  var data={title:ti,body:bo,side:S.teams[sd]?sd:"",at:id&&S.news[id]?S.news[id].at:new Date().toISOString()};
  try{busy(form,true);await put("news",id,data);busy(form,false);if(id){closeSheet();toast("Story saved");}else{form.elements.title.value="";form.elements.body.value="";toast("Story posted");}}
  catch(err){busy(form,false);formErr(form,writeErr(err));}
});
["aPTeam","aPQ"].forEach(function(id){$(id).addEventListener("input",renderAdmin);});

/* ---------- Start ---------- */
renderAll();
watchAuth(function(u){checkAdmin(u);});
startData();
