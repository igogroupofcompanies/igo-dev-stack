# Routing
| Task type | Agent / skill | Must read | Must run |
|---|---|---|---|
| New feature | planner → builder | PRD, ARCHITECTURE | tests, E2E |
| Bug | debugger (self-heal) | BUG_TRACKER, TROUBLESHOOTING | regression test |
| UI | frontend + browser QA | DESIGN_SYSTEM, USER_FLOWS | browser run |
| DB / API | backend | DATABASE, API_SPEC | migration dry-run |
| Security-touching | security-reviewer | SECURITY_POLICY, THREAT_MODEL | SECURITY_TESTS |
| Deploy | release | DEPLOYMENT, CLOUDFLARE_EDGE | pre-deploy checklist |
Escalate to human: prod data, payments, auth model changes, destructive ops, 3 failed self-heal rounds.
