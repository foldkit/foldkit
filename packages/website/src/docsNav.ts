import { Array, Number, Option, pipe } from 'effect'

import {
  bestPracticesRouter,
  comingFromReactRouter,
  coreArchitectureRouter,
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
  manifestoRouter,
  patternsOutMessageRouter,
  patternsSubmodelsRouter,
  projectOrganizationRouter,
  routingAndNavigationRouter,
  uiButtonRouter,
  uiCheckboxRouter,
  uiComboboxRouter,
  uiDialogRouter,
  uiDisclosureRouter,
  uiListboxRouter,
  uiMenuRouter,
  uiPopoverRouter,
  uiRadioGroupRouter,
  uiSwitchRouter,
  uiTabsRouter,
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
  },
  {
    label: 'Core Concepts',
    pages: [
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
        _tag: 'CoreInit',
        href: coreInitRouter(),
        label: 'Init',
      },
      {
        _tag: 'CoreTask',
        href: coreTaskRouter(),
        label: 'Task',
      },
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
      {
        _tag: 'CoreErrorView',
        href: coreErrorViewRouter(),
        label: 'Error View',
      },
      {
        _tag: 'CoreSlowViewWarning',
        href: coreSlowViewWarningRouter(),
        label: 'Slow View Warning',
      },
      {
        _tag: 'CoreViewMemoization',
        href: coreViewMemoizationRouter(),
        label: 'View Memoization',
      },
    ],
  },
  {
    label: 'Guides',
    pages: [
      {
        _tag: 'ComingFromReact',
        href: comingFromReactRouter(),
        label: 'Coming from React',
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
      {
        _tag: 'BestPractices',
        href: bestPracticesRouter(),
        label: 'Best Practices',
      },
    ],
  },
  {
    label: 'Patterns',
    pages: [
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
  },
  {
    label: 'Examples',
    pages: [
      {
        _tag: 'Examples',
        href: examplesRouter(),
        label: 'Example Apps',
      },
    ],
  },
  {
    label: 'Foldkit UI',
    pages: [
      {
        _tag: 'UiButton',
        href: uiButtonRouter(),
        label: 'Button',
      },
      {
        _tag: 'UiTabs',
        href: uiTabsRouter(),
        label: 'Tabs',
      },
      {
        _tag: 'UiDisclosure',
        href: uiDisclosureRouter(),
        label: 'Disclosure',
      },
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
        _tag: 'UiListbox',
        href: uiListboxRouter(),
        label: 'Listbox',
      },
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
        _tag: 'UiCheckbox',
        href: uiCheckboxRouter(),
        label: 'Checkbox',
      },
      {
        _tag: 'UiCombobox',
        href: uiComboboxRouter(),
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
