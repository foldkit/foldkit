import { Array, Equal, Number, Option, Schema, pipe } from 'effect'

import { examples } from './page/example/meta'
import { AppRoute, DocsRoute, isBlogRoute } from './route'
import { type GroupKey } from './sidebarStorage'

export const DOCS_SIDEBAR_NAV_ID = 'docs-sidebar-nav'

export const MOBILE_MENU_NAV_ID = 'mobile-menu-nav'

// NAV PAGE

export const NavPage = Schema.Struct({
  route: DocsRoute,
  label: Schema.String,
})
export type NavPage = typeof NavPage.Type

export const isNavPageActive = (route: AppRoute, page: NavPage): boolean =>
  Equal.equals(page.route, route)

// DOCS SECTIONS

export type DocsSection = Readonly<{
  key: GroupKey
  label: string
  pageGroups: ReadonlyArray<ReadonlyArray<NavPage>>
}>

export const getStartedPage: NavPage = {
  route: AppRoute.GetStarted(),
  label: 'Get Started',
}

export const docsSections: ReadonlyArray<DocsSection> = [
  {
    key: 'introduction',
    label: 'Introduction',
    pageGroups: [
      [
        {
          route: AppRoute.WhyFoldkit(),
          label: 'Why Foldkit',
        },
        {
          route: AppRoute.Roadmap(),
          label: 'Roadmap',
        },
      ],
    ],
  },
  {
    key: 'coreConcepts',
    label: 'Core',
    pageGroups: [
      [
        {
          route: AppRoute.CoreArchitecture(),
          label: 'Architecture',
        },
        {
          route: AppRoute.CoreCounterExample(),
          label: 'Counter Example',
        },
      ],
      [
        {
          route: AppRoute.CoreModel(),
          label: 'Model',
        },
        {
          route: AppRoute.CoreMessages(),
          label: 'Messages',
        },
        {
          route: AppRoute.CoreUpdate(),
          label: 'Update',
        },
        {
          route: AppRoute.CoreView(),
          label: 'View',
        },
      ],
      [
        {
          route: AppRoute.CoreCommands(),
          label: 'Commands',
        },
        {
          route: AppRoute.CoreSubscriptions(),
          label: 'Subscriptions',
        },
        {
          route: AppRoute.CoreInitAndFlags(),
          label: 'Init & Flags',
        },
        {
          route: AppRoute.CoreSubmodel(),
          label: 'Submodel',
        },
        {
          route: AppRoute.CoreRuntime(),
          label: 'Runtime',
        },
        {
          route: AppRoute.CoreServerRendering(),
          label: 'Server Rendering',
        },
        {
          route: AppRoute.CoreEmbedding(),
          label: 'Embedding',
        },
        {
          route: AppRoute.RoutingAndNavigation(),
          label: 'Routing & Navigation',
        },
        {
          route: AppRoute.CoreViewTransitions(),
          label: 'View Transitions',
        },
      ],
      [
        {
          route: AppRoute.CoreMount(),
          label: 'Mount',
        },
        {
          route: AppRoute.CoreCustomElement(),
          label: 'CustomElement',
        },
        {
          route: AppRoute.CoreDom(),
          label: 'Dom',
        },
        {
          route: AppRoute.CoreRender(),
          label: 'Render',
        },
        {
          route: AppRoute.CoreCanvas(),
          label: 'Canvas',
        },
        {
          route: AppRoute.CoreFile(),
          label: 'File',
        },
        {
          route: AppRoute.CoreHttp(),
          label: 'Http',
        },
        {
          route: AppRoute.CoreQuery(),
          label: 'Query',
        },
        {
          route: AppRoute.FieldValidation(),
          label: 'Field Validation',
        },
        {
          route: AppRoute.AsyncData(),
          label: 'Async Data',
        },
        {
          route: AppRoute.CoreMachine(),
          label: 'Machine',
        },
      ],
      [
        {
          route: AppRoute.CoreResources(),
          label: 'Resources',
        },
        {
          route: AppRoute.CoreManagedResources(),
          label: 'Managed Resources',
        },
      ],
      [
        {
          route: AppRoute.CoreCrashView(),
          label: 'Crash View',
        },
        {
          route: AppRoute.CoreSlowWarnings(),
          label: 'Slow Warnings',
        },
        {
          route: AppRoute.CoreViewMemoization(),
          label: 'View Memoization',
        },
        {
          route: AppRoute.CoreFreezeModel(),
          label: 'Freeze Model',
        },
        {
          route: AppRoute.CorePreserveScroll(),
          label: 'Preserve Scroll',
        },
      ],
      [
        {
          route: AppRoute.CoreDevTools(),
          label: 'DevTools',
        },
      ],
    ],
  },
  {
    key: 'comparisons',
    label: 'Comparisons',
    pageGroups: [
      [
        {
          route: AppRoute.ComingFromReact(),
          label: 'Coming from React',
        },
        {
          route: AppRoute.ReactComparison(),
          label: 'Foldkit vs React: Side by Side',
        },
        {
          route: AppRoute.EffectAtomComparison(),
          label: 'Foldkit vs React + Effect Atom',
        },
      ],
      [
        {
          route: AppRoute.ElmComparison(),
          label: 'Foldkit vs Elm: Side by Side',
        },
      ],
      [
        {
          route: AppRoute.ComingFromTanStackQuery(),
          label: 'Coming from TanStack Query',
        },
      ],
    ],
  },
  {
    key: 'patterns',
    label: 'Patterns',
    pageGroups: [
      [
        {
          route: AppRoute.PatternsAntiPatterns(),
          label: 'Anti-patterns',
        },
        {
          route: AppRoute.ProjectOrganization(),
          label: 'Project Organization',
        },
        {
          route: AppRoute.PatternsInformingSubmodels(),
          label: 'Informing Submodels',
        },
        {
          route: AppRoute.PatternsSubscriptionOrganization(),
          label: 'Subscription Organization',
        },
      ],
    ],
  },
  {
    key: 'tooling',
    label: 'Tooling',
    pageGroups: [
      [
        {
          route: AppRoute.ToolingLinting(),
          label: 'Oxlint Plugin',
        },
      ],
    ],
  },
  {
    key: 'faq',
    label: 'FAQ',
    pageGroups: [
      [
        {
          route: AppRoute.Performance(),
          label: 'Performance',
        },
      ],
    ],
  },
  {
    key: 'foldkitUi',
    label: 'Foldkit UI',
    pageGroups: [
      [
        {
          route: AppRoute.UiOverview(),
          label: 'Overview',
        },
        {
          route: AppRoute.UiSelectionSubmodels(),
          label: 'Selection Submodels',
        },
      ],
      [
        {
          route: AppRoute.UiAnchor(),
          label: 'Anchor',
        },
        {
          route: AppRoute.UiAnimation(),
          label: 'Animation',
        },
        {
          route: AppRoute.UiButton(),
          label: 'Button',
        },
        {
          route: AppRoute.UiCalendar(),
          label: 'Calendar',
        },
        {
          route: AppRoute.UiCheckbox(),
          label: 'Checkbox',
        },
        {
          route: AppRoute.UiCombobox(),
          label: 'Combobox',
        },
        {
          route: AppRoute.UiDatePicker(),
          label: 'Date Picker',
        },
        {
          route: AppRoute.UiDialog(),
          label: 'Dialog',
        },
        {
          route: AppRoute.UiDisclosure(),
          label: 'Disclosure',
        },
        {
          route: AppRoute.UiDragAndDrop(),
          label: 'Drag and Drop',
        },
        {
          route: AppRoute.UiFieldset(),
          label: 'Fieldset',
        },
        {
          route: AppRoute.UiFileDrop(),
          label: 'File Drop',
        },
        {
          route: AppRoute.UiHoverIntent(),
          label: 'Hover Intent',
        },
        {
          route: AppRoute.UiInput(),
          label: 'Input',
        },
        {
          route: AppRoute.UiListbox(),
          label: 'Listbox',
        },
        {
          route: AppRoute.UiMenu(),
          label: 'Menu',
        },
        {
          route: AppRoute.UiMeter(),
          label: 'Meter',
        },
        {
          route: AppRoute.UiNav(),
          label: 'Nav',
        },
        {
          route: AppRoute.UiPopover(),
          label: 'Popover',
        },
        {
          route: AppRoute.UiProgress(),
          label: 'Progress',
        },
        {
          route: AppRoute.UiRadioGroup(),
          label: 'Radio Group',
        },
        {
          route: AppRoute.UiSelect(),
          label: 'Select',
        },
        {
          route: AppRoute.UiSlider(),
          label: 'Slider',
        },
        {
          route: AppRoute.UiSwitch(),
          label: 'Switch',
        },
        {
          route: AppRoute.UiTabs(),
          label: 'Tabs',
        },
        {
          route: AppRoute.UiTextarea(),
          label: 'Textarea',
        },
        {
          route: AppRoute.UiToast(),
          label: 'Toast',
        },
        {
          route: AppRoute.UiTooltip(),
          label: 'Tooltip',
        },
        {
          route: AppRoute.UiVirtualList(),
          label: 'Virtual List',
        },
      ],
    ],
  },
  {
    key: 'ai',
    label: 'AI',
    pageGroups: [
      [
        {
          route: AppRoute.AiOverview(),
          label: 'Overview',
        },
        {
          route: AppRoute.AiSkills(),
          label: 'Skills',
        },
        {
          route: AppRoute.AiMcp(),
          label: 'DevTools MCP',
        },
        {
          route: AppRoute.ContentApi(),
          label: 'Content API',
        },
      ],
    ],
  },
  {
    key: 'testing',
    label: 'Testing',
    pageGroups: [
      [
        {
          route: AppRoute.Testing(),
          label: 'Overview',
        },
        {
          route: AppRoute.TestingStory(),
          label: 'Story',
        },
        {
          route: AppRoute.TestingScene(),
          label: 'Scene',
        },
      ],
    ],
  },
  {
    key: 'bestPractices',
    label: 'Best Practices',
    pageGroups: [
      [
        {
          route: AppRoute.BestPracticesSideEffects(),
          label: 'Side Effects & Purity',
        },
        {
          route: AppRoute.BestPracticesMessages(),
          label: 'Messages',
        },
        {
          route: AppRoute.BestPracticesKeying(),
          label: 'Keying',
        },
        {
          route: AppRoute.BestPracticesImmutability(),
          label: 'Immutability',
        },
      ],
    ],
  },
  {
    key: 'examples',
    label: 'Examples',
    pageGroups: [
      [
        {
          route: AppRoute.Examples(),
          label: 'Overview',
        },
        ...Array.map(examples, example => ({
          route: AppRoute.ExampleDetail({ exampleSlug: example.slug }),
          label: example.title,
        })),
        {
          route: AppRoute.TypingTerminal(),
          label: 'Typing Terminal',
        },
      ],
    ],
  },
]

