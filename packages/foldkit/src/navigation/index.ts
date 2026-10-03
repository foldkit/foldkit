import { Effect } from 'effect'

import {
  currentEntryKey,
  recordLeavingEntryAndCreateKey,
} from './historyEntries.js'
import { UrlChangeType } from './urlChangeType.js'

export { LoadType } from './loadType.js'
export { ScrollPosition } from './scrollPosition.js'
export { UrlChangeType } from './urlChangeType.js'
export { UrlRequest } from './urlRequest.js'

/** Pushes a new URL to browser history and triggers Foldkit's URL change
 *  handling with `UrlChangeType.Push()`. Records the window scroll position of
 *  the entry being left, and writes `{ foldkitEntryKey }` as the new entry's
 *  history state, so a later Back or Forward can report where the reader was. */
export const pushUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    window.history.pushState(
      { foldkitEntryKey: recordLeavingEntryAndCreateKey() },
      '',
      url,
    )
    window.dispatchEvent(
      new CustomEvent('foldkit:urlchange', { detail: UrlChangeType.Push() }),
    )
  })

/** Replaces the current URL in browser history and triggers Foldkit's URL
 *  change handling with `UrlChangeType.Replace()`. Writes
 *  `{ foldkitEntryKey }` as the history state, keeping the current entry's
 *  key. */
export const replaceUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    window.history.replaceState({ foldkitEntryKey: currentEntryKey() }, '', url)
    window.dispatchEvent(
      new CustomEvent('foldkit:urlchange', {
        detail: UrlChangeType.Replace(),
      }),
    )
  })

/** Navigates back in browser history. */
export const back = (): Effect.Effect<void> =>
  Effect.sync(() => window.history.back())

/** Navigates forward in browser history. */
export const forward = (): Effect.Effect<void> =>
  Effect.sync(() => window.history.forward())

/** Performs a full page navigation to the given href. */
export const load = (href: string): Effect.Effect<void> =>
  Effect.sync(() => window.location.assign(href))

/** Opens the given href in a new browsing context (tab or window, at the browser's discretion).
 *  The current page is unchanged. Subject to popup blockers when not called from a user-gesture handler. */
export const openUrl = (href: string): Effect.Effect<void> =>
  Effect.sync(() => {
    window.open(href, '_blank', 'noopener,noreferrer')
  })
