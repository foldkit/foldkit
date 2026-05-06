import { Match as M, Option } from 'effect'

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

type StaticRouteTag = Exclude<
  AppRoute['_tag'],
  'ApiModule' | 'ExampleDetail' | 'Playground'
>

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
  WhyNoJsx: docs(
    'Why no JSX?',
    'Why Foldkit uses a typed function-call DSL instead of JSX, with side-by-side comparisons of buttons, inputs, and conditional rendering.',
    'Docs',
  ),
  GettingStarted: docs(
    'Getting Started',
    'Set up your first Foldkit application in minutes. Install, scaffold with create-foldkit-app, and build a TypeScript frontend with Effect-TS.',
    'Docs',
  ),
  ComingFromReact: docs(
    'Coming from React',
    'Moving from React to a principled architecture? Foldkit replaces hooks, useEffect, and component state with The Elm Architecture: one Model, one update function, explicit effects. Built on Effect-TS.',
    'Docs',
  ),
  ReactComparison: docs(
    'Foldkit vs React: Side by Side',
    'A side-by-side comparison of the same pixel art editor built in both Foldkit and React. Covers state management, side effects, testing, performance, and architectural tradeoffs.',
    'Guides',
  ),
  RoutingAndNavigation: docs(
    'Routing and Navigation',
    'Type-safe routing with bidirectional parser combinators in Foldkit. URLs parse into typed routes and build back. No string matching, built on Effect-TS.',
    'Docs',
  ),
  FieldValidation: docs(
    'Field Validation',
    'Per-field form validation in Foldkit using a four-state discriminated union. Built-in validation rules, Effect-TS powered, no impossible states.',
    'Docs',
  ),
  Testing: docs(
    'Testing',
    'Test Foldkit programs with Story and Scene. Story simulates the update loop. Scene tests features through the rendered view with accessible locators.',
    'Docs',
  ),
  TestingStory: docs(
    'Story',
    'Test the state machine with Story. Send Messages, resolve Commands inline, and assert on the Model. Pure, deterministic, fast.',
    'Testing',
  ),
  TestingScene: docs(
    'Scene',
    'Test features through the rendered view with Scene. Click buttons, type into inputs, and assert on the HTML using accessible locators.',
    'Testing',
  ),
  Examples: docs(
    'Example Apps',
    'Working Foldkit example apps: counter, forms, routing, auth, websocket chat, and more. Each demonstrates Effect-TS and Elm Architecture patterns.',
    'Docs',
  ),
  TypingTerminal: docs(
    'Typing Terminal',
    'A production real-time multiplayer typing speed game. Full-stack Effect app with an RPC backend, streaming room subscriptions, and a Foldkit frontend that share schemas across the wire.',
    'Examples',
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
    'How Foldkit implements The Elm Architecture (TEA) with Effect-TS: Model, update, view, Commands, and Subscriptions.',
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
    "Pure functions that transform the Model and return Commands in response to Messages. Foldkit's update replaces useReducer and useEffect with a single, exhaustive pattern match.",
  ),
  CoreView: core(
    'View',
    'Render your UI as a pure function of the Model. Foldkit views are plain TypeScript functions. No JSX, no hooks, no component lifecycle.',
  ),
  CoreCommands: core(
    'Commands',
    'Model side effects as values returned from update. Commands replace useEffect with explicit, testable Effect-TS operations.',
  ),
  CoreMount: core(
    'Mount',
    'OnMount: the single mount-time DOM hook for integrating third-party libraries with paired cleanup. Keeps imperative work confined to the seam where the virtual DOM meets the real one.',
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
  CoreFile: core(
    'File',
    'Read and select files from the browser using an opaque File type and event attributes for inputs and drop zones.',
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
  CoreDevTools: core(
    'DevTools',
    'A built-in overlay for inspecting Messages and Model state.',
  ),
  CoreCrashView: core(
    'Crash View',
    'A fallback UI and crash reporting for unrecoverable runtime errors.',
  ),
  CoreSlowView: core(
    'Slow View',
    'Performance monitoring for view render times.',
  ),
  CoreFreezeModel: core(
    'Freeze Model',
    'Catch accidental Model mutations at the write site in development.',
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
    'Headless, accessible UI primitives for Foldkit: dialog, menu, tabs, listbox, and more. Built for The Elm Architecture with Effect-TS.',
  ),
  UiButton: ui(
    'Button',
    'A thin wrapper around the native button with accessibility attributes and styling hooks.',
  ),
  UiCalendar: ui(
    'Calendar',
    'Accessible inline calendar grid with 2D keyboard navigation, locale-aware headers, and min/max/disabled-date constraints.',
  ),
  UiDatePicker: ui(
    'Date Picker',
    'Accessible date picker that wraps Calendar in a Popover. Focus choreography, click-outside dismissal, and hidden form input for native form submission.',
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
  UiToast: ui(
    'Toast',
    'Stack of transient notifications anchored to a corner of the viewport with per-entry enter/leave animations and auto-dismiss.',
  ),
  UiTooltip: ui(
    'Tooltip',
    'Non-interactive floating label that appears on hover or focus and hides on leave, blur, or Escape.',
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
  UiSlider: ui(
    'Slider',
    'Accessible slider for numeric range input. Pointer drag, keyboard navigation, ARIA slider semantics.',
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
  UiDragAndDrop: ui(
    'Drag and Drop',
    'Accessible drag and drop with keyboard support, auto-scrolling, and screen reader announcements.',
  ),
  UiFileDrop: ui(
    'File Drop',
    'Headless file drop zone that accepts drag-and-drop plus click-to-browse via a hidden native file input.',
  ),
  UiAnimation: ui(
    'Animation',
    'Coordinates CSS enter/leave animations via a state machine and data attributes. Works with both CSS transitions and keyframe animations.',
  ),
  UiVirtualList: ui(
    'Virtual List',
    'Virtualization primitive for large lists. Only items inside the viewport plus an overscan buffer are mounted; spacers above and below keep the scrollbar physically correct.',
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
  AiMcp: docs(
    'DevTools MCP',
    'Expose a running Foldkit app to AI agents over the Model Context Protocol.',
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

export const routeToMetadata = (route: AppRoute): PageMetadata =>
  M.value(route).pipe(
    M.withReturnType<PageMetadata>(),
    M.tag('ApiModule', ({ moduleSlug }) =>
      docs(
        moduleSlug,
        `API documentation for the ${moduleSlug} module.`,
        'API Reference',
      ),
    ),
    M.tag('ExampleDetail', ({ exampleSlug }) =>
      Option.match(findBySlug(exampleSlug), {
        onNone: () =>
          docs('Example', 'A Foldkit example application.', 'Examples'),
        onSome: example => docs(example.title, example.description, 'Examples'),
      }),
    ),
    M.tag('Playground', ({ exampleSlug }) =>
      Option.match(findBySlug(exampleSlug), {
        onNone: () => docs('Playground', 'Foldkit playground.', 'Playground'),
        onSome: example =>
          docs(
            `${example.title} playground`,
            `Edit and run the ${example.title} example live in your browser.`,
            'Playground',
          ),
      }),
    ),
    M.orElse(({ _tag }) => METADATA_BY_TAG[_tag]),
  )
