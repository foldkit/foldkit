---
'@foldkit/ui': patch
---

Complete Dialog cleanup after a failed native show or lifecycle resource acquisition. An open or animating Dialog resets, schedules `CloseDialog`, and emits `CompletedClose` after the native close, resource release, scroll unlock and focus restoration. `Closed` keeps its Model-transition timing. A parent that retains the Dialog until `CompletedClose` can now dispose of it after opening fails as well.

The conditional-parent lifecycle case was described by [Awjin in #1892](https://github.com/foldkit/foldkit/pull/1892). This preview repair uses the existing Dialog cleanup and completion path.

Keep inferred UI provider exports nameable in emitted declarations. The affected public entry points expose the names of their original child contract keys through type-only reexports; runtime exports and identities are unchanged.
