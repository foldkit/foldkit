---
'foldkit': minor
---

Scene testing parity fixes:

- Add `Scene.all.label(text)` — the multi-match counterpart to `Scene.label`. Finds every element whose accessible label matches via the same four resolution strategies (`aria-label`, `<label for="id">`, nested `<label>`, `aria-labelledby`) and deduplicates. Closes a gap where the docs referenced `Scene.all.label` but it was never implemented.
- Backfill three Vitest matchers that previously only worked in the `Scene.expect(...).to*()` chain form: `toBeEmpty`, `toBeVisible`, `toHaveId`.
- `expect(element).toHaveText(/regex/)` and `toContainText(/regex/)` now accept `RegExp`, matching the chain form.

`toHaveAccessibleName` and `toHaveAccessibleDescription` remain chain-only because they need the root VNode tree to resolve `aria-labelledby` / `aria-describedby` id references — a tree the bare Vitest matchers don't receive.
