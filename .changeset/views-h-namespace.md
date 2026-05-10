---
'foldkit': patch
---

Adopt a single canonical convention for the html factory inside view code: bind `html<...>()` to a local `h` in the scope where the relevant Message type is available, then access elements, attributes, and event handlers as `h.div`, `h.OnClick`, etc.

Previously, view code destructured individual elements and attribute builders out of `html<...>()`. Generic Submodel views (like `Ui.Disclosure.view`) destructured inside the function body, where the `<ParentMessage>` generic was in scope. Views bound to a fixed Message type at module level destructured once at the top of the module, sometimes re-exported from a per-app `html.ts` file. The new convention collapses both onto the same dotted shape.

Pure style change inside foldkit's UI components, devtools overlay, crash view, and the README counter example. The `html` function and the record it returns are unchanged; existing apps continue to run.

The same convention applied to consumer code is documented under the new "Wiring the View" section in the website's Submodels docs, which describes how to keep child views truly generic over a parent's Message type by taking `<ParentMessage>` as a function generic rather than an imported alias.
