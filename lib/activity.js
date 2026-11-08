'use strict';
// IGO team activity log: who did what in Claude Code, when, in which project.
// Writes JSON lines to ~/.claude/igo-security/activity/<YYYY-MM-DD>.jsonl and mirrors the
// day files to the team folder (network share, Google Drive / OneDrive synced folder, NAS).
const fs = require('fs');
const path = require('path');
const os = require('os');
const C = require('./common');
const R = require('./rules');

const LOCAL_DIR = path.join(C.SEC_DIR, 'activity');
const day = (d = new Date()) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10);
};

function member(cfg) {
  return (cfg.teamMember || os.userInfo().username || 'unknown').replace(/[^\w.\- ]+/g, '_');
}
function host() { return os.hostname().replace(/[^\w.-]+/g, '_'); }

// Mask secrets and Indian ID numbers before anything is written.
function mask(text, max = 2000) {
  let t = String(text || '');
  for (const f of R.scanSecrets(t)) if (f.match && R.SEV[f.sev] >= 2) t = t.split(f.match.replace(/…$/, '')).join('[SECRET]');
  t = t.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[JWT]')
       .replace(/\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, '[SECRET]')
       .replace(/\b(sk-ant-|sk-|ghp_|github_pat_|xox[baprs]-|rzp_live_|sk_live_)[A-Za-z0-9_\-]{8,}/g, '[SECRET]')
       .replace(/\b([2-9]\d{3})[\s-]?(\d{4})[\s-]?(\d{4})\b/g, (m, a, b, c) => (R.verhoeff(a + b + c) ? `${a} XXXX XXXX` : m))
       .replace(/\b([A-Z]{3}[PCHFATBLJG][A-Z])\d{4}([A-Z])\b/g, '$1XXXX$2')
       .replace(/((password|passwd|pwd|secret|token|api[_-]?key)\s*[:=]\s*)['"]?[^\s'"]{4,}/gi, '$1[SECRET]');
  return t.length > max ? t.slice(0, max) + '…' : t;
}

function summarise(tool, ti) {
  ti = ti || {};
  if (tool === 'Bash' || tool === 'PowerShell') return { kind: 'command', detail: ti.command };
  if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)) return { kind: 'file-change', detail: ti.file_path || ti.notebook_path };
  if (['Read', 'NotebookRead'].includes(tool)) return { kind: 'file-read', detail: ti.file_path || ti.notebook_path };
  if (['Grep', 'Glob'].includes(tool)) return { kind: 'search', detail: `${ti.pattern || ''} ${ti.path || ''}`.trim() };
  if (tool === 'WebFetch') return { kind: 'web', detail: ti.url };
  if (tool === 'WebSearch') return { kind: 'web', detail: ti.query };
  if (tool === 'Task' || tool === 'Agent') return { kind: 'agent', detail: ti.description || ti.subagent_type };
  if (tool === 'Skill') return { kind: 'skill', detail: ti.skill || ti.name };
  if (tool.startsWith('mcp__')) return { kind: 'mcp', detail: tool.replace(/^mcp__/, '') };
  return { kind: 'tool', detail: '' };
}

function record(cfg, inp, extra) {
  if (cfg.teamLogging === false) return;
  try {
    fs.mkdirSync(LOCAL_DIR, { recursive: true });
    const ev = {
      ts: new Date().toISOString(), member: member(cfg), host: host(),
      session: String(inp.session_id || '').slice(0, 12),
      project: path.basename(process.env.CLAUDE_PROJECT_DIR || inp.cwd || ''), cwd: process.env.CLAUDE_PROJECT_DIR || inp.cwd || '',
      ...extra
    };
    if (ev.detail) ev.detail = mask(ev.detail, cfg.teamDetailMax || 2000);
    fs.appendFileSync(path.join(LOCAL_DIR, day() + '.jsonl'), JSON.stringify(ev) + '\n');
  } catch (_) {}
}

// Mirror local day files to <teamLogDir>/<member>@<host>/ (copy when size differs). Cheap & idempotent.
function sync(cfg, maxDays = 14) {
  const dir = cfg.teamLogDir;
  if (!dir) return { ok: false, reason: 'no team folder set' };
  try {
    if (!fs.existsSync(dir)) return { ok: false, reason: 'team folder not reachable: ' + dir };
    const dest = path.join(dir, `${member(cfg)}@${host()}`);
    fs.mkdirSync(dest, { recursive: true });
    let copied = 0;
    const files = fs.existsSync(LOCAL_DIR) ? fs.readdirSync(LOCAL_DIR).filter(f => f.endsWith('.jsonl')).sort().slice(-maxDays) : [];
    for (const f of files) {
      const src = path.join(LOCAL_DIR, f), dst = path.join(dest, f);
      const a = fs.statSync(src).size; let b = -1; try { b = fs.statSync(dst).size; } catch (_) {}
      if (a !== b) { fs.copyFileSync(src, dst); copied++; }
    }
    fs.writeFileSync(path.join(dest, '_member.json'), JSON.stringify({ member: member(cfg), host: host(), os: `${os.platform()} ${os.release()}`, lastSync: new Date().toISOString(), plugin: require('../.claude-plugin/plugin.json').version }, null, 2));
    return { ok: true, copied, dest };
  } catch (e) { return { ok: false, reason: e.message }; }
}

module.exports = { record, sync, summarise, mask, member, host, LOCAL_DIR, day };
