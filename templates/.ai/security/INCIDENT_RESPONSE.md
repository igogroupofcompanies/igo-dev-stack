# Incident Response
Severity: SEV1 data leak/active attack · SEV2 vuln exploitable · SEV3 hardening
1. **Contain** — rotate exposed keys, block IPs/WAF rule, "Under Attack", disable affected feature.
2. **Assess** — scope, data touched, timeline (logs, Cloudflare events).
3. **Eradicate** — fix + regression test (`SELF_HEAL_LOOP.md`).
4. **Recover** — deploy, monitor 24h.
5. **Notify** — users/regulators as required (DPDP/GDPR timelines).
6. **Post-mortem** — blameless, 5 whys, add rule to `THREAT_MODEL.md` + `MEMORY.md`.
## Contacts
| Role | Name | Phone/Email |
|---|---|---|
## Incident log
| Date | Sev | Summary | Resolution |
|---|---|---|---|
