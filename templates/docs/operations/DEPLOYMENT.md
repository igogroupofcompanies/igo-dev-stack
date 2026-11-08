# Deployment
Environments: dev · staging · prod
Pipeline: lint → test → build → preview → approval → prod
Rollback: _exact steps_
Secrets: stored in _vault / Cloudflare / platform_, never in repo.
Pre-deploy checklist: tests green · migrations reviewed · `CLOUDFLARE_EDGE.md` rules in sync · CHANGELOG updated.
