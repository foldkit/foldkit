import { Array, Option, pipe } from 'effect'

import { Link } from '../../link'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export type ExampleMeta = Readonly<{
  slug: string
  title: string
  description: string
  difficulty: Difficulty
  tags: ReadonlyArray<string>
  sourceHref: string
  hasRouting: boolean
  entryFile: string
}>

export const examples: ReadonlyArray<ExampleMeta> = [
  {
    slug: 'counter',
    title: 'Counter',
    description:
      'The classic counter example. Increment, decrement, and reset a number.',
    difficulty: 'Beginner',
    tags: ['State'],
    sourceHref: Link.exampleCounter,
    hasRouting: false,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'todo',
    title: 'Todo',
    description:
      'A todo list with local storage persistence. Add, complete, and delete tasks.',
    difficulty: 'Beginner',
    tags: ['Storage'],
    sourceHref: Link.exampleTodo,
    hasRouting: false,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'stopwatch',
    title: 'Stopwatch',
    description:
      'A stopwatch with start, stop, and reset. Demonstrates time-based subscriptions.',
    difficulty: 'Beginner',
    tags: ['Subscriptions'],
    sourceHref: Link.exampleStopwatch,
    hasRouting: false,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'form',
    title: 'Form',
    description:
      'Form handling with field validation, error states, and async submission.',
    difficulty: 'Intermediate',
    tags: ['Validation'],
    sourceHref: Link.exampleForm,
    hasRouting: false,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'weather',
    title: 'Weather',
    description:
      'Look up weather by zip code. Demonstrates HTTP requests and loading states.',
    difficulty: 'Intermediate',
    tags: ['HTTP'],
    sourceHref: Link.exampleWeather,
    hasRouting: false,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'routing',
    title: 'Routing',
    description:
      'Client-side routing with URL parameters, nested routes, and navigation.',
    difficulty: 'Intermediate',
    tags: ['Routing'],
    sourceHref: Link.exampleRouting,
    hasRouting: true,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'query-sync',
    title: 'Query Sync',
    description:
      'Filterable dinosaur table where every control syncs to URL query parameters. Schema transforms enforce valid states — invalid params gracefully fall back.',
    difficulty: 'Intermediate',
    tags: ['Routing', 'Query Params'],
    sourceHref: Link.exampleQuerySync,
    hasRouting: true,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'auth',
    title: 'Auth',
    description:
      'Authentication flow with Submodels, OutMessage, protected routes, and session management.',
    difficulty: 'Advanced',
    tags: ['Auth', 'Routing', 'Submodels', 'OutMessage'],
    sourceHref: Link.exampleAuth,
    hasRouting: true,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'shopping-cart',
    title: 'Shopping Cart',
    description:
      'E-commerce app with product listing, cart management, and checkout flow.',
    difficulty: 'Advanced',
    tags: ['Routing'],
    sourceHref: Link.exampleShoppingCart,
    hasRouting: true,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'snake',
    title: 'Snake',
    description:
      'The classic snake game. Keyboard input, game loop, and collision detection.',
    difficulty: 'Advanced',
    tags: ['Game'],
    sourceHref: Link.exampleSnake,
    hasRouting: false,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'error-view',
    title: 'Error View',
    description:
      'Custom error fallback UI. Demonstrates errorView with a crash button and reload.',
    difficulty: 'Beginner',
    tags: ['Fallback UI'],
    sourceHref: Link.exampleErrorView,
    hasRouting: false,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'websocket-chat',
    title: 'WebSocket Chat',
    description:
      'Managed resources with WebSocket integration. Connection lifecycle, reconnection, and message streaming.',
    difficulty: 'Advanced',
    tags: ['Managed Resources', 'WebSocket'],
    sourceHref: Link.exampleWebsocketChat,
    hasRouting: false,
    entryFile: 'src/main.ts',
  },
  {
    slug: 'ui-showcase',
    title: 'UI Showcase',
    description:
      'Interactive showcase of every Foldkit UI component with styled examples, routing, and component state management.',
    difficulty: 'Advanced',
    tags: ['UI Components', 'Routing'],
    sourceHref: Link.exampleUiShowcase,
    hasRouting: true,
    entryFile: 'src/main.ts',
  },
]

export const findBySlug = (slug: string): Option.Option<ExampleMeta> =>
  pipe(
    examples,
    Array.findFirst(example => example.slug === slug),
  )
