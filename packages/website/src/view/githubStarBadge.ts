import { clsx } from 'clsx'
import { Option } from 'effect'
import { Html, inertHtml as ih } from 'foldkit/html'

import { formatStarCount } from '../githubStars'
import { Icon } from '../icon'

const STAR_COUNT_MIN_WIDTH = 'min-w-[3ch]'

export const view = (maybeGitHubStarCount: Option.Option<number>): Html => {
  const badge = (label: Html): Html =>
    ih.span(
      [
        ih.Class(
          'inline-flex items-center gap-1 rounded-full bg-gray-900 dark:bg-white px-2 pt-0.5 pb-0.75 text-xs font-semibold text-white dark:text-gray-900',
        ),
        ih.AriaHidden(true),
      ],
      [
        Icon.star('w-3.5 h-3.5'),
        ih.span(
          [
            ih.Class(
              clsx(
                'mt-px inline-flex justify-center tabular-nums',
                STAR_COUNT_MIN_WIDTH,
              ),
            ),
          ],
          [label],
        ),
      ],
    )

  return Option.match(maybeGitHubStarCount, {
    onNone: () => ih.empty,
    onSome: count => badge(ih.span([], [formatStarCount(count)])),
  })
}
