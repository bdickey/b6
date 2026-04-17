# AGENT_LOG.md — benji-hq

Coordination layer between Harvey (mini) and Claude Code (laptop).
**Read this before starting work. Write to it after any change.**

## Protocol

**Before starting ANY work:**
1. `git pull origin main`
2. Read the last 5 entries in this file
3. If another agent marked something IN-PROGRESS, check with Ben before touching those files

**After EVERY meaningful change:**
1. `git add -A && git commit -m "clear description"`
2. `git push origin main`
3. Append a line here (newest at top): `[YYYY-MM-DD HH:MM PDT] [AGENT] [STATUS] — What changed`

STATUS options: `STARTED` | `IN-PROGRESS` | `DONE` | `DEPLOYED` | `BROKEN`

**Agents:** Harvey = mini (via Telegram) | Claude Code = laptop terminal sessions

---

## Log (newest first)

[2026-04-17 17:00 PDT] Harvey (mini) DONE — Added AGENT_LOG.md coordination layer
