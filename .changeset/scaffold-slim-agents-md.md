---
'create-foldkit-app': patch
---

Slim the scaffolded `AGENTS.md` and point it at the live Foldkit code as the canonical reference.

Two problems with the previous template:

1. It was 215 lines and duplicated rules from the foldkit project's `CLAUDE.md` and the `foldkit-skills` plugin docs (a fourth source of truth). It also included Day-N material like the full Mount section that a freshly scaffolded project doesn't need on Day 1.
2. It called `repos/foldkit/CLAUDE.md` the "canonical convention guide." That's wrong on two counts: `CLAUDE.md` is foldkit-repo-internal (has repo-specific scopes, file paths, dev rules) and isn't designed for consumer dev, and even within the foldkit repo, the live code (`examples/`, `packages/foldkit/src/`, the production apps) is more authoritative than any written summary.

The new version focuses on the Day-1 bootstrap brief: framing, the subtree prompt, the critical idioms (`update`, `view`, `evo`, `Dom`, `html` factory, file split), the highest-frequency code-style rules, Message naming prefixes, and the DevTools pointer. It consistently treats the live Foldkit code as canonical. API-specific examples that drift on signature changes (e.g. the `Command.define` shape, which is curried and has already changed once) are replaced with prose plus pointers to the actual example files. Advanced patterns (Mount, ManagedResource, Submodels, OutMessage, Subscriptions, routing, accessibility) defer to the live code via a "Going Deeper" pointer.

Existing scaffolded apps are unaffected. The change only affects new projects scaffolded with `create-foldkit-app`.
