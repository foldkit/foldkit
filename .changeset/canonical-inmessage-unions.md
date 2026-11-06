---
'foldkit': minor
---

Add `defineInMessageUnion` as the canonical helper for ordinary Block parent-input contracts. It returns the same MessageUnion Schema, constructors, and exhaustive matcher as `defineMessageUnion`, while rejecting tags outside `Requested...` and `InformedOf...` at their literal property and rejecting invalid erased inputs at runtime. Extracted literal case records retain the same validation.

Migrate ordinary InMessage declarations by changing their helper import and call:

```ts
import { Schema } from 'effect'
import { defineInMessageUnion } from 'foldkit/message'

export const InMessage = defineInMessageUnion({
  RequestedSave: {},
  InformedOfRouteChange: { pathname: Schema.String },
})
export type InMessage = typeof InMessage.Type
```

Local Message and OutMessage unions continue to use `defineMessageUnion`. Existing custom Schema forms remain supported subject to the Block's existing constructor and tag validation. Generated names preserve the suffix exactly: `RequestedX` becomes `requestX`, and `InformedOfX` becomes `informOfX`, without aliases.
