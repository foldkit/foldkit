import { Array, Match } from 'effect'
import { Html } from 'foldkit/html'

import { Class, Href, a, div, h3, p } from '../html'
import { Link } from '../link'
import { pageTitle, para } from '../prose'
import { type ExampleMeta, examples as exampleMetas } from './example/meta'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

type TypingTerminalExample = Readonly<{
  title: string
  description: string
  sourceHref: string
  difficulty: Difficulty
  tags: ReadonlyArray<string>
  liveUrl: string
}>

const typingTerminal: TypingTerminalExample = {
  title: 'Typing Terminal',
  description:
    'A production real-time multiplayer typing speed game. Full stack Effect app with RPC backend and Foldkit frontend.',
  sourceHref: Link.typingTerminalSource,
  difficulty: 'Advanced',
  tags: ['Full Stack', 'RPC', 'Production'],
  liveUrl: Link.typingTerminal,
}

export const exampleAppCount = exampleMetas.length + 1

const difficultyToTag = (difficulty: Difficulty): Html => {
  const { label, colors } = Match.value(difficulty).pipe(
    Match.when('Beginner', () => ({
      label: 'Beginner',
      colors:
        'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400',
    })),
    Match.when('Intermediate', () => ({
      label: 'Intermediate',
      colors:
        'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400',
    })),
    Match.when('Advanced', () => ({
      label: 'Advanced',
      colors:
        'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400',
    })),
    Match.exhaustive,
  )
  return div([Class(`text-xs px-2 py-0.5 rounded-full ${colors}`)], [label])
}

const featureTag = (text: string): Html =>
  div(
    [
      Class(
        'text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      ),
    ],
    [text],
  )

const secondaryLink = (href: string, label: string): Html =>
  a(
    [
      Href(href),
      Class(
        'text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors',
      ),
    ],
    [label],
  )

const exampleCard = (example: ExampleMeta): Html =>
  a(
    [
      Href(`/example-apps/${example.slug}`),
      Class(
        'block p-5 rounded-lg bg-gray-100 dark:bg-gray-850 border border-gray-300 dark:border-gray-700 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors',
      ),
    ],
    [
      h3(
        [Class('text-lg font-semibold text-gray-900 dark:text-white mb-2')],
        [example.title],
      ),
      p(
        [Class('text-sm text-gray-600 dark:text-gray-400 mb-3')],
        [example.description],
      ),
      div(
        [Class('flex gap-2 flex-wrap items-center')],
        [
          difficultyToTag(example.difficulty),
          ...Array.map(example.tags, featureTag),
        ],
      ),
      div(
        [Class('mt-3')],
        [secondaryLink(example.sourceHref, 'View source on GitHub')],
      ),
    ],
  )

const typingTerminalCard = (example: TypingTerminalExample): Html =>
  a(
    [
      Href(example.sourceHref),
      Class(
        'block p-5 rounded-lg bg-gray-100 dark:bg-gray-850 border border-gray-300 dark:border-gray-700 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors',
      ),
    ],
    [
      h3(
        [Class('text-lg font-semibold text-gray-900 dark:text-white mb-2')],
        [example.title],
      ),
      p(
        [Class('text-sm text-gray-600 dark:text-gray-400 mb-3')],
        [example.description],
      ),
      div(
        [Class('flex gap-2 flex-wrap')],
        [
          difficultyToTag(example.difficulty),
          ...Array.map(example.tags, featureTag),
        ],
      ),
      a(
        [
          Href(example.liveUrl),
          Class(
            'text-xs text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 mt-5 inline-block',
          ),
        ],
        ['Live →'],
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
            Href('/getting-started'),
            Class(
              'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
            ),
          ],
          ['Getting Started'],
        ),
        ' to get up and running.',
      ),
      div(
        [Class('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start')],
        [
          ...Array.map(exampleMetas, exampleCard),
          typingTerminalCard(typingTerminal),
        ],
      ),
    ],
  )
