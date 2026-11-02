import { idSelector } from '../internal/selectors.js'

// CONSTANTS

export const SEARCH_DEBOUNCE_MILLISECONDS = 350
export const LEFT_MOUSE_BUTTON = 0

// SELECTORS

export const buttonSelector = (id: string): string => idSelector(`${id}-button`)

/** Returns the bare DOM id of the listbox trigger button, derived from the
 *  listbox's base id. Use this to associate an external label with the
 *  trigger via a native `<label for={Listbox.buttonId(id)}>` or an
 *  `aria-labelledby` reference. Mirrors `buttonSelector`, which returns the
 *  CSS selector form (`#${id}-button`) rather than the bare id. */
export const buttonId = (id: string): string => `${id}-button`

export const itemsSelector = (id: string): string => idSelector(`${id}-items`)
export const itemSelector = (id: string, index: number): string =>
  idSelector(`${id}-item-${index}`)
export const itemId = (id: string, index: number): string =>
  `${id}-item-${index}`
