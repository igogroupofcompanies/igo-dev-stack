'use strict';
// Builds a self-contained HTML dashboard of team Claude Code activity from the team folder.
const fs = require('fs');
const path = require('path');
const A = require('./activity');

const BUCKET_MIN = 5;   // a member counts as "active" in any 5-minute slot with at least one event

function readEvents(roots, days) {
  const since = Date.now() - days * 864e5;
  const events = [];
  const members = {};
  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => path.join(root, d.name));
    if (root === A.LOCAL_DIR) dirs.push(root);
    for (const d of dirs) {
      try { const m = JSON.parse(fs.readFileSync(path.join(d, '_member.json'), 'utf8')); members[m.member + '@' + m.host] = m; } catch (_) {}
      for (const f of fs.readdirSync(d).filter(f => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))) {
        if (new Date(f.slice(0, 10)).getTime() < since - 864e5) continue;
        for (const line of fs.readFileSync(path.join(d, f), 'utf8').split('\n')) {
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
  return { events: out, members };
}

function summarise(events) {
  const per = {};
  for (const e of events) {
    const who = e.member;
    const p = per[who] = per[who] || { member: who, hosts: new Set(), buckets: new Set(), projects: {}, prompts: 0, commands: 0, files: new Set(), blocked: 0, approvals: 0, sessions: new Set(), first: e.ts, last: e.ts, failed: 0, days: {} };
    p.hosts.add(e.host); if (e.session) p.sessions.add(e.session);
    const t = new Date(e.ts); const b = Math.floor(t.getTime() / (BUCKET_MIN * 60000));
    if (!p.buckets.has(b)) { p.buckets.add(b); const proj = e.project || '(none)'; p.projects[proj] = (p.projects[proj] || 0) + BUCKET_MIN; const dk = A.day(t); p.days[dk] = (p.days[dk] || 0) + BUCKET_MIN; }
    if (e.event === 'prompt') p.prompts++;
    if (e.kind === 'command' && e.event === 'action') { p.commands++; if (e.ok === false || (e.exit && e.exit !== 0)) p.failed++; }
    if (e.kind === 'file-change' && e.event === 'action' && e.detail) p.files.add(e.detail);
    if (e.event === 'blocked') p.blocked++;
    if (e.event === 'needs-approval') p.approvals++;
    if (e.ts < p.first) p.first = e.ts; if (e.ts > p.last) p.last = e.ts;
  }
  return Object.values(per).map(p => ({ ...p, hosts: [...p.hosts], activeMin: p.buckets.size * BUCKET_MIN, buckets: undefined, files: p.files.size, sessions: p.sessions.size }));
}

function html(data) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>IGO Team Activity</title>
<style>
:root{--bg:#f7f8fa;--card:#fff;--fg:#1c2330;--mut:#667085;--line:#e4e7ec;--acc:#2f7d4f;--warn:#b54708;--bad:#b42318;--h0:#eef4f0;--h1:#c9e3d2;--h2:#8fc6a3;--h3:#4f9e6e;--h4:#2f7d4f}
@media (prefers-color-scheme:dark){:root{--bg:#0f1318;--card:#171c23;--fg:#e6e9ee;--mut:#98a2b3;--line:#2a313b;--acc:#5cc488;--warn:#f79009;--bad:#f97066;--h0:#1b2420;--h1:#1f4030;--h2:#2b6a46;--h3:#3f9a63;--h4:#5cc488}}
*{box-sizing:border-box}body{margin:0;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--fg)}
header{padding:20px 24px 8px}h1{margin:0;font-size:22px}.sub{color:var(--mut)}
.wrap{padding:8px 24px 32px;max-width:1400px;margin:auto}
.bar{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.bar select,.bar input{padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);color:var(--fg);font:inherit}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px}
.card h3{margin:0 0 6px;font-size:15px}.kv{display:grid;grid-template-columns:1fr auto;gap:2px 10px;color:var(--mut);font-size:13px}.kv b{color:var(--fg);font-weight:600;text-align:right}
.big{font-size:24px;font-weight:700}.tag{display:inline-block;padding:1px 7px;border-radius:99px;font-size:12px;border:1px solid var(--line);margin:2px 4px 0 0}
.bad{color:var(--bad)}.warn{color:var(--warn)}.ok{color:var(--acc)}
section{margin-top:22px}section h2{font-size:16px;margin:0 0 8px}
.heat{overflow-x:auto}.heat table{border-collapse:separate;border-spacing:2px}.heat td,.heat th{font-size:11px;padding:0;text-align:center;color:var(--mut)}
.heat td.c{width:22px;height:20px;border-radius:4px}
table.tl{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.tl th,.tl td{padding:6px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top;font-size:13px}
.tl th{color:var(--mut);font-weight:600;position:sticky;top:0;background:var(--card)}.tl td.d{font-family:ui-monospace,Consolas,monospace;font-size:12px;word-break:break-word;max-width:640px}
.scroll{max-height:560px;overflow:auto;border-radius:12px}
.note{color:var(--mut);font-size:12px;margin-top:8px}
@media (max-width:600px){header,.wrap{padding-left:16px;padding-right:16px}.tl td.d{max-width:260px}}
</style></head><body>
<header><h1>IGO Team Activity: Claude Code</h1><div class="sub" id="meta"></div></header>
<div class="wrap">
<div class="bar"><select id="fm"><option value="">All members</option></select><select id="fd"><option value="">All days</option></select><select id="fp"><option value="">All projects</option></select>
<select id="fe"><option value="">All events</option><option value="prompt">Prompts</option><option value="command">Commands</option><option value="file-change">Files changed</option><option value="blocked">Blocked / approvals</option><option value="session">Sessions</option></select>
<input id="fq" placeholder="Search text…" size="24"></div>
<div class="grid" id="cards"></div>
<section><h2>Time slots (active minutes per hour)</h2><div class="heat card" id="heat"></div></section>
<section><h2>Projects (active minutes)</h2><div class="grid" id="proj"></div></section>
<section><h2>Timeline</h2><div class="scroll"><table class="tl"><thead><tr><th>Time</th><th>Member</th><th>Project</th><th>Event</th><th>Detail</th></tr></thead><tbody id="tl"></tbody></table></div>
<div class="note" id="cnt"></div></section>
<div class="note">Active time = 5-minute slots with Claude Code activity. Secrets, Aadhaar and PAN numbers are masked at source. Generated by igo-dev-stack.</div>
</div>
<script>
const D=${json};const $=id=>document.getElementById(id);
const fmt=t=>new Date(t).toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const hm=m=>m>=60?Math.floor(m/60)+'h '+(m%60)+'m':m+'m';
const dayOf=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const uniq=a=>[...new Set(a)].sort();
uniq(D.events.map(e=>e.member)).forEach(v=>$('fm').add(new Option(v,v)));
uniq(D.events.map(e=>dayOf(e.ts))).reverse().forEach(v=>$('fd').add(new Option(v,v)));
uniq(D.events.map(e=>e.project||'(none)')).forEach(v=>$('fp').add(new Option(v,v)));
$('meta').textContent='Generated '+new Date(D.generated).toLocaleString()+' · last '+D.days+' day(s) · '+D.events.length+' events · '+uniq(D.events.map(e=>e.member)).length+' member(s)';
function cls(e){if(e.event==='prompt')return 'prompt';if(e.event==='blocked'||e.event==='needs-approval')return 'blocked';if(/^session|turn-end/.test(e.event))return 'session';return e.kind||e.event}
function label(e){return e.event==='prompt'?'💬 prompt':e.event==='blocked'?'⛔ blocked':e.event==='needs-approval'?'⚠ approval':e.event==='session-start'?'▶ session start':e.event==='session-end'?'■ session end':e.event==='turn-end'?'· reply done':(e.kind==='command'?'⌘ command':e.kind==='file-change'?'✎ file changed':e.kind==='file-read'?'📄 read':e.kind==='web'?'🌐 web':e.kind==='skill'?'★ skill':e.kind==='agent'?'🤖 agent':e.kind==='mcp'?'🔌 '+(e.tool||'mcp'):e.kind||e.event)}
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function filtered(){const m=$('fm').value,d=$('fd').value,p=$('fp').value,ev=$('fe').value,q=$('fq').value.toLowerCase();
 return D.events.filter(e=>(!m||e.member===m)&&(!d||dayOf(e.ts)===d)&&(!p||(e.project||'(none)')===p)&&(!ev||cls(e)===ev)&&(!q||(e.detail||'').toLowerCase().includes(q)||(e.project||'').toLowerCase().includes(q)))}
function summary(ev){const per={};for(const e of ev){const p=per[e.member]=per[e.member]||{m:e.member,b:new Set(),pr:0,cmd:0,files:new Set(),blk:0,apr:0,first:e.ts,last:e.ts,proj:{},hosts:new Set(),fail:0};
 p.hosts.add(e.host);const b=Math.floor(new Date(e.ts)/300000);if(!p.b.has(b)){p.b.add(b);const k=e.project||'(none)';p.proj[k]=(p.proj[k]||0)+5}
 if(e.event==='prompt')p.pr++;if(e.event==='action'&&e.kind==='command'){p.cmd++;if(e.ok===false||(e.exit&&e.exit!==0))p.fail++}
 if(e.event==='action'&&e.kind==='file-change'&&e.detail)p.files.add(e.detail);if(e.event==='blocked')p.blk++;if(e.event==='needs-approval')p.apr++;
 if(e.ts<p.first)p.first=e.ts;if(e.ts>p.last)p.last=e.ts}return Object.values(per).sort((a,b)=>b.b.size-a.b.size)}
function render(){const ev=filtered();const S=summary(ev);
 $('cards').innerHTML=S.map(p=>'<div class="card"><h3>'+esc(p.m)+'</h3><div class="big">'+hm(p.b.size*5)+'</div><div class="sub">active · '+fmt(p.first)+' → '+fmt(p.last)+'</div><div class="kv" style="margin-top:8px">'+
  '<span>Prompts</span><b>'+p.pr+'</b><span>Commands</span><b>'+p.cmd+(p.fail?' <span class="warn">('+p.fail+' failed)</span>':'')+'</b><span>Files changed</span><b>'+p.files.size+'</b><span>Blocked</span><b class="'+(p.blk?'bad':'')+'">'+p.blk+'</b><span>Needed approval</span><b class="'+(p.apr?'warn':'')+'">'+p.apr+'</b></div><div style="margin-top:6px">'+
  Object.entries(p.proj).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>'<span class="tag">'+esc(k)+' · '+hm(v)+'</span>').join('')+'</div><div class="note">'+esc([...p.hosts].join(', '))+'</div></div>').join('')||'<div class="card">No activity for this filter.</div>';
 const hrs=[...Array(24).keys()];const rows=S.map(p=>{const h=Array(24).fill(0);const seen=new Set();for(const e of ev.filter(x=>x.member===p.m)){const t=new Date(e.ts);const b=Math.floor(t/300000);if(seen.has(b))continue;seen.add(b);h[t.getHours()]+=5}return [p.m,h]});
 const col=v=>v===0?'var(--h0)':v<=10?'var(--h1)':v<=25?'var(--h2)':v<=45?'var(--h3)':'var(--h4)';
 $('heat').innerHTML='<table><tr><th></th>'+hrs.map(h=>'<th>'+String(h).padStart(2,'0')+'</th>').join('')+'</tr>'+rows.map(([m,h])=>'<tr><th style="text-align:right;padding-right:6px">'+esc(m)+'</th>'+h.map((v,i)=>'<td class="c" style="background:'+col(v)+'" title="'+esc(m)+' '+String(i).padStart(2,'0')+':00 - '+v+' min"></td>').join('')+'</tr>').join('')+'</table><div class="note">Darker = more active minutes in that hour'+($('fd').value?' on '+$('fd').value:' (all selected days combined)')+'.</div>';
 const pj={};for(const p of S)for(const [k,v] of Object.entries(p.proj)){pj[k]=pj[k]||{t:0,m:{}};pj[k].t+=v;pj[k].m[p.m]=(pj[k].m[p.m]||0)+v}
 $('proj').innerHTML=Object.entries(pj).sort((a,b)=>b[1].t-a[1].t).map(([k,v])=>'<div class="card"><h3>'+esc(k)+'</h3><div class="big">'+hm(v.t)+'</div>'+Object.entries(v.m).sort((a,b)=>b[1]-a[1]).map(([m,x])=>'<span class="tag">'+esc(m)+' · '+hm(x)+'</span>').join('')+'</div>').join('');
 const rowsTl=ev.slice().reverse().slice(0,3000);
 $('tl').innerHTML=rowsTl.map(e=>'<tr><td>'+fmt(e.ts)+'</td><td>'+esc(e.member)+'</td><td>'+esc(e.project||'')+'</td><td class="'+(e.event==='blocked'?'bad':e.event==='needs-approval'?'warn':'')+'">'+label(e)+(e.rule?' <span class="tag">'+esc(e.rule)+'</span>':'')+'</td><td class="d">'+esc(e.detail||'')+'</td></tr>').join('');
 $('cnt').textContent=ev.length+' events'+(ev.length>3000?' (latest 3000 shown)':'');}
['fm','fd','fp','fe'].forEach(i=>$(i).onchange=render);$('fq').oninput=render;render();
</script></body></html>`;
}

function build(cfg, days, roots) {
  const { events, members } = readEvents(roots, days);
  return { html: html({ generated: new Date().toISOString(), days, events, members, summary: summarise(events) }), count: events.length, members: [...new Set(events.map(e => e.member))] };
}

module.exports = { build, readEvents, summarise };
