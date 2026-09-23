import { Effect } from 'effect'

import { pushHistory, replaceHistory } from './history.js'

export { UrlRequest } from './urlRequest.js'

/** Pushes a new URL to browser history and triggers Foldkit's URL change handling:
 *  the new URL arrives as your `routing.onUrlChange` Message, the same way a
 *  back/forward navigation does. Parse the route there rather than where the
 *  push is issued. */
export const pushUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    pushHistory(url)
  })

/** Replaces the current URL in browser history and triggers Foldkit's URL change
 *  handling: the new URL arrives as your `routing.onUrlChange` Message. */
export const replaceUrl = (url: string): Effect.Effect<void> =>
  Effect.sync(() => {
    replaceHistory(url)
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
