import { Schema } from 'effect'

import { defineTaggedUnion } from '../schema/index.js'
import { ScrollPosition } from './scrollPosition.js'

/** How the URL changed, as `routing.onUrlChange` receives it after the URL.
 *
 *  - `Push`: `pushUrl` added a new history entry.
 *  - `Replace`: `replaceUrl` replaced the current entry.
 *  - `Traverse`: a `popstate` arrived, usually from Back, Forward, or
 *    `history.go` returning to an earlier entry.
 *
 *  `Traverse` carries `maybeSavedScrollPosition`, the window scroll position
 *  the reader last had on the entry, or `Option.none()` when none was
 *  recorded. An entry Foldkit has never seen has no position. That includes
 *  the new entry a native fragment navigation creates, such as
 *  `location.hash = '#details'`, which the browser also reports with
 *  `popstate`.
 *
 *  The runtime only reports the change. It never scrolls the window and never
 *  changes `history.scrollRestoration`, so scrolling to the top or restoring
 *  the position is a Command that update returns. */
export const UrlChangeType = defineTaggedUnion({
  Push: {},
  Replace: {},
  Traverse: { maybeSavedScrollPosition: Schema.Option(ScrollPosition) },
})
/** How the URL changed: `Push`, `Replace`, or `Traverse`. */
export type UrlChangeType = typeof UrlChangeType.Type
