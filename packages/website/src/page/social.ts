import type { Html } from 'foldkit/html'

import { Class, div, li, ul } from '../html'
import { Link } from '../link'
import type { TableOfContentsEntry } from '../main'
import { link, pageTitle, para } from '../prose'

export const tableOfContents: ReadonlyArray<TableOfContentsEntry> = []

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('social', 'Social'),
      para(
        'Follow Foldkit for updates, releases, and the occasional opinion on frontend architecture.',
      ),
      ul(
        [Class('space-y-3 mb-4')],
        [
          li([Class('leading-relaxed')], [link(Link.x, 'X (Twitter)')]),
          li([Class('leading-relaxed')], [link(Link.bluesky, 'Bluesky')]),
          li([Class('leading-relaxed')], [link(Link.threads, 'Threads')]),
        ],
      ),
    ],
  )
