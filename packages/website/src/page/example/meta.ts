import { Array, Option, Schema } from 'effect'

type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'

export const ExampleSlug = Schema.Literals([
  'counter',
  'counters',
  'todo',
  'stopwatch',
  'crash-view',
  'slow-warnings',
  're-render-outlines',
  'form',
  'job-application',
  'weather',
  'api-cache',
  'charting',
  'routing',
  'route-transitions',
  'interrupting-commands',
  'view-transitions',
  'query-sync',
  'snake',
  'auth',
  'shopping-cart',
  'state-machine',
  'pixel-art',
  'websocket-chat',
  'managed-resource-layer',
  'kanban',
  'map',
  'canvas-art',
  'generative-art',
  'web-components',
  'embedding',
  'ssg',
  'ssr',
  'ui-showcase',
  'personal-blog',
])
export type ExampleSlug = typeof ExampleSlug.Type

export type LivePreview = 'Spa' | 'Prerendered' | 'PlaygroundOnly'

export type ExampleMeta = Readonly<{
  slug: ExampleSlug
  title: string
  description: string
  difficulty: Difficulty
  tags: ReadonlyArray<string>
  hasRouting: boolean
  livePreview: LivePreview
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
    livePreview: 'Spa',
  },
  {
    slug: 'counters',
    title: 'Counters',
    description:
      'Add and remove independent Counter Submodels in a dynamic list. Each row is embedded through h.submodel and routed through a wrapper Message.',
    difficulty: 'Beginner',
    tags: ['Submodels'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'todo',
    title: 'Todo',
    description:
      'A todo list persisted in localStorage. Add, complete, and delete tasks.',
    difficulty: 'Beginner',
    tags: ['Storage'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'stopwatch',
    title: 'Stopwatch',
    description:
      'A stopwatch with start, stop, and reset. Demonstrates a time-based Subscription.',
    difficulty: 'Beginner',
    tags: ['Subscriptions'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'crash-view',
    title: 'Crash View',
    description:
      'A custom crash fallback with a button that crashes the application and an action that reloads it. Demonstrates crash.view and crash.report.',
    difficulty: 'Beginner',
    tags: ['Fallback UI'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 're-render-outlines',
    title: 'Re-render Outlines',
    description:
      'Highlights re-renders with fading outlines and contrasts memoized versus unmemoized rendering. Toggle the overlay and watch the log update as patches land.',
    difficulty: 'Intermediate',
    tags: ['Performance', 'Diagnostics'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'slow-warnings',
    title: 'Slow Warnings',
    description:
      'Trigger slow update, view, patch, and Subscription dependency warnings at their default thresholds, then inspect them in a visible log.',
    difficulty: 'Intermediate',
    tags: ['Performance', 'Diagnostics'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'form',
    title: 'Form',
    description:
      'A form with field validation, error states, and asynchronous submission.',
    difficulty: 'Intermediate',
    tags: ['Validation'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'weather',
    title: 'Weather',
    description:
      'Look up weather by ZIP code. Demonstrates HTTP requests and loading states.',
    difficulty: 'Intermediate',
    tags: ['HTTP'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'api-cache',
    title: 'API Cache',
    description:
      'Query caching without a query client. Demonstrates stale-while-revalidate, request deduplication, invalidation, and interval refetching.',
    difficulty: 'Intermediate',
    tags: ['Caching', 'Subscriptions', 'UI Components'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'charting',
    title: 'Charting',
    description:
      'A live dashboard for public Foldkit telemetry from GitHub and npm. Demonstrates HTTP Commands, asynchronous state, an ECharts Mount adapter, and a Subscription that turns chart clicks into Messages.',
    difficulty: 'Advanced',
    tags: ['Charts', 'HTTP', 'Mount', 'Subscriptions', 'Third-Party Library'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'routing',
    title: 'Routing',
    description:
      'A client-routed application with URL parameters, nested routes, rest segments, and navigation.',
    difficulty: 'Intermediate',
    tags: ['Routing'],
    hasRouting: true,
    livePreview: 'Spa',
  },
  {
    slug: 'route-transitions',
    title: 'Route Transitions',
    description:
      'A live log shows which Transition helper handles each navigation. Entering the gallery loads its catalog once, staying on a painting refetches only when its id changes, and leaving the studio saves a draft.',
    difficulty: 'Intermediate',
    tags: ['Routing', 'Transitions', 'Commands'],
    hasRouting: true,
    livePreview: 'Spa',
  },
  {
    slug: 'interrupting-commands',
    title: 'Interrupting Commands',
    description:
      'Simulated file uploads driven by interruptible Commands. Cancel one upload, cancel every upload in flight, or restart a cancelled upload through a keyed interrupt registry and an outcome-carrying result Message.',
    difficulty: 'Intermediate',
    tags: ['Commands', 'Concurrency'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'view-transitions',
    title: 'View Transitions',
    description:
      'Animated route changes with the View Transitions API. Transition types control direction-aware slides, and a shared element morphs from gallery card to detail hero.',
    difficulty: 'Intermediate',
    tags: ['Routing', 'Animation'],
    hasRouting: true,
    livePreview: 'Spa',
  },
  {
    slug: 'query-sync',
    title: 'Query Sync',
    description:
      'A filterable dinosaur table where every control syncs to URL query parameters. Schema transforms accept valid states and replace invalid parameters with declared defaults.',
    difficulty: 'Intermediate',
    tags: ['Routing', 'Query Params'],
    hasRouting: true,
    livePreview: 'Spa',
  },
  {
    slug: 'snake',
    title: 'Snake',
    description:
      'The classic snake game. Keyboard input, game loop, and collision detection.',
    difficulty: 'Advanced',
    tags: ['Game'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'auth',
    title: 'Auth',
    description:
      'An authentication flow with Submodels, OutMessage, protected routes, and session management.',
    difficulty: 'Advanced',
    tags: ['Auth', 'Routing', 'Submodels', 'OutMessage'],
    hasRouting: true,
    livePreview: 'Spa',
  },
  {
    slug: 'shopping-cart',
    title: 'Shopping Cart',
    description:
      'An e-commerce application with a product listing, cart management, and checkout flow.',
    difficulty: 'Advanced',
    tags: ['Routing'],
    hasRouting: true,
    livePreview: 'Spa',
  },
  {
    slug: 'state-machine',
    title: 'State Machine',
    description:
      'A checkout workflow powered by the experimental state machine module. Guards skip Shipping for digital orders, gate Place order behind a complete review, and parse promo codes into applied discounts.',
    difficulty: 'Advanced',
    tags: ['State Machines', 'Commands', 'Experimental'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'pixel-art',
    title: 'Pixel Art',
    description:
      'A pixel art editor with immutable undo and redo, time-travel history, Foldkit UI components, lazy views, Subscriptions, Commands that report errors as Messages, and localStorage persistence through Flags.',
    difficulty: 'Advanced',
    tags: ['Undo/Redo', 'UI Components', 'Storage'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'job-application',
    title: 'Job Application',
    description:
      'A multi-step form with asynchronous email validation, cross-field date constraints, file uploads, and per-step error indicators.',
    difficulty: 'Advanced',
    tags: ['Validation', 'Multi-step', 'UI Components'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'websocket-chat',
    title: 'WebSocket Chat',
    description:
      'A ManagedResource owns a WebSocket connection lifecycle. Demonstrates connection state, reconnection, and frames entering update as Messages.',
    difficulty: 'Advanced',
    tags: ['Managed Resources', 'WebSocket'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'managed-resource-layer',
    title: 'Managed Resource Layer',
    description:
      'A layer-backed ManagedResource starts a ComputeEngine service from an Effect Layer, exposes it to Commands, and runs Layer finalizers when the Model turns it off.',
    difficulty: 'Advanced',
    tags: ['Managed Resources', 'Effect Layer', 'Commands'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'kanban',
    title: 'Kanban',
    description:
      'A drag-and-drop kanban board with cross-column reordering, keyboard navigation, fractional indexing, and screen reader announcements.',
    difficulty: 'Advanced',
    tags: ['Drag & Drop', 'Submodels', 'OutMessage', 'Storage'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'map',
    title: 'Map',
    description:
      'An interactive MapLibre GL map with locations, search, and "find my location." Demonstrates a Mount integration with a third-party DOM library, plus a Subscription that turns map movement and marker clicks into Messages.',
    difficulty: 'Advanced',
    tags: ['Mount', 'Subscriptions', 'Third-Party Library'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'canvas-art',
    title: 'Canvas Art',
    description:
      'Click the canvas to spawn bouncing balls. Demonstrates declarative 2D rendering with Canvas.view, animation-frame Subscriptions, and pointer events translated to canvas-local coordinates.',
    difficulty: 'Intermediate',
    tags: ['Canvas', 'Animation', 'Subscriptions'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'generative-art',
    title: 'Generative Art',
    description:
      'Move the mouse to stir a Perlin-noise flow field, then click to bloom prismatic particle bursts. Demonstrates Canvas.view with hundreds of evolving Path strokes per frame, Effect Random for spawning, and simulation controls wired through Messages.',
    difficulty: 'Advanced',
    tags: ['Canvas', 'Animation', 'Subscriptions', 'Generative'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'web-components',
    title: 'Web Components',
    description:
      'A QR code designer integrates two third-party web components through CustomElement.define. The color picker emits CustomEvents as Messages, the QR element receives typed properties, and both communicate through the Model.',
    difficulty: 'Advanced',
    tags: ['Web Components', 'CustomElement', 'Third-Party Library'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'embedding',
    title: 'Embedding',
    description:
      'A Foldkit widget embedded in a plain TypeScript host page through Runtime.embed. The host seeds initial state with Flags, pushes a step value in through an inbound Port, mirrors the count the widget emits through an outbound Port, and mounts and unmounts the widget with dispose. All communication crosses one Schema-typed handle; the host never touches the Model.',
    difficulty: 'Advanced',
    tags: ['Embedding', 'Ports', 'makeElement', 'Host Interop'],
    hasRouting: false,
    livePreview: 'Spa',
  },
  {
    slug: 'ssg',
    title: 'Static Site Generation',
    description:
      'A build script renders every route to static HTML through a server entry, and the client hydrates the served markup in place. The same init, view, and Model produce the build output and the running application.',
    difficulty: 'Advanced',
    tags: ['Server Rendering', 'Hydration', 'Routing'],
    hasRouting: true,
    livePreview: 'Prerendered',
  },
  {
    slug: 'ssr',
    title: 'Server-Side Rendering',
    description:
      'A server renders each request into HTML using Flags read from a cookie, and the client hydrates with the exact values the server used. Reload the page and your latest count arrives already in the markup, before any JavaScript runs.',
    difficulty: 'Advanced',
    tags: ['Server Rendering', 'Hydration', 'Flags'],
    hasRouting: false,
    livePreview: 'PlaygroundOnly',
  },
  {
    slug: 'ui-showcase',
    title: 'UI Showcase',
    description:
      'An interactive showcase of every Foldkit UI component, with styled routed demos and their parent and Submodel wiring.',
    difficulty: 'Advanced',
    tags: ['UI Components', 'Routing'],
    hasRouting: true,
    livePreview: 'Spa',
  },
  {
    slug: 'personal-blog',
    title: 'Personal Blog',
    description:
      'A blog whose prose lives in Markdown files. The @foldkit/markdown Vite plugin compiles each file into a typed document, per-node view overrides style the result, and directive islands place a live Counter Submodel and Note callout between paragraphs.',
    difficulty: 'Advanced',
    tags: ['Markdown', 'Islands', 'Submodels', 'Routing'],
    hasRouting: true,
    livePreview: 'Spa',
  },
]

export const exampleSlugs: ReadonlyArray<ExampleSlug> = Array.map(
  examples,
  ({ slug }) => slug,
)

export const findBySlug = (slug: string): Option.Option<ExampleMeta> =>
  Array.findFirst(examples, example => example.slug === slug)
