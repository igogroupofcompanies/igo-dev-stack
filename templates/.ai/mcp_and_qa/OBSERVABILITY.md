# Observability
| Signal | Where | Checked when |
|---|---|---|
| Browser console | browser agent | every E2E flow |
| Network 4xx/5xx | browser agent | every E2E flow |
| App logs | _platform_ | after deploy / on failure |
| Edge events | Cloudflare Security Events | weekly + incidents |
| Uptime / errors | _Sentry/UptimeRobot_ | continuous |
Log hygiene: structured JSON, request IDs, no PII/secrets.
