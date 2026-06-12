---
'foldkit': patch
---

Add an experimental statechart spike at `src/statechart/`: a declarative transition table that compiles to a plain `transition(state, message) => [nextState, commands]` function. Not exported from the package surface and not part of the public API; findings live in `src/statechart/SPIKE_NOTES.md`.
