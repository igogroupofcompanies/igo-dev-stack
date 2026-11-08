# Cloudflare Edge Security
| Control | Setting | Status |
|---|---|---|
| DNS | Proxied (orange cloud) for all app hosts; DNSSEC on | ☐ |
| TLS | Full (strict), min TLS 1.2, HSTS (6–12 months), Always HTTPS | ☐ |
| Origin lock | Authenticated Origin Pulls or Cloudflare Tunnel; origin firewall allows only CF IPs | ☐ |
| WAF | Managed ruleset + OWASP core ruleset on; custom rules below | ☐ |
| Rate limiting | Login/OTP/API: e.g. 5 req/min/IP on auth, 100 req/min/IP on API | ☐ |
| Bot protection | Bot Fight / Super Bot Fight; Turnstile on forms & signup | ☐ |
| DDoS | Default L3/4/7 protection on; "Under Attack" runbook below | ☐ |
| Headers (Transform Rules) | CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options/frame-ancestors | ☐ |
| Access (Zero Trust) | Admin/staging/ERP panels behind Cloudflare Access + MFA | ☐ |
| Cache | Never cache authenticated/API responses; cache static only | ☐ |
| Logging | Logpush/Security events reviewed weekly | ☐ |
## Custom WAF rules
- Block known bad paths (`/.env`, `/.git`, `/wp-admin` if not WordPress)
- Challenge non-IN traffic to admin routes (if applicable)
## Runbook: under attack
1. Dashboard → Security → "I'm Under Attack" 2. Tighten rate limits 3. Check origin load 4. Log in `INCIDENT_RESPONSE.md`
