import { Array } from 'effect'
import type { Html } from 'foldkit/html'

import { Class, Href, a, div, table, tbody, td, th, thead, tr } from '../html'
import { Link } from '../link'
import { pageTitle, para } from '../prose'
import { exampleDetailRouter, gettingStartedRouter } from '../route'
import { type ExampleMeta, examples as exampleMetas } from './example/meta'

export const exampleAppCount = exampleMetas.length + 1

const nameClassName =
  'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-medium'

const exampleRow = (example: ExampleMeta): Html =>
  tr(
    [Class('border-b border-gray-200 dark:border-gray-700/50')],
    [
      td(
        [Class('py-2.5 pr-4 whitespace-nowrap align-top')],
        [
          a(
            [
              Href(exampleDetailRouter({ exampleSlug: example.slug })),
              Class(nameClassName),
            ],
            [example.title],
          ),
        ],
      ),
      td(
        [Class('py-2.5 text-gray-600 dark:text-gray-400')],
        [example.description],
      ),
    ],
  )

const typingTerminalRow: Html = tr(
  [Class('border-b border-gray-200 dark:border-gray-700/50')],
  [
    td(
      [Class('py-2.5 pr-4 whitespace-nowrap align-top')],
      [
        a(
          [Href(Link.typingTerminalSource), Class(nameClassName)],
          ['Typing Terminal'],
        ),
      ],
    ),
    td(
      [Class('py-2.5 text-gray-600 dark:text-gray-400')],
      [
        div(
          [],
          [
            'A production real-time multiplayer typing speed game. Full stack Effect app with RPC backend and Foldkit frontend.',
          ],
        ),
        a(
          [
            Href(Link.typingTerminal),
            Class(
              'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 mt-1 inline-block',
            ),
          ],
          ['Race your friends →'],
        ),
      ],
    ),
  ],
)

const headerCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

const examplesTable: Html = div(
  [Class('mb-8')],
  [
    table(
      [Class('w-full text-sm')],
      [
        thead(
          [],
          [
            tr(
              [],
              [
                th([Class(headerCellClassName)], ['Example']),
                th([Class(headerCellClassName)], ['Description']),
              ],
            ),
          ],
        ),
        tbody([], [...Array.map(exampleMetas, exampleRow), typingTerminalRow]),
      ],
    ),
  ],
)

export const view = (): Html =>
  div(
    [],
    [
      pageTitle('examples', 'Examples'),
      para(
        'Each example is available as a starter template via ',
        a(
          [
            Href(Link.createFoldkitApp),
            Class(
              'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
            ),
          ],
          ['Create Foldkit App'],
        ),
        '. Pick one that matches what you\u2019re building, or start with Counter and work your way up. See ',
        a(
          [
            Href(gettingStartedRouter()),
            Class(
              'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
            ),
          ],
          ['Getting Started'],
        ),
        ' to get up and running.',
      ),
      examplesTable,
    ],
  )
