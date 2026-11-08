#!/usr/bin/env node
'use strict';
// igo-brain - one-command Obsidian Second Brain setup for IGO.
// Installs Obsidian, builds the vault (obsidian-second-brain bootstrap + IGO folders),
// installs community plugins, wires Claude Code (OBSIDIAN_VAULT_PATH + plugin), Git backup, security check.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const C = require('../lib/common');
const R = require('../lib/rules');

const args = process.argv.slice(2);
const flag = n => args.includes('--' + n);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const WIN = process.platform === 'win32', MAC = process.platform === 'darwin';

if (flag('help') || args.includes('-h')) {
  console.log(`igo-brain - Obsidian second brain setup
  --vault <dir>      vault folder (default: OBSIDIAN_VAULT_PATH or ~/Documents/IGO-Brain)
  --name "<name>"    your full name
  --preset <p>       executive | builder | creator | researcher | default (default: executive)
  --style wiki       wiki-style layout
  --remote <url>     PRIVATE git remote for backup
  --no-app --no-plugins --no-git --no-claude --force`);
  process.exit(0);
}
const VAULT = path.resolve(opt('vault', C.vaultPath(C.loadConfig()) || path.join(os.homedir(), 'Documents', 'IGO-Brain')));
const NAME = opt('name', os.userInfo().username);
const PRESET = opt('preset', 'executive');
const OSB_DIR = path.join(C.CLAUDE_DIR, 'igo-tools', 'obsidian-second-brain');
const OSB_REPO = 'https://github.com/eugeniughelbur/obsidian-second-brain.git';

const COMMUNITY = [
  { id: 'dataview', repo: 'blacksmithgu/obsidian-dataview', why: 'queries & dashboards' },
  { id: 'obsidian-kanban', repo: 'obsidian-community/obsidian-kanban', why: 'boards' },
  { id: 'templater-obsidian', repo: 'SilentVoid13/Templater', why: 'templates' },
  { id: 'calendar', repo: 'liamcain/obsidian-calendar-plugin', tag: '1.5.10', why: 'daily notes calendar' },
  { id: 'obsidian-tasks-plugin', repo: 'obsidian-tasks-group/obsidian-tasks', why: 'task tracking' },
  { id: 'omnisearch', repo: 'scambier/obsidian-omnisearch', why: 'fast full-text search' },
  { id: 'obsidian-git', repo: 'Vinzent03/obsidian-git', why: 'automatic Git backup' },
];

// IGO work areas on top of the preset
const IGO_FOLDERS = {
  'Areas/Compliance': 'Policies, audits, DPDP, statutory filings, certifications',
  'Areas/ERP': 'IGO ERP restructuring, modules, vendors, rollout',
  'Areas/Websites': 'Brand websites, domains, hosting, SEO',
  'Areas/Automation': 'Internal automations, AI agents, scripts, integrations',
  'Areas/IT-Infrastructure': 'Servers, Proxmox, network, devices, access',
  'Areas/Security': 'Security reviews, incidents, plugin audits (igo-sec reports)',
  'Startups': 'New startup ideas, research, evaluations',
  'Vendors': 'Vendors, contracts, renewals (no passwords here)',
  'Inbox': 'Quick captures to be filed',
};

