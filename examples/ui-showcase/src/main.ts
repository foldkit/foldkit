import clsx from 'clsx'
import { Array, Effect, Match, Option, Schema, pipe } from 'effect'
import {
  Calendar,
  Command,
  Route,
  Runtime,
  Submodel,
  Subscription,
  Update,
} from 'foldkit'
import { Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { defineRouteUnion, literal } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { Dialog, Nav } from '@foldkit/ui'

import * as Icon from './icon'
import { uiInit } from './ui/init'
import { Message as UiMessage } from './ui/message'
import { UiModel } from './ui/model'
import * as UiSubscriptions from './ui/subscriptions'
import { closeMobileMenu, openMobileMenu, uiUpdate } from './ui/update'
import * as View from './ui/view'

// ROUTE

export const AppRoute = defineRouteUnion({
  Home: {},
  Button: {},
  Calendar: {},
  Checkbox: {},
  Combobox: {},
  DatePicker: {},
  Dialog: {},
  Disclosure: {},
  DragAndDrop: {},
  Fieldset: {},
  FileDrop: {},
  HoverIntent: {},
  Input: {},
  Listbox: {},
  Menu: {},
  Popover: {},
  RadioGroup: {},
  Select: {},
  Slider: {},
  Switch: {},
  Tabs: {},
  Textarea: {},
  Toast: {},
  Tooltip: {},
  Animation: {},
  VirtualList: {},
  NotFound: { path: Schema.String },
})

export type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
const buttonRouter = pipe(literal('button'), Route.mapTo(AppRoute.Button))
const calendarRouter = pipe(literal('calendar'), Route.mapTo(AppRoute.Calendar))
const checkboxRouter = pipe(literal('checkbox'), Route.mapTo(AppRoute.Checkbox))
const comboboxRouter = pipe(literal('combobox'), Route.mapTo(AppRoute.Combobox))
const datePickerRouter = pipe(
  literal('date-picker'),
  Route.mapTo(AppRoute.DatePicker),
)
const dialogRouter = pipe(literal('dialog'), Route.mapTo(AppRoute.Dialog))
const disclosureRouter = pipe(
  literal('disclosure'),
  Route.mapTo(AppRoute.Disclosure),
)
const dragAndDropRouter = pipe(
  literal('drag-and-drop'),
  Route.mapTo(AppRoute.DragAndDrop),
)
const fieldsetRouter = pipe(literal('fieldset'), Route.mapTo(AppRoute.Fieldset))
const fileDropRouter = pipe(
  literal('file-drop'),
  Route.mapTo(AppRoute.FileDrop),
)
const hoverIntentRouter = pipe(
  literal('hover-intent'),
  Route.mapTo(AppRoute.HoverIntent),
)
const inputRouter = pipe(literal('input'), Route.mapTo(AppRoute.Input))
const listboxRouter = pipe(literal('listbox'), Route.mapTo(AppRoute.Listbox))
const menuRouter = pipe(literal('menu'), Route.mapTo(AppRoute.Menu))
const popoverRouter = pipe(literal('popover'), Route.mapTo(AppRoute.Popover))
const radioGroupRouter = pipe(
  literal('radio-group'),
  Route.mapTo(AppRoute.RadioGroup),
)
const selectRouter = pipe(literal('select'), Route.mapTo(AppRoute.Select))
const sliderRouter = pipe(literal('slider'), Route.mapTo(AppRoute.Slider))
const switchRouter = pipe(literal('switch'), Route.mapTo(AppRoute.Switch))
const tabsRouter = pipe(literal('tabs'), Route.mapTo(AppRoute.Tabs))
const textareaRouter = pipe(literal('textarea'), Route.mapTo(AppRoute.Textarea))
const toastRouter = pipe(literal('toast'), Route.mapTo(AppRoute.Toast))
const tooltipRouter = pipe(literal('tooltip'), Route.mapTo(AppRoute.Tooltip))
const animationRouter = pipe(
  literal('animation'),
  Route.mapTo(AppRoute.Animation),
)
const virtualListRouter = pipe(
  literal('virtual-list'),
  Route.mapTo(AppRoute.VirtualList),
)

const routeParser = Route.oneOf(
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
  hoverIntentRouter,
  inputRouter,
  listboxRouter,
  menuRouter,
  popoverRouter,
  radioGroupRouter,
  selectRouter,
  sliderRouter,
  switchRouter,
  tabsRouter,
  textareaRouter,
  toastRouter,
  tooltipRouter,
  animationRouter,
  virtualListRouter,
  homeRouter,
)

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound)

