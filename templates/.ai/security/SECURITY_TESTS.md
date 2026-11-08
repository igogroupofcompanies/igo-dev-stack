# Security Tests
| ID | Test | Method | Expected |
|---|---|---|---|
| S1 | AuthZ: user A cannot read user B data | API calls w/ 2 test users | 403/404 |
| S2 | Injection (SQL/XSS) on every input | payload list | sanitized / rejected |
| S3 | Rate limit on login/OTP | burst requests | 429 |
| S4 | Security headers present | curl -I | CSP, HSTS, nosniff |
| S5 | Secrets scan | gitleaks/trufflehog | 0 findings |
| S6 | Dependency audit | npm audit / pip-audit | 0 High/Critical |
| S7 | Origin not reachable directly | curl origin IP | blocked |
| S8 | Prompt-injection canaries | PROMPT_INJECTION_DEFENSE.md | all refused |
| S9 | MCP scope check | MCP_SANDBOX_POLICY.md | no prod/write access |
