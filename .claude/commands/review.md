---
description: "Run a full code review on recent changes - checks type safety, naming, security, and project standards"
agent: "code-review"
argument-hint: "Scope of review, e.g. 'all backend services' or 'admin-api auth module'"
---

Review the following for quality, security, and standards compliance:

**Scope:** {{ input }}

See `code-review.md` for the full checklist. Report findings as Blockers (must fix), Warnings (should fix), and Suggestions (nice to have).
