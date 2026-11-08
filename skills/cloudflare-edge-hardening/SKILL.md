---
name: cloudflare-edge-hardening
description: Use when deploying a site/API behind Cloudflare, changing DNS/WAF/rate limits/headers, or auditing edge security. Applies the checklist in docs/security/CLOUDFLARE_EDGE.md.
---
# Cloudflare edge hardening
Checklist (tick in `docs/security/CLOUDFLARE_EDGE.md`): proxied DNS + DNSSEC · SSL Full(strict) + HSTS · origin lock (Tunnel or Authenticated Origin Pulls + firewall to CF IPs) · WAF managed + OWASP · rate limits on auth/API · Turnstile on forms · bot protection · security headers via Transform Rules · Access+MFA on admin/staging/ERP · no caching of authenticated responses · Security Events reviewed weekly.
Verify with: `curl -sI https://host` (headers), direct-origin-IP request (must fail), burst test on login (429).
Never paste API tokens into repo; use scoped tokens (Zone:Edit only for needed zones).
Changes to edge config must update the doc in the same PR.
