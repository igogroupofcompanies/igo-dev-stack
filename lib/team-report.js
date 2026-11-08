'use strict';
// Builds a self-contained HTML dashboard of team Claude Code activity from the team folder.
const fs = require('fs');
const path = require('path');
const A = require('./activity');

const BUCKET_MIN = 5;   // a member counts as "active" in any 5-minute slot with at least one event

function readEvents(roots, days, privPem) {
  const since = Date.now() - days * 864e5;
  const events = [];
  const members = {};
  const stats = { files: 0, encrypted: 0, undecryptable: 0 };
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => path.join(root, d.name));
    if (root === A.LOCAL_DIR) dirs.push(root);
    for (const d of dirs) {
      try { const m = JSON.parse(fs.readFileSync(path.join(d, '_member.json'), 'utf8')); members[m.member + '@' + m.host] = m; } catch (_) {}
      for (const f of fs.readdirSync(d).filter(f => /^\d{4}-\d{2}-\d{2}\.jsonl(\.enc)?$/.test(f))) {
        if (new Date(f.slice(0, 10)).getTime() < since - 864e5) continue;
        let text = '';
        stats.files++;
        if (f.endsWith('.enc')) {
          stats.encrypted++;
          if (!privPem) { stats.undecryptable++; continue; }
          try { text = require('./teamcrypto').decrypt(fs.readFileSync(path.join(d, f), 'utf8'), privPem).toString('utf8'); } catch (_) { stats.undecryptable++; continue; }
        } else text = fs.readFileSync(path.join(d, f), 'utf8');
        for (const line of text.split('\n')) {
          if (!line) continue;
          try { const e = JSON.parse(line); if (new Date(e.ts).getTime() >= since) events.push(e); } catch (_) {}
        }
      }
    }
  }
  // de-duplicate (local + team copies)
  const seen = new Set();
  const out = events.filter(e => { const k = e.ts + e.member + e.host + e.event + (e.detail || '').slice(0, 40); if (seen.has(k)) return false; seen.add(k); return true; });
  out.sort((a, b) => a.ts.localeCompare(b.ts));
  return { events: out, members, stats };
}

