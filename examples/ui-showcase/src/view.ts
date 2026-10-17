import clsx from 'clsx'
import { Array, Match, Option, pipe } from 'effect'
import { Html, HtmlBuilder } from 'foldkit/html'

import { Nav } from '@foldkit/ui'

import { ApplicationComposition, UiBinding } from './composition'
import type { ApplicationViewBuilder } from './composition'
import * as Icon from './icon'
import { Message } from './message'
import { Model } from './model'
import {
  ApplicationRoute,
  animationRouter,
  buttonRouter,
  calendarRouter,
  checkboxRouter,
  comboboxRouter,
  datePickerRouter,
  dialogRouter,
  disclosureRouter,
  dragAndDropRouter,
  fieldsetRouter,
  fileDropRouter,
  homeRouter,
  hoverIntentRouter,
  inputRouter,
  listboxRouter,
  menuRouter,
  meterRouter,
  popoverRouter,
  progressRouter,
  radioGroupRouter,
  selectRouter,
  sliderRouter,
  switchRouter,
  tabsRouter,
  textareaRouter,
  toastRouter,
  tooltipRouter,
  virtualListRouter,
} from './route'
import * as Ui from './ui'

type NavItem = Readonly<{
  label: string
  routeTag: string
  href: string
}>

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { label: 'Animation', routeTag: 'Animation', href: animationRouter() },
  { label: 'Button', routeTag: 'Button', href: buttonRouter() },
  { label: 'Calendar', routeTag: 'Calendar', href: calendarRouter() },
  { label: 'Checkbox', routeTag: 'Checkbox', href: checkboxRouter() },
  { label: 'Combobox', routeTag: 'Combobox', href: comboboxRouter() },
  { label: 'Date Picker', routeTag: 'DatePicker', href: datePickerRouter() },
  { label: 'Dialog', routeTag: 'Dialog', href: dialogRouter() },
  { label: 'Disclosure', routeTag: 'Disclosure', href: disclosureRouter() },
  {
    label: 'Drag and Drop',
    routeTag: 'DragAndDrop',
    href: dragAndDropRouter(),
  },
  { label: 'Fieldset', routeTag: 'Fieldset', href: fieldsetRouter() },
  { label: 'File Drop', routeTag: 'FileDrop', href: fileDropRouter() },
  {
    label: 'Hover Intent',
    routeTag: 'HoverIntent',
    href: hoverIntentRouter(),
  },
  { label: 'Input', routeTag: 'Input', href: inputRouter() },
  { label: 'Listbox', routeTag: 'Listbox', href: listboxRouter() },
  { label: 'Menu', routeTag: 'Menu', href: menuRouter() },
  { label: 'Meter', routeTag: 'Meter', href: meterRouter() },
  { label: 'Popover', routeTag: 'Popover', href: popoverRouter() },
  { label: 'Progress', routeTag: 'Progress', href: progressRouter() },
  { label: 'Radio Group', routeTag: 'RadioGroup', href: radioGroupRouter() },
  { label: 'Select', routeTag: 'Select', href: selectRouter() },
  { label: 'Slider', routeTag: 'Slider', href: sliderRouter() },
  { label: 'Switch', routeTag: 'Switch', href: switchRouter() },
  { label: 'Tabs', routeTag: 'Tabs', href: tabsRouter() },
  { label: 'Textarea', routeTag: 'Textarea', href: textareaRouter() },
  { label: 'Toast', routeTag: 'Toast', href: toastRouter() },
  { label: 'Tooltip', routeTag: 'Tooltip', href: tooltipRouter() },
  {
    label: 'Virtual List',
    routeTag: 'VirtualList',
    href: virtualListRouter(),
  },
]

const NAV_ROUTE_TAGS: ReadonlyArray<string> = Array.map(
  NAV_ITEMS,
  navItem => navItem.routeTag,
)

const navItemHref = (index: number): string =>
  pipe(
    NAV_ITEMS,
    Array.get(index),
    Option.map(navItem => navItem.href),
    Option.getOrElse(() => homeRouter()),
  )

const componentNav = (
  currentRoute: ApplicationRoute,
  toView: (render: Nav.RenderInfo) => Html,
): Html =>
  Nav.view({
    items: NAV_ROUTE_TAGS,
    ariaLabel: 'Components',
    toHref: (_routeTag, index) => navItemHref(index),
    isItemCurrent: routeTag => currentRoute._tag === routeTag,
    toView,
  })

