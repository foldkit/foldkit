import { Array, Number, Option, pipe } from 'effect'

import { examples } from './page/example/meta'
import {
  aiOverviewRouter,
  aiSkillsRouter,
  bestPracticesImmutabilityRouter,
  bestPracticesKeyingRouter,
  bestPracticesMessagesRouter,
  bestPracticesSideEffectsRouter,
  comingFromReactRouter,
  coreArchitectureRouter,
  coreCommandsRouter,
  coreCounterExampleRouter,
  coreCrashViewRouter,
  coreDevtoolsRouter,
  coreFileRouter,
  coreInitAndFlagsRouter,
  coreManagedResourcesRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreResourcesRouter,
  coreRunningYourAppRouter,
  coreSlowViewRouter,
  coreSubscriptionsRouter,
  coreTaskRouter,
  coreUpdateRouter,
  coreViewMemoizationRouter,
  coreViewRouter,
  exampleDetailRouter,
  examplesRouter,
  fieldValidationRouter,
  gettingStartedRouter,
  manifestoRouter,
  patternsOutMessageRouter,
  patternsSubmodelsRouter,
  projectOrganizationRouter,
  reactComparisonRouter,
  routingAndNavigationRouter,
  testingRouter,
  testingSceneRouter,
  testingStoryRouter,
  uiButtonRouter,
  uiCheckboxRouter,
  uiComboboxRouter,
  uiDialogRouter,
  uiDisclosureRouter,
  uiDragAndDropRouter,
  uiFieldsetRouter,
  uiInputRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiOverviewRouter,
  uiPopoverRouter,
  uiRadioGroupRouter,
  uiSelectRouter,
  uiSwitchRouter,
  uiTabsRouter,
  uiTextareaRouter,
  uiTransitionRouter,
} from './route'

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
  label: string
  pageGroups: ReadonlyArray<ReadonlyArray<NavPage>>
}>

export const docsSections: ReadonlyArray<DocsSection> = [
  {
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
          _tag: 'CoreTask',
          href: coreTaskRouter(),
          label: 'Task',
        },
        {
          _tag: 'CoreFile',
          href: coreFileRouter(),
          label: 'File',
        },
      ],
      [
        {
          _tag: 'CoreRunningYourApp',
          href: coreRunningYourAppRouter(),
          label: 'Running Your App',
        },
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
          _tag: 'CoreDevtools',
          href: coreDevtoolsRouter(),
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
          _tag: 'CoreViewMemoization',
          href: coreViewMemoizationRouter(),
          label: 'View Memoization',
        },
      ],
    ],
  },
  {
    label: 'Guides',
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
        {
          _tag: 'ProjectOrganization',
          href: projectOrganizationRouter(),
          label: 'Project Organization',
        },
      ],
    ],
  },
  {
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
    label: 'Patterns',
    pageGroups: [
      [
        {
          _tag: 'PatternsSubmodels',
          href: patternsSubmodelsRouter(),
          label: 'Submodels',
        },
        {
          _tag: 'PatternsOutMessage',
          href: patternsOutMessageRouter(),
          label: 'OutMessage',
        },
      ],
    ],
  },
  {
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
      ],
    ],
  },
  {
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
      ],
    ],
  },
  {
    label: 'Foldkit UI',
    pageGroups: [
      [
        {
          _tag: 'UiOverview',
          href: uiOverviewRouter(),
          label: 'Overview',
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
          _tag: 'UiTransition',
          href: uiTransitionRouter(),
          label: 'Transition',
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
