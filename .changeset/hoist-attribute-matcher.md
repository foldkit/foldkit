---
'foldkit': patch
---

Faster un-memoized view rendering. The HTML attribute matcher used to be built once per VNode inside `buildVNodeData`; it is now built once at module load and shared across every VNode.

In the lustre-labs/benchmark TodoMVC runbook (100 adds + 100 toggles + 100 destroys, Chrome):

- Foldkit naive: 1,570 ms -> 590 ms
- Foldkit optimised (`createKeyedLazy` + `createLazy`): 267 ms -> 269 ms (within noise)

The optimised slot did not move because `createKeyedLazy` already short-circuits the hot path through reference-equality memoization, so per-VNode matcher construction was never reached for cached subtrees. The change benefits view code that has not yet been wrapped in lazy boundaries.
