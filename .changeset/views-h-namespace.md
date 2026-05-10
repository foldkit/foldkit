---
'foldkit': patch
---

Adopt a single canonical convention for binding the `html` factory: each view module binds `const h = html<Message>()` once at the top, and call sites reach for elements, attributes, and event handlers through `h.div`, `h.OnClick`, etc. Previously the convention was to destructure into individual local names, optionally re-exported from a per-app `html.ts` file shared across the codebase.

The dotted form makes it explicit which Message type each call site is typed against, removes the need for a shared `html.ts` re-export, and unblocks an important pattern: child views can now be truly generic over `<ParentMessage>` and bind `html<ParentMessage>()` inside the function body, rather than being implicitly tied to a specific parent's Message via the shared file. This is the load-bearing piece that lets a child view be embedded under any parent that supplies a `toParentMessage` callback. The new "Wiring the View" section under Submodels in the docs walks through the pattern.

No runtime behavior change. No public API change. The `html` function and the record it returns are unchanged. Existing apps continue to work; the change is in convention only.
