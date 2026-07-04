import { Dom } from 'foldkit'

// ❌ Bad
// Raw element methods throw on a missing node and sit outside the Effect flow.
const badFocus = (element: HTMLElement) => {
  element.focus()
}

// ✅ Good
// Foldkit's DOM helpers take a selector and return an Effect.
const goodFocus = Dom.focus('#email')
