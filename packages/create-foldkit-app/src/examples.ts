export const EXAMPLE_VALUES = [
  'counter',
  'todo',
  'stopwatch',
  'crash-view',
  'form',
  'job-application',
  'weather',
  'routing',
  'query-sync',
  'snake',
  'auth',
  'shopping-cart',
  'pixel-art',
  'websocket-chat',
  'kanban',
  'ui-showcase',
] as const

export type Example = (typeof EXAMPLE_VALUES)[number]

export const examples: ReadonlyArray<{
  value: Example
  title: string
  description: string
}> = [
  {
    value: 'counter',
    title: 'counter',
    description: 'Simple increment/decrement with reset',
  },
  {
    value: 'todo',
    title: 'todo',
    description: 'CRUD operations with localStorage persistence',
  },
  {
    value: 'stopwatch',
    title: 'stopwatch',
    description: 'Timer with start/stop/reset functionality',
  },
  {
    value: 'crash-view',
    title: 'crash-view',
    description: 'Custom crash fallback UI with crash.view and crash.report',
  },
  {
    value: 'form',
    title: 'form',
    description: 'Form validation with async email checking',
  },
  {
    value: 'job-application',
    title: 'job-application',
    description:
      'Multi-step form with async validation, file uploads, and per-step error indicators',
  },
  {
    value: 'weather',
    title: 'weather',
    description: 'HTTP requests with async state handling',
  },
  {
    value: 'routing',
    title: 'routing',
    description: 'URL routing with parser combinators and route parameters',
  },
  {
    value: 'query-sync',
    title: 'query-sync',
    description:
      'URL-driven filtering, sorting, and search with query parameters',
  },
  {
    value: 'snake',
    title: 'snake',
    description: 'Classic game built with subscriptions',
  },
  {
    value: 'auth',
    title: 'auth',
    description: 'Authentication with Submodels, OutMessage, and protected routes',
  },
  {
    value: 'shopping-cart',
    title: 'shopping-cart',
    description: 'Complex state management with nested models and routing',
  },
  {
    value: 'pixel-art',
    title: 'pixel-art',
    description:
      'Pixel editor with undo/redo, time-travel history, UI components, and localStorage persistence',
  },
  {
    value: 'websocket-chat',
    title: 'websocket-chat',
    description: 'Managed resources with WebSocket integration',
  },
  {
    value: 'kanban',
    title: 'kanban',
    description:
      'Drag-and-drop board with fractional indexing, keyboard navigation, and screen reader announcements',
  },
  {
    value: 'ui-showcase',
    title: 'ui-showcase',
    description: 'Every Foldkit UI component with routing and Submodels',
  },
]
