---
'foldkit': minor
---

Rename `boundaryAttributes` to `childAttributes` and `BoundaryAttribute` to `ChildAttribute`.

The "boundary" name was framework-internal jargon: consumers don't reason about boundaries, they reason about which side of the parent-child relationship owns what. The rename slots the API into the role-named column alongside the existing `viewInputs` (parent → child view), `context` (parent → child update), and `OutMessage` (child → parent update). `childAttributes` is now "what the child publishes to the parent" in the same vocabulary.

### Migration

```ts
// Before
import { type BoundaryAttribute, boundaryAttributes } from 'foldkit/html'
// After
import { type ChildAttribute, childAttributes } from 'foldkit/html'

return viewInputs.toView({
  button: boundaryAttributes([h.OnClick(Toggled())]),
  panel: boundaryAttributes([h.Id(panelId(model.id))]),
})

return viewInputs.toView({
  button: childAttributes([h.OnClick(Toggled())]),
  panel: childAttributes([h.Id(panelId(model.id))]),
})
```

The runtime behavior is unchanged. Every interactive Foldkit UI primitive uses the new name internally; consumer migration is a mechanical find-replace on the two identifiers.
