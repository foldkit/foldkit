import { Array } from 'effect'
import { Html, html } from 'foldkit/html'

import { Link } from '../link'
import type { Message } from '../message'
import { pageTitle, para } from '../prose'
import {
  exampleDetailRouter,
  gettingStartedRouter,
  typingTerminalRouter,
} from '../route'
import { type ExampleMeta, examples as exampleMetas } from './example/meta'

export const exampleAppCount = exampleMetas.length + 1

const nameClassName =
  'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 font-medium'

const exampleRow = (example: ExampleMeta): Html => {
  const h = html<Message>()

  return h.tr(
    [h.Class('border-b border-gray-200 dark:border-gray-700/50')],
    [
      h.td(
        [h.Class('py-2.5 pr-4 whitespace-nowrap align-top')],
        [
          h.a(
            [
              h.Href(exampleDetailRouter({ exampleSlug: example.slug })),
              h.Class(nameClassName),
            ],
            [example.title],
          ),
        ],
      ),
      h.td(
        [h.Class('py-2.5 text-gray-600 dark:text-gray-400')],
        [example.description],
      ),
    ],
  )
}

const typingTerminalRow = (): Html => {
  const h = html<Message>()

  return h.tr(
    [h.Class('border-b border-gray-200 dark:border-gray-700/50')],
    [
      h.td(
        [h.Class('py-2.5 pr-4 whitespace-nowrap align-top')],
        [
          h.a(
            [h.Href(typingTerminalRouter()), h.Class(nameClassName)],
            ['Typing Terminal'],
          ),
        ],
      ),
      h.td(
        [h.Class('py-2.5 text-gray-600 dark:text-gray-400')],
        [
          h.div(
            [],
            [
              'A production real-time multiplayer typing speed game. Full stack Effect app with RPC backend and Foldkit frontend.',
            ],
          ),
          h.a(
            [
              h.Href(Link.typingTerminal),
              h.Class(
                'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 mt-1 inline-block',
              ),
            ],
            ['Race your friends →'],
          ),
        ],
      ),
    ],
  )
}

const headerCellClassName =
  'py-2 pr-4 text-left font-medium text-gray-900 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700/50'

const examplesTable = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mb-8')],
    [
      h.table(
        [h.Class('w-full text-sm')],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                [
                  h.th([h.Class(headerCellClassName)], ['Example']),
                  h.th([h.Class(headerCellClassName)], ['Description']),
                ],
              ),
            ],
          ),
          h.tbody(
            [],
            [...Array.map(exampleMetas, exampleRow), typingTerminalRow()],
          ),
        ],
      ),
    ],
  )
}

export const view = (): Html => {
  const h = html<Message>()

  return h.div(
    [],
    [
      pageTitle('examples', 'Examples'),
      para(
        'Each example is available as a starter template via ',
        h.a(
          [
            h.Href(Link.createFoldkitApp),
            h.Class(
              'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
            ),
          ],
          ['Create Foldkit App'],
        ),
        '. Pick one that matches what you’re building, or start with Counter and work your way up. See ',
        h.a(
          [
            h.Href(gettingStartedRouter()),
            h.Class(
              'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
            ),
          ],
          ['Getting Started'],
        ),
        ' to get up and running.',
      ),
      examplesTable(),
    ],
  )
}
