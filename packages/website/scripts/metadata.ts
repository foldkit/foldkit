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
  'The frontend framework for correctness. Built on Effect and The Elm Architecture. Predictable state, explicit effects, and a principled architecture designed to scale.'

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
    'Set up your first Foldkit application in minutes.',
    'Docs',
  ),
  ComingFromReact: docs(
    'Coming From React',
    'A guide for React developers transitioning to Foldkit.',
    'Docs',
  ),
  RoutingAndNavigation: docs(
    'Routing and Navigation',
    'Type-safe routing with bidirectional parsers in Foldkit.',
    'Docs',
  ),
  FieldValidation: docs(
    'Field Validation',
    'Model validation state as a four-state discriminated union — no impossible states.',
    'Docs',
  ),
  Examples: docs(
    'Example Apps',
    'Starter templates for common patterns — counter, forms, routing, auth, and more.',
    'Docs',
  ),
  BestPractices: docs(
    'Best Practices',
    'Recommended patterns and conventions for Foldkit applications.',
    'Docs',
  ),
  ProjectOrganization: docs(
    'Project Organization',
    'How to structure a Foldkit project for maintainability.',
    'Docs',
  ),
  CoreArchitecture: core(
    'Architecture',
    'The Elm Architecture adapted for TypeScript and Effect.',
  ),
  CoreCounterExample: core(
    'Counter Example',
    'A minimal Foldkit application explained step by step.',
  ),
  CoreModel: core(
    'Model',
    'The single source of truth for your application state.',
  ),
  CoreMessages: core(
    'Messages',
    'Events that describe what happened in your application.',
  ),
  CoreUpdate: core(
    'Update',
    'Pure functions that transform state in response to Messages.',
  ),
  CoreView: core('View', 'Declarative virtual DOM rendering from your Model.'),
  CoreCommands: core(
    'Commands',
    'Side effects as data — HTTP requests, DOM operations, and more.',
  ),
  CoreSubscriptions: core(
    'Subscriptions',
    'Long-running streams with automatic lifecycle management based on Model state.',
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
  CoreErrorView: core(
    'Error View',
    'A fallback UI for unrecoverable runtime errors.',
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
    'Headless, accessible UI components built for The Elm Architecture.',
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
  NotFound: {
    title: 'Page Not Found',
    description: SITE_DESCRIPTION,
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
