import { Array } from 'effect'
import { type Html, inertHtml as ih } from 'foldkit/html'

import { Link } from '../link'
import { pageTitle, para } from '../prose'
import {
  exampleDetailRouter,
  getStartedRouter,
  typingTerminalRouter,
} from '../route'
import { type ExampleMeta, examples as exampleMetas } from './example/meta'

export const exampleAppCount = exampleMetas.length + 1

const nameClassName = 'link-accent font-medium'

const exampleRow = (example: ExampleMeta): Html =>
  ih.tr(
    [ih.Class('border-b border-gray-200 dark:border-gray-700/50')],
    [
      ih.td(
        [ih.Class('py-2.5 pr-4 whitespace-nowrap align-top')],
        [
          ih.a(
            [
              ih.Href(exampleDetailRouter({ exampleSlug: example.slug })),
              ih.Class(nameClassName),
            ],
            [example.title],
          ),
        ],
      ),
      ih.td(
        [ih.Class('py-2.5 text-gray-600 dark:text-gray-400')],
        [example.description],
      ),
    ],
  )

const typingTerminalRow = (): Html =>
  ih.tr(
    [ih.Class('border-b border-gray-200 dark:border-gray-700/50')],
    [
      ih.td(
        [ih.Class('py-2.5 pr-4 whitespace-nowrap align-top')],
        [
          ih.a(
            [ih.Href(typingTerminalRouter()), ih.Class(nameClassName)],
            ['Typing Terminal'],
          ),
        ],
      ),
      ih.td(
        [ih.Class('py-2.5 text-gray-600 dark:text-gray-400')],
        [
          ih.div(
            [],
            [
              'A production real-time multiplayer typing speed game. A full-stack Effect application with an RPC backend and Foldkit frontend.',
            ],
          ),
          ih.a(
            [
              ih.Href(Link.typingTerminal),
              ih.Class('link-accent mt-1 inline-block'),
            ],
            ['Race your friends →'],
          ),
        ],
      ),
    ],
  )

const headerCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

const examplesTable = (): Html =>
  ih.div(
    [ih.Class('mb-8 overflow-x-auto')],
    [
      ih.table(
        [ih.Class('w-full text-sm')],
        [
          ih.thead(
            [],
            [
              ih.tr(
                [],
                [
                  ih.th([ih.Class(headerCellClassName)], ['Example']),
                  ih.th([ih.Class(headerCellClassName)], ['Description']),
                ],
              ),
            ],
          ),
          ih.tbody(
            [],
            [...Array.map(exampleMetas, exampleRow), typingTerminalRow()],
          ),
        ],
      ),
    ],
  )

export const view = (): Html =>
  ih.div(
    [],
    [
      pageTitle('examples', 'Examples'),
      para(
        'Each example is available as a starter template via ',
        ih.a(
          [ih.Href(Link.createFoldkitApp), ih.Class('link-accent')],
          ['Create Foldkit App'],
        ),
        '. Pick one that matches what you’re building, or start with Counter and work your way up. See ',
        ih.a(
          [ih.Href(getStartedRouter()), ih.Class('link-accent')],
          ['Get Started'],
        ),
        ' to get up and running.',
      ),
      examplesTable(),
    ],
  )
