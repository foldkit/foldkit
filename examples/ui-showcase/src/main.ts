import clsx from 'clsx'
import { Effect, Match as M, Schema as S, pipe } from 'effect'
import {
  Calendar,
  Command,
  Route,
  Runtime,
  Submodel,
  Subscription,
  Ui,
} from 'foldkit'
import { Document, Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { literal, r } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import * as Icon from './icon'
import { uiInit } from './ui/init'
import { GotMobileMenuDialogMessage, UiMessage } from './ui/message'
import { UiModel } from './ui/model'
import * as UiSubscriptions from './ui/subscriptions'
import { uiUpdate } from './ui/update'
import * as View from './ui/view'

// ROUTE

export const HomeRoute = r('Home')
export const ButtonRoute = r('Button')
export const CalendarRoute = r('Calendar')
export const CheckboxRoute = r('Checkbox')
export const ComboboxRoute = r('Combobox')
export const DatePickerRoute = r('DatePicker')
export const DialogRoute = r('Dialog')
export const DisclosureRoute = r('Disclosure')
export const DragAndDropRoute = r('DragAndDrop')
export const FieldsetRoute = r('Fieldset')
export const FileDropRoute = r('FileDrop')
export const InputRoute = r('Input')
export const ListboxRoute = r('Listbox')
export const MenuRoute = r('Menu')
export const PopoverRoute = r('Popover')
export const RadioGroupRoute = r('RadioGroup')
export const SelectRoute = r('Select')
export const SliderRoute = r('Slider')
export const SwitchRoute = r('Switch')
export const TabsRoute = r('Tabs')
export const TextareaRoute = r('Textarea')
export const ToastRoute = r('Toast')
export const TooltipRoute = r('Tooltip')
export const AnimationRoute = r('Animation')
export const VirtualListRoute = r('VirtualList')
export const NotFoundRoute = r('NotFound', { path: S.String })

const AppRoute = S.Union([
  HomeRoute,
  ButtonRoute,
  CalendarRoute,
  CheckboxRoute,
  ComboboxRoute,
  DatePickerRoute,
  DialogRoute,
  DisclosureRoute,
  DragAndDropRoute,
  FieldsetRoute,
  FileDropRoute,
  InputRoute,
  ListboxRoute,
  MenuRoute,
  PopoverRoute,
  RadioGroupRoute,
  SelectRoute,
  SliderRoute,
  SwitchRoute,
  TabsRoute,
  TextareaRoute,
  ToastRoute,
  TooltipRoute,
  AnimationRoute,
  VirtualListRoute,
  NotFoundRoute,
])

type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
const buttonRouter = pipe(literal('button'), Route.mapTo(ButtonRoute))
const calendarRouter = pipe(literal('calendar'), Route.mapTo(CalendarRoute))
const checkboxRouter = pipe(literal('checkbox'), Route.mapTo(CheckboxRoute))
const comboboxRouter = pipe(literal('combobox'), Route.mapTo(ComboboxRoute))
const datePickerRouter = pipe(
  literal('date-picker'),
  Route.mapTo(DatePickerRoute),
)
const dialogRouter = pipe(literal('dialog'), Route.mapTo(DialogRoute))
const disclosureRouter = pipe(
  literal('disclosure'),
  Route.mapTo(DisclosureRoute),
)
const dragAndDropRouter = pipe(
  literal('drag-and-drop'),
  Route.mapTo(DragAndDropRoute),
)
const fieldsetRouter = pipe(literal('fieldset'), Route.mapTo(FieldsetRoute))
const fileDropRouter = pipe(literal('file-drop'), Route.mapTo(FileDropRoute))
const inputRouter = pipe(literal('input'), Route.mapTo(InputRoute))
const listboxRouter = pipe(literal('listbox'), Route.mapTo(ListboxRoute))
const menuRouter = pipe(literal('menu'), Route.mapTo(MenuRoute))
const popoverRouter = pipe(literal('popover'), Route.mapTo(PopoverRoute))
const radioGroupRouter = pipe(
  literal('radio-group'),
  Route.mapTo(RadioGroupRoute),
)
const selectRouter = pipe(literal('select'), Route.mapTo(SelectRoute))
const sliderRouter = pipe(literal('slider'), Route.mapTo(SliderRoute))
const switchRouter = pipe(literal('switch'), Route.mapTo(SwitchRoute))
const tabsRouter = pipe(literal('tabs'), Route.mapTo(TabsRoute))
const textareaRouter = pipe(literal('textarea'), Route.mapTo(TextareaRoute))
const toastRouter = pipe(literal('toast'), Route.mapTo(ToastRoute))
const tooltipRouter = pipe(literal('tooltip'), Route.mapTo(TooltipRoute))
const animationRouter = pipe(literal('animation'), Route.mapTo(AnimationRoute))
const virtualListRouter = pipe(
  literal('virtual-list'),
  Route.mapTo(VirtualListRoute),
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

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  uiModel: UiModel,
})

