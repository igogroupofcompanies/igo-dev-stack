# MCP Servers (allowlist)
Only servers listed here may be used. Add via PR + security-reviewer approval.
| Server | Purpose | Scope / permissions | Secrets via | Approved by |
|---|---|---|---|---|
| browser (Chrome/Playwright) | E2E QA | localhost + staging only | — | |
| docs (Context7) | library docs | read-only | — | |
| db (Supabase) | schema/query | **dev/staging only**, read-only by default | env | |
Rules: least privilege · pin versions · no prod write access · log tool calls · see `MCP_SANDBOX_POLICY.md`.
