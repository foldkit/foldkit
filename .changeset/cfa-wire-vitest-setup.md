---
'create-foldkit-app': patch
---

Wire Scene matchers into the scaffolded project. The base template now ships
`src/vitest-setup.ts` (three lines: `import { setup } from 'foldkit/test/vitest'; setup()`) and `vitest.config.ts` registers it via `setupFiles`. Previously,
projects scaffolded with `--example form|weather|todo|auth|kanban|pixel-art`
pulled in the example's `src/vitest-setup.ts` and scene tests but never ran the
setup file — Scene matcher assertions would fail at runtime.
