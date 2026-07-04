import { html } from 'foldkit/html'

import { Input } from '@foldkit/ui'

const h = html<Message>()

// ❌ Bad
// Dropping the attribute bundle discards the ARIA, handlers, and Submodel
// wiring Foldkit provides.
const badInput = Input.view({
  toView: ({ input }) => h.input([h.Class('border')]),
})

// ✅ Good
const goodInput = Input.view({
  toView: ({ input }) => h.input([...input, h.Class('border')]),
})
