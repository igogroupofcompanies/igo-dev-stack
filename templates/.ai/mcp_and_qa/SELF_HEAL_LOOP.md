# Self-Heal Loop
```
RUN E2E → fail? → LOG bug → DIAGNOSE (console, network, logs, git diff)
 → WRITE failing regression test → FIX minimal → RE-RUN unit + that flow + full P0 flows
 → pass? → update BUG_TRACKER + TROUBLESHOOTING → done
 → fail? → round++ ; round > 3 → STOP, write HANDOFF, ask human
```
Rules: one bug per round · no test deletion/skipping to go green · no disabling security checks · never touch prod · S1 security bugs stop the loop and trigger `INCIDENT_RESPONSE.md`.
