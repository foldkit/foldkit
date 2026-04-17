---
'foldkit': patch
---

Add ESLint `no-restricted-syntax` rules banning `new Date()`, `Date.now()`, and `Math.random()` — impure APIs that bypass Effect. Legitimate bridge sites in `calendar/` and `task/random.ts` use inline `eslint-disable-next-line`.
