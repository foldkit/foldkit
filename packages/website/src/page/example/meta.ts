import { Array, Option } from 'effect'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export type ExampleSlug =
  | 'counter'
  | 'todo'
  | 'stopwatch'
  | 'crash-view'
  | 'form'
  | 'job-application'
  | 'weather'
  | 'routing'
  | 'query-sync'
  | 'snake'
  | 'auth'
  | 'shopping-cart'
  | 'pixel-art'
  | 'websocket-chat'
  | 'kanban'
  | 'ui-showcase'

export type ExampleMeta = Readonly<{
  slug: ExampleSlug
  title: string
  description: string
  difficulty: Difficulty
  tags: ReadonlyArray<string>
  hasRouting: boolean
}>

export const examples: ReadonlyArray<ExampleMeta> = [
  {
    slug: 'counter',
    title: 'Counter',
    description:
      'The classic counter example. Increment, decrement, and reset a number.',
    difficulty: 'Beginner',
    tags: ['State'],
    hasRouting: false,
  },
  {
    slug: 'todo',
    title: 'Todo',
    description:
      'A todo list with local storage persistence. Add, complete, and delete tasks.',
    difficulty: 'Beginner',
    tags: ['Storage'],
    hasRouting: false,
  },
  {
    slug: 'stopwatch',
    title: 'Stopwatch',
    description:
      'A stopwatch with start, stop, and reset. Demonstrates time-based subscriptions.',
    difficulty: 'Beginner',
    tags: ['Subscriptions'],
    hasRouting: false,
  },
  {
    slug: 'crash-view',
    title: 'Crash View',
    description:
      'Custom crash fallback UI. Demonstrates crash.view and crash.report with a crash button and reload.',
    difficulty: 'Beginner',
    tags: ['Fallback UI'],
    hasRouting: false,
  },
  {
    slug: 'form',
    title: 'Form',
    description:
      'Form handling with field validation, error states, and async submission.',
    difficulty: 'Intermediate',
    tags: ['Validation'],
    hasRouting: false,
  },
  {
    slug: 'weather',
    title: 'Weather',
    description:
      'Look up weather by zip code. Demonstrates HTTP requests and loading states.',
    difficulty: 'Intermediate',
    tags: ['HTTP'],
    hasRouting: false,
  },
  {
    slug: 'routing',
    title: 'Routing',
    description:
      'Client-side routing with URL parameters, nested routes, and navigation.',
    difficulty: 'Intermediate',
    tags: ['Routing'],
    hasRouting: true,
  },
  {
    slug: 'query-sync',
    title: 'Query Sync',
    description:
      'Filterable dinosaur table where every control syncs to URL query parameters. Schema transforms enforce valid states. Invalid params gracefully fall back.',
    difficulty: 'Intermediate',
    tags: ['Routing', 'Query Params'],
    hasRouting: true,
  },
  {
    slug: 'snake',
    title: 'Snake',
    description:
      'The classic snake game. Keyboard input, game loop, and collision detection.',
    difficulty: 'Advanced',
    tags: ['Game'],
    hasRouting: false,
  },
  {
    slug: 'auth',
    title: 'Auth',
    description:
      'Authentication flow with Submodels, OutMessage, protected routes, and session management.',
    difficulty: 'Advanced',
    tags: ['Auth', 'Routing', 'Submodels', 'OutMessage'],
    hasRouting: true,
  },
  {
    slug: 'shopping-cart',
    title: 'Shopping Cart',
    description:
      'E-commerce app with product listing, cart management, and checkout flow.',
    difficulty: 'Advanced',
    tags: ['Routing'],
    hasRouting: true,
  },
  {
    slug: 'pixel-art',
    title: 'Pixel Art',
    description:
      'Pixel art editor showcasing undo/redo with immutable snapshots, time-travel history, UI components (RadioGroup, Switch, Listbox, Dialog, Button), createLazy view optimization, Subscriptions, Commands with error handling, and localStorage persistence via Flags.',
    difficulty: 'Advanced',
    tags: ['Undo/Redo', 'UI Components', 'Storage'],
    hasRouting: false,
  },
  {
    slug: 'job-application',
    title: 'Job Application',
    description:
      'Multi-step form with async email validation, cross-field date constraints, file uploads, and per-step error indicators.',
    difficulty: 'Advanced',
    tags: ['Validation', 'Multi-step', 'UI Components'],
    hasRouting: false,
  },
  {
    slug: 'websocket-chat',
    title: 'WebSocket Chat',
    description:
      'Managed resources with WebSocket integration. Connection lifecycle, reconnection, and message streaming.',
    difficulty: 'Advanced',
    tags: ['Managed Resources', 'WebSocket'],
    hasRouting: false,
  },
  {
    slug: 'kanban',
    title: 'Kanban',
    description:
      'Drag-and-drop kanban board with cross-column reordering, keyboard navigation, fractional indexing, and screen reader announcements.',
    difficulty: 'Advanced',
    tags: ['Drag & Drop', 'Submodels', 'OutMessage', 'Storage'],
    hasRouting: false,
  },
  {
    slug: 'ui-showcase',
    title: 'UI Showcase',
    description:
      'Interactive showcase of every Foldkit UI component with styled examples, routing, and component state management.',
    difficulty: 'Advanced',
    tags: ['UI Components', 'Routing'],
    hasRouting: true,
  },
]

export const exampleSlugs: ReadonlyArray<ExampleSlug> = Array.map(
  examples,
  ({ slug }) => slug,
)

export const findBySlug = (slug: string): Option.Option<ExampleMeta> =>
  Array.findFirst(examples, example => example.slug === slug)
