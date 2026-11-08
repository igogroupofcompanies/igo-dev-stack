# Context Map (what to load for what)
| Area | Paths | Notes |
|---|---|---|
| Frontend | `src/app/**`, `docs/architecture/DESIGN_SYSTEM.md` | |
| Backend | `src/api/**`, `docs/architecture/API_SPEC.md` | |
| DB | `migrations/**`, `docs/architecture/DATABASE.md` | |
| Infra | `docs/operations/DEPLOYMENT.md`, `docs/security/CLOUDFLARE_EDGE.md` | |
Never load: `node_modules`, build output, lockfiles, `.env*`, binaries.
