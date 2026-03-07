import { Array, Number, Option, pipe } from 'effect'

import {
  bestPracticesRouter,
  comingFromReactRouter,
  coreCommandsRouter,
  coreCounterExampleRouter,
  coreErrorViewRouter,
  coreInitRouter,
  coreManagedResourcesRouter,
  coreMessagesRouter,
  coreModelRouter,
  coreResourcesRouter,
  coreRunningYourAppRouter,
  coreSlowViewWarningRouter,
  coreSubscriptionsRouter,
  coreTaskRouter,
  coreUpdateRouter,
  coreViewMemoizationRouter,
  coreViewRouter,
  examplesRouter,
  fieldValidationRouter,
  gettingStartedRouter,
  patternsModelAsUnionRouter,
  patternsOutMessageRouter,
  patternsSubmodelsRouter,
  projectOrganizationRouter,
  routingAndNavigationRouter,
  uiComboboxRouter,
  uiDialogRouter,
  uiDisclosureRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiPopoverRouter,
  uiSwitchRouter,
  uiTabsRouter,
  whyFoldkitRouter,
} from './route'

// NAV PAGE

export type NavPage = Readonly<{
  _tag: string
  href: string
  label: string
}>

// DOCS SECTIONS

export type DocsSection = Readonly<{
  label: string
  pages: ReadonlyArray<NavPage>
}>

export const docsSections: ReadonlyArray<DocsSection> = [
  {
    label: 'Get Started',
    pages: [
      {
        _tag: 'WhyFoldkit',
        href: whyFoldkitRouter.build({}),
        label: 'Why Foldkit?',
      },
      {
        _tag: 'ComingFromReact',
        href: comingFromReactRouter.build({}),
        label: 'Coming from React',
      },
      {
        _tag: 'GettingStarted',
        href: gettingStartedRouter.build({}),
        label: 'Getting Started',
      },
    ],
  },
  {
    label: 'Core Concepts',
    pages: [
      {
        _tag: 'CoreCounterExample',
        href: coreCounterExampleRouter.build({}),
        label: 'Counter Example',
      },
      {
        _tag: 'CoreModel',
        href: coreModelRouter.build({}),
        label: 'Model',
      },
      {
        _tag: 'CoreMessages',
        href: coreMessagesRouter.build({}),
        label: 'Messages',
      },
      {
        _tag: 'CoreUpdate',
        href: coreUpdateRouter.build({}),
        label: 'Update',
      },
      {
        _tag: 'CoreView',
        href: coreViewRouter.build({}),
        label: 'View',
      },
      {
        _tag: 'CoreCommands',
        href: coreCommandsRouter.build({}),
        label: 'Commands',
      },
      {
        _tag: 'CoreSubscriptions',
        href: coreSubscriptionsRouter.build({}),
        label: 'Subscriptions',
      },
      {
        _tag: 'CoreInit',
        href: coreInitRouter.build({}),
        label: 'Init',
      },
      {
        _tag: 'CoreTask',
        href: coreTaskRouter.build({}),
        label: 'Task',
      },
      {
        _tag: 'CoreRunningYourApp',
        href: coreRunningYourAppRouter.build({}),
        label: 'Running Your App',
      },
      {
        _tag: 'CoreResources',
        href: coreResourcesRouter.build({}),
        label: 'Resources',
      },
      {
        _tag: 'CoreManagedResources',
        href: coreManagedResourcesRouter.build({}),
        label: 'Managed Resources',
      },
      {
        _tag: 'CoreErrorView',
        href: coreErrorViewRouter.build({}),
        label: 'Error View',
      },
      {
        _tag: 'CoreSlowViewWarning',
        href: coreSlowViewWarningRouter.build({}),
        label: 'Slow View Warning',
      },
      {
        _tag: 'CoreViewMemoization',
        href: coreViewMemoizationRouter.build({}),
        label: 'View Memoization',
      },
    ],
  },
  {
    label: 'Guides',
    pages: [
      {
        _tag: 'RoutingAndNavigation',
        href: routingAndNavigationRouter.build({}),
        label: 'Routing & Navigation',
      },
      {
        _tag: 'FieldValidation',
        href: fieldValidationRouter.build({}),
        label: 'Field Validation',
      },
      {
        _tag: 'ProjectOrganization',
        href: projectOrganizationRouter.build({}),
        label: 'Project Organization',
      },
      {
        _tag: 'BestPractices',
        href: bestPracticesRouter.build({}),
        label: 'Best Practices',
      },
    ],
  },
  {
    label: 'Patterns',
    pages: [
      {
        _tag: 'PatternsSubmodels',
        href: patternsSubmodelsRouter.build({}),
        label: 'Submodels',
      },
      {
        _tag: 'PatternsModelAsUnion',
        href: patternsModelAsUnionRouter.build({}),
        label: 'Model as Union',
      },
      {
        _tag: 'PatternsOutMessage',
        href: patternsOutMessageRouter.build({}),
        label: 'OutMessage',
      },
    ],
  },
  {
    label: 'Examples',
    pages: [
      {
        _tag: 'Examples',
        href: examplesRouter.build({}),
        label: 'Example Apps',
      },
    ],
  },
  {
    label: 'Foldkit UI',
    pages: [
      {
        _tag: 'UiTabs',
        href: uiTabsRouter.build({}),
        label: 'Tabs',
      },
      {
        _tag: 'UiDisclosure',
        href: uiDisclosureRouter.build({}),
        label: 'Disclosure',
      },
      {
        _tag: 'UiDialog',
        href: uiDialogRouter.build({}),
        label: 'Dialog',
      },
      {
        _tag: 'UiMenu',
        href: uiMenuRouter.build({}),
        label: 'Menu',
      },
      {
        _tag: 'UiPopover',
        href: uiPopoverRouter.build({}),
        label: 'Popover',
      },
      {
        _tag: 'UiListbox',
        href: uiListboxRouter.build({}),
        label: 'Listbox',
      },
      {
        _tag: 'UiSwitch',
        href: uiSwitchRouter.build({}),
        label: 'Switch',
      },
      {
        _tag: 'UiCombobox',
        href: uiComboboxRouter.build({}),
        label: 'Combobox',
      },
    ],
  },
]

// FLAT PAGE LIST

export const allPages: ReadonlyArray<NavPage> = Array.flatMap(
  docsSections,
  ({ pages }) => pages,
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
