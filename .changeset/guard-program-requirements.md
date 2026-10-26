---
'foldkit': patch
---

Prevent false Mount type errors that depended on the native TypeScript compiler's checker count. Program constructors now avoid recursively extracting requirements from a broad Block fallback when rejecting an invalid root. This prevents the rejection from reaching the compiler's instantiation depth limit and affecting later cached type results. Program validation and service requirements remain enforced for source and emitted declarations.