function html(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>IGO Team Activity</title>
<style>
:root{--bg:#f4f6f8;--panel:#ffffff;--panel2:#f9fafb;--fg:#101828;--mut:#667085;--mut2:#98a2b3;--line:#e4e7ec;--acc:#1f7a4d;--acc2:#e8f4ee;--warn:#b54708;--warnbg:#fff6e6;--bad:#c01048;--badbg:#fff1f3;--ok:#12b76a;--shadow:0 1px 2px rgba(16,24,40,.06),0 1px 3px rgba(16,24,40,.08);
--h0:#eef2f0;--h1:#cfe8da;--h2:#97cfb0;--h3:#4fa877;--h4:#1f7a4d;--radius:14px}
:root[data-theme=dark]{--bg:#0c1014;--panel:#141a20;--panel2:#10151a;--fg:#e7ebef;--mut:#9aa4b2;--mut2:#6b7684;--line:#232b34;--acc:#4cc38a;--acc2:#16271f;--warn:#fdb022;--warnbg:#2a2110;--bad:#fd6f8e;--badbg:#2b1219;--ok:#32d583;--shadow:none;--h0:#18201c;--h1:#1d3a2b;--h2:#25603f;--h3:#33925c;--h4:#4cc38a}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0c1014;--panel:#141a20;--panel2:#10151a;--fg:#e7ebef;--mut:#9aa4b2;--mut2:#6b7684;--line:#232b34;--acc:#4cc38a;--acc2:#16271f;--warn:#fdb022;--warnbg:#2a2110;--bad:#fd6f8e;--badbg:#2b1219;--ok:#32d583;--shadow:none;--h0:#18201c;--h1:#1d3a2b;--h2:#25603f;--h3:#33925c;--h4:#4cc38a}}
*{box-sizing:border-box}html,body{margin:0}body{font:14px/1.45 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased}
button,select,input{font:inherit;color:inherit}
.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.top .in{max-width:1440px;margin:auto;padding:12px 20px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.logo{width:34px;height:34px;border-radius:9px;background:var(--acc);color:#fff;display:grid;place-items:center;font-weight:800;font-size:12px;letter-spacing:.5px}
.ttl h1{margin:0;font-size:17px;font-weight:700}.ttl div{color:var(--mut);font-size:12px}
.sp{flex:1}
.seg{display:flex;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:3px;gap:2px}
.seg button{border:0;background:none;padding:6px 11px;border-radius:7px;cursor:pointer;color:var(--mut);font-weight:500}
.seg button.on{background:var(--acc2);color:var(--acc)}
.btn{border:1px solid var(--line);background:var(--panel);border-radius:10px;padding:7px 12px;cursor:pointer;font-weight:500;display:inline-flex;gap:6px;align-items:center}
.btn:hover{border-color:var(--mut2)}
.layout{max-width:1440px;margin:auto;padding:18px 20px 40px;display:grid;grid-template-columns:270px minmax(0,1fr);gap:18px}.layout>*{min-width:0}main{min-width:0}
.side{position:sticky;top:76px;align-self:start;max-height:calc(100vh - 96px);overflow:auto}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow)}
.side .panel{padding:8px}
.side input{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:9px;background:var(--panel2);margin-bottom:6px}
.mem{display:flex;gap:10px;align-items:center;padding:8px;border-radius:10px;cursor:pointer;border:1px solid transparent}
.mem:hover{background:var(--panel2)}.mem.on{background:var(--acc2);border-color:color-mix(in srgb,var(--acc) 35%,transparent)}
.av{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:12px;color:#fff;position:relative;flex:none}
.av i{position:absolute;right:-1px;bottom:-1px;width:11px;height:11px;border-radius:50%;border:2px solid var(--panel)}
.mem .nm{font-weight:600;line-height:1.2}.mem .st{font-size:12px;color:var(--mut)}.mem .tm{margin-left:auto;text-align:right;font-weight:600;font-size:13px}
.mem .tm small{display:block;color:var(--mut);font-weight:400;font-size:11px}
.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
.kpi{padding:14px 16px}.kpi .l{color:var(--mut);font-size:12px;font-weight:500}.kpi .v{font-size:24px;font-weight:700;margin-top:4px;letter-spacing:-.3px}.kpi .s{font-size:12px;color:var(--mut);margin-top:2px}
.kpi.alert .v{color:var(--bad)}
.card{padding:16px 18px;margin-top:16px}.card h2{margin:0;font-size:15px;font-weight:650}.card .hd{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}.card .hd .sub{color:var(--mut);font-size:12px}
.daynav{display:flex;align-items:center;gap:6px;margin-left:auto}.daynav button{border:1px solid var(--line);background:var(--panel);border-radius:8px;width:30px;height:30px;cursor:pointer}.daynav b{min-width:120px;text-align:center;font-weight:600}
.gantt{position:relative}.grow{display:grid;grid-template-columns:130px 1fr;align-items:center;min-height:34px;border-top:1px dashed var(--line)}
.grow:first-child{border-top:0}.gname{font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:8px}
.track{position:relative;height:22px;background:repeating-linear-gradient(90deg,transparent 0,transparent calc(100%/24 - 1px),var(--line) calc(100%/24 - 1px),var(--line) calc(100%/24));border-radius:6px}
.seg2{position:absolute;top:2px;height:18px;border-radius:5px;min-width:4px;cursor:default;opacity:.92}
.seg2:hover{opacity:1;outline:2px solid var(--fg)}
.alertdot{position:absolute;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--bad);transform:translateX(-4px);box-shadow:0 0 0 2px var(--panel)}
.axis{display:grid;grid-template-columns:130px 1fr;font-size:11px;color:var(--mut2);margin-top:6px}.axis div:last-child{display:flex;justify-content:space-between}
.legend{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--mut)}.legend span{display:inline-flex;align-items:center;gap:5px}.legend i{width:10px;height:10px;border-radius:3px;display:inline-block}
.two{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:16px;align-items:start}.two>*{min-width:0}
.heat{overflow-x:auto}.heat table{border-collapse:separate;border-spacing:3px;width:100%}.heat th{font-size:10.5px;color:var(--mut2);font-weight:500}
.heat th.r{text-align:right;padding-right:6px;font-size:12px;color:var(--fg);white-space:nowrap}.heat td{height:22px;border-radius:5px;min-width:14px}
.pbar{margin:10px 0}.pbar .t{display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px}.pbar .t b{font-weight:600}
.stack{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--panel2)}
.chips{display:flex;gap:6px;flex-wrap:wrap}.chip{border:1px solid var(--line);background:var(--panel);border-radius:99px;padding:5px 11px;cursor:pointer;font-size:12.5px;color:var(--mut);font-weight:500}.chip.on{background:var(--fg);color:var(--panel);border-color:var(--fg)}
.search{flex:1;min-width:180px;padding:7px 11px;border:1px solid var(--line);border-radius:9px;background:var(--panel2)}
.sess{border:1px solid var(--line);border-radius:12px;margin-top:10px;overflow:hidden}
.sess>summary{list-style:none;cursor:pointer;display:flex;gap:10px;align-items:center;padding:10px 12px;background:var(--panel2)}
.sess>summary::-webkit-details-marker{display:none}
.sess .meta{font-size:12px;color:var(--mut)}.sess .cnt{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
.pill{font-size:11.5px;padding:2px 8px;border-radius:99px;background:var(--panel);border:1px solid var(--line);color:var(--mut);white-space:nowrap}
.pill.b{background:var(--badbg);color:var(--bad);border-color:transparent}.pill.w{background:var(--warnbg);color:var(--warn);border-color:transparent}.pill.p{background:var(--acc2);color:var(--acc);border-color:transparent}
.ev{display:grid;grid-template-columns:62px 22px 1fr;gap:8px;padding:7px 12px;border-top:1px solid var(--line);align-items:start}
.ev .t{color:var(--mut2);font-size:12px;font-variant-numeric:tabular-nums;padding-top:1px}.ev .ic{font-size:14px;text-align:center}
.ev .x{font-size:13px;word-break:break-word}.ev .x code{font:12px/1.5 ui-monospace,Consolas,monospace;background:var(--panel2);border:1px solid var(--line);border-radius:6px;padding:1px 6px}
.ev.prompt .x{font-weight:500}.ev.blocked{background:var(--badbg)}.ev.needs-approval{background:var(--warnbg)}
.ev .x .tag{font-size:11px;color:var(--mut);margin-left:6px}
.empty{color:var(--mut);padding:24px;text-align:center}
.foot{color:var(--mut2);font-size:12px;margin-top:18px;line-height:1.6}
.tip{position:fixed;pointer-events:none;background:var(--fg);color:var(--panel);padding:6px 9px;border-radius:8px;font-size:12px;z-index:9;display:none;max-width:280px}
.more{display:block;margin:10px auto 0}
@media (max-width:1100px){.kpis{grid-template-columns:repeat(3,1fr)}.two{grid-template-columns:minmax(0,1fr)}}
@media (max-width:820px){.layout{grid-template-columns:1fr;padding:12px 16px 32px}.side{position:static;max-height:none}.top .in{padding:10px 16px}.grow,.axis{grid-template-columns:84px 1fr}}
@media (max-width:520px){.kpis{grid-template-columns:repeat(2,1fr)}.ev{grid-template-columns:48px 18px 1fr}}
</style></head><body>
<div class="top"><div class="in">
 <div class="logo">IGO</div><div class="ttl"><h1>Team Activity</h1><div id="gen"></div></div><div class="sp"></div>
 <div class="seg" id="range"><button data-d="1">Today</button><button data-d="7" class="on">7 days</button><button data-d="30">30 days</button></div>
 <button class="btn" id="csv" title="Download the filtered events as CSV">⬇ CSV</button>
 <button class="btn" id="theme" title="Toggle light / dark" aria-label="Toggle theme"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button>
</div></div>
<div class="layout">
 <aside class="side"><div class="panel"><input id="ms" placeholder="Search members…"><div id="members"></div></div>
  <div class="foot"><span style="color:var(--ok)">●</span> Active now (15 min) &nbsp; <span style="color:var(--warn)">●</span> Active today &nbsp; <span style="color:var(--mut2)">●</span> Idle</div></aside>
 <main>
  <div class="kpis" id="kpis"></div>
  <div class="panel card"><div class="hd"><h2>Day timeline</h2><span class="sub">When each person was working, coloured by project. Red dots = blocked actions.</span>
   <div class="daynav"><button id="dprev">‹</button><b id="dlabel"></b><button id="dnext">›</button></div></div>
   <div class="gantt" id="gantt"></div><div class="axis"><div></div><div><span>00</span><span>03</span><span>06</span><span>09</span><span>12</span><span>15</span><span>18</span><span>21</span><span>24</span></div></div>
   <div class="legend" id="legend" style="margin-top:10px"></div></div>
  <div class="two">
   <div class="panel card"><div class="hd"><h2>Time slots</h2><span class="sub">Active minutes per hour, selected range</span></div><div class="heat" id="heat"></div></div>
   <div class="panel card"><div class="hd"><h2>Projects</h2><span class="sub">Active time per project</span></div><div id="proj"></div></div>
  </div>
  <div class="panel card"><div class="hd"><h2>Activity</h2><span class="sub" id="fcount"></span></div>
   <div class="hd" style="margin-bottom:4px"><div class="chips" id="chips"></div><input class="search" id="q" placeholder="Search prompts, commands, files…"></div>
   <div id="feed"></div></div>
  <div class="foot" id="foot"></div>
 </main>
</div>
<div class="tip" id="tip"></div>
<script>
const D=${json};
const $=s=>document.getElementById(s),esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SLOT=5*60000,NOW=Date.now();
const PAL=['#1f7a4d','#2e90fa','#9e77ed','#f79009','#ee46bc','#15b79e','#6172f3','#e04f16','#669f2a','#0ba5ec'];
const AVC=['#1f7a4d','#2e90fa','#7a5af8','#dd2590','#e04f16','#0e9384','#444ce7','#b54708'];
const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))|0;return Math.abs(h)};
const ini=n=>String(n).split(/[\\s._-]+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join('')||'?';
const dkey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const hm=m=>m>=60?Math.floor(m/60)+'h '+String(m%60).padStart(2,'0')+'m':m+'m';
const tm=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
const dl=k=>new Date(k+'T00:00').toLocaleDateString([],{weekday:'short',day:'numeric',month:'short'});
const ago=t=>{const m=Math.round((NOW-new Date(t))/60000);return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' d ago'};
const EV=D.events.map(e=>({...e,t:new Date(e.ts).getTime(),d:dkey(e.ts),project:e.project||'(no project)'}));
const projects=[...new Set(EV.map(e=>e.project))];const pcol={};projects.forEach((p,i)=>pcol[p]=PAL[i%PAL.length]);
const membersAll=[...new Set(EV.map(e=>e.member))].sort();const mcol={};membersAll.forEach((m,i)=>mcol[m]=AVC[i%AVC.length]);const AV=m=>mcol[m]||AVC[hash(m)%AVC.length];
let S={range:7,member:'',day:dkey(NOW),type:'all',q:'',limit:40};
try{const th=localStorage.getItem('igo-theme');if(th)document.documentElement.dataset.theme=th}catch(_){}
const inRange=e=>e.t>=(S.range===1?new Date(dkey(NOW)+'T00:00').getTime():NOW-S.range*864e5);
const kind=e=>e.event==='prompt'?'prompts':(e.event==='blocked'||e.event==='needs-approval')?'alerts':e.kind==='command'?'commands':e.kind==='file-change'?'files':'other';
function slots(list){const m={};for(const e of list){const b=Math.floor(e.t/SLOT);(m[e.member]=m[e.member]||new Set()).add(b)}return m}
function spans(list){ // contiguous active spans per member (gap <= 10 min), with project of majority
 const by={};for(const e of list)(by[e.member]=by[e.member]||[]).push(e);const out={};
 for(const [m,arr] of Object.entries(by)){arr.sort((a,b)=>a.t-b.t);const sp=[];let cur=null;
  for(const e of arr){if(cur&&e.t-cur.e<=10*60000){cur.e=Math.max(cur.e,e.t);cur.p[e.project]=(cur.p[e.project]||0)+1;cur.n++}else{cur={s:e.t,e:e.t,p:{[e.project]:1},n:1};sp.push(cur)}}
  sp.forEach(x=>{x.e=Math.max(x.e,x.s+SLOT);x.proj=Object.entries(x.p).sort((a,b)=>b[1]-a[1])[0][0]});out[m]=sp}return out}
function render(){
 const R=EV.filter(inRange),RM=R.filter(e=>!S.member||e.member===S.member);
 // sidebar
 const today=dkey(NOW),sl=slots(EV.filter(e=>e.d===today)),slR=slots(R);const q=($('ms').value||'').toLowerCase();
 const last={};EV.forEach(e=>{if(!last[e.member]||e.t>last[e.member])last[e.member]=e.t});
 $('members').innerHTML='<div class="mem '+(S.member?'':'on')+'" data-m=""><div class="av" style="background:var(--fg);color:var(--panel)">ALL</div><div><div class="nm">Whole team</div><div class="st">'+membersAll.length+' members</div></div><div class="tm">'+hm(Object.values(slR).reduce((a,s)=>a+s.size*5,0))+'<small>'+(S.range===1?'today':S.range+' days')+'</small></div></div>'+
  membersAll.filter(m=>m.toLowerCase().includes(q)).map(m=>{const l=last[m]||0;const st=NOW-l<15*60000?['var(--ok)','Active now']:dkey(l)===today?['var(--warn)','Last seen '+tm(l)]:['var(--mut2)','Last seen '+ago(l)];
  return '<div class="mem '+(S.member===m?'on':'')+'" data-m="'+esc(m)+'"><div class="av" style="background:'+AV(m)+'">'+esc(ini(m))+'<i style="background:'+st[0]+'"></i></div><div style="min-width:0"><div class="nm">'+esc(m)+'</div><div class="st">'+st[1]+'</div></div><div class="tm">'+(((sl[m]||new Set()).size)?hm(sl[m].size*5)+'<small>today</small>':hm(((slR[m]||new Set()).size)*5)+'<small>'+(S.range===1?'today':S.range+' days')+'</small>')+'</div></div>'}).join('');
 document.querySelectorAll('.mem').forEach(el=>el.onclick=()=>{S.member=el.dataset.m;S.limit=40;render()});
 // KPIs
 const sR=slots(RM),act=Object.values(sR).reduce((a,s)=>a+s.size*5,0),cnt=k=>RM.filter(e=>kind(e)===k).length;
 const cmds=RM.filter(e=>e.event==='action'&&e.kind==='command'),fail=cmds.filter(e=>e.ok===false||(e.exit&&e.exit!==0)).length;
 const files=new Set(RM.filter(e=>e.event==='action'&&e.kind==='file-change').map(e=>e.detail)).size;
 const activeToday=Object.keys(slots(EV.filter(e=>e.d===today))).length,blk=RM.filter(e=>e.event==='blocked').length,apr=RM.filter(e=>e.event==='needs-approval').length;
 const sessions=new Set(RM.filter(e=>e.session).map(e=>e.member+e.session)).size;
 const K=[['Active time',hm(act),sessions+' sessions'],['Members active today',activeToday+' / '+membersAll.length,Object.keys(sR).length+' in range'],['Prompts',cnt('prompts'),'requests to Claude'],['Commands',cmds.length,fail?fail+' failed':'all succeeded'],['Files changed',files,'unique files'],['Security alerts',blk+apr,blk+' blocked · '+apr+' approvals']];
 $('kpis').innerHTML=K.map((k,i)=>'<div class="panel kpi'+(i===5&&blk?' alert':'')+'"><div class="l">'+k[0]+'</div><div class="v">'+k[1]+'</div><div class="s">'+k[2]+'</div></div>').join('');
 // gantt (single day)
 $('dlabel').textContent=S.day===today?'Today':dl(S.day);
 const DE=EV.filter(e=>e.d===S.day&&(!S.member||e.member===S.member)),sp=spans(DE),d0=new Date(S.day+'T00:00').getTime();
 const rows=(S.member?[S.member]:membersAll).filter(m=>sp[m]||!S.member);
 $('gantt').innerHTML=rows.length?rows.map(m=>{const segs=(sp[m]||[]).map(x=>{const l=(x.s-d0)/864e5*100,w=Math.max((x.e-x.s)/864e5*100,.35);return '<div class="seg2" style="left:'+l+'%;width:'+w+'%;background:'+pcol[x.proj]+'" data-tip="'+esc(m+' · '+x.proj+' · '+tm(x.s)+'–'+tm(x.e)+' · '+x.n+' events')+'"></div>'}).join('')+
  DE.filter(e=>e.member===m&&e.event==='blocked').map(e=>'<div class="alertdot" style="left:'+((e.t-d0)/864e5*100)+'%" data-tip="'+esc('Blocked '+tm(e.t)+': '+(e.detail||''))+'"></div>').join('');
  const tot=(slots(DE)[m]||new Set()).size*5;return '<div class="grow"><div class="gname">'+esc(m)+' <span style="color:var(--mut);font-weight:400">'+(tot?hm(tot):'')+'</span></div><div class="track">'+segs+'</div></div>'}).join(''):'<div class="empty">No activity on this day.</div>';
 const usedP=[...new Set(DE.map(e=>e.project))];$('legend').innerHTML=usedP.map(p=>'<span><i style="background:'+pcol[p]+'"></i>'+esc(p)+'</span>').join('');
 // heatmap member x hour
 const hrs=[...Array(24).keys()],hm2={};const seen=new Set();
 for(const e of RM){const b=Math.floor(e.t/SLOT),k=e.member+b;if(seen.has(k))continue;seen.add(k);const h=new Date(e.t).getHours();(hm2[e.member]=hm2[e.member]||Array(24).fill(0))[h]+=5}
 const mx=Math.max(5,...Object.values(hm2).flat());const col=v=>!v?'var(--h0)':v/mx<.25?'var(--h1)':v/mx<.5?'var(--h2)':v/mx<.8?'var(--h3)':'var(--h4)';
 const hk=Object.keys(hm2).sort();
 $('heat').innerHTML=hk.length?'<table><tr><th></th>'+hrs.map(h=>'<th>'+(h%3?'':String(h).padStart(2,'0'))+'</th>').join('')+'</tr>'+hk.map(m=>'<tr><th class="r">'+esc(m)+'</th>'+hm2[m].map((v,h)=>'<td style="background:'+col(v)+'" data-tip="'+esc(m+' · '+String(h).padStart(2,'0')+':00 – '+String(h+1).padStart(2,'0')+':00 · '+v+' min')+'"></td>').join('')+'</tr>').join('')+'</table>':'<div class="empty">No activity in range.</div>';
 // projects
 const pj={};seen.clear();for(const e of RM){const b=Math.floor(e.t/SLOT),k=e.member+b;if(seen.has(k))continue;seen.add(k);const p=pj[e.project]=pj[e.project]||{t:0,m:{}};p.t+=5;p.m[e.member]=(p.m[e.member]||0)+5}
 const pk=Object.entries(pj).sort((a,b)=>b[1].t-a[1].t),pmax=pk[0]?pk[0][1].t:1;
 $('proj').innerHTML=pk.length?pk.slice(0,10).map(([p,v])=>'<div class="pbar"><div class="t"><b>'+esc(p)+'</b><span>'+hm(v.t)+'</span></div><div class="stack"><div style="width:'+Math.max(4,v.t/pmax*100)+'%;background:'+pcol[p]+';border-radius:99px"></div></div><div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap">'+Object.entries(v.m).sort((a,b)=>b[1]-a[1]).map(([m,x])=>'<span class="pill"><b style="color:'+AV(m)+'">●</b> '+esc(m)+' '+hm(x)+'</span>').join('')+'</div></div>').join(''):'<div class="empty">No projects in range.</div>';
 // chips + feed (grouped by session)
 const types=[['all','All'],['prompts','Prompts'],['commands','Commands'],['files','Files'],['alerts','Alerts']];
 $('chips').innerHTML=types.map(([k,l])=>'<button class="chip '+(S.type===k?'on':'')+'" data-k="'+k+'">'+l+(k==='all'?'':' '+RM.filter(e=>kind(e)===k).length)+'</button>').join('');
 document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{S.type=c.dataset.k;S.limit=40;render()});
 const qq=S.q.toLowerCase();
 const F=RM.filter(e=>!['turn-end'].includes(e.event)&&(S.type==='all'?kind(e)!=='other'||/^session/.test(e.event):kind(e)===S.type)&&(!qq||(e.detail||'').toLowerCase().includes(qq)||e.project.toLowerCase().includes(qq)||e.member.toLowerCase().includes(qq)));
 $('fcount').textContent=F.length+' events · '+(S.member||'whole team');
 const groups={};for(const e of F){const k=e.member+'|'+(e.session||e.d)+'|'+e.project;(groups[k]=groups[k]||[]).push(e)}
 const G=Object.values(groups).sort((a,b)=>b[b.length-1].t-a[a.length-1].t);
 const icon=e=>e.event==='prompt'?'💬':e.event==='blocked'?'⛔':e.event==='needs-approval'?'⚠️':e.event==='session-start'?'▶':e.event==='session-end'?'■':e.kind==='command'?'⌘':e.kind==='file-change'?'✎':e.kind==='file-read'?'📄':e.kind==='web'?'🌐':e.kind==='skill'?'★':e.kind==='agent'?'🤖':e.kind==='mcp'?'🔌':'•';
 const body=e=>e.event==='prompt'?esc(e.detail):e.event==='session-start'?'Session started':e.event==='session-end'?'Session ended':(e.kind==='command'?'<code>'+esc(e.detail)+'</code>'+(e.ok===false||(e.exit&&e.exit!==0)?'<span class="tag" style="color:var(--bad)">failed</span>':''):esc(e.detail||e.tool||''))+(e.rule?'<span class="tag">'+esc(e.rule)+'</span>':'');
 $('feed').innerHTML=G.length?G.slice(0,S.limit).map((g,i)=>{const a=g[0],z=g[g.length-1],c=k=>g.filter(e=>kind(e)===k).length,mins=new Set(g.map(e=>Math.floor(e.t/SLOT))).size*5;
  return '<details class="sess" '+(i<1?'open':'')+'><summary><div class="av" style="width:28px;height:28px;font-size:11px;background:'+AV(a.member)+'">'+esc(ini(a.member))+'</div><div><b>'+esc(a.member)+'</b> · '+esc(a.project)+'<div class="meta">'+dl(a.d)+' · '+tm(a.t)+' – '+tm(z.t)+' · ~'+hm(mins)+'</div></div><div class="cnt">'+
  (c('prompts')?'<span class="pill p">'+c('prompts')+' prompts</span>':'')+(c('commands')?'<span class="pill">'+c('commands')+' commands</span>':'')+(c('files')?'<span class="pill">'+c('files')+' files</span>':'')+(c('alerts')?'<span class="pill b">'+c('alerts')+' alerts</span>':'')+'</div></summary>'+
  g.slice().reverse().map(e=>'<div class="ev '+esc(e.event)+' '+(e.event==='prompt'?'prompt':'')+'"><div class="t">'+tm(e.t)+'</div><div class="ic">'+icon(e)+'</div><div class="x">'+body(e)+'</div></div>').join('')+'</details>'}).join('')+(G.length>S.limit?'<button class="btn more" id="more">Show more sessions ('+(G.length-S.limit)+')</button>':''):'<div class="empty">No activity matches.</div>';
 if($('more'))$('more').onclick=()=>{S.limit+=40;render()};
 $('gen').textContent='Updated '+new Date(D.generated).toLocaleString([],{dateStyle:'medium',timeStyle:'short'})+' · '+membersAll.length+' members · '+D.days+' days of data';
 $('foot').innerHTML='Active time counts 5-minute slots with Claude Code activity. Secrets, Aadhaar and PAN numbers are masked on each PC before upload'+(D.stats&&D.stats.encrypted?'; '+D.stats.encrypted+' encrypted log files decrypted with the admin key'+(D.stats.undecryptable?', <b style="color:var(--bad)">'+D.stats.undecryptable+' could not be decrypted</b>':''):'')+'. Confidential: for IGO admins only.';
}
// tooltips
document.addEventListener('mousemove',e=>{const t=e.target.closest('[data-tip]'),tip=$('tip');if(!t){tip.style.display='none';return}tip.textContent=t.dataset.tip;tip.style.display='block';tip.style.left=Math.min(e.clientX+12,innerWidth-290)+'px';tip.style.top=(e.clientY+14)+'px'});
document.querySelectorAll('#range button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#range button').forEach(x=>x.classList.remove('on'));b.classList.add('on');S.range=+b.dataset.d;S.limit=40;render()});
$('dprev').onclick=()=>{const d=new Date(S.day+'T00:00');d.setDate(d.getDate()-1);S.day=dkey(d);render()};
$('dnext').onclick=()=>{const d=new Date(S.day+'T00:00');d.setDate(d.getDate()+1);if(d.getTime()<=NOW)S.day=dkey(d);render()};
$('q').oninput=e=>{S.q=e.target.value;S.limit=40;render()};$('ms').oninput=render;
$('theme').onclick=()=>{const r=document.documentElement,cur=r.dataset.theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'),nx=cur==='dark'?'light':'dark';r.dataset.theme=nx;try{localStorage.setItem('igo-theme',nx)}catch(_){}};
$('csv').onclick=()=>{const rows=[['time','member','host','project','event','kind','detail','rule']].concat(EV.filter(inRange).filter(e=>!S.member||e.member===S.member).map(e=>[e.ts,e.member,e.host,e.project,e.event,e.kind||'',e.detail||'',e.rule||'']));
 const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\\r\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff'+csv],{type:'text/csv'}));a.download='igo-team-activity.csv';a.click()};
// default day = latest day with data
if(EV.length&&!EV.some(e=>e.d===S.day))S.day=EV[EV.length-1].d;
render();
</script></body></html>`;
}

function build(cfg, days, roots, privPem) {
  const { events, members, stats } = readEvents(roots, days, privPem);
  return { html: html({ generated: new Date().toISOString(), days, events, members, stats }), count: events.length, members: [...new Set(events.map(e => e.member))], stats };
}

module.exports = { build, readEvents };
