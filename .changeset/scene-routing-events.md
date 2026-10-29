---
'foldkit': minor
---

Add explicit URL-change delivery to Scene tests. Configure `routing.onUrlChange` with the Program's callback or canonical Message constructor, then use `Navigation.changedUrl` to run update and render the next view. Navigation Command completion and URL delivery are separate test steps; Scene does not execute navigation Effects or emulate browser history.

Relative URL references resolve against a fixed `http://localhost/` origin by default. Set `routing.origin` to test another origin. URL delivery preserves pending Command, Mount, unmount, and OutMessage bookkeeping, including `Command.keepPending` for an exact invocation whose completion arrives later.