// FLAT PAGE LIST

export const allPages: ReadonlyArray<NavPage> = [
  getStartedPage,
  ...Array.flatMap(docsSections, ({ pageGroups }) => Array.flatten(pageGroups)),
]

// NEXT / PREV LOOKUP

export type PageNeighbors = Readonly<{
  maybePrevious: Option.Option<NavPage>
  maybeNext: Option.Option<NavPage>
}>

export const pageNeighbors = (route: AppRoute): PageNeighbors =>
  pipe(
    allPages,
    Array.findFirstIndex(page => isNavPageActive(route, page)),
    Option.match({
      onNone: (): PageNeighbors => ({
        maybePrevious: Option.none(),
        maybeNext: Option.none(),
      }),
      onSome: index => ({
        maybePrevious: Array.get(allPages, Number.decrement(index)),
        maybeNext: Array.get(allPages, Number.increment(index)),
      }),
    }),
  )

export const findActiveSectionKey = (
  route: AppRoute,
): Option.Option<GroupKey> => {
  // NOTE: ApiModule and Blog pages aren't in docsSections. Their groups are
  // rendered separately, so map them explicitly.
  if (AppRoute.guards.ApiModule(route)) {
    return Option.some('apiReference')
  }

  if (isBlogRoute(route)) {
    return Option.some('blog')
  }

  return pipe(
    docsSections,
    Array.findFirst(section =>
      pipe(
        section.pageGroups,
        Array.flatten,
        Array.some(page => isNavPageActive(route, page)),
      ),
    ),
    Option.map(section => section.key),
  )
}
