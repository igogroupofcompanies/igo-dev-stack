# MCP Sandbox Policy
- Run MCP/browsers in dev/staging only; separate browser profile; no personal logins.
- Network allowlist: localhost, staging host, doc sites. Deny everything else.
- Filesystem: project dir only; no `~/.ssh`, `~/.aws`, `.env*`.
- DB: read-only role; no prod credentials on dev machines.
- Pin versions; review new servers' source & permissions; remove unused.
- Human approval for: write/delete, deploy, payments, sending messages, installing packages.
- Log every tool call (name, args hash, result status).
