import { Array, Option, Schema as S } from 'effect'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export const ExampleSlug = S.Literals([
  'counter',
  'counters',
  'todo',
  'stopwatch',
  'crash-view',
  'form',
  'job-application',
  'weather',
  'api-cache',
  'routing',
  'query-sync',
  'snake',
  'auth',
  'shopping-cart',
  'pixel-art',
  'websocket-chat',
  'kanban',
  'map',
  'canvas-art',
  'generative-art',
  'web-components',
  'embedding',
  'ui-showcase',
])
export type ExampleSlug = typeof ExampleSlug.Type

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
    slug: 'counters',
    title: 'Counters',
    description:
      'A dynamic list of Counter Submodels. Add and remove rows; each row is an independent Submodel embedded via h.submodel, with per-instance routing via a wrapper Message.',
    difficulty: 'Beginner',
    tags: ['Submodels'],
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
    slug: 'api-cache',
    title: 'API Cache',
    description:
      'Query caching without a query client. Demonstrates stale-while-revalidate, request deduplication, invalidation, and interval refetching.',
    difficulty: 'Intermediate',
    tags: ['Caching', 'Subscriptions', 'UI Components'],
    hasRouting: false,
  },
  {
    slug: 'routing',
    title: 'Routing',
    description:
      'Client-side routing with URL parameters, nested routes, rest segments, and navigation.',
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
    slug: 'map',
    title: 'Map',
    description:
      'Interactive MapLibre GL map with locations, search, and "find my location". Demonstrates OnMount integration with a third-party DOM library, plus a Subscription bridging map move and marker click events back to the Model.',
    difficulty: 'Advanced',
    tags: ['Mount', 'Subscriptions', 'Third-Party Library'],
    hasRouting: false,
  },
  {
    slug: 'canvas-art',
    title: 'Canvas Art',
    description:
      'Click the canvas to spawn bouncing balls. Demonstrates declarative 2D rendering with Canvas.view, animation-frame Subscriptions, and pointer events translated to canvas-local coordinates.',
    difficulty: 'Intermediate',
    tags: ['Canvas', 'Animation', 'Subscriptions'],
    hasRouting: false,
  },
  {
    slug: 'generative-art',
    title: 'Generative Art',
    description:
      'Move the mouse to stir a Perlin-noise flow field, click to bloom prismatic particle bursts. Demonstrates Canvas.view with hundreds of evolving Path strokes per frame, Effect Random for spawning, and tunable simulation knobs wired through Messages.',
    difficulty: 'Advanced',
    tags: ['Canvas', 'Animation', 'Subscriptions', 'Generative'],
    hasRouting: false,
  },
  {
    slug: 'web-components',
    title: 'Web Components',
    description:
      'QR code designer wiring two real third-party web components into Foldkit with CustomElement.define. A hex color picker from vanilla-colorful emits color-changed CustomEvents that flow back as Messages, and the sl-qr-code element from Shoelace accepts typed properties. The picker and the QR never touch each other directly; they share state through the Model.',
    difficulty: 'Advanced',
    tags: ['Web Components', 'CustomElement', 'Third-Party Library'],
    hasRouting: false,
  },
  {
    slug: 'embedding',
    title: 'Embedding',
    description:
      'A Foldkit widget embedded in a plain TypeScript host page through Runtime.embed. The host seeds initial state with Flags, pushes a step value in through an inbound Port, mirrors the count the widget emits through an outbound Port, and mounts and unmounts the widget with dispose. All communication crosses one Schema-typed handle; the host never touches the Model.',
    difficulty: 'Advanced',
    tags: ['Embedding', 'Ports', 'makeElement', 'Host Interop'],
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