// MODEL

export const Model = Schema.Struct({
  route: AppRoute,
  uiModel: UiModel,
})

export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  ClickedOpenMobileMenu: {},
  GotUiMessage: { message: UiMessage },
})

export type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// INIT

export const Flags = Schema.Struct({
  today: Calendar.CalendarDate,
})

export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  return { today }
})

export const init: Runtime.RoutingApplicationInit<Model, Message, Flags> = (
  flags: Flags,
  url: Url,
) => {
  const uiInit_ = uiInit(flags.today)

  return {
    model: {
      route: urlToAppRoute(url),
      uiModel: uiInit_.model,
    },
    commands: Command.mapMessages(uiInit_.commands, message =>
      Message.GotUiMessage({ message }),
    ),
  }
}

// UPDATE

const toUiMessage = (message: UiMessage): Message =>
  Message.GotUiMessage({ message })

const foldUi = Update.foldChild({
  update: uiUpdate,
  read: (model: Model) => Option.some(model.uiModel),
  write: (model, nextUiModel) => evo(model, { uiModel: () => nextUiModel }),
  toParentMessage: toUiMessage,
})

const foldUiOpenMobileMenu = Update.foldChildStep({
  update: openMobileMenu,
  read: (model: Model) => Option.some(model.uiModel),
  write: (model, nextUiModel) => evo(model, { uiModel: () => nextUiModel }),
  toParentMessage: toUiMessage,
})

const foldUiCloseMobileMenu = Update.foldChildStep({
  update: closeMobileMenu,
  read: (model: Model) => Option.some(model.uiModel),
  write: (model, nextUiModel) => evo(model, { uiModel: () => nextUiModel }),
  toParentMessage: toUiMessage,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),

    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: urlToString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) =>
      Update.combine(model, [
        stepModel => ({
          model: evo(stepModel, { route: () => urlToAppRoute(url) }),
        }),
        foldUiCloseMobileMenu,
      ]),

    ClickedOpenMobileMenu: () => foldUiOpenMobileMenu(model),

    GotUiMessage: ({ message }) => foldUi(model, message),
  })

// VIEW

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
  { label: 'Popover', routeTag: 'Popover', href: popoverRouter() },
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
  currentRoute: AppRoute,
  toView: (render: Nav.RenderInfo) => Html,
): Html =>
  Nav.view({
    items: NAV_ROUTE_TAGS,
    ariaLabel: 'Components',
    toHref: (_routeTag, index) => navItemHref(index),
    isItemCurrent: routeTag => currentRoute._tag === routeTag,
    toView,
  })

const navListView = <Message>(
  items: ReadonlyArray<Nav.ItemInfo>,
  linkClassName: (isActive: boolean) => string,
  h: HtmlBuilder<Message>,
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

const sidebarView = (currentRoute: AppRoute, h: HtmlBuilder<Message>): Html =>
  componentNav(currentRoute, ({ nav, items }) =>
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
    ),
  )

const mobileMenuContent = (
  currentRoute: AppRoute,
  closeButton: Dialog.RenderInfo['closeButton'],
  h: HtmlBuilder<UiMessage>,
): Html =>
  h.div(
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
      componentNav(currentRoute, ({ nav, items }) =>
        h.nav(
          [
            ...nav,
            h.Class('flex-1 overflow-y-auto min-h-0 p-4'),
            h.Tabindex(-1),
            h.Autofocus(true),
          ],
          [navListView(items, mobileNavLinkClassName, h)],
        ),
      ),
    ],
  )

