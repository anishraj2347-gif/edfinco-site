# EdFinco blog — starter content

Blog posts now live in the **database**, not in this folder. The files here are only the
**starter content**, imported once when a fresh database starts (`lib/server/seed.ts`):

- `<slug>.md` → the three launch articles (imported as live posts)
- `TOPICS.md` → the topic backlog the writer works through (`- [ ]` open, `- [x]` done; the
  "processing fees" topic stays blocked until the owner confirms the fee wording)

After that, everything happens through the approval workflow: the Claude routine (Claude Pro plan)
writes each draft, the admin approves it by email or in `/admin`, and only approved posts go live.
See `docs/blog-automation-setup.md`.

- Writing + compliance rules given to the writer: `lib/server/writer-instructions.ts`
- Checks every draft must pass before the admin sees it: `lib/server/post-checks.ts`
- Rendering (safe Markdown subset, never raw HTML): `lib/markdown.ts`, `components/BlogMarkdown.tsx`

## Seed file format (only if you add another starter post)

```
---
title: "..."
description: "..."            # ≤155 chars
date: "YYYY-MM-DD"
author: "EdFinco Team"
tags: ["Education loans", "..."]
image: "/photos/<file>.jpg"
imageAlt: "..."
status: "published"
---
```

Body: `## ` / `### ` headings, paragraphs, `- ` bullets, `1. ` lists, `**bold**`, `[text](/path)` or
`[text](https://…)` links, single-line `> ` quotes. Files whose name isn't a lowercase-kebab slug
(this README, `TOPICS.md`) are never imported as posts. Seeding runs once per database.
