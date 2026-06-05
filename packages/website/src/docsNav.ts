import { Array, Number, Option, pipe } from 'effect'

import { examples } from './page/example/meta'
import {
  aiMcpRouter,
  aiOverviewRouter,
  aiSkillsRouter,
  bestPracticesImmutabilityRouter,
  bestPracticesKeyingRouter,
  bestPracticesMessagesRouter,
  bestPracticesSideEffectsRouter,
  comingFromReactRouter,
  coreArchitectureRouter,
  coreCanvasRouter,
  coreCommandsRouter,
  coreCounterExampleRouter,
  coreCrashViewRouter,
  coreCustomElementRouter,
  coreDevToolsRouter,
  coreDomRouter,
  coreFileRouter,
  coreFreezeModelRouter,
  coreInitAndFlagsRouter,
  coreManagedResourcesRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreMountRouter,
  coreRenderRouter,
  coreResourcesRouter,
  coreRuntimeRouter,
  coreSlowViewRouter,
  coreSubmodelRouter,
  coreSubscriptionsRouter,
  coreUpdateRouter,
  coreViewMemoizationRouter,
  coreViewRouter,
  exampleDetailRouter,
  examplesRouter,
  fieldValidationRouter,
  gettingStartedRouter,
  manifestoRouter,
  patternsInformingSubmodelsRouter,
  patternsSubscriptionOrganizationRouter,
  projectOrganizationRouter,
  reactComparisonRouter,
  routingAndNavigationRouter,
  testingRouter,
  testingSceneRouter,
  testingStoryRouter,
  typingTerminalRouter,
  uiAnimationRouter,
  uiButtonRouter,
  uiCalendarRouter,
  uiCheckboxRouter,
  uiComboboxRouter,
  uiDatePickerRouter,
  uiDialogRouter,
  uiDisclosureRouter,
  uiDragAndDropRouter,
  uiFieldsetRouter,
  uiFileDropRouter,
  uiInputRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiOverviewRouter,
  uiPopoverRouter,
  uiRadioGroupRouter,
  uiSelectRouter,
  uiSelectionSubmodelsRouter,
  uiSliderRouter,
  uiSwitchRouter,
  uiTabsRouter,
  uiTextareaRouter,
  uiToastRouter,
  uiTooltipRouter,
  uiVirtualListRouter,
  whatAboutSsrRouter,
  whyNoJsxRouter,
} from './route'
import { type GroupKey } from './sidebarStorage'

export const DOCS_SIDEBAR_NAV_ID = 'docs-sidebar-nav'

// NAV PAGE

export type NavPage = Readonly<{
  _tag: string
  href: string
  label: string
}>

const EXAMPLE_DETAIL_TAG_PREFIX = 'ExampleDetail:'

const exampleDetailTag = (slug: string): string =>
  EXAMPLE_DETAIL_TAG_PREFIX + slug

/** Determines whether a nav page should be highlighted as active. Handles
 *  example detail pages whose `_tag` encodes the slug (e.g. `ExampleDetail:counter`). */
export const isNavPageActive = (
  routeTag: string,
  maybeExampleSlug: Option.Option<string>,
  pageTag: string,
): boolean =>
  pipe(
    maybeExampleSlug,
    Option.filter(() => pageTag.startsWith(EXAMPLE_DETAIL_TAG_PREFIX)),
    Option.match({
      onNone: () => routeTag === pageTag,
      onSome: slug => pageTag === exampleDetailTag(slug),
    }),
  )

// DOCS SECTIONS

export type DocsSection = Readonly<{
  key: GroupKey
  label: string
  pageGroups: ReadonlyArray<ReadonlyArray<NavPage>>
}>

