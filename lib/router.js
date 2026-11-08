'use strict';
// IGO Skill Router: on every prompt, pick the installed skills / commands / agents that fit
// and tell Claude to use them automatically, so users never have to name a skill.
const fs = require('fs');
const path = require('path');
const C = require('./common');

const INDEX = path.join(C.SEC_DIR, 'skill-index.json');
const STOP = new Set('the a an and or for to of in on at by with from this that these those is are was were be been being it its as into your you our we i me my can could should would will just also any all some use using used when what which who how why need want make get set new not but if then than so do does done via per about after before over under more most other only same such very each both few own too out up down off again further once here there where your yours their them they he she his her him hers us let lets please kindly now today help create build add run show give file files thing things work working'.split(' '));
const stem = w => w.replace(/(ies)$/, 'y').replace(/(ing|ed|es|s)$/, '').replace(/(.)\1$/, '$1');
const tokens = t => String(t || '').toLowerCase().replace(/[^a-z0-9\s\-_/.]/g, ' ').split(/[\s\-_/.]+/).filter(w => w.length >= 3 && !STOP.has(w)).map(stem);

// High-precision intents → skill names (matched against the end of a skill id). Boost only if installed.
const INTENTS = [
  [/\b(new (feature|module|page|app|project)|implement|build (a|an|the)|add (a|an) (feature|module|page|screen|api))\b/i, ['brainstorming', 'writing-plans', 'plan-first', 'feature-dev']],
  [/\b(bug|error|exception|broken|crash|not working|fails?|failing|stack ?trace|debug)\b/i, ['systematic-debugging', 'debugging-toolkit', 'browser-qa-self-heal', 'debug']],
  [/\b(test|tests|tdd|unit test|coverage)\b/i, ['test-driven-development', 'tdd-workflows', 'testing-strategy']],
  [/\b(ui|ux|design|landing page|website|web ?page|layout|css|tailwind|component|dashboard design|colou?rs?|typography)\b/i, ['ui-ux-pro-max', 'frontend-design']],
  [/\b(api|endpoint|backend|server|rest|graphql|microservice)\b/i, ['backend-development', 'api-scaffolding']],
  [/\b(database|schema|table|migration|sql|postgres|supabase|query)\b/i, ['database-design', 'supabase', 'database-migrations']],
  [/\b(deploy|release|go live|production|publish|ship)\b/i, ['igo-security-review', 'evals-definition-of-done', 'deployment-strategies', 'cicd-automation', 'vercel'], /\b(bug|error|broken|crash|fails?|failing|500|404)\b/i],
  [/\b(security|secure|vulnerab\w*|owasp|pentest|secret|leak|dpdp|gdpr|compliance|audit)\b/i, ['igo-security-review', 'security-guidance', 'security-compliance', 'prompt-injection-defense']],
  [/\b(install|add|try|use)\b[^.]{0,40}\b(plugin|skill|mcp|repo|repository|extension|package)\b|github\.com\//i, ['igo-plugin-audit', 'mcp-governance']],
  [/\b(word|docx|excel|xlsx|spreadsheet|powerpoint|pptx|slides?|deck|pdf)\b/i, ['docx', 'xlsx', 'pptx', 'pdf']],
  [/\b(remember|recall|what did we decide|decision|meeting notes?|second brain|obsidian|vault|journal|daily note)\b/i, ['obsidian-save', 'obsidian-decide', 'obsidian-find', 'obsidian-daily'], /\b(set ?up|install|configure)\b/i],
  [/\b(set ?up|install|configure)\b[^.]{0,30}\b(obsidian|vault|second brain)\b/i, ['igo-brain-setup']],
  [/\b(handoff|hand off|end of (the )?(day|session)|wrap up|summari[sz]e (the )?session)\b/i, ['handoff-memory', 'handoff', 'obsidian-save']],
  [/\b(cloudflare|waf|dns|ddos|rate limit|turnstile|edge)\b/i, ['cloudflare-edge-hardening']],
  [/\b(e2e|end to end|browser test|qa|regression|playwright|self[- ]heal)\b/i, ['browser-qa-self-heal', 'self-heal', 'playwright', 'webapp-testing']],
  [/\b(review|pr|pull request|diff|code quality|refactor|clean ?up|simplif\w*)\b/i, ['code-review', 'requesting-code-review', 'code-simplifier', 'pr-review-toolkit']],
  [/\b(commit|push|branch|merge|git)\b/i, ['commit-commands', 'finishing-a-development-branch']],
  [/\b(docs?|documentation|readme|library|framework|sdk|how to use)\b/i, ['context7']],
  [/\b(blueprint|project structure|agents\.md|scaffold|boilerplate|folder structure|onboard\w* (a|the) (repo|project))\b/i, ['project-blueprint', 'blueprint-init', 'blueprint-adopt', 'blueprint-audit']],
  [/\b(set ?up|install)\b[^.]{0,30}\b(claude code|stack|plugins|environment)\b/i, ['igo-setup']],
  [/\b(blocked|guard|quarantine|security (status|report|profile)|strict mode)\b/i, ['igo-security-center']],
  [/\b(team|staff|employee|member)s?\b[^.]{0,40}\b(activity|monitor\w*|doing|working|time ?slots?|log|dashboard|report)\b|\bmonitor (my )?team\b/i, ['igo-team-monitor']],
];

function parseFront(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const fm = {}; let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) { key = kv[1]; fm[key] = kv[2].replace(/^["'>|]\s*|["']$/g, '').trim(); }
    else if (key && /^\s+\S/.test(line)) fm[key] += ' ' + line.trim();
  }
  return fm;
}

function scanDir(dir, kind, prefix, out, source) {
  if (!dir || !fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    let file, base;
    if (kind === 'skill' && e.isDirectory()) { file = path.join(dir, e.name, 'SKILL.md'); base = e.name; }
    else if ((kind === 'command' || kind === 'agent') && e.isFile() && e.name.endsWith('.md')) { file = path.join(dir, e.name); base = e.name.slice(0, -3); }
    else continue;
    if (!fs.existsSync(file)) continue;
    let fm = {}; try { fm = parseFront(fs.readFileSync(file, 'utf8').slice(0, 4000)); } catch (_) { continue; }
    const name = fm.name || base;
    const desc = (fm.description || '').slice(0, 600);
    if (!desc) continue;
    const id = kind === 'command' ? `/${prefix ? prefix + ':' : ''}${base}` : kind === 'agent' ? `agent:${name}` : `${prefix ? prefix + ':' : ''}${name}`;
    out.push({ id, kind, name, desc, source });
  }
}

function signature() {
  const parts = [];
  for (const f of [C.INSTALLED, C.SETTINGS, path.join(C.CLAUDE_DIR, 'skills')]) { try { parts.push(fs.statSync(f).mtimeMs); } catch (_) { parts.push(0); } }
  parts.push(process.env.CLAUDE_PLUGIN_ROOT || '');
  return parts.join('|');
}

function buildIndex(projectDir) {
  const items = [];
  const en = C.enabledMap();
  const seen = new Set();
  for (const p of C.installedPlugins()) {
    if (en[p.key] === false || !p.installPath || seen.has(p.installPath)) continue;
    seen.add(p.installPath);
    scanDir(path.join(p.installPath, 'skills'), 'skill', p.name, items, p.key);
    scanDir(path.join(p.installPath, 'commands'), 'command', p.name, items, p.key);
    scanDir(path.join(p.installPath, 'agents'), 'agent', p.name, items, p.key);
  }
  const own = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..');
  if (!seen.has(own)) { scanDir(path.join(own, 'skills'), 'skill', 'igo-dev-stack', items, 'igo-dev-stack'); scanDir(path.join(own, 'commands'), 'command', 'igo-dev-stack', items, 'igo-dev-stack'); scanDir(path.join(own, 'agents'), 'agent', 'igo-dev-stack', items, 'igo-dev-stack'); }
  scanDir(path.join(C.CLAUDE_DIR, 'skills'), 'skill', '', items, 'user');
  scanDir(path.join(C.CLAUDE_DIR, 'commands'), 'command', '', items, 'user');
  // dedupe by id
  const map = new Map(); for (const it of items) if (!map.has(it.id)) map.set(it.id, it);
  const list = [...map.values()];
  // document frequencies
  const df = {};
  for (const it of list) { it.nt = [...new Set(tokens(it.name))]; it.dt = [...new Set(tokens(it.desc))]; for (const t of new Set([...it.nt, ...it.dt])) df[t] = (df[t] || 0) + 1; }
  return { sig: signature(), built: new Date().toISOString(), n: list.length, df, items: list };
}

function loadIndex() {
  let idx = C.readJSON(INDEX, null);
  if (!idx || idx.sig !== signature() || (Date.now() - new Date(idx.built)) > 864e5) {
    idx = buildIndex(); try { C.writeJSON(INDEX, idx); } catch (_) {}
  }
  return idx;
}

function projectItems(projectDir) {
  const items = [];
  if (!projectDir) return items;
  scanDir(path.join(projectDir, '.claude', 'skills'), 'skill', '', items, 'project');
  scanDir(path.join(projectDir, '.claude', 'commands'), 'command', '', items, 'project');
  for (const it of items) { it.nt = [...new Set(tokens(it.name))]; it.dt = [...new Set(tokens(it.desc))]; }
  return items;
}

function route(prompt, projectDir, max = 4) {
  prompt = String(prompt || '');
  if (prompt.trim().startsWith('/') || prompt.trim().split(/\s+/).length < 3) return [];
  const idx = loadIndex();
  const seenIds = new Set();
  const items = [...idx.items, ...projectItems(projectDir)].filter(it => !seenIds.has(it.id) && seenIds.add(it.id));
  const N = Math.max(idx.n, 1);
  const pt = [...new Set(tokens(prompt))];
  const scored = [];
  for (const it of items) {
    let s = 0, hits = 0;
    for (const t of pt) {
      const idf = Math.log(1 + N / (1 + (idx.df[t] || 0)));
      if (it.nt.includes(t)) { s += 3 * idf; hits++; } else if (it.dt.includes(t)) { s += idf; hits++; }
    }
    let boosted = false;
    for (const [re, names, not] of INTENTS) {
      if (!re.test(prompt) || (not && not.test(prompt))) continue;
      const i = names.findIndex(n => it.name === n || it.id.endsWith(':' + n) || it.id.endsWith('/' + n));
      if (i > -1) { s += 12 + (names.length - i) * 2; hits += 2; boosted = true; }
    }
    if (it.kind === 'agent') s *= 0.7;
    if (hits >= 2 && s >= (boosted ? 6 : 9)) scored.push({ ...it, score: Math.round(s * 10) / 10 });
  }
  scored.sort((a, b) => b.score - a.score);
  // keep diversity: max 2 from the same plugin
  const out = [], per = {};
  for (const s of scored) { const k = s.source; if ((per[k] || 0) >= 2) continue; per[k] = (per[k] || 0) + 1; out.push(s); if (out.length >= max) break; }
  return out;
}

function routeContext(picks) {
  if (!picks.length) return '';
  const lines = picks.map((p, i) => `${i + 1}. ${p.kind === 'skill' ? 'Skill' : p.kind === 'command' ? 'Command' : 'Agent'} \`${p.id}\` - ${p.desc.replace(/\s+/g, ' ').slice(0, 110)}`);
  return `IGO Skill Router - installed capabilities that match this request:\n${lines.join('\n')}\nUse the relevant one(s) automatically (Skill tool for skills; follow the command/agent instructions) before answering. Do not ask the user to name a skill. Skip any that clearly do not fit; if none fit, proceed normally.`;
}

module.exports = { route, routeContext, buildIndex, loadIndex, tokens, INDEX };
