# Security Policy
## Reporting: _security contact_ · response SLA
## Baseline controls
- [ ] Auth: MFA for admins, short-lived tokens, least privilege
- [ ] Secrets in vault; rotation schedule; secret scanning in CI
- [ ] Input validation + output encoding; parameterised queries only
- [ ] Dependency audit in CI (npm audit / pip-audit); lockfiles committed
- [ ] Logging without PII/secrets; audit log for admin actions
- [ ] Backups tested; restore drill quarterly
- [ ] Data protection: DPDP Act (India) / GDPR where applicable; retention + deletion process
## Release gate: no open High/Critical findings
