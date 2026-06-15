---
'foldkit': patch
---

Key the render dispatch stack on a `globalThis` symbol so foldkit survives being instantiated more than once in a page. When a bundler split `foldkit` and `@foldkit/ui` into separate instances (Vite dev optimizing them in separate passes, or `@foldkit/ui` externalized while `foldkit` is inlined under Vitest), each copy got its own empty dispatch stack. The runtime pushed a render frame onto one instance's stack while a `@foldkit/ui` component's element constructors read another instance's empty stack, crashing with "must be called inside a runtime-driven render" or "dispatchAcrossBoundary missing wrap for ancestor". The stack now resolves to a single shared array regardless of how a bundler splits the module graph.
