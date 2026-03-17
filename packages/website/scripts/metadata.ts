import { Option, pipe } from 'effect'

import { findBySlug } from '../src/page/example/meta'
import { type AppRoute } from '../src/route'

// PAGE METADATA

export type PageMetadata = Readonly<{
  title: string
  description: string
  section: string
}>

const SITE_DESCRIPTION =
  'A TypeScript frontend framework built on Effect-TS, using The Elm Architecture (TEA). Single state tree, pure update functions, explicit side effects, and type-safe routing. An alternative to React for teams that value correctness.'

const docs = (
  title: string,
  description: string,
  section: string,
): PageMetadata => ({
  title,
  description,
  section,
})

const core = (title: string, description: string): PageMetadata =>
  docs(title, description, 'Core Concepts')

const ui = (title: string, description: string): PageMetadata =>
  docs(title, description, 'Foldkit UI')

const pattern = (title: string, description: string): PageMetadata =>
  docs(title, description, 'Patterns')

type StaticRouteTag = Exclude<AppRoute['_tag'], 'ApiModule' | 'ExampleDetail'>

const METADATA_BY_TAG: Record<StaticRouteTag, PageMetadata> = {
  Home: {
    title: 'Foldkit',
    description: SITE_DESCRIPTION,
    section: '',
  },
  Manifesto: docs(
    'Manifesto',
    'Why Foldkit exists and the principles behind its design.',
    'Docs',
  ),
  GettingStarted: docs(
    'Getting Started',
    'Set up your first Foldkit application in minutes. Install, scaffold with create-foldkit-app, and build a TypeScript frontend with Effect-TS.',
    'Docs',
  ),
  ComingFromReact: docs(
    'Coming from React',
    'Moving from React to a principled architecture? Foldkit replaces hooks, useEffect, and component state with The Elm Architecture — one Model, one update function, explicit effects. Built on Effect-TS.',
    'Docs',
  ),
  RoutingAndNavigation: docs(
    'Routing and Navigation',
    'Type-safe routing with bidirectional parsers in Foldkit. URLs parse into typed routes and build back — no string matching, powered by Effect-TS Schema.',
    'Docs',
  ),
  FieldValidation: docs(
    'Field Validation',
    'Per-field form validation in Foldkit using a four-state discriminated union. Sync and async rules, Effect-TS powered, no impossible states.',
    'Docs',
  ),
  Examples: docs(
    'Example Apps',
    'Working Foldkit example apps — counter, forms, routing, auth, websocket chat, and more. Each demonstrates Effect-TS and Elm Architecture patterns.',
    'Docs',
  ),
  BestPracticesSideEffects: docs(
    'Side Effects & Purity',
    'Why Foldkit programs should have zero side effects outside of Commands.',
    'Best Practices',
  ),
  BestPracticesMessages: docs(
    'Messages',
    'Name messages as past-tense events, not imperative commands.',
    'Best Practices',
  ),
  BestPracticesKeying: docs(
    'Keying',
    'Key branch points to prevent stale DOM when views switch between different trees.',
    'Best Practices',
  ),
  BestPracticesImmutability: docs(
    'Immutability',
    'Immutable model updates with evo for predictable state transitions.',
    'Best Practices',
  ),
  ProjectOrganization: docs(
    'Project Organization',
    'How to structure a Foldkit project for maintainability.',
    'Docs',
  ),
  CoreArchitecture: core(
    'Architecture',
    'How Foldkit implements The Elm Architecture (TEA) with Effect-TS — Model, update, view, Commands, and Subscriptions.',
  ),
  CoreCounterExample: core(
    'Counter Example',
    'A minimal Foldkit application explained step by step.',
  ),
  CoreModel: core(
    'Model',
    "Define your entire application state as a single Effect-TS Schema. Learn how Foldkit's Model replaces useState, Redux, and Zustand.",
  ),
  CoreMessages: core(
    'Messages',
    'Type-safe events that drive state changes in Foldkit. Messages replace React event handlers with a declarative, traceable pattern.',
  ),
  CoreUpdate: core(
    'Update',
    "Pure functions that transform the Model in response to Messages. Foldkit's update replaces useReducer with exhaustive pattern matching.",
  ),
  CoreView: core(
    'View',
    'Render your UI as a pure function of the Model. Foldkit views are plain TypeScript functions — no JSX, no hooks, no component lifecycle.',
  ),
  CoreCommands: core(
    'Commands',
    'Model side effects as values returned from update. Commands replace useEffect with explicit, testable Effect-TS operations.',
  ),
  CoreSubscriptions: core(
    'Subscriptions',
    'Declarative streams that start and stop based on Model state. Foldkit Subscriptions replace useEffect cleanup patterns with automatic lifecycle management.',
  ),
  CoreInitAndFlags: core(
    'Init & Flags',
    'Set up the initial Model, pass external data via flags, and run startup Commands.',
  ),
  CoreTask: core(
    'Task',
    'Utility functions for common side effects like time, focus, and randomness.',
  ),
  CoreRunningYourApp: core(
    'Running Your App',
    'Mount and run a Foldkit application in the browser.',
  ),
  CoreResources: core(
    'Resources',
    'Long-lived browser singletons shared across Commands.',
  ),
  CoreManagedResources: core(
    'Managed Resources',
    'Resources that activate and release based on Model state.',
  ),
  CoreDevtools: core(
    'DevTools',
    'A built-in overlay for inspecting Messages and Model state.',
  ),
  CoreCrashView: core(
    'Crash View',
    'A fallback UI and crash reporting for unrecoverable runtime errors.',
  ),
  CoreSlowViewWarning: core(
    'Slow View Warning',
    'Performance monitoring for view render times.',
  ),
  CoreViewMemoization: core(
    'View Memoization',
    'Optimize rendering performance with memoized views.',
  ),
  PatternsSubmodels: pattern(
    'Submodels',
    'Compose applications from independent, encapsulated modules.',
  ),
  PatternsOutMessage: pattern(
    'OutMessage',
    'Communication between parent and child modules.',
  ),
  UiOverview: ui(
    'Foldkit UI',
    'Headless, accessible UI primitives for Foldkit — dialog, menu, tabs, listbox, and more. Built for The Elm Architecture with Effect-TS.',
  ),
  UiButton: ui(
    'Button',
    'A thin wrapper around the native button with accessibility attributes and styling hooks.',
  ),
  UiCheckbox: ui(
    'Checkbox',
    'Accessible checkbox with indeterminate state support.',
  ),
  UiTabs: ui('Tabs', 'Accessible tabbed interface with keyboard navigation.'),
  UiDisclosure: ui(
    'Disclosure',
    'An accessible show/hide foundation for toggleable content sections.',
  ),
  UiDialog: ui(
    'Dialog',
    'A modal dialog backed by the native dialog element with focus trapping and scroll locking.',
  ),
  UiMenu: ui('Menu', 'Accessible dropdown menu with keyboard navigation.'),
  UiPopover: ui(
    'Popover',
    'Floating content panels anchored to trigger elements.',
  ),
  UiListbox: ui(
    'Listbox',
    'Accessible list selection with single and multi-select modes.',
  ),
  UiRadioGroup: ui(
    'Radio Group',
    'Accessible radio button group with keyboard navigation.',
  ),
  UiSelect: ui(
    'Select',
    'A thin wrapper around the native select with ARIA linking and styling hooks.',
  ),
  UiSwitch: ui('Switch', 'Accessible toggle switch for boolean settings.'),
  UiCombobox: ui(
    'Combobox',
    'Accessible autocomplete input with filtering and selection.',
  ),
  UiInput: ui(
    'Input',
    'A thin wrapper around the native input with ARIA linking and styling hooks.',
  ),
  UiTextarea: ui(
    'Textarea',
    'A thin wrapper around the native textarea with ARIA linking and styling hooks.',
  ),
  UiFieldset: ui(
    'Fieldset',
    'Group related form fields with accessible labeling.',
  ),
  AiOverview: docs(
    'AI',
    'Why Foldkit\u2019s architecture makes AI-assisted development uniquely effective.',
    'AI',
  ),
  AiSkills: docs(
    'Skills',
    'Agent skills for generating, scaffolding, and auditing Foldkit programs.',
    'AI',
  ),
  NotFound: {
    title: 'Page Not Found',
    description: SITE_DESCRIPTION,
    section: '',
  },
  Newsletter: {
    title: 'Newsletter',
    description:
      'Subscribe to the Foldkit newsletter for new releases, patterns, and the occasional deep dive.',
    section: '',
  },
}

export const routeToMetadata = (route: AppRoute): PageMetadata => {
  if (route._tag === 'ApiModule') {
    return docs(
      route.moduleSlug,
      `API documentation for the ${route.moduleSlug} module.`,
      'API Reference',
    )
  }

  if (route._tag === 'ExampleDetail') {
    return pipe(
      findBySlug(route.exampleSlug),
      Option.match({
        onNone: () =>
          docs('Example', 'A Foldkit example application.', 'Examples'),
        onSome: example => docs(example.title, example.description, 'Examples'),
      }),
    )
  }

  return METADATA_BY_TAG[route._tag]
}
