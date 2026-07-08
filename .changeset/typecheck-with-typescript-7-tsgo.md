---
---

Internal tooling change with no public API or shipped-output change: type-check and build with TypeScript 7 via the native `tsgo` compiler (`@typescript/native-preview`). Every `tsc` invocation in package scripts now runs `tsgo`. The `typescript` 6 package stays installed because typedoc and the `check-effect-prebundle` script depend on the classic compiler API that TypeScript 7 does not yet expose, so they continue to run against it side by side. No release needed.
