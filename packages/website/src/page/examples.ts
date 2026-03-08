import { Array, Match } from 'effect'
import { Html } from 'foldkit/html'

import { Class, Href, a, div, h3, p } from '../html'
import { Link } from '../link'
import { pageTitle, para } from '../prose'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

type Example = {
  title: string
  description: string
  href: string
  difficulty: Difficulty
  tags: ReadonlyArray<string>
  liveUrl?: string
}

const examples: ReadonlyArray<Example> = [
  {
    title: 'Counter',
    description: 'The classic counter example. Increment, decrement, and reset a number.',
    href: Link.exampleCounter,
    difficulty: 'Beginner',
    tags: ['State'],
  },
  {
    title: 'Todo',
    description:
      'A todo list with local storage persistence. Add, complete, and delete tasks.',
    href: Link.exampleTodo,
    difficulty: 'Beginner',
    tags: ['Storage'],
  },
  {
    title: 'Stopwatch',
    description:
      'A stopwatch with start, stop, and reset. Demonstrates time-based subscriptions.',
    href: Link.exampleStopwatch,
    difficulty: 'Beginner',
    tags: ['Subscriptions'],
  },
  {
    title: 'Form',
    description:
      'Form handling with field validation, error states, and async submission.',
    href: Link.exampleForm,
    difficulty: 'Intermediate',
    tags: ['Validation'],
  },
  {
    title: 'Weather',
    description:
      'Look up weather by zip code. Demonstrates HTTP requests and loading states.',
    href: Link.exampleWeather,
    difficulty: 'Intermediate',
    tags: ['HTTP'],
  },
  {
    title: 'Routing',
    description:
      'Client-side routing with URL parameters, nested routes, and navigation.',
    href: Link.exampleRouting,
    difficulty: 'Intermediate',
    tags: ['Routing'],
  },
  {
    title: 'Query Sync',
    description:
      'Filterable dinosaur table where every control syncs to URL query parameters. Schema transforms enforce valid states — invalid params gracefully fall back.',
    href: Link.exampleQuerySync,
    difficulty: 'Intermediate',
    tags: ['Routing', 'Query Params'],
  },
  {
    title: 'Auth',
    description:
      'Authentication flow with Submodels, OutMessage, protected routes, and session management.',
    href: Link.exampleAuth,
    difficulty: 'Advanced',
    tags: ['Auth', 'Routing', 'Submodels', 'OutMessage'],
  },
  {
    title: 'Shopping Cart',
    description:
      'E-commerce app with product listing, cart management, and checkout flow.',
    href: Link.exampleShoppingCart,
    difficulty: 'Advanced',
    tags: ['Routing'],
  },
  {
    title: 'Snake',
    description:
      'The classic snake game. Keyboard input, game loop, and collision detection.',
    href: Link.exampleSnake,
    difficulty: 'Advanced',
    tags: ['Game'],
  },
  {
    title: 'Error View',
    description:
      'Custom error fallback UI. Demonstrates errorView with a crash button and reload.',
    href: Link.exampleErrorView,
    difficulty: 'Beginner',
    tags: ['Fallback UI'],
  },
  {
    title: 'WebSocket Chat',
    description:
      'Managed resources with WebSocket integration. Connection lifecycle, reconnection, and message streaming.',
    href: Link.exampleWebsocketChat,
    difficulty: 'Advanced',
    tags: ['Managed Resources', 'WebSocket'],
  },
  {
    title: 'Typing Terminal',
    description:
      'A production real-time multiplayer typing speed game. Full stack Effect app with RPC backend and Foldkit frontend.',
    href: Link.typingTerminalSource,
    difficulty: 'Advanced',
    tags: ['Full Stack', 'RPC', 'Production'],
    liveUrl: Link.typingTerminal,
  },
]

export const exampleAppCount = examples.length

const difficultyToTag = (difficulty: Difficulty): Html => {
  const { label, colors } = Match.value(difficulty).pipe(
    Match.when('Beginner', () => ({
      label: 'Beginner',
      colors: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400',
    })),
    Match.when('Intermediate', () => ({
      label: 'Intermediate',
      colors: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400',
    })),
    Match.when('Advanced', () => ({
      label: 'Advanced',
      colors: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400',
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

const exampleCard = (example: Example): Html =>
  a(
    [
      Href(example.href),
      Class(
        'block p-5 rounded-lg bg-gray-100 dark:bg-gray-850 border border-gray-300 dark:border-gray-700 hover:bg-gray-200/60 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors',
      ),
    ],
    [
      h3(
        [Class('text-lg font-semibold text-gray-900 dark:text-white mb-2')],
        [example.title],
      ),
      p([Class('text-sm text-gray-600 dark:text-gray-400 mb-3')], [example.description]),
      div(
        [Class('flex gap-2 flex-wrap')],
        [difficultyToTag(example.difficulty), ...Array.map(example.tags, featureTag)],
      ),
      ...(example.liveUrl
        ? [
            a(
              [
                Href(example.liveUrl),
                Class(
                  'text-xs text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500 mt-5 inline-block',
                ),
              ],
              ['Live →'],
            ),
          ]
        : []),
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
        ". Pick one that matches what you're building, or start with Counter and work your way up. See ",
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
        examples.map(exampleCard),
      ),
    ],
  )