export type Model = typeof Model.Type

// MESSAGE

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const ClickedLink = m('ClickedLink', {
  request: UrlRequest,
})
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const GotUiMessage = m('GotUiMessage', {
  message: UiMessage,
})

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  GotUiMessage,
])
export type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define(
  'NavigateInternal',
  { url: S.String },
  CompletedNavigateInternal,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())))

const LoadExternal = Command.define(
  'LoadExternal',
  { href: S.String },
  CompletedLoadExternal,
)(({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())))

// INIT

export const Flags = S.Struct({
  today: Calendar.CalendarDate,
})

export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  return { today }
})

export const init: Runtime.RoutingProgramInit<Model, Message, Flags> = (
  flags: Flags,
  url: Url,
) => {
  const [initialUiModel, uiCommands] = uiInit(flags.today)

  return [
    {
      route: urlToAppRoute(url),
      uiModel: initialUiModel,
    },
    Command.mapMessages(uiCommands, message => GotUiMessage({ message })),
  ]
}

// UPDATE

const toUiMessage = (message: typeof UiMessage.Type): Message =>
  GotUiMessage({ message })

const toMobileMenuDialogMessage = (message: Ui.Dialog.Message): Message =>
  GotUiMessage({ message: GotMobileMenuDialogMessage({ message }) })

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      CompletedNavigateInternal: () => [model, []],
      CompletedLoadExternal: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({
              url,
            }): [
              Model,
              ReadonlyArray<Command.Command<typeof CompletedNavigateInternal>>,
            ] => [model, [NavigateInternal({ url: urlToString(url) })]],
            External: ({
              href,
            }): [
              Model,
              ReadonlyArray<Command.Command<typeof CompletedLoadExternal>>,
            ] => [model, [LoadExternal({ href })]],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const [closedDialog, closeDialogCommands] = Ui.Dialog.close(
          model.uiModel.mobileMenuDialog,
        )

        return [
          evo(model, {
            route: () => urlToAppRoute(url),
            uiModel: uiModel =>
              evo(uiModel, {
                mobileMenuDialog: () => closedDialog,
              }),
          }),
          Command.mapMessages(closeDialogCommands, message =>
            toMobileMenuDialogMessage(message),
          ),
        ]
      },

      GotUiMessage: ({ message }) => {
        const [nextUiModel, uiCommands] = uiUpdate(model.uiModel, message)

        return [
          evo(model, { uiModel: () => nextUiModel }),
          Command.mapMessages(uiCommands, message => GotUiMessage({ message })),
        ]
      },
    }),
  )

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

