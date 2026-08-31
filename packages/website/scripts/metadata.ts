import { Array, Match, Option } from 'effect'

import {
  BLOG_DESCRIPTION,
  BLOG_SECTION,
  BLOG_TITLE,
} from '../src/page/blog/meta'
import { findBySlug } from '../src/page/example/meta'
import { type AppRoute } from '../src/route'
import { blogPosts } from './blogPosts'

// PAGE METADATA

export type PageMetadata = Readonly<{
  title: string
  description: string
  section: string
}>

export type ApiModuleNameResolver = (slug: string) => string

const SITE_DESCRIPTION =
  'Foldkit is a TypeScript frontend framework built on Effect. One Schema-defined Model, explicit effects, typed routing, server rendering, and accessible UI components.'

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

const devtools = (title: string, description: string): PageMetadata =>
  docs(title, description, 'DevTools')

const ui = (title: string, description: string): PageMetadata =>
  docs(title, description, 'Foldkit UI')

const pattern = (title: string, description: string): PageMetadata =>
  docs(title, description, 'Patterns')

const tooling = (title: string, description: string): PageMetadata =>
  docs(title, description, 'Tooling')

type StaticRouteTag = Exclude<
  AppRoute['_tag'],
  'ApiModule' | 'BlogPost' | 'ExampleDetail' | 'Playground'
>

