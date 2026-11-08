---
name: igo-security-review
description: Runs an internal security and compliance review of a codebase or a change - secrets in code, OWASP Top 10 vulnerabilities, DPDP Act personal data (Aadhaar, PAN, phone, farmer data), vulnerable dependencies, Supabase RLS and Vercel/public env exposure. Use for "security review", "audit our ERP/website/app", "check for secrets", "DPDP compliance check", "is this safe to deploy", before releases, and after large changes.
---

# IGO Security Review (features 15-19)

## Run
```
node "${CLAUDE_PLUGIN_ROOT}/scripts/igo-sec.js" review [project-folder] [--deep] [--no-net]
```
- `--deep` also runs Semgrep OWASP rules if `semgrep` is installed. Gitleaks runs automatically if installed.
- Report saved to `~/.claude/igo-security/reviews/`. Exit code 2 if anything critical.
- Quick secret scan only: `igo-sec scan-secrets [dir]` or `igo-sec scan-secrets --staged` (staged git changes).

## Sections
| # | Check | Notes |
|---|---|---|
| 16 | Secrets | AWS, GitHub, Anthropic, OpenAI, Google, Slack, Stripe/Razorpay live keys, private keys, DB URLs with passwords, Supabase service_role JWTs; secret files present; `.env` missing from `.gitignore` |
| 15 | OWASP Top 10 | SQL/NoSQL/command injection, XSS sinks, path traversal, open redirect, SSRF, weak hash/randomness, JWT verification off, TLS off, CORS `*`, debug on, insecure cookies, unsafe deserialisation, mass assignment |
| 19 | Supabase / Vercel | secrets in `NEXT_PUBLIC_*`/`VITE_*`, service_role or `auth.admin` in client code, RLS disabled, `USING (true)` policies, public buckets. Includes SQL to run live (Supabase MCP `execute_sql` if connected) |
| 17 | DPDP Act 2023 | valid Aadhaar numbers (Verhoeff-checked), PAN, phone numbers in data files, PII written to logs, Aadhaar stored as plain text, PII fields with no consent handling |
| 18 | Dependencies | npm/PyPI versions against OSV.dev; unpinned versions |

## Per-change review (any diff touching auth, sessions, payments, personal data, uploads, secrets, SQL, integrations)
Check: authN/authZ per endpoint (IDOR) · input validation · parameterised queries · output encoding/CSP · CSRF/CORS · file upload type/size/path · secrets handling · SSRF · rate limiting · PII in logs · dependency CVEs · error leakage · RLS policies. Output a table: finding · severity · file:line · fix. Block merge on High/Critical. In blueprint projects add new threats to `docs/security/THREAT_MODEL.md` and a test to `.ai/security/SECURITY_TESTS.md`.

## After the scan
1. Verify each critical/high finding by reading the code - drop false positives, say why.
2. Fix critical issues first (rotate any exposed key - deleting it from code is not enough).
3. For DPDP: mask/hash Aadhaar, never log PII, add consent + purpose, restrict access (RLS).
4. If Supabase is connected, run the SQL block and report tables without RLS.
5. Give the user a short graded summary (A-F), top 5 fixes, and the saved report path.
