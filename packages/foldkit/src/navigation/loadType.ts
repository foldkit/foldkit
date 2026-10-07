import { Schema } from 'effect'

import { defineTaggedUnion } from '../schema/index.js'
import { ScrollPosition } from './scrollPosition.js'

/** How the reader arrived at the page, as a routing application's `init`
 *  receives it after the URL.
 *
 *  - `Push`: a new visit, such as following a link from another site or
 *    typing the address.
 *  - `Reload`: the page was reloaded.
 *  - `Traverse`: Back or Forward returned to the page from another document.
 *
 *  Only the first routing `init` in a page receives `Reload` or `Traverse`.
 *  Any later `init` in the same page, of this application or another, such as
 *  the one `Runtime.embed` runs after a dispose, receives `Push`, because the
 *  document was not loaded again.
 *
 *  `Reload` and `Traverse` carry `maybeSavedScrollPosition`, the window scroll
 *  position the reader last had on the current history entry, or
 *  `Option.none()` when none was recorded. A server render always passes
 *  `Push`.
 *
 *  The runtime only reports the load. It never scrolls the window and never
 *  changes `history.scrollRestoration`, so restoring the position is a
 *  Command that `init` returns. */
export const LoadType = defineTaggedUnion({
  Push: {},
  Reload: { maybeSavedScrollPosition: Schema.Option(ScrollPosition) },
  Traverse: { maybeSavedScrollPosition: Schema.Option(ScrollPosition) },
})
/** How the reader arrived at the page: `Push`, `Reload`, or `Traverse`. */
export type LoadType = typeof LoadType.Type