const out = [];
const step = m => console.log(`\n==> ${m}`);
const ok = m => { console.log('  ✓ ' + m); out.push(['ok', m]); };
const warn = m => { console.log('  ! ' + m); out.push(['warn', m]); };
const has = c => spawnSync(WIN ? 'where' : 'which', [c], { stdio: 'ignore' }).status === 0;
// .cmd shims (claude via npm, winget) need a shell on Windows; quote args so paths with spaces survive.
const run = (c, a, o = {}) => {
  const sh = WIN && /^(claude|winget|brew|flatpak)$/.test(c);
  return spawnSync(c, sh ? a.map(x => /[\s"&|<>^]/.test(x) ? `"${x.replace(/"/g, '\\"')}"` : x) : a, { stdio: o.quiet ? 'pipe' : 'inherit', encoding: 'utf8', shell: sh, timeout: o.timeout || 600000, cwd: o.cwd });
};

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'igo-brain' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

function obsidianInstalled() {
  if (WIN) return [path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Obsidian', 'Obsidian.exe'), path.join(process.env.LOCALAPPDATA || '', 'Obsidian', 'Obsidian.exe')].some(p => fs.existsSync(p));
  if (MAC) return fs.existsSync('/Applications/Obsidian.app');
  return has('obsidian') || fs.existsSync('/var/lib/flatpak/app/md.obsidian.Obsidian') || fs.existsSync(path.join(os.homedir(), '.local/share/flatpak/app/md.obsidian.Obsidian'));
}

async function main() {
  console.log(`IGO Second Brain setup\n  vault:  ${VAULT}\n  name:   ${NAME}\n  preset: ${PRESET}`);
  if (typeof fetch !== 'function') { console.error('Node 18+ required.'); process.exit(1); }

  // 1. Obsidian app
  step('Obsidian app');
  if (obsidianInstalled()) ok('Obsidian already installed');
  else if (flag('no-app')) warn('Skipped Obsidian install (--no-app)');
  else if (WIN && has('winget')) { run('winget', ['install', '-e', '--id', 'Obsidian.Obsidian', '--silent', '--accept-package-agreements', '--accept-source-agreements']); obsidianInstalled() ? ok('Obsidian installed') : warn('Install Obsidian from https://obsidian.md/download'); }
  else if (MAC && has('brew')) { run('brew', ['install', '--cask', 'obsidian']); ok('Obsidian installed (brew)'); }
  else if (has('flatpak')) { run('flatpak', ['install', '-y', 'flathub', 'md.obsidian.Obsidian']); ok('Obsidian installed (flatpak)'); }
  else warn('Install Obsidian manually: https://obsidian.md/download');

  // 2. obsidian-second-brain toolkit (for the vault bootstrap script)
  step('obsidian-second-brain toolkit');
  if (!has('git')) { warn('git missing - install Git and re-run'); return finish(); }
  if (fs.existsSync(path.join(OSB_DIR, '.git'))) { run('git', ['-C', OSB_DIR, 'pull', '--ff-only', '--quiet'], { quiet: true }); ok('Toolkit updated'); }
  else { fs.mkdirSync(path.dirname(OSB_DIR), { recursive: true }); const r = run('git', ['clone', '--depth', '1', '--quiet', OSB_REPO, OSB_DIR], { quiet: true }); r.status === 0 ? ok('Toolkit cloned') : warn('Clone failed: ' + (r.stderr || '').trim()); }
  const sha = (run('git', ['-C', OSB_DIR, 'rev-parse', 'HEAD'], { quiet: true }).stdout || '').trim();

  // 3. Vault bootstrap
  step('Vault');
  const exists = fs.existsSync(path.join(VAULT, '_CLAUDE.md'));
  if (exists && !flag('force')) ok('Vault already bootstrapped - keeping your notes');
  else if (has('uv')) {
    const a = ['run', '--no-project', 'python', path.join(OSB_DIR, 'scripts', 'bootstrap_vault.py'), '--path', VAULT, '--name', NAME, '--preset', PRESET];
    if (opt('style')) a.push('--style', opt('style'));
    const r = run('uv', a, { quiet: true, cwd: OSB_DIR });
    r.status === 0 ? ok(`Vault created with "${PRESET}" preset`) : warn('Bootstrap failed: ' + String(r.stderr || r.stdout).trim().slice(-300));
  } else warn('uv missing - install uv (winget install astral-sh.uv) and re-run');
  fs.mkdirSync(VAULT, { recursive: true });
  for (const [dir, purpose] of Object.entries(IGO_FOLDERS)) {
    const d = path.join(VAULT, dir); fs.mkdirSync(d, { recursive: true });
    const idx = path.join(d, '_index.md');
    if (!fs.existsSync(idx)) fs.writeFileSync(idx, `---\ntype: area-index\ncreated: ${new Date().toISOString().slice(0, 10)}\n---\n# ${path.basename(dir)}\n\n${purpose}\n\n## Notes\n\`\`\`dataview\nLIST FROM "${dir.replace(/\\/g, '/')}" WHERE file.name != "_index" SORT file.mtime DESC\n\`\`\`\n`);
  }
  ok('IGO areas added: ' + Object.keys(IGO_FOLDERS).join(', '));
  const home = path.join(VAULT, 'IGO Home.md');
  if (!fs.existsSync(home)) fs.writeFileSync(home, `# IGO Second Brain\n\n${Object.keys(IGO_FOLDERS).map(d => `- [[${d}/_index|${path.basename(d)}]]`).join('\n')}\n\n## Rules\n- No passwords, API keys, Aadhaar/PAN or bank numbers in notes - link to where they are stored.\n- Company data stays in a **private** backup.\n- Ask Claude: \`/obsidian-second-brain:obsidian-save\`, \`…:obsidian-find\`, \`…:obsidian-daily\`.\n`);

  // 4. Obsidian configuration + community plugins
  step('Obsidian configuration & community plugins');
  const ob = path.join(VAULT, '.obsidian'); fs.mkdirSync(path.join(ob, 'plugins'), { recursive: true });
  const mergeJSON = (f, patch) => { const p = path.join(ob, f); const cur = C.readJSON(p, Array.isArray(patch) ? [] : {}); const val = Array.isArray(patch) ? [...new Set([...cur, ...patch])] : { ...cur, ...patch }; fs.writeFileSync(p, JSON.stringify(val, null, 2)); };
  mergeJSON('app.json', { newFileLocation: 'folder', newFileFolderPath: 'Inbox', attachmentFolderPath: 'Attachments', alwaysUpdateLinks: true, useMarkdownLinks: false });
  mergeJSON('daily-notes.json', { folder: 'Daily', template: 'Templates/Daily Note', format: 'YYYY-MM-DD' });
  mergeJSON('templates.json', { folder: 'Templates' });
  mergeJSON('core-plugins.json', ['file-explorer', 'global-search', 'switcher', 'graph', 'backlink', 'outgoing-link', 'tag-pane', 'page-preview', 'daily-notes', 'templates', 'command-palette', 'bookmarks', 'outline', 'bases', 'canvas', 'properties']);
  const enabled = [];
  if (!flag('no-plugins')) {
    for (const p of COMMUNITY) {
      const dir = path.join(ob, 'plugins', p.id);
      try {
        fs.mkdirSync(dir, { recursive: true });
        for (const f of ['manifest.json', 'main.js']) await download(`https://github.com/${p.repo}/releases/${p.tag ? 'download/' + p.tag : 'latest/download'}/${f}`, path.join(dir, f));
        try { await download(`https://github.com/${p.repo}/releases/${p.tag ? 'download/' + p.tag : 'latest/download'}/styles.css`, path.join(dir, 'styles.css')); } catch (_) {}
        const mf = C.readJSON(path.join(dir, 'manifest.json'), {});
        if (mf.id !== p.id) throw new Error(`manifest id mismatch (${mf.id})`);
        // security: scan downloaded plugin code for critical malware patterns
        const crit = R.scan(fs.readFileSync(path.join(dir, 'main.js'), 'utf8'), R.CODE_MALWARE_RULES).filter(f => f.sev === 'critical');
        if (crit.length) { fs.rmSync(dir, { recursive: true, force: true }); warn(`${p.id}: removed - ${crit[0].msg}`); continue; }
        enabled.push(p.id); ok(`${p.id} ${mf.version || ''} (${p.why})`);
      } catch (e) { warn(`${p.id}: ${e.message} - install it from Settings → Community plugins`); }
    }
    mergeJSON('community-plugins.json', enabled);
    if (enabled.includes('obsidian-git')) {
      const gp = path.join(ob, 'plugins', 'obsidian-git', 'data.json');
      if (!fs.existsSync(gp)) fs.writeFileSync(gp, JSON.stringify({ autoSaveInterval: 15, autoPushInterval: 0, autoPullInterval: 0, commitMessage: 'vault backup: {{date}}', disablePush: false, pullBeforePush: true }, null, 2));
    }
    if (enabled.includes('templater-obsidian')) {
      const tp = path.join(ob, 'plugins', 'templater-obsidian', 'data.json');
      if (!fs.existsSync(tp)) fs.writeFileSync(tp, JSON.stringify({ templates_folder: 'Templates', trigger_on_file_creation: false }, null, 2));
    }
  }

  // 5. Git (local history; push only to a PRIVATE remote)
  step('Git backup');
  const gi = path.join(VAULT, '.gitignore');
  const ignore = ['.obsidian/workspace*.json', '.obsidian/cache', '.trash/', '_trash/', '.DS_Store', 'Thumbs.db', '*.env', '.env*', '*.pem', '*.key', '*.jks', '*.keystore', '.vault-meta/', '.smart-env/'];
  const curIg = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
  fs.writeFileSync(gi, curIg + ignore.filter(l => !curIg.split(/\r?\n/).includes(l)).map(l => l + '\n').join(''));
  if (!flag('no-git')) {
    if (!fs.existsSync(path.join(VAULT, '.git'))) { run('git', ['init', '-q', '-b', 'main'], { cwd: VAULT, quiet: true }); }
    run('git', ['add', '-A'], { cwd: VAULT, quiet: true });
    const c = run('git', ['-c', 'user.name=IGO Brain', '-c', 'user.email=brain@localhost', 'commit', '-qm', 'IGO Second Brain setup'], { cwd: VAULT, quiet: true });
    ok(c.status === 0 ? 'Git repo initialised (local). Add a PRIVATE remote to back up.' : 'Git repo ready');
    if (opt('remote')) { run('git', ['remote', 'add', 'origin', opt('remote')], { cwd: VAULT, quiet: true }); ok('Remote set: ' + opt('remote') + ' (make sure it is private)'); }
  }

  // 6. Claude Code wiring
  step('Claude Code');
  const s = C.readJSON(C.SETTINGS, {});
  s.env = { ...(s.env || {}), OBSIDIAN_VAULT_PATH: VAULT.split(path.sep).join('/') };
  C.writeJSON(C.SETTINGS, s); ok('OBSIDIAN_VAULT_PATH set in ~/.claude/settings.json');
  const cfg = C.loadConfig();
  cfg.approved['obsidian-second-brain@obsidian-second-brain'] = { repo: 'eugeniughelbur/obsidian-second-brain', sha, verdict: 'REVIEW', note: 'Official installers + optional Telegram integration flagged; core vault commands reviewed', approvedAt: new Date().toISOString() };
  cfg.vaultPath = VAULT; C.saveConfig(cfg); ok('Plugin approved in IGO Security Guard' + (sha ? ` (pinned ${sha.slice(0, 7)})` : ''));
  if (!flag('no-claude') && has('claude')) {
    run('claude', ['plugin', 'marketplace', 'add', 'eugeniughelbur/obsidian-second-brain'], { quiet: true });
    const r = run('claude', ['plugin', 'install', 'obsidian-second-brain@obsidian-second-brain', '--scope', 'user'], { quiet: true });
    r.status === 0 ? ok('obsidian-second-brain plugin installed in Claude Code') : warn('Plugin install: run /plugin install obsidian-second-brain@obsidian-second-brain');
  } else if (!flag('no-claude')) warn('Claude Code not found - install it, then: /plugin install obsidian-second-brain@obsidian-second-brain');

  // 7. Security check of the vault
  step('Security check');
  let found = 0;
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.name === '.git' || e.name === '.obsidian') continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.md$/.test(e.name)) { const t = fs.readFileSync(p, 'utf8'); const f = [...R.scanSecrets(t).filter(x => R.SEV[x.sev] >= 3), ...R.aadhaarFindings(t)]; if (f.length) { found += f.length; warn(`${path.relative(VAULT, p)}: ${f.map(x => x.msg).join(', ')}`); } } } };
  try { walk(VAULT); } catch (_) {}
  if (!found) ok('No secrets or Aadhaar numbers in the vault');
  C.log('brain-setup', { vault: VAULT, preset: PRESET, plugins: enabled, sha });
  finish();
}

function finish() {
  const w = out.filter(x => x[0] === 'warn');
  console.log(`\n${w.length ? 'Done with ' + w.length + ' item(s) to check.' : 'All done.'}\n
Next:
  1. Open Obsidian → "Open folder as vault" → ${VAULT}
     When asked, click "Trust author and enable plugins".
  2. Restart Claude Code, open it inside the vault folder and run:
       /obsidian-second-brain:obsidian-init
  3. Daily use: obsidian-save (end of session), obsidian-daily (morning), obsidian-find "question"
  4. Backup: create a PRIVATE GitHub repo, then: git -C "${VAULT}" remote add origin <url> && git -C "${VAULT}" push -u origin main`);
}

main().catch(e => { console.error('igo-brain: ' + e.message); process.exit(1); });
