---
'foldkit': minor
---

`Scene.click` on a submit button (`<button>` with no type or `type="submit"`, `<input type="submit">`, `<input type="image">`) now falls through to the `submit` handler of the nearest ancestor `<form>` when the button has no click handler of its own — mirroring browser behavior. Tests can now click the submit button directly instead of reaching past it to the form. Disabled buttons do not fall through.
