'use strict';
// IGO Security Guard rule engine. Severity: critical > high > medium > low.
const SEV = { low: 1, medium: 2, high: 3, critical: 4 };
const r = (id, sev, cat, re, msg) => ({ id, sev, cat, re, msg });

// ---- Dangerous shell commands (runtime firewall + plugin script audit) ----
const COMMAND_RULES = [
  r('rm-root', 'critical', 'destructive', /\brm\s+-[a-z]*(rf|fr)[a-z]*\s+(--no-preserve-root\s+)?(\/|~|\$HOME|\/\*|\*)(\s|$|;)/i, 'Recursive delete of root/home'),
  r('rm-win-root', 'critical', 'destructive', /\b(Remove-Item|rd|rmdir|del)\b[^;\n]*(-Recurse|\/s)[^;\n]*\s["']?([A-Za-z]:\\?|~|\$HOME|\$env:USERPROFILE)["']?(\s|$|;)/i, 'Recursive delete of drive/home'),
  r('format-disk', 'critical', 'destructive', /\b(format\s+[A-Za-z]:|mkfs(\.\w+)?\s|diskpart\b|dd\s+if=\S+\s+of=\/dev\/(sd|nvme|disk|hd)|Clear-Disk|Format-Volume)/i, 'Disk format / raw disk write'),
  r('fork-bomb', 'critical', 'destructive', /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/, 'Fork bomb'),
  r('ransom-shadow', 'critical', 'destructive', /vssadmin\s+delete\s+shadows|wbadmin\s+delete|bcdedit\b[^\n]*recoveryenabled\s+no|cipher\s+\/w/i, 'Backup / shadow-copy destruction (ransomware pattern)'),
  r('reverse-shell', 'critical', 'malware', /\/dev\/(tcp|udp)\/\d|bash\s+-i\s*>&|socat\b[^\n]*exec:|(^|[\s;&|(])(nc|ncat|netcat)\s[^\n]*\s-[ec]\s+(\/bin\/|cmd|powershell)|New-Object\s+System\.Net\.Sockets\.TCPClient/, 'Reverse shell'),
  r('miner', 'critical', 'malware', /\bxmrig\b|stratum\+tcp|\bminerd\b|cryptonight|coinhive/i, 'Crypto miner'),
  r('ps-encoded', 'critical', 'malware', /powershell(\.exe)?\b[^\n]*\s-(e|ec|enc|encodedcommand)\s+[A-Za-z0-9+\/=]{20,}/i, 'Encoded PowerShell command'),
  r('av-disable', 'critical', 'malware', /Set-MpPreference\b[^\n]*-Disable|DisableRealtimeMonitoring|Add-MpPreference\b[^\n]*-ExclusionPath|sc(\.exe)?\s+(stop|delete|config)\s+WinDefend|netsh\s+advfirewall\s+set\s+\w+\s+state\s+off|\bufw\s+disable|setenforce\s+0|spctl\s+--master-disable/i, 'Disables antivirus / firewall'),
  r('certutil-dl', 'critical', 'malware', /certutil(\.exe)?\b[^\n]*-urlcache|bitsadmin\b[^\n]*\/transfer|mshta\s+https?:|regsvr32\b[^\n]*\/i:https?:/i, 'LOLBin download'),
  r('pipe-shell', 'high', 'remote-exec', /\b(curl|wget)\b[^|;\n]*\|\s*(sudo\s+)?(ba|z|da|k)?sh\b|\b(iwr|irm|Invoke-WebRequest|Invoke-RestMethod|curl|wget)\b[^|\n]*\|\s*(iex|Invoke-Expression)\b|\biex\s*\(\s*(New-Object\s+Net\.WebClient|iwr|irm)/i, 'Downloads and runs remote code'),
  r('log-wipe', 'high', 'anti-forensics', /\bhistory\s+-c\b|Clear-History|wevtutil\s+cl\b|Clear-EventLog|rm\s+[^\n]*\.bash_history|unset\s+HISTFILE/i, 'Wipes history / event logs'),
  r('persistence', 'high', 'persistence', /\\CurrentVersion\\Run|schtasks(\.exe)?\s+\/create|crontab\s+-[^l]|\(crontab|launchctl\s+(load|bootstrap)|systemctl\s+enable|New-ScheduledTask|Register-ScheduledTask|Startup\\[^\n]*\.(lnk|bat|cmd|vbs|ps1)/i, 'Adds startup persistence'),
  r('registry', 'high', 'system', /\breg(\.exe)?\s+(add|delete|import)\b|(Set|New|Remove)-ItemProperty\b[^\n]*HK(LM|CU|EY_)/i, 'Registry modification'),
  r('force-push', 'high', 'git', /git\s+push\b[^\n;]*(--force\b|\s-f\b|--force-with-lease|\+[\w/-]*(main|master))/i, 'Force push'),
  r('git-history', 'medium', 'git', /git\s+(reset\s+--hard|clean\s+-[a-z]*f[a-z]*d|filter-branch|branch\s+-D\s+(main|master))/i, 'Discards git history / work'),
  r('perm-777', 'high', 'system', /chmod\s+(-R\s+)?(0?777|a\+rwx)|chown\s+-R\s+\S+\s+\/(\s|$)|icacls\b[^\n]*Everyone:\(?F/i, 'World-writable permissions'),
  r('sudo', 'medium', 'system', /(^|[;&|]\s*)sudo\s|Start-Process\b[^\n]*-Verb\s+RunAs|\brunas\s+\/user/i, 'Elevated privileges'),
  r('db-drop', 'high', 'database', /\b(DROP\s+(DATABASE|SCHEMA|TABLE)\b|TRUNCATE\s+TABLE\b|TRUNCATE\s+[\w."]+\s*;)|\b(drop\s+(database|schema|table)\s+(if\s+exists\s+)?[\w."]+|truncate\s+table\s+[\w."]+)/, 'Drops / truncates database objects'),
  r('db-delete-all', 'high', 'database', /DELETE\s+FROM\s+[\w."]+\s*(;|"|'|$)/im, 'DELETE without WHERE'),
  r('publish', 'high', 'release', /\b(npm|pnpm|yarn)\s+publish\b|twine\s+upload|gh\s+release\s+create|gh\s+repo\s+(delete|edit\b[^\n]*--visibility)|cargo\s+publish/i, 'Publishes package / changes repo visibility'),
  r('prod-deploy', 'high', 'deploy', /vercel\b[^\n]*(--prod\b|\bpromote\b|\bremove\b)|supabase\s+(db\s+(push|reset)|projects\s+delete)|terraform\s+(apply|destroy)|kubectl\s+delete|firebase\s+deploy|eas\s+submit|fastlane\s+\w*release/i, 'Production deploy / destroy'),
  r('rm-recursive', 'medium', 'destructive', /\brm\s+-[a-z]*r[a-z]*\s|Remove-Item\b[^\n]*-Recurse|\brd\s+\/s|rmdir\s+\/s/i, 'Recursive delete'),
  r('kill-all', 'medium', 'system', /taskkill\s+\/f\s+\/im\s+\*|\bkillall\s|pkill\s+-9|Stop-Process\b[^\n]*-Name\s+\*/i, 'Kills many processes'),
  r('env-dump', 'medium', 'secrets', /(^|[;&|]\s*)(printenv|env)\s*($|[|>;])|Get-ChildItem\s+env:|\bgci\s+env:|\bset\s*($|\|)|JSON\.stringify\(\s*process\.env\s*\)|os\.environ\s*\)/im, 'Dumps environment variables (secrets)'),
  r('shutdown', 'medium', 'system', /\b(shutdown|reboot|Restart-Computer|Stop-Computer)\b/i, 'Shutdown / reboot'),
];

// ---- Secret file paths ----
const SECRET_PATH_RE = [
  /(^|[\\/])\.env(\.(?!example|sample|template|dist)[\w.-]+)?$/i,
  /(^|[\\/])\.ssh([\\/]|$)/i, /(^|[\\/])id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /(^|[\\/])\.aws[\\/](credentials|config)$/i, /(^|[\\/])\.(npmrc|pypirc|netrc|git-credentials)$/i,
  /\.(jks|keystore|p12|pfx|pem|key|ppk|kdbx)$/i, /(^|[\\/])keystore\.properties$/i,
  /(^|[\\/])(credentials|service[-_]?account[\w-]*|client_secret[\w-]*)\.json$/i,
  /(^|[\\/])\.docker[\\/]config\.json$/i, /(^|[\\/])\.kube[\\/]config$/i,
  /(^|[\\/])\.config[\\/]gh[\\/]hosts\.ya?ml$/i, /(^|[\\/])\.claude[\\/]\.credentials\.json$/i,
  /(Login Data|Cookies|Local State|logins\.json|key[34]\.db)$/i, /(^|[\\/])wallet\.dat$/i,
  /(^|[\\/])secrets?\.(ya?ml|json|toml)$/i
];
const SECRET_PATH_IN_CMD = /(\.env\b(?!\.(example|sample|template))|\.ssh[\\/]|id_rsa|id_ed25519|\.aws[\\/]credentials|\.npmrc|\.pypirc|\.netrc|\.git-credentials|\.(jks|keystore|p12|pfx|pem|ppk)\b|keystore\.properties|service[-_]?account[\w-]*\.json|Login Data|\.claude[\\/]\.credentials)/i;
function isSecretPath(p) { if (!p) return false; p = String(p); if (/\.(example|sample|template|dist)(\.\w+)?$/i.test(p)) return false; return SECRET_PATH_RE.some(re => re.test(p)); }

// ---- Secret values in content ----
const SECRET_RULES = [
  r('aws-key', 'critical', 'secret', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/, 'AWS access key'),
  r('private-key', 'critical', 'secret', /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY( BLOCK)?-----/, 'Private key'),
  r('github-token', 'critical', 'secret', /\b(gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{60,})\b/, 'GitHub token'),
  r('anthropic-key', 'critical', 'secret', /\bsk-ant-[A-Za-z0-9_-]{20,}/, 'Anthropic API key'),
  r('openai-key', 'critical', 'secret', /\bsk-(proj-)?[A-Za-z0-9]{32,}\b/, 'OpenAI API key'),
  r('google-key', 'high', 'secret', /\bAIza[0-9A-Za-z_-]{35}\b/, 'Google API key'),
  r('slack-token', 'critical', 'secret', /\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'),
  r('stripe-live', 'critical', 'secret', /\b(sk|rk)_live_[A-Za-z0-9]{20,}/, 'Stripe live key'),
  r('razorpay-live', 'critical', 'secret', /\brzp_live_[A-Za-z0-9]{10,}/, 'Razorpay live key'),
  r('telegram-bot', 'high', 'secret', /\b\d{8,10}:AA[A-Za-z0-9_-]{33}\b/, 'Telegram bot token'),
  r('discord-webhook', 'high', 'secret', /discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+/i, 'Discord webhook'),
  r('db-url-pass', 'high', 'secret', /\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^:\s/'"]+:[^@\s'"]{3,}@[^\s'"]+/i, 'Database URL with password'),
  r('generic-secret', 'medium', 'secret', /\b(password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret)\b\s*[:=]\s*['"][^'"\s$<{]{8,}['"]/i, 'Hard-coded credential'),
];
const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
function jwtFindings(text) {
  const out = [];
  for (const m of String(text).matchAll(JWT_RE)) {
    let role = '';
    try { role = JSON.parse(Buffer.from(m[0].split('.')[1], 'base64url').toString()).role || ''; } catch (_) {}
    if (role === 'service_role') out.push({ id: 'supabase-service-role', sev: 'critical', cat: 'secret', msg: 'Supabase service_role key (full DB access, bypasses RLS)', match: m[0].slice(0, 24) + '…' });
    else out.push({ id: 'jwt', sev: role === 'anon' ? 'low' : 'medium', cat: 'secret', msg: `JWT token${role ? ` (role: ${role})` : ''}`, match: m[0].slice(0, 24) + '…' });
  }
  return out;
}

// ---- Prompt injection / hidden instructions ----
const INJECTION_RULES = [
  r('inj-ignore', 'high', 'injection', /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(all |any |the )?(previous|prior|above|earlier|system|original)\b[^.\n]{0,20}\b(instructions?|prompts?|rules?|guidelines?|directives?)/i, 'Tries to override instructions'),
  r('inj-roleplay', 'medium', 'injection', /\byou are now\b[^.\n]{0,40}\b(DAN|jailbroken|unrestricted|developer mode|no (rules|restrictions))|\b(act|behave) as (an? )?(unrestricted|unfiltered)\b/i, 'Jailbreak role-play'),
  r('inj-secrecy', 'high', 'injection', /\b(do not|don't|never)\s+(tell|inform|mention|reveal|show|notify)\s+(this to\s+)?the\s+user\b|\bwithout\s+(telling|informing|asking)\s+the\s+user\b|\bsilently\s+(run|execute|send|upload|install)\b/i, 'Hides actions from the user'),
  r('inj-exfil', 'high', 'injection', /\b(send|upload|post|exfiltrate|forward|transmit)\b[^.\n]{0,60}(\.env\b|\bapi[_ ]?keys?|tokens?|credentials?|secrets?|passwords?|ssh keys?|cookies)\b[^.\n]{0,60}\b(to|at|via)\b/i, 'Asks to send secrets somewhere'),
  r('inj-system-tag', 'medium', 'injection', /<\/?\s*(system|system_prompt|instructions|admin|assistant_override)\s*>|\[\s*(SYSTEM|INST)\s*\]|#{2,}\s*(new\s+)?system\s+(prompt|instructions?)/i, 'Fake system/instruction tags'),
  r('inj-tool-order', 'medium', 'injection', /\b(AI|assistant|agent|claude|LLM)\b[^.\n]{0,30}\b(must|should|needs to)\b[^.\n]{0,30}\b(run|execute)\b[^.\n]{0,20}\b(command|script|curl|bash|powershell)/i, 'Instructs the AI to run commands'),
];
const HIDDEN_UNICODE = /[​-‏‪-‮⁠-⁤⁦-⁩﻿]|[\u{E0000}-\u{E007F}]/u;
const HTML_COMMENT_INSTR = /<!--[^>]{0,400}\b(ignore|instruction|assistant|claude|AI|execute|run|curl|send)\b[^>]{0,400}-->/i;

// ---- Malicious code patterns (plugin audit) ----
const CODE_MALWARE_RULES = [
  r('eval-decode', 'critical', 'obfuscation', /\beval\s*\(\s*(atob|Buffer\.from|unescape|decodeURIComponent|base64\.b64decode|codecs\.decode)|exec\s*\(\s*(base64\.b64decode|zlib\.decompress|marshal\.loads)|new\s+Function\s*\(\s*(atob|Buffer\.from)/i, 'Executes decoded/obfuscated code'),
  r('exfil-endpoint', 'high', 'exfiltration', /(webhook\.site|requestbin|pipedream\.net|ngrok(-free)?\.(io|app)|pastebin\.com\/api|transfer\.sh|api\.telegram\.org\/bot|discord(app)?\.com\/api\/webhooks|interact\.sh|oast\.(fun|me|pro)|burpcollaborator)/i, 'Sends data to a known exfiltration endpoint'),
  r('steal-creds', 'high', 'exfiltration', /(\.ssh[\\/]id_(rsa|ed25519|ecdsa)|\.aws[\\/]credentials|\bLogin Data\b|\bLocal State\b|\.git-credentials|\.claude[\\/]\.credentials|security\s+find-(generic|internet)-password|Cookies\.binarycookies|logins\.json|key4\.db)/, 'Reads credential stores'),
  r('env-exfil', 'high', 'exfiltration', /(fetch|axios|request|http\.request|requests\.(post|get)|urllib)[^\n]{0,120}(process\.env|os\.environ)|(process\.env|os\.environ)[^\n]{0,120}(fetch|axios|requests\.post)/i, 'Sends environment variables over network'),
  r('install-script', 'high', 'supply-chain', /"(preinstall|postinstall|install|prepare)"\s*:\s*"(?!(husky|tsc|npm run build|node-gyp))[^"]+"/i, 'npm install-time script'),
  r('long-base64', 'medium', 'obfuscation', /['"`][A-Za-z0-9+\/]{400,}={0,2}['"`]/, 'Large base64 blob'),
  r('hex-blob', 'medium', 'obfuscation', /(\\x[0-9a-f]{2}){60,}/i, 'Hex-escaped blob'),
  r('dynamic-require', 'low', 'obfuscation', /require\s*\(\s*[^'"`)\s][^)]*\)|__import__\s*\(\s*[^'"]/, 'Dynamic import'),
];

// ---- OWASP-style code issues (internal code review) ----
const CODE_VULN_RULES = [
  r('sqli-concat', 'high', 'A03-injection', /(query|execute|raw|sql|prepare)\s*\(\s*(['"][^'"\n]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^'"\n]*['"]\s*\+|`[^`]*\b(SELECT|INSERT|UPDATE|DELETE)\b[^`]*\$\{)/i, 'SQL built by string concatenation / template'),
  r('sqli-fstring', 'high', 'A03-injection', /(execute|executemany|raw)\s*\(\s*f["'][^"'\n]*\b(SELECT|INSERT|UPDATE|DELETE)\b|(execute|raw)\s*\(\s*["'][^"']*\b(SELECT|INSERT|UPDATE|DELETE)\b[^"']*["']\s*%\s*\(/i, 'SQL built with f-string / % formatting'),
  r('cmd-injection', 'high', 'A03-injection', /\b(exec|execSync|spawnSync)\s*\(\s*`[^`]*\$\{|os\.system\s*\(|subprocess\.\w+\([^)\n]*shell\s*=\s*True|shell_exec\s*\(|\bsystem\s*\(\s*\$_(GET|POST|REQUEST)/i, 'Command injection risk'),
  r('nosqli', 'high', 'A03-injection', /\.(find|findOne|update\w*|delete\w*)\s*\(\s*req\.(body|query|params)\s*[,)]/i, 'NoSQL injection (raw request object as query)'),
  r('xss', 'medium', 'A03-injection', /\.innerHTML\s*=|dangerouslySetInnerHTML|document\.write\s*\(|\bv-html\s*=|\|\s*safe\b|mark_safe\s*\(/i, 'XSS sink'),
  r('eval', 'medium', 'A03-injection', /(^|[^\w.])eval\s*\(|new\s+Function\s*\(/, 'eval / new Function'),
  r('path-traversal', 'high', 'A01-access', /(readFile\w*|createReadStream|sendFile|res\.download|open)\s*\([^)\n]*(req\.(query|params|body)|request\.(args|form|GET|POST))/i, 'Path traversal (user input in file path)'),
  r('open-redirect', 'medium', 'A01-access', /(res\.redirect|redirect)\s*\(\s*(req\.(query|body|params)|request\.(args|GET))/i, 'Open redirect'),
  r('weak-hash', 'medium', 'A02-crypto', /createHash\(\s*['"](md5|sha1)['"]\)|hashlib\.(md5|sha1)\(|\bmd5\s*\(\s*\$_?\w*pass/i, 'Weak hash (MD5/SHA1)'),
  r('weak-random', 'medium', 'A02-crypto', /Math\.random\(\)[^\n]{0,60}(token|otp|password|secret|session|key)|(token|otp|password|secret|session)[^\n]{0,60}Math\.random\(\)|random\.(randint|random|choice)\([^\n]{0,40}(otp|token)/i, 'Insecure randomness for secrets/OTP'),
  r('jwt-weak', 'high', 'A07-auth', /algorithms?\s*:\s*\[?\s*['"]none['"]|ignoreExpiration\s*:\s*true|verify_signature['"]?\s*:\s*False|jwt\.decode\([^)\n]*verify\s*=\s*False/i, 'JWT verification disabled'),
  r('tls-off', 'high', 'A02-crypto', /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0|verify\s*=\s*False|InsecureSkipVerify\s*:\s*true|CURLOPT_SSL_VERIFYPEER\s*,\s*(false|0)/i, 'TLS verification disabled'),
  r('cors-any', 'medium', 'A05-misconfig', /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*|origin\s*:\s*['"]\*['"]|origin\s*:\s*true\s*,\s*credentials\s*:\s*true|CORS_ALLOW_ALL_ORIGINS\s*=\s*True/i, 'CORS allows any origin'),
  r('debug-on', 'medium', 'A05-misconfig', /\bDEBUG\s*=\s*True\b|app\.run\([^)\n]*debug\s*=\s*True|display_errors\s*=\s*On/i, 'Debug mode enabled'),
  r('cookie-insecure', 'medium', 'A07-auth', /(httpOnly|httponly)\s*:\s*false|secure\s*:\s*false[^\n]{0,40}cookie|SESSION_COOKIE_SECURE\s*=\s*False/i, 'Insecure cookie flags'),
  r('deserialize', 'high', 'A08-integrity', /pickle\.loads?\(|yaml\.load\([^)\n]*(?<!SafeLoader)\)|unserialize\s*\(\s*\$_|node-serialize|ObjectInputStream/i, 'Unsafe deserialization'),
  r('ssrf', 'medium', 'A10-ssrf', /(fetch|axios\.\w+|requests\.(get|post)|http\.get|urllib\.request\.urlopen)\s*\(\s*(req\.(query|body|params)|request\.(args|form|GET))/i, 'SSRF (user-controlled URL)'),
  r('mass-assign', 'medium', 'A01-access', /\.(create|update|insert|upsert)\s*\(\s*req\.body\s*\)/i, 'Mass assignment (whole req.body saved)'),
];

// ---- Supabase / Vercel specific ----
const PLATFORM_RULES = [
  r('public-env-secret', 'critical', 'secret-exposure', /\b(NEXT_PUBLIC|VITE|EXPO_PUBLIC|REACT_APP|NUXT_PUBLIC|PUBLIC)_[A-Z0-9_]*(SERVICE_ROLE|SECRET|PRIVATE|PASSWORD|ADMIN)[A-Z0-9_]*\b/, 'Secret exposed via public (browser) env variable'),
  r('service-role-ref', 'high', 'secret-exposure', /SUPABASE_SERVICE_ROLE(_KEY)?|service_role/i, 'Service-role key referenced (must be server-only)'),
  r('supabase-admin', 'high', 'A01-access', /supabase\.auth\.admin\./, 'Supabase admin API used (server-only)'),
  r('rls-off', 'critical', 'A01-access', /DISABLE\s+ROW\s+LEVEL\s+SECURITY|NO\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/i, 'Row Level Security disabled'),
  r('policy-true', 'high', 'A01-access', /CREATE\s+POLICY[\s\S]{0,200}?USING\s*\(\s*true\s*\)/i, 'RLS policy USING (true) - open to everyone'),
  r('public-bucket', 'medium', 'A01-access', /createBucket\([^)]*public\s*:\s*true|storage\.buckets[^\n]*public[^\n]*true/i, 'Public storage bucket'),
];

// ---- DPDP / PII ----
const PII_RULES = [
  r('pii-log', 'high', 'dpdp', /(console\.(log|info|debug|warn|error)|logger\.\w+|log\.\w+|print|logging\.\w+|Log\.\w)\s*\([^)\n]*\b(aadhaa?r\w*|pan_?(no|number|card)\w*|mobile\w*|phone\w*|dob|date_?of_?birth|bank_?(account|acc)\w*|ifsc|otp|password|upi_?id)\b/i, 'Personal data written to logs'),
  r('pii-plain-store', 'medium', 'dpdp', /\b(aadhaa?r|aadhar)(_?(no|number|num|id))?\b['"]?\s*[:=]?\s*(VARCHAR|TEXT|CHAR|String|string|z\.string|CharField|types?\.String)/i, 'Aadhaar stored as plain text - hash/mask and restrict'),
  r('pan', 'medium', 'dpdp', /\b[A-Z]{3}[PCHFATBLJG][A-Z]\d{4}[A-Z]\b/, 'PAN number in file'),
  r('mobile-data', 'low', 'dpdp', /(\+91[\s-]?)?\b[6-9]\d{9}\b/, 'Indian mobile number in file'),
];
// Verhoeff checksum: real Aadhaar numbers pass it (cuts false positives)
const vd = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const vp = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
function verhoeff(num) { let c = 0; const d = String(num).split('').reverse().map(Number); for (let i = 0; i < d.length; i++) c = vd[c][vp[i % 8][d[i]]]; return c === 0; }
function aadhaarFindings(text) {
  const out = [];
  for (const m of String(text).matchAll(/\b([2-9]\d{3})[\s-]?(\d{4})[\s-]?(\d{4})\b/g)) {
    const n = m[1] + m[2] + m[3];
    if (verhoeff(n) && !/^(\d)\1+$/.test(n)) out.push({ id: 'aadhaar', sev: 'high', cat: 'dpdp', msg: 'Valid Aadhaar number in file', match: n.slice(0, 4) + ' XXXX ' + n.slice(8) });
  }
  return out;
}

function scan(text, rules, extra = {}) {
  const out = [];
  if (!text) return out;
  const lines = String(text).split(/\r?\n/);
  for (const rule of rules) {
    if (rule.re.flags.includes('m') || /\[\\s\\S\]/.test(rule.re.source)) {
      const m = String(text).match(rule.re);
      if (m) out.push({ id: rule.id, sev: rule.sev, cat: rule.cat, msg: rule.msg, line: String(text).slice(0, m.index).split('\n').length, match: m[0].slice(0, 120), ...extra });
      continue;
    }
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 20000) continue;
      const m = lines[i].match(rule.re);
      if (m) { out.push({ id: rule.id, sev: rule.sev, cat: rule.cat, msg: rule.msg, line: i + 1, match: m[0].slice(0, 120), ...extra }); break; }
    }
  }
  return out;
}

const PLACEHOLDER = /localhost|127\.0\.0\.1|0\.0\.0\.0|example|placeholder|changeme|your[_-]|xxx|<[^>]+>|:\/\/(user|username|admin|postgres|root|test):(pass|password|postgres|secret|test|admin|root|changeme)@/i;
function scanSecrets(text) {
  return [...scan(text, SECRET_RULES), ...jwtFindings(text)].map(f => (f.match && PLACEHOLDER.test(f.match)) ? { ...f, sev: 'low', msg: f.msg + ' (placeholder/local)' } : f);
}
// Blank out comment-only lines (keeps line numbers) so commented examples are not flagged.
function stripComments(text) {
  return String(text).replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).split('\n').map(l => /^\s*(\/\/|#(?!!)|\*|REM\b|::|<#|--\s)/i.test(l) ? '' : l).join('\n');
}
function scanInjection(text) {
  const out = scan(text, INJECTION_RULES);
  if (HIDDEN_UNICODE.test(text)) out.push({ id: 'hidden-unicode', sev: 'high', cat: 'injection', msg: 'Hidden/invisible Unicode characters (can smuggle instructions)' });
  const hc = String(text).match(HTML_COMMENT_INSTR);
  if (hc) out.push({ id: 'html-comment-instr', sev: 'medium', cat: 'injection', msg: 'Instructions hidden in HTML comment', match: hc[0].slice(0, 120) });
  return out;
}
function maxSev(findings) { return findings.reduce((m, f) => Math.max(m, SEV[f.sev] || 0), 0); }
function sevName(n) { return Object.keys(SEV).find(k => SEV[k] === n) || 'none'; }

module.exports = {
  SEV, COMMAND_RULES, SECRET_RULES, INJECTION_RULES, CODE_MALWARE_RULES, CODE_VULN_RULES, PLATFORM_RULES, PII_RULES,
  SECRET_PATH_IN_CMD, isSecretPath, scan, scanSecrets, stripComments, scanInjection, aadhaarFindings, verhoeff, maxSev, sevName, HIDDEN_UNICODE
};
