---
'foldkit': minor
---

`Scene.click` now mirrors browser semantics more closely:

- Clicking a submit button (`<button>` with no type or `type="submit"`, `<input type="submit">`, `<input type="image">`) with no click handler of its own falls through to the `submit` handler of the nearest ancestor `<form>`. Tests can now click the submit button directly instead of reaching past it to the form.
- Clicking an element marked as disabled (`disabled` prop/attribute, or `aria-disabled="true"`) throws a clear error instead of silently invoking its click handler. Disabled elements don't dispatch click events in the browser, so tests shouldn't either.