const sidebarView = (currentRoute: AppRoute): Html => {
  const h = html<Message>()

  return h.nav(
    [
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
      h.ul(
        [h.Class('flex flex-col gap-0.5')],
        NAV_ITEMS.map(navItem =>
          h.li(
            [],
            [
              h.a(
                [
                  h.Href(navItem.href),
                  h.Class(
                    navLinkClassName(currentRoute._tag === navItem.routeTag),
                  ),
                ],
                [navItem.label],
              ),
            ],
          ),
        ),
      ),
    ],
  )
}

const mobileMenuContent = (currentRoute: AppRoute): Html => {
  const h = html<Message>()

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
              h.Class(
                'p-2 rounded-md hover:bg-gray-200 transition text-gray-700 cursor-pointer',
              ),
              h.AriaLabel('Close menu'),
              h.OnClick(toMobileMenuDialogMessage(Ui.Dialog.RequestedClose())),
            ],
            [Icon.xMark('w-6 h-6')],
          ),
        ],
      ),
      h.nav(
        [
          h.Class('flex-1 overflow-y-auto min-h-0 p-4'),
          h.Tabindex(-1),
          h.Autofocus(true),
        ],
        [
          h.ul(
            [h.Class('flex flex-col gap-0.5')],
            NAV_ITEMS.map(navItem =>
              h.li(
                [],
                [
                  h.a(
                    [
                      h.Href(navItem.href),
                      h.Class(
                        mobileNavLinkClassName(
                          currentRoute._tag === navItem.routeTag,
                        ),
                      ),
                    ],
                    [navItem.label],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  )
}

const mobileHeaderView = (model: Model): Html => {
  const h = html<Message>()

  return h.header(
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
          h.OnClick(toMobileMenuDialogMessage(Ui.Dialog.RequestedOpen())),
        ],
        [Icon.menu('w-6 h-6')],
      ),
    ],
  )
}

const mobileMenuView = (model: Model): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId: model.uiModel.mobileMenuDialog.id,
    model: model.uiModel.mobileMenuDialog,
    view: Ui.Dialog.view,
    viewInputs: {
      toView: ({ dialog, backdrop, panel, isVisible }) =>
        h.dialog(
          [...dialog, h.Class('md:hidden')],
          isVisible
            ? [
                h.div([...backdrop, h.Class('fixed inset-0 z-[59]')], []),
                h.div(
                  [
                    ...panel,
                    h.Class('fixed inset-0 z-[60] bg-white flex flex-col'),
                  ],
                  [mobileMenuContent(model.route)],
                ),
              ]
            : [],
        ),
    },
    toParentMessage: message => toMobileMenuDialogMessage(message),
  })
}

const homeView = (): Html => {
  const h = html<Message>()

  return h.div(
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
}

const notFoundView = (path: string): Html => {
  const h = html<Message>()

  return h.div(
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
}

const contentView = (model: Model): Html => {
  const h = html<Message>()

  const embedUi = (id: string, view: Submodel.View<UiModel, UiMessage>): Html =>
    h.submodel({
      slotId: id,
      model: model.uiModel,
      view,
      toParentMessage: toUiMessage,
    })

  return M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: homeView,
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
      NotFound: ({ path }) => notFoundView(path),
    }),
  )
}

const routeTitle = (route: Model['route']): string =>
  M.value(route).pipe(
    M.tag('Home', () => 'Foldkit UI Showcase'),
    M.orElse(({ _tag }) => `${_tag} — Foldkit UI Showcase`),
  )

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: routeTitle(model.route),
    body: h.div(
      [h.Class('flex flex-col md:flex-row min-h-screen bg-white')],
      [
        mobileHeaderView(model),
        mobileMenuView(model),
        sidebarView(model.route),
        h.main(
          [h.Class('flex-1 p-4 md:p-8 overflow-auto')],
          [h.keyed('div')(model.route._tag, [], [contentView(model)])],
        ),
      ],
    ),
  }
}

// SUBSCRIPTION

export const subscriptions = Subscription.lift(UiSubscriptions.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.uiModel,
  toParentMessage: message => GotUiMessage({ message }),
})
