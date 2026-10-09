---
'foldkit': minor
---

`Scene.expect(locator).toHaveAttrs` and the Vitest matcher assert several attributes in one call. The assertion passes only when every name and value matches. A failure names each missing or mismatched attribute. `expect(locator).not.toHaveAttrs` passes when that set as a whole does not match. An empty set of attributes throws, since it would assert nothing.

`toHaveAttr(name, value?)` is unchanged. A presence-only check stays on the singular matcher.
