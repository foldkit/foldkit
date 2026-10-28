---
'foldkit': minor
---

Add `Scene.unhover(target)`, the counterpart to `Scene.hover`. It invokes the target's `OnMouseLeave` handler, or its `OnMouseOut` handler when the element has no `OnMouseLeave`, and feeds the resulting Message through update. A Scene test can now close a hover card, tooltip, or pause-on-hover toast the way a person does. When the element has neither handler, `unhover` throws an error that names the missing `OnMouseLeave` attribute.

```ts
import { expect, hover, role, unhover } from 'foldkit/scene'

hover(role('link', { name: 'Ada Lovelace' }))
expect(role('region', { name: 'Profile preview' })).toExist()
unhover(role('link', { name: 'Ada Lovelace' }))
expect(role('region', { name: 'Profile preview' })).toBeAbsent()
```
