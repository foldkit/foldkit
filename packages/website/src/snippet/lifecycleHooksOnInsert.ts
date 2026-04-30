import type { Html } from 'foldkit/html'

import { Class, OnInsert, Placeholder, Type, input } from '../html'

// Focus the input as soon as it lands in the DOM. Synchronous,
// fire-and-forget. No Message is produced because nothing about the
// Model needs to change.

const focusOnInsert = (element: Element): void => {
  if (element instanceof HTMLElement) {
    element.focus()
  }
}

const searchInputView = (): Html =>
  input(
    [
      Type('text'),
      Placeholder('Search...'),
      Class('border rounded px-2 py-1'),
      OnInsert(focusOnInsert),
    ],
    [],
  )