const METADATA_BY_TAG: Record<StaticRouteTag, PageMetadata> = {
  Home: {
    title: 'Foldkit',
    description: SITE_DESCRIPTION,
    section: '',
  },
  Manifesto: docs(
    'Why Foldkit',
    'Why Foldkit exists and the principles behind its design.',
    'Docs',
  ),
  WhyNoJsx: docs(
    'Why no JSX?',
    'Why Foldkit uses a typed function-call DSL instead of JSX, with side-by-side comparisons of buttons, inputs, and conditional rendering.',
    'FAQ',
  ),
  Performance: docs(
    'Performance',
    'Foldkit’s rendering cost model, TodoMVC benchmark results, development-mode overhead, and the tools for measuring and memoizing expensive views.',
    'FAQ',
  ),
  GettingStarted: docs(
    'Getting Started',
    'Create a Foldkit project from a starter, inspect the generated structure, or add Foldkit to an existing Vite application.',
    'Docs',
  ),
  Roadmap: docs(
    'Roadmap',
    'The work that gates Foldkit 1.0, experimental features available today, possible directions after 1.0, and architectural decisions that will not change.',
    'Docs',
  ),
  ComingFromReact: docs(
    'Coming from React',
    'See how Foldkit replaces component-owned state and Effects with one Model, Messages, update, Commands, Subscriptions, and Submodels.',
    'Docs',
  ),
  ComingFromTanStackQuery: docs(
    'Coming from TanStack Query',
    'Foldkit has no useQuery. AsyncData models remote values, while caching, refetching, invalidation, deduplication, and request races remain visible application policy.',
    'Docs',
  ),
  ReactComparison: docs(
    'Foldkit vs React: Side by Side',
    'A side-by-side comparison of the same pixel art editor built in both Foldkit and React. Covers state management, side effects, testing, performance, and architectural tradeoffs.',
    'Guides',
  ),
  EffectAtomComparison: docs(
    'Foldkit vs React + Effect Atom',
    'Two Effect-native architectures: Effect Atom distributes state across reactive cells inside React, while Foldkit builds the application around one Model and update function.',
    'Guides',
  ),
  ElmComparison: docs(
    'Foldkit vs Elm: Side by Side',
    'A side-by-side comparison of the same pixel art editor built in both Foldkit and Elm. Same architecture, different host: ports vs Commands, decoders vs Schema, and what each side gives up.',
    'Guides',
  ),
  RoutingAndNavigation: docs(
    'Routing & Navigation',
    'Define routes with bidirectional parser combinators that decode URLs into typed values and build URLs from Schema-validated parameters.',
    'Docs',
  ),
  FieldValidation: docs(
    'Field Validation',
    'Model each field as NotValidated, Validating, Invalid, or Valid. Compose synchronous and asynchronous Rules, cross-field checks, and form-level validation.',
    'Docs',
  ),
  Testing: docs(
    'Testing',
    'Test Foldkit programs with Story and Scene. Story drives the update loop directly, while Scene drives the rendered view through accessible locators.',
    'Docs',
  ),
  TestingStory: docs(
    'Story',
    'Drive update with Messages, inspect the Model and Commands, and supply Command results without executing their Effects.',
    'Testing',
  ),
  TestingScene: docs(
    'Scene',
    'Drive the rendered VNode tree with accessible locators, dispatch interactions, resolve lifecycle results, and assert on the resulting HTML.',
    'Testing',
  ),
  Examples: docs(
    'Examples',
    'Browse working Foldkit applications that cover state, forms, routing, caching, authentication, server rendering, UI components, third-party integrations, and more.',
    'Examples',
  ),
  TypingTerminal: docs(
    'Typing Terminal',
    'A production multiplayer typing game with a full-stack Effect RPC backend, streaming room Subscriptions, and a Foldkit frontend. Client and server share the same Schemas.',
    'Examples',
  ),
  BestPracticesSideEffects: docs(
    'Side Effects & Purity',
    'Keep update and view deterministic by confining outside work to Commands, Subscriptions, Mounts, ManagedResources, and other Runtime-managed boundaries.',
    'Best Practices',
  ),
  BestPracticesMessages: docs(
    'Messages',
    'Name Messages as verb-first, past-tense facts, and name Command result Messages after the Command that produced them.',
    'Best Practices',
  ),
  BestPracticesKeying: docs(
    'Keying',
    'Use stable Model identifiers to preserve identity for mapped list items and entities rendered at one position.',
    'Best Practices',
  ),
  BestPracticesImmutability: docs(
    'Immutability',
    'Update Models immutably with evo, preserving references for unchanged branches and keeping state transitions predictable.',
    'Best Practices',
  ),
  ProjectOrganization: docs(
    'Project Organization',
    'Start with one main module, then separate Messages, Commands, Submodels, and Subscriptions when ownership or file size makes the split useful.',
    'Docs',
  ),
  ToolingLinting: tooling(
    'Oxlint Plugin',
    'Install and configure @foldkit/oxlint-plugin, then see what each Foldkit-specific rule accepts and rejects.',
  ),
  CoreArchitecture: core(
    'Architecture',
    'How Model, Messages, update, view, Commands, Subscriptions, and the Runtime form Foldkit’s Elm Architecture loop.',
  ),
  CoreCounterExample: core(
    'Counter Example',
    'Build and trace a minimal Counter through its Model, Message Schema, update, view, init, and Runtime wiring.',
  ),
  CoreModel: core(
    'Model',
    'Define application state as one Schema-backed Model. Foldkit uses its runtime Schema to preserve state across hot updates and validate unknown data.',
  ),
  CoreMessages: core(
    'Messages',
    'Define the facts update can handle as a Schema-backed Message union, with naming conventions for user actions, Command results, and Submodel wrappers.',
  ),
  CoreUpdate: core(
    'Update',
    'Handle every Message with a pure update function that returns the next Model and Commands. Use Match and evo to keep transitions exhaustive and immutable.',
  ),
  CoreView: core(
    'View',
    'Return a Document or Html value as a pure function of the Model. Covers document metadata, element builders, events, and view decomposition.',
  ),
  CoreCommands: core(
    'Commands',
    'Describe one-shot Effects caused by Messages, map their results back into Messages, test them as values, and interrupt keyed work when needed.',
  ),
  CoreMount: core(
    'Mount',
    'Run DOM work while a specific rendered element exists. Mount supplies the live Element, emits declared result Messages, and keeps setup paired with cleanup.',
  ),
  CoreCustomElement: core(
    'CustomElement',
    'Create typed Foldkit builders for native custom elements by declaring their properties and CustomEvents with Schema.',
  ),
  CoreSubscriptions: core(
    'Subscriptions',
    'Run ongoing Streams whose lifetime follows Model-derived dependencies. Covers restart behavior, timers, browser events, live dependency reads, and Submodel lifting.',
  ),
  CoreInitAndFlags: core(
    'Init & Flags',
    'Construct the first Model and startup Commands. Routing supplies the current URL, while Schema-validated Flags support fresh client boots and hydration.',
  ),
  CoreDom: core(
    'Dom',
    'Use Effects for common DOM work such as focus, dialog control, scrolling, scroll locks, and inert isolation.',
  ),
  CoreRender: core(
    'Render',
    'Synchronize Commands and Effects with the browser render cycle so DOM reads and CSS transitions land on the intended frame.',
  ),
  CoreFile: core(
    'File',
    'Read and select browser files through an opaque File type, with event attributes for native inputs and drop zones.',
  ),
  CoreHttp: core(
    'Http',
    'Provide a Fetch-backed HttpClient to Commands while keeping browser requests CORS-simple by disabling trace header propagation unless it is required.',
  ),
  CoreCanvas: core(
    'Canvas',
    'Declarative 2D rendering with a Schema-defined Shape AST and pointer events translated to canvas-local coordinates.',
  ),
  CoreRuntime: core(
    'Runtime',
    'Configure a page-owning application with makeApplication, or mount a reusable widget with makeElement and embed.',
  ),
  CoreServerRendering: core(
    'Server Rendering',
    'Render the same application to HTML for request-time SSR or build-time SSG, then hydrate it in place through a validated build-id and Flags handoff.',
  ),
  CoreResources: core(
    'Resources',
    'Provide app-lifetime Effect services to Commands, Subscriptions, Mounts, and Flags, or provide a service directly when sharing is unnecessary.',
  ),
  CoreManagedResources: core(
    'Managed Resources',
    'Acquire a stateful handle while a Model condition holds, expose it to Commands, and release it when dependencies change. Covers Layers and Submodel lifting.',
  ),
  DevToolsOverview: devtools(
    'DevTools',
    'Inspect Message history, Model changes, Commands, and Mounts in the development overlay. Configure time travel, filtering, history limits, and AI dispatch.',
  ),
  DevToolsReRenderOutlines: devtools(
    'Re-render Outlines',
    'Highlight re-rendered boundaries with fading outlines, read the overlay, and fix over-rendering with memoization.',
  ),
  CoreCrashView: core(
    'Crash View',
    'Replace the default Runtime crash screen and report unrecoverable failures without treating expected Effect failures as crashes.',
  ),
  CoreViewTransitions: core(
    'View Transitions',
    'Animate qualifying renders with the browser View Transitions API. Covers route direction, shared elements, and when a running transition is skipped.',
  ),
  CoreSlowWarnings: core(
    'Slow Warnings',
    'Measure development-mode update, view, patch, and Subscription dependency phases, interpret warnings, and tune thresholds after profiling.',
  ),
  CoreFreezeModel: core(
    'Freeze Model',
    'Deep-freeze the Model in development to catch accidental mutation at the write site. Covers what is frozen and the Runtime cost.',
  ),
  CorePreserveScroll: core(
    'Preserve Scroll',
    'Restore window scroll position across Vite HMR reloads. Covers when restoration runs and its window-only scope.',
  ),
  CoreViewMemoization: core(
    'View Memoization',
    'Skip stable view subtrees with createLazy and createKeyedLazy, choose cache keys by entity identity, and profile before adding memoization.',
  ),
  CoreEmbedding: core(
    'Embedding',
    'Embed a Foldkit widget in another application through a Schema-typed handle. Covers initial Flags, inbound and outbound Ports, disposal, and React integration.',
  ),
  CoreSubmodel: core(
    'Submodel',
    'Split a large application into child state machines while preserving parent-to-child Message flow. Covers Update.foldChild, h.submodel, OutMessages, reflection, testing, and DevTools.',
  ),
  AsyncData: core(
    'Async Data',
    'A six-state value type for asynchronously loaded data in the Model: Idle, Loading, Refreshing, Failure, Stale, and Success, with stale-while-revalidate and keep-stale-on-failure built in.',
  ),
  PatternsInformingSubmodels: pattern(
    'Informing Submodels',
    'Relay a change a Submodel does not own (a URL, a server push, an auth change) through a helper it exposes, so it can update its own state in response.',
  ),
  PatternsSubscriptionOrganization: pattern(
    'Subscription Organization',
    'Organize Subscription records by ownership and lift child Subscriptions through nested Model and Message types.',
  ),
  UiOverview: ui(
    'Foldkit UI',
    'Choose between stateful Submodels and stateless render helpers in Foldkit’s headless UI package. Covers accessibility, styling, installation, and the component catalog.',
  ),
  UiSelectionSubmodels: ui(
    'Selection Submodels',
    'Use create<Item>() factories to keep one item type across a selection Submodel’s view, update, programmatic helpers, and OutMessages.',
  ),
  UiAnchor: ui(
    'Anchor',
    'Position and portal floating panels with the same Floating UI runtime used by Listbox, Combobox, Menu, Popover, Tooltip, and Date Picker.',
  ),
  UiButton: ui(
    'Button',
    'A stateless wrapper around the native button with accessibility attributes, event wiring, and styling hooks.',
  ),
  UiCalendar: ui(
    'Calendar',
    'Accessible inline calendar grid with 2D keyboard navigation, locale-aware headers, and min/max/disabled-date constraints.',
  ),
  UiDatePicker: ui(
    'Date Picker',
    'An accessible Date Picker that wraps Calendar in a Popover, with focus management, click-outside dismissal, and a hidden input for native form submission.',
  ),
  UiCheckbox: ui(
    'Checkbox',
    'Accessible checkbox with indeterminate state support.',
  ),
  UiTabs: ui(
    'Tabs',
    'A selection Submodel for tab panels, with roving tabindex, horizontal and vertical orientation, and automatic or manual activation.',
  ),
  UiNav: ui(
    'Nav',
    'A stateless helper for URL-driven navigation with aria-current page semantics.',
  ),
  UiDisclosure: ui(
    'Disclosure',
    'A stateless, controlled show-and-hide helper for inline content, with disclosure semantics and keyboard behavior.',
  ),
  UiDialog: ui(
    'Dialog',
    'A modal dialog backed by the native dialog element with focus trapping and scroll locking.',
  ),
  UiMenu: ui(
    'Menu',
    'An anchored action-menu Submodel with keyboard navigation, typeahead, dismissal, and optional modal behavior.',
  ),
  UiPopover: ui(
    'Popover',
    'An anchored floating panel for arbitrary content, with dismissal, focus return, portaling, and optional modal behavior.',
  ),
  UiToast: ui(
    'Toast',
    'Stack of transient notifications anchored to a corner of the viewport with per-entry enter/leave animations and auto-dismiss.',
  ),
  UiTooltip: ui(
    'Tooltip',
    'Non-interactive floating label that appears on hover or focus and hides on leave, blur, or Escape.',
  ),
  UiHoverIntent: ui(
    'Hover Intent',
    'Behavior-only Submodel for delayed hover and focus reveal across a trigger and panel.',
  ),
  UiListbox: ui(
    'Listbox',
    'A selection Submodel with single-select and multi-select modes, keyboard navigation, typeahead, and anchored positioning.',
  ),
  UiRadioGroup: ui(
    'Radio Group',
    'A selection Submodel for radio options, with roving tabindex, keyboard navigation, and read-only behavior.',
  ),
  UiSelect: ui(
    'Select',
    'A stateless wrapper around the native select with ARIA linking, change handling, and styling hooks.',
  ),
  UiSlider: ui(
    'Slider',
    'A numeric range Submodel with pointer dragging, keyboard navigation, constraints, steps, and ARIA slider semantics.',
  ),
  UiSwitch: ui(
    'Switch',
    'A stateless, controlled toggle for immediate on-and-off actions, with keyboard behavior and switch semantics.',
  ),
  UiCombobox: ui(
    'Combobox',
    'A searchable selection Submodel with parent-controlled filtering, single-select and multi-select modes, and anchored positioning.',
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
    'A stateless wrapper around the native fieldset with linked legend and description attributes.',
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
    'Render only visible rows plus overscan while spacers preserve scroll geometry. Supports fixed and variable row heights, measurement, and programmatic scrolling.',
  ),
  AiOverview: docs(
    'AI',
    'How Foldkit’s explicit architecture gives coding agents stable boundaries, plus the source, skills, and DevTools MCP references available to them.',
    'AI',
  ),
  AiSkills: docs(
    'Skills',
    'Install and use Foldkit’s repository skills for architecture guidance, program generation, and application audits.',
    'AI',
  ),
  AiMcp: docs(
    'DevTools MCP',
    'Connect an agent to a running Foldkit application to inspect Models and Message history, compare states, replay the UI, and dispatch Schema-validated Messages.',
    'AI',
  ),
  ContentApi: docs(
    'Foldkit Content API',
    'The read-only JSON API for this documentation site: endpoints, authentication, versioning and deprecation policy, rate limit headers, and the RFC 9457 error model.',
    'AI',
  ),
  About: docs(
    'About Foldkit',
    'What Foldkit is, who builds it, how changes are developed and released, and where the project stands before 1.0.',
    'Site',
  ),
  Contact: docs(
    'Contact Foldkit',
    'How to reach the Foldkit project: issues, Discord, security reports, and contributions.',
    'Site',
  ),
  Privacy: docs(
    'Foldkit Privacy Policy',
    'What foldkit.dev collects, what stays in your browser, the third parties involved, and the choices you have.',
    'Site',
  ),
  NotFound: {
    title: 'Page Not Found',
    description: 'The requested page could not be found.',
    section: '',
  },
  Newsletter: {
    title: 'Newsletter',
    description:
      'Subscribe to the Foldkit newsletter for new releases, patterns, and the occasional deep dive.',
    section: '',
  },
  Blog: docs(BLOG_TITLE, BLOG_DESCRIPTION, BLOG_SECTION),
}