const navListView = <Message, AllowedMountRequirements>(
  items: ReadonlyArray<Nav.ItemInfo>,
  linkClassName: (isActive: boolean) => string,
  h: HtmlBuilder<Message, AllowedMountRequirements>,
): Html =>
  h.ul(
    [h.Class('flex flex-col gap-0.5')],
    pipe(
      NAV_ITEMS,
      Array.zip(items),
      Array.map(([navItem, item]) =>
        h.li(
          [],
          [
            h.a(
              [...item.link, h.Class(linkClassName(item.isCurrent))],
              [navItem.label],
            ),
          ],
        ),
      ),
    ),
  )

const navLinkClassName = (isActive: boolean): string =>
  clsx(
    'block px-3 py-1.5 rounded-md text-sm transition-colors',
    isActive
      ? 'bg-accent-100 text-accent-700'
      : 'text-gray-700 hover:bg-gray-200',
  )

const mobileNavLinkClassName = (isActive: boolean): string =>
  clsx(
    'block px-4 py-2.5 rounded-md text-base transition-colors',
    isActive
      ? 'bg-accent-100 text-accent-700'
      : 'text-gray-700 hover:bg-gray-200',
  )

const sidebarView = (
  currentRoute: ApplicationRoute,
  h: ApplicationViewBuilder,
) => {
  const sidebarNavView = ({ nav, items }: Nav.RenderInfo): Html =>
    h.nav(
      [
        ...nav,
        h.Class(
          'hidden md:flex w-56 shrink-0 border-r border-gray-200 bg-gray-50 p-4 flex-col',
        ),
      ],
      [
        h.div(
          [h.Class('mb-6')],
          [
            h.a(
              [h.Href(homeRouter()), h.Class('block')],
              [
                h.h1(
                  [h.Class('text-lg font-bold text-gray-900')],
                  ['Foldkit UI'],
                ),
              ],
            ),
            h.span([h.Class('text-xs text-gray-500')], ['Component Showcase']),
          ],
        ),
        navListView(items, navLinkClassName, h),
      ],
    )

  return componentNav(currentRoute, sidebarNavView)
}

const mobileMenuContent =
  (
    currentRoute: ApplicationRoute,
  ): Ui.View.MobileMenuViewInputs['renderContent'] =>
  (closeButton, h) => {
    const mobileNavView = ({ nav, items }: Nav.RenderInfo): Html =>
      h.nav(
        [
          ...nav,
          h.Class('flex-1 overflow-y-auto min-h-0 p-4'),
          h.Tabindex(-1),
          h.Autofocus(true),
        ],
        [navListView(items, mobileNavLinkClassName, h)],
      )

    return h.div(
      [h.Class('flex flex-col h-full')],
      [
        h.div(
          [
            h.Class(
              'flex items-center justify-between border-b border-gray-200 px-4 py-3',
            ),
          ],
          [
            h.a(
              [h.Href(homeRouter()), h.Class('block')],
              [
                h.div(
                  [h.Class('flex flex-col')],
                  [
                    h.span(
                      [h.Class('text-base font-bold text-gray-900')],
                      ['Foldkit UI'],
                    ),
                    h.span(
                      [h.Class('text-xs text-gray-500')],
                      ['Component Showcase'],
                    ),
                  ],
                ),
              ],
            ),
            h.button(
              [
                ...closeButton,
                h.Class(
                  'p-2 rounded-md hover:bg-gray-200 transition text-gray-700 cursor-pointer',
                ),
                h.AriaLabel('Close menu'),
              ],
              [Icon.xMark('w-6 h-6')],
            ),
          ],
        ),
        componentNav(currentRoute, mobileNavView),
      ],
    )
  }

const mobileHeaderView = (model: Model, h: ApplicationViewBuilder) =>
  h.header(
    [
      h.Class(
        'md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3',
      ),
    ],
    [
      h.a(
        [h.Href(homeRouter()), h.Class('block')],
        [
          h.div(
            [h.Class('flex flex-col')],
            [
              h.span(
                [h.Class('text-base font-bold text-gray-900')],
                ['Foldkit UI'],
              ),
              h.span(
                [h.Class('text-xs text-gray-500')],
                ['Component Showcase'],
              ),
            ],
          ),
        ],
      ),
      h.button(
        [
          h.Class(
            'p-2 rounded-md hover:bg-gray-200 transition text-gray-700 cursor-pointer',
          ),
          h.AriaExpanded(model.uiModel.mobileMenuDialog.isOpen),
          h.AriaLabel('Toggle menu'),
          h.OnClick(Message.ClickedOpenMobileMenu()),
        ],
        [Icon.menu('w-6 h-6')],
      ),
    ],
  )

const mobileMenuView = (model: Model, h: ApplicationViewBuilder) =>
  h.block(
    UiBinding.embedView({
      slotId: 'mobile-menu',
      model: model.uiModel,
      view: Ui.View.mobileMenu,
      viewInputs: { renderContent: mobileMenuContent(model.route) },
    }),
  )

