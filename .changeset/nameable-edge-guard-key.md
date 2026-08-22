---
'foldkit': patch
---

Let a consumer export a Machine Edge built with `to` or `when` from `foldkit/experimental/machine`.

`Edge` has a hidden field that carries the guard value type. Its key was a `unique symbol` that Foldkit did not export. TypeScript had to write that key into the consumer's `.d.ts` file, but it had no name for it, so it failed with `TS4023: ... has or is using name 'EdgeGuardValueTypeId' ... but cannot be named`. This hit any package that builds an Edge in one module and exports it, as soon as that package turned on declaration emit. `When`, `Otherwise`, and `TransitionTable` embed `Edge`, so exporting any of them hit the same error.

The key is now a normal property, `'~foldkit/EdgeGuardValue'`, following the same fix as the runtime boot key. Consumers need to do nothing. The field is still internal and still has no runtime representation.
