'use strict';
// Shared config, state, logging and helpers for IGO Security Guard.
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');
const SEC_DIR = process.env.IGO_SEC_DIR || path.join(CLAUDE_DIR, 'igo-security');
const CONFIG = path.join(SEC_DIR, 'config.json');
const STATE = path.join(SEC_DIR, 'state.json');
const LOG = path.join(SEC_DIR, 'audit.log');
const POLICY_CACHE = path.join(SEC_DIR, 'remote-policy.json');
const SETTINGS = path.join(CLAUDE_DIR, 'settings.json');
const INSTALLED = path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json');

// Plugins installed by igo-setup are approved by default (by name, no SHA pin).
const STACK = [
  'context7@claude-plugins-official', 'feature-dev@claude-plugins-official',
  'code-review@claude-plugins-official', 'pr-review-toolkit@claude-plugins-official',
  'code-simplifier@claude-plugins-official', 'commit-commands@claude-plugins-official',
  'security-guidance@claude-plugins-official', 'frontend-design@claude-plugins-official',
  'claude-md-management@claude-plugins-official', 'typescript-lsp@claude-plugins-official',
  'pyright-lsp@claude-plugins-official', 'playwright@claude-plugins-official',
  'supabase@claude-plugins-official', 'vercel@claude-plugins-official',
  'document-skills@anthropic-agent-skills', 'superpowers@superpowers-marketplace',
  'backend-development@claude-code-workflows', 'frontend-mobile-development@claude-code-workflows',
  'database-design@claude-code-workflows', 'security-compliance@claude-code-workflows',
  'cicd-automation@claude-code-workflows', 'debugging-toolkit@claude-code-workflows',
  'claude-mem@thedotmack', 'agent-skills@addy-agent-skills',
  'ui-ux-pro-max@ui-ux-pro-max-skill', 'obsidian-second-brain@obsidian-second-brain', 'igo-dev-stack@igo-group'
];

const DEFAULT_CONFIG = {
  profile: 'normal',                 // strict | normal | open
  enforceAllowlist: false,           // true: auto-disable unapproved plugins at session start
  autoQuarantine: true,              // auto-disable plugins on the blocklist
  remotePolicyUrl: '',               // company policy.json (approved + blocked) shared by all machines
  trustedPublishers: ['anthropics'],
  trustedMarketplaces: ['claude-plugins-official', 'anthropic-agent-skills'],   // Anthropic-managed: approved automatically
  trustedInstallers: ['claude.ai', 'astral.sh', 'raw.githubusercontent.com/rtk-ai', 'raw.githubusercontent.com/igogroupofcompanies/igo-dev-stack', 'get.pnpm.io', 'bun.sh', 'deno.land', 'sh.rustup.rs'],
  egressAllow: [
    'github.com', 'githubusercontent.com', 'api.github.com', 'registry.npmjs.org', 'npmjs.com',
    'pypi.org', 'files.pythonhosted.org', 'api.osv.dev', 'claude.ai', 'anthropic.com',
    'supabase.co', 'supabase.com', 'vercel.com', 'vercel.app', 'igogroups.in',
    'localhost', '127.0.0.1', 'context7.com', 'nodejs.org'
  ],
  protectedPaths: [],                // extra folders Claude must never write to
  router: true,                      // auto-suggest matching skills on every prompt
  routerMax: 4,
  blueprint: 'auto',                 // auto | suggest | off - IGO project blueprint for code projects
  approved: Object.fromEntries(STACK.map(k => [k, { source: 'igo-stack', approvedAt: 'baseline' }])),
  blocked: []
};

function ensureDir(d = SEC_DIR) { try { fs.mkdirSync(d, { recursive: true }); } catch (_) {} }
function readJSON(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return d; } }
function writeJSON(f, o) { ensureDir(path.dirname(f)); fs.writeFileSync(f, JSON.stringify(o, null, 2)); }

function loadConfig() {
  let c = readJSON(CONFIG, null);
  if (!c) { c = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); try { writeJSON(CONFIG, c); } catch (_) {} }
  c = { ...DEFAULT_CONFIG, ...c };
  // merge remote company policy (cached)
  const rp = readJSON(POLICY_CACHE, null);
  if (rp) {
    c.approved = { ...(rp.approved || {}), ...(c.approved || {}) };
    c.blocked = [...new Set([...(c.blocked || []), ...(rp.blocked || [])])];
    if (rp.profileFloor && rank(rp.profileFloor) > rank(c.profile)) c.profile = rp.profileFloor;
    if (Array.isArray(rp.egressAllow)) c.egressAllow = [...new Set([...c.egressAllow, ...rp.egressAllow])];
  }
  return c;
}
function saveConfig(c) { writeJSON(CONFIG, c); }
function rank(p) { return { open: 0, normal: 1, strict: 2 }[p] ?? 1; }

function loadState() { return readJSON(STATE, { knownPlugins: {}, lastPrompt: '', lastPromptAt: null }); }
function saveState(s) { try { writeJSON(STATE, s); } catch (_) {} }

function log(event, data = {}) {
  try { ensureDir(); fs.appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + '\n'); } catch (_) {}
}

// Installed plugins: [{ key, name, market, installPath, sha, version, scope }]
function installedPlugins() {
  const j = readJSON(INSTALLED, null);
  const out = [];
  if (!j) return out;
  const root = j.plugins && typeof j.plugins === 'object' ? j.plugins : j;
  for (const [key, val] of Object.entries(root)) {
    if (!key.includes('@')) continue;
    const arr = Array.isArray(val) ? val : [val];
    for (const v of arr) {
      if (!v || typeof v !== 'object') continue;
      const [name, market] = key.split('@');
      out.push({ key, name, market, installPath: v.installPath || v.path || '', sha: v.gitCommitSha || v.commitSha || '', version: v.version || '', scope: v.scope || '' });
    }
  }
  return out;
}

function enabledMap() { const s = readJSON(SETTINGS, {}); return s.enabledPlugins || {}; }

function setPluginEnabled(key, enabled) {
  const s = readJSON(SETTINGS, {});
  s.enabledPlugins = s.enabledPlugins || {};
  s.enabledPlugins[key] = enabled;
  writeJSON(SETTINGS, s);
}

function hostOf(u) { try { return new URL(u).hostname.toLowerCase(); } catch (_) { return ''; } }
function hostAllowed(host, list) {
  if (!host) return true;
  return list.some(d => { d = d.toLowerCase(); return host === d || host.endsWith('.' + d); });
}

function isUnder(p, dir) {
  if (!p || !dir) return false;
  const a = path.resolve(p).toLowerCase(), b = path.resolve(dir).toLowerCase();
  return a === b || a.startsWith(b.endsWith(path.sep) ? b : b + path.sep);
}

function vaultPath(cfg) {
  const s = readJSON(SETTINGS, {});
  return process.env.OBSIDIAN_VAULT_PATH || (s.env && s.env.OBSIDIAN_VAULT_PATH) || (cfg && cfg.vaultPath) || '';
}

function readStdin() {
  try { return JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (_) { return {}; }
}

module.exports = {
  HOME, CLAUDE_DIR, SEC_DIR, CONFIG, STATE, LOG, POLICY_CACHE, SETTINGS, INSTALLED, STACK, DEFAULT_CONFIG,
  ensureDir, readJSON, writeJSON, loadConfig, saveConfig, loadState, saveState, log,
  installedPlugins, enabledMap, vaultPath, setPluginEnabled, hostOf, hostAllowed, isUnder, readStdin, rank
};