export const routeToMetadata = (
  route: AppRoute,
  resolveApiModuleName: ApiModuleNameResolver,
): PageMetadata =>
  Match.value(route).pipe(
    Match.withReturnType<PageMetadata>(),
    Match.tag('ApiModule', ({ moduleSlug }) => {
      const moduleName = resolveApiModuleName(moduleSlug)
      return docs(
        moduleName,
        `API documentation for the ${moduleName} module.`,
        'API Reference',
      )
    }),
    Match.tag('BlogPost', ({ postSlug }) => {
      const { frontmatter } = Option.getOrThrowWith(
        Array.findFirst(blogPosts, ({ slug }) => slug === postSlug),
        () =>
          new Error(
            `Blog post "${postSlug}" is missing from the blog post registry.`,
          ),
      )
      return docs(frontmatter.title, frontmatter.description, BLOG_SECTION)
    }),
    Match.tag('ExampleDetail', ({ exampleSlug }) => {
      const example = Option.getOrThrowWith(
        findBySlug(exampleSlug),
        () =>
          new Error(
            `Example "${exampleSlug}" is missing from the example registry.`,
          ),
      )
      return docs(example.title, example.description, 'Examples')
    }),
    Match.tag('Playground', ({ exampleSlug }) => {
      const example = Option.getOrThrowWith(
        findBySlug(exampleSlug),
        () =>
          new Error(
            `Playground example "${exampleSlug}" is missing from the example registry.`,
          ),
      )
      return docs(
        `${example.title} Playground`,
        `Edit and run the ${example.title} example live in your browser.`,
        'Playground',
      )
    }),
    Match.orElse(({ _tag }) => METADATA_BY_TAG[_tag]),
  )
