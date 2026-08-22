---
'foldkit': minor
---

`Machine.unreachableStates` and `Machine.deadTransitions` accept an optional array of extra walk roots for entry states the declared Edge set does not reach from `initial`, such as states restored from persistence or entered through deep links. The roots are additive: `initial` is always a root, so passing extra roots can only shrink the findings. The analysis docs now state their assumptions plainly: the results describe the declared Edge set walked from its roots, the walk cannot see state advanced outside `transition` and `step`, and entry points other than `initial` must be passed as extra roots or the analysis reports false positives.