export const docsSections: ReadonlyArray<DocsSection> = [
  {
    key: 'getStarted',
    label: 'Get Started',
    pageGroups: [
      [
        {
          _tag: 'Manifesto',
          href: manifestoRouter(),
          label: 'Manifesto',
        },
        {
          _tag: 'GettingStarted',
          href: gettingStartedRouter(),
          label: 'Getting Started',
        },
      ],
    ],
  },
  {
    key: 'coreConcepts',
    label: 'Core Concepts',
    pageGroups: [
      [
        {
          _tag: 'CoreArchitecture',
          href: coreArchitectureRouter(),
          label: 'Architecture',
        },
        {
          _tag: 'CoreCounterExample',
          href: coreCounterExampleRouter(),
          label: 'Counter Example',
        },
      ],
      [
        {
          _tag: 'CoreModel',
          href: coreModelRouter(),
          label: 'Model',
        },
        {
          _tag: 'CoreMessages',
          href: coreMessagesRouter(),
          label: 'Messages',
        },
        {
          _tag: 'CoreUpdate',
          href: coreUpdateRouter(),
          label: 'Update',
        },
        {
          _tag: 'CoreView',
          href: coreViewRouter(),
          label: 'View',
        },
      ],
      [
        {
          _tag: 'CoreCommands',
          href: coreCommandsRouter(),
          label: 'Commands',
        },
        {
          _tag: 'CoreMount',
          href: coreMountRouter(),
          label: 'Mount',
        },
        {
          _tag: 'CoreSubscriptions',
          href: coreSubscriptionsRouter(),
          label: 'Subscriptions',
        },
        {
          _tag: 'CoreInitAndFlags',
          href: coreInitAndFlagsRouter(),
          label: 'Init & Flags',
        },
        {
          _tag: 'CoreSubmodel',
          href: coreSubmodelRouter(),
          label: 'Submodel',
        },
        {
          _tag: 'CoreRuntime',
          href: coreRuntimeRouter(),
          label: 'Runtime',
        },
      ],
      [
        {
          _tag: 'RoutingAndNavigation',
          href: routingAndNavigationRouter(),
          label: 'Routing & Navigation',
        },
        {
          _tag: 'FieldValidation',
          href: fieldValidationRouter(),
          label: 'Field Validation',
        },
      ],
      [
        {
          _tag: 'CoreDom',
          href: coreDomRouter(),
          label: 'Dom',
        },
        {
          _tag: 'CoreRender',
          href: coreRenderRouter(),
          label: 'Render',
        },
        {
          _tag: 'CoreCustomElement',
          href: coreCustomElementRouter(),
          label: 'CustomElement',
        },
        {
          _tag: 'CoreCanvas',
          href: coreCanvasRouter(),
          label: 'Canvas',
        },
        {
          _tag: 'CoreFile',
          href: coreFileRouter(),
          label: 'File',
        },
      ],
      [
        {
          _tag: 'CoreResources',
          href: coreResourcesRouter(),
          label: 'Resources',
        },
        {
          _tag: 'CoreManagedResources',
          href: coreManagedResourcesRouter(),
          label: 'Managed Resources',
        },
      ],
      [
        {
          _tag: 'CoreDevTools',
          href: coreDevToolsRouter(),
          label: 'DevTools',
        },
        {
          _tag: 'CoreCrashView',
          href: coreCrashViewRouter(),
          label: 'Crash View',
        },
        {
          _tag: 'CoreSlowView',
          href: coreSlowViewRouter(),
          label: 'Slow View',
        },
        {
          _tag: 'CoreFreezeModel',
          href: coreFreezeModelRouter(),
          label: 'Freeze Model',
        },
        {
          _tag: 'CoreViewMemoization',
          href: coreViewMemoizationRouter(),
          label: 'View Memoization',
        },
      ],
    ],
  },
  {
    key: 'forReactDevelopers',
    label: 'For React Developers',
    pageGroups: [
      [
        {
          _tag: 'ComingFromReact',
          href: comingFromReactRouter(),
          label: 'Coming from React',
        },
        {
          _tag: 'ReactComparison',
          href: reactComparisonRouter(),
          label: 'Foldkit vs React: Side by Side',
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
          _tag: 'ProjectOrganization',
          href: projectOrganizationRouter(),
          label: 'Project Organization',
        },
        {
          _tag: 'PatternsInformingSubmodels',
          href: patternsInformingSubmodelsRouter(),
          label: 'Informing Submodels',
        },
        {
          _tag: 'PatternsSubscriptionOrganization',
          href: patternsSubscriptionOrganizationRouter(),
          label: 'Subscription Organization',
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
          _tag: 'WhyNoJsx',
          href: whyNoJsxRouter(),
          label: 'Why no JSX?',
        },
        {
          _tag: 'WhatAboutSsr',
          href: whatAboutSsrRouter(),
          label: 'What about SSR?',
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
          _tag: 'UiOverview',
          href: uiOverviewRouter(),
          label: 'Overview',
        },
        {
          _tag: 'UiSelectionSubmodels',
          href: uiSelectionSubmodelsRouter(),
          label: 'Selection Submodels',
        },
      ],
      [
        {
          _tag: 'UiButton',
          href: uiButtonRouter(),
          label: 'Button',
        },
        {
          _tag: 'UiInput',
          href: uiInputRouter(),
          label: 'Input',
        },
        {
          _tag: 'UiTextarea',
          href: uiTextareaRouter(),
          label: 'Textarea',
        },
        {
          _tag: 'UiCheckbox',
          href: uiCheckboxRouter(),
          label: 'Checkbox',
        },
        {
          _tag: 'UiFieldset',
          href: uiFieldsetRouter(),
          label: 'Fieldset',
        },
      ],
      [
        {
          _tag: 'UiRadioGroup',
          href: uiRadioGroupRouter(),
          label: 'Radio Group',
        },
        {
          _tag: 'UiSwitch',
          href: uiSwitchRouter(),
          label: 'Switch',
        },
        {
          _tag: 'UiSlider',
          href: uiSliderRouter(),
          label: 'Slider',
        },
        {
          _tag: 'UiSelect',
          href: uiSelectRouter(),
          label: 'Select',
        },
        {
          _tag: 'UiListbox',
          href: uiListboxRouter(),
          label: 'Listbox',
        },
        {
          _tag: 'UiCombobox',
          href: uiComboboxRouter(),
          label: 'Combobox',
        },
      ],
      [
        {
          _tag: 'UiDialog',
          href: uiDialogRouter(),
          label: 'Dialog',
        },
        {
          _tag: 'UiMenu',
          href: uiMenuRouter(),
          label: 'Menu',
        },
        {
          _tag: 'UiPopover',
          href: uiPopoverRouter(),
          label: 'Popover',
        },
        {
          _tag: 'UiTooltip',
          href: uiTooltipRouter(),
          label: 'Tooltip',
        },
        {
          _tag: 'UiToast',
          href: uiToastRouter(),
          label: 'Toast',
        },
        {
          _tag: 'UiDisclosure',
          href: uiDisclosureRouter(),
          label: 'Disclosure',
        },
        {
          _tag: 'UiTabs',
          href: uiTabsRouter(),
          label: 'Tabs',
        },
      ],
      [
        {
          _tag: 'UiDragAndDrop',
          href: uiDragAndDropRouter(),
          label: 'Drag and Drop',
        },
        {
          _tag: 'UiFileDrop',
          href: uiFileDropRouter(),
          label: 'File Drop',
        },
        {
          _tag: 'UiCalendar',
          href: uiCalendarRouter(),
          label: 'Calendar',
        },
        {
          _tag: 'UiDatePicker',
          href: uiDatePickerRouter(),
          label: 'Date Picker',
        },
        {
          _tag: 'UiAnimation',
          href: uiAnimationRouter(),
          label: 'Animation',
        },
        {
          _tag: 'UiVirtualList',
          href: uiVirtualListRouter(),
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
          _tag: 'AiOverview',
          href: aiOverviewRouter(),
          label: 'Overview',
        },
        {
          _tag: 'AiSkills',
          href: aiSkillsRouter(),
          label: 'Skills',
        },
        {
          _tag: 'AiMcp',
          href: aiMcpRouter(),
          label: 'DevTools MCP',
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
          _tag: 'Testing',
          href: testingRouter(),
          label: 'Overview',
        },
        {
          _tag: 'TestingStory',
          href: testingStoryRouter(),
          label: 'Story',
        },
        {
          _tag: 'TestingScene',
          href: testingSceneRouter(),
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
          _tag: 'BestPracticesSideEffects',
          href: bestPracticesSideEffectsRouter(),
          label: 'Side Effects & Purity',
        },
        {
          _tag: 'BestPracticesMessages',
          href: bestPracticesMessagesRouter(),
          label: 'Messages',
        },
        {
          _tag: 'BestPracticesKeying',
          href: bestPracticesKeyingRouter(),
          label: 'Keying',
        },
        {
          _tag: 'BestPracticesImmutability',
          href: bestPracticesImmutabilityRouter(),
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
          _tag: 'Examples',
          href: examplesRouter(),
          label: 'Overview',
        },
        ...Array.map(examples, example => ({
          _tag: exampleDetailTag(example.slug),
          href: exampleDetailRouter({ exampleSlug: example.slug }),
          label: example.title,
        })),
        {
          _tag: 'TypingTerminal',
          href: typingTerminalRouter(),
          label: 'Typing Terminal',
        },
      ],
    ],
  },
]

// FLAT PAGE LIST

export const allPages: ReadonlyArray<NavPage> = Array.flatMap(
  docsSections,
  ({ pageGroups }) => Array.flatten(pageGroups),
)

// NEXT / PREV LOOKUP

export type PageNeighbors = Readonly<{
  maybePrevious: Option.Option<NavPage>
  maybeNext: Option.Option<NavPage>
}>

export const pageNeighbors = (_tag: string): PageNeighbors =>
  pipe(
    allPages,
    Array.findFirstIndex(page => page._tag === _tag),
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
  routeTag: string,
  maybeExampleSlug: Option.Option<string>,
): Option.Option<GroupKey> => {
  // NOTE: ApiModule pages aren't in docsSections; their apiReference group is
  // rendered separately, so map them explicitly.
  if (routeTag === 'ApiModule') {
    return Option.some('apiReference')
  }
  return pipe(
    docsSections,
    Array.findFirst(section =>
      pipe(
        section.pageGroups,
        Array.flatten,
        Array.some(page =>
          isNavPageActive(routeTag, maybeExampleSlug, page._tag),
        ),
      ),
    ),
    Option.map(section => section.key),
  )
}
