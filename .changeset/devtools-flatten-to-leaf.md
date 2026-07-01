---
'@foldkit/devtools': minor
---

Add a "Flatten to leaf message" toggle to the DevTools message list.

The message list labels each row by its outermost `Got*Message` wrapper, so a
deeply nested submodel event shows up as a wall of identical parent tags (for
example every keystroke in a login form reads `GotLoggedOutMessage`). Reading
the actual innermost message previously meant picking the right scope in the
submodel filter dropdown.

The new checkbox, shown alongside the submodel filter, relabels every row with
its most nested child message tag while leaving the filter untouched. It is a
relabel, not a filter, so it composes with the scope dropdown rather than
replacing it. When flatten is on, the inspector's Message tab also unwraps the
selected message to its leaf so the label and the inspected value agree. The
toggle is built on the `@foldkit/ui` Checkbox component.

The setting persists to localStorage, so it survives a page reload. It is read
at overlay boot via the Flags pattern and written from a Command on each
toggle.
