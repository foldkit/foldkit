import { Dom } from 'foldkit'

// ❌ Bad
// Raw element methods throw on a missing node and sit outside Foldkit's helpers.
const badFocus = (element: HTMLElement) => {
  element.focus()
}

// ✅ Good
// Foldkit's DOM helpers return an Effect and handle the element safely.
const goodFocus = (id: string) => Dom.focus(id)
