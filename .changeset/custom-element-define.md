---
'foldkit': minor
'create-foldkit-app': minor
---

Add `CustomElement.define` for binding native web components to Foldkit programs.

Declare the element's properties and events with Schema once. `CustomElement.define` returns a spec; call `.withMessage<Message>()` inside a view module to mint a typed builder. Property factories become PascalCase methods, event factories become `On{PascalCase}` methods, all checked against the declared Schema. Property writes diff across renders, and `CustomEvent`s come back as Messages, with no manual property or event wiring at the call site.

```ts
import { Schema as S } from 'effect'
import { CustomElement } from 'foldkit'
import 'vanilla-colorful/hex-color-picker.js'

const hexColorPicker = CustomElement.define({
  tag: 'hex-color-picker',
  properties: {
    color: S.String,
  },
  events: {
    'color-changed': S.Struct({ value: S.String }),
  },
})

const picker = hexColorPicker.withMessage<Message>()

picker([
  picker.Color(model.color),
  picker.OnColorChanged(detail => ChangedColor({ value: detail.value })),
])
```

Also adds a `web-components` starter to `create-foldkit-app` demonstrating the API end-to-end with two real third-party web components (`vanilla-colorful` and `@shoelace-style/shoelace`) communicating through the Model.