const homeView = (h: ApplicationViewBuilder) =>
  h.div(
    [h.Class('max-w-2xl')],
    [
      h.h1(
        [h.Class('text-2xl md:text-3xl font-bold text-gray-900 mb-4')],
        ['Foldkit UI Showcase'],
      ),
      h.p(
        [h.Class('text-gray-600 mb-4')],
        [
          'This is a showcase of every Foldkit UI component. Select a component from the menu to see it in action.',
        ],
      ),
      h.p(
        [h.Class('text-gray-600')],
        [
          'Each component is headless. You provide the markup and styling via a callback, and Foldkit handles accessibility, keyboard navigation, and state management.',
        ],
      ),
    ],
  )

const notFoundView = (path: string, h: ApplicationViewBuilder) =>
  h.div(
    [h.Class('max-w-2xl')],
    [
      h.h1(
        [h.Class('text-2xl md:text-3xl font-bold text-red-600 mb-4')],
        ['404 — Page Not Found'],
      ),
      h.p(
        [h.Class('text-gray-600 mb-4')],
        [`The path "${path}" was not found.`],
      ),
      h.a(
        [h.Href(homeRouter()), h.Class('text-accent-600 hover:underline')],
        ['Go Home'],
      ),
    ],
  )

const contentView = (model: Model, h: ApplicationViewBuilder) => {
  const embedUi = (id: string, view: typeof Ui.View.button): Html =>
    h.block(
      UiBinding.embedView({
        slotId: id,
        model: model.uiModel,
        view,
      }),
    )

  return ApplicationRoute.match(model.route, {
    Home: () => homeView(h),
    Button: () => embedUi('ui-button', Ui.View.button),
    Calendar: () => embedUi('ui-calendar', Ui.View.calendar),
    Checkbox: () => embedUi('ui-checkbox', Ui.View.checkbox),
    Combobox: () => embedUi('ui-combobox', Ui.View.combobox),
    DatePicker: () => embedUi('ui-date-picker', Ui.View.datePicker),
    Dialog: () => embedUi('ui-dialog', Ui.View.dialog),
    Disclosure: () => embedUi('ui-disclosure', Ui.View.disclosure),
    DragAndDrop: () => embedUi('ui-drag-and-drop', Ui.View.dragAndDrop),
    Fieldset: () => embedUi('ui-fieldset', Ui.View.fieldset),
    FileDrop: () => embedUi('ui-file-drop', Ui.View.fileDrop),
    HoverIntent: () => embedUi('ui-hover-intent', Ui.View.hoverIntent),
    Input: () => embedUi('ui-input', Ui.View.input),
    Listbox: () => embedUi('ui-listbox', Ui.View.listbox),
    Menu: () => embedUi('ui-menu', Ui.View.menu),
    Meter: () => embedUi('ui-meter', Ui.View.meter),
    Popover: () => embedUi('ui-popover', Ui.View.popover),
    Progress: () => embedUi('ui-progress', Ui.View.progress),
    RadioGroup: () => embedUi('ui-radio-group', Ui.View.radioGroup),
    Select: () => embedUi('ui-select', Ui.View.select),
    Slider: () => embedUi('ui-slider', Ui.View.slider),
    Switch: () => embedUi('ui-switch', Ui.View.switch_),
    Tabs: () => embedUi('ui-tabs', Ui.View.tabs),
    Textarea: () => embedUi('ui-textarea', Ui.View.textarea),
    Toast: () => embedUi('ui-toast', Ui.View.toast),
    Tooltip: () => embedUi('ui-tooltip', Ui.View.tooltip),
    Animation: () => embedUi('ui-animation', Ui.View.animation),
    VirtualList: () => embedUi('ui-virtual-list', Ui.View.virtualList),
    NotFound: ({ path }) => notFoundView(path, h),
  })
}

const routeTitle = (route: Model['route']): string =>
  Match.value(route).pipe(
    Match.tag('Home', () => 'Foldkit UI Showcase'),
    Match.orElse(({ _tag }) => `${_tag} | Foldkit UI Showcase`),
  )

export const view = ApplicationComposition.makeView((model, h) => ({
  title: routeTitle(model.route),
  body: h.div(
    [h.Class('flex flex-col md:flex-row min-h-screen bg-white')],
    [
      mobileHeaderView(model, h),
      mobileMenuView(model, h),
      sidebarView(model.route, h),
      h.main(
        [h.Class('flex-1 p-4 md:p-8 overflow-auto')],
        [contentView(model, h)],
      ),
    ],
  ),
}))