const mobileHeaderView = (model: Model, h: HtmlBuilder<Message>): Html =>
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

type MobileMenuViewInputs = Readonly<{
  currentRoute: AppRoute
}>

const mobileMenuDialogView = Submodel.defineView<
  UiModel,
  UiMessage,
  MobileMenuViewInputs
>((model, { currentRoute }, h): Html =>
  h.submodel({
    slotId: model.mobileMenuDialog.id,
    model: model.mobileMenuDialog,
    view: Dialog.view,
    viewInputs: {
      toView: ({ dialog, backdrop, panel, closeButton, isVisible }) =>
        h.dialog(
          [...dialog, h.Class('md:hidden')],
          isVisible
            ? [
                h.div([...backdrop, h.Class('fixed inset-0 z-[59]')]),
                h.div(
                  [
                    ...panel,
                    h.Class('fixed inset-0 z-[60] bg-white flex flex-col'),
                  ],
                  [mobileMenuContent(currentRoute, closeButton, h)],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message =>
      UiMessage.GotMobileMenuDialogMessage({ message }),
  }),
)

const mobileMenuView = (model: Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: 'mobile-menu',
    model: model.uiModel,
    view: mobileMenuDialogView,
    viewInputs: { currentRoute: model.route },
    toParentMessage: toUiMessage,
  })

const homeView = (h: HtmlBuilder<Message>): Html =>
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

const notFoundView = (path: string, h: HtmlBuilder<Message>): Html =>
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

const contentView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const embedUi = (id: string, view: Submodel.View<UiModel, UiMessage>): Html =>
    h.submodel({
      slotId: id,
      model: model.uiModel,
      view,
      toParentMessage: toUiMessage,
    })

  return AppRoute.match(model.route, {
    Home: () => homeView(h),
    Button: () => embedUi('ui-button', View.button),
    Calendar: () => embedUi('ui-calendar', View.calendar),
    Checkbox: () => embedUi('ui-checkbox', View.checkbox),
    Combobox: () => embedUi('ui-combobox', View.combobox),
    DatePicker: () => embedUi('ui-date-picker', View.datePicker),
    Dialog: () => embedUi('ui-dialog', View.dialog),
    Disclosure: () => embedUi('ui-disclosure', View.disclosure),
    DragAndDrop: () => embedUi('ui-drag-and-drop', View.dragAndDrop),
    Fieldset: () => embedUi('ui-fieldset', View.fieldset),
    FileDrop: () => embedUi('ui-file-drop', View.fileDrop),
    HoverIntent: () => embedUi('ui-hover-intent', View.hoverIntent),
    Input: () => embedUi('ui-input', View.input),
    Listbox: () => embedUi('ui-listbox', View.listbox),
    Menu: () => embedUi('ui-menu', View.menu),
    Popover: () => embedUi('ui-popover', View.popover),
    RadioGroup: () => embedUi('ui-radio-group', View.radioGroup),
    Select: () => embedUi('ui-select', View.select),
    Slider: () => embedUi('ui-slider', View.slider),
    Switch: () => embedUi('ui-switch', View.switch_),
    Tabs: () => embedUi('ui-tabs', View.tabs),
    Textarea: () => embedUi('ui-textarea', View.textarea),
    Toast: () => embedUi('ui-toast', View.toast),
    Tooltip: () => embedUi('ui-tooltip', View.tooltip),
    Animation: () => embedUi('ui-animation', View.animation),
    VirtualList: () => embedUi('ui-virtual-list', View.virtualList),
    NotFound: ({ path }) => notFoundView(path, h),
  })
}

const routeTitle = (route: Model['route']): string =>
  Match.value(route).pipe(
    Match.tag('Home', () => 'Foldkit UI Showcase'),
    Match.orElse(({ _tag }) => `${_tag} | Foldkit UI Showcase`),
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
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
})

// SUBSCRIPTION

export const subscriptions = Subscription.lift(UiSubscriptions.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.uiModel,
  toParentMessage: message => Message.GotUiMessage({ message }),
})
