import { Html, inertHtml as ih } from 'foldkit/html'

import { type PreviewRelease, scaffoldCommand } from '../previewRelease'
import { previewMigrationRouter, previewUpgradeRouter } from '../route'

const packageLink = ([name, version]: readonly [string, string]): Html =>
  ih.a(
    [
      ih.Href(`https://www.npmjs.com/package/${name}/v/${version}`),
      ih.Class(
        'inline-flex min-h-6 items-center font-mono underline hover:no-underline',
      ),
    ],
    [`${name}@${version}`],
  )

const command = (value: string): Html =>
  ih.code(
    [
      ih.Class(
        'block overflow-x-auto rounded-sm bg-amber-50 px-2 py-1 font-mono text-[11px] dark:bg-amber-900/70',
      ),
    ],
    [value],
  )

export const view = (release: PreviewRelease): Html => {
  const shortCommit = release.sourceCommit.slice(0, 7)
  const packageLinks = Object.entries(release.packages)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(packageLink)

  return ih.aside(
    [
      ih.AriaLabel('Integration preview'),
      ih.Class(
        'relative z-50 mx-auto my-3 w-[min(52rem,calc(100vw-1.5rem))] rounded-lg border border-amber-300 bg-amber-100/95 px-3 py-2 text-xs text-amber-950 shadow-lg backdrop-blur-sm dark:border-amber-700 dark:bg-amber-950/95 dark:text-amber-100',
      ),
    ],
    [
      ih.div(
        [ih.Class('flex flex-wrap items-center gap-x-2 gap-y-1 font-medium')],
        [
          'Integration preview · ',
          ih.a(
            [
              ih.Href(
                `https://github.com/foldkit/foldkit/commit/${release.sourceCommit}`,
              ),
              ih.Class('font-mono underline hover:no-underline'),
            ],
            [shortCommit],
          ),
        ],
      ),
      ih.div(
        [ih.Class('mt-1 flex max-h-12 flex-wrap gap-x-2 overflow-y-auto')],
        packageLinks,
      ),
      ih.div([ih.Class('mt-2')], [command(scaffoldCommand(release))]),
      ih.p(
        [ih.Class('mt-2')],
        [
          'Existing project? ',
          ih.a(
            [
              ih.Href(previewMigrationRouter()),
              ih.Class('underline hover:no-underline'),
            ],
            ['Migrate from stable'],
          ),
          ' · ',
          ih.a(
            [
              ih.Href(previewUpgradeRouter()),
              ih.Class('underline hover:no-underline'),
            ],
            ['Upgrade an earlier preview'],
          ),
          '. Update only the packages your project uses, keeping development dependencies in place.',
        ],
      ),
    ],
  )
}
