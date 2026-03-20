import clsx from 'clsx'
import { Effect, Match as M, Schema as S, pipe } from 'effect'
import { Command, Route, Runtime, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { load, pushUrl } from 'foldkit/navigation'
import { literal, r } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import * as Icon from './icon'
import { uiInit } from './init'
import { GotMobileMenuDialogMessage, UiMessage } from './message'
import { UiModel } from './model'
import { uiUpdate } from './update'
import * as View from './view'

// ROUTE

const HomeRoute = r('Home')
const ButtonRoute = r('Button')
const CheckboxRoute = r('Checkbox')
const ComboboxRoute = r('Combobox')
const DialogRoute = r('Dialog')
const DisclosureRoute = r('Disclosure')
const FieldsetRoute = r('Fieldset')
const InputRoute = r('Input')
const ListboxRoute = r('Listbox')
const MenuRoute = r('Menu')
const PopoverRoute = r('Popover')
const RadioGroupRoute = r('RadioGroup')
const SelectRoute = r('Select')
const SwitchRoute = r('Switch')
const TabsRoute = r('Tabs')
const TextareaRoute = r('Textarea')
const NotFoundRoute = r('NotFound', { path: S.String })

const AppRoute = S.Union(
  HomeRoute,
  ButtonRoute,
  CheckboxRoute,
  ComboboxRoute,
  DialogRoute,
  DisclosureRoute,
  FieldsetRoute,
  InputRoute,
  ListboxRoute,
  MenuRoute,
  PopoverRoute,
  RadioGroupRoute,
  SelectRoute,
  SwitchRoute,
  TabsRoute,
  TextareaRoute,
  NotFoundRoute,
)

type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(HomeRoute))
const buttonRouter = pipe(literal('button'), Route.mapTo(ButtonRoute))
const checkboxRouter = pipe(literal('checkbox'), Route.mapTo(CheckboxRoute))
const comboboxRouter = pipe(literal('combobox'), Route.mapTo(ComboboxRoute))
const dialogRouter = pipe(literal('dialog'), Route.mapTo(DialogRoute))
const disclosureRouter = pipe(
  literal('disclosure'),
  Route.mapTo(DisclosureRoute),
)
const fieldsetRouter = pipe(literal('fieldset'), Route.mapTo(FieldsetRoute))
const inputRouter = pipe(literal('input'), Route.mapTo(InputRoute))
const listboxRouter = pipe(literal('listbox'), Route.mapTo(ListboxRoute))
const menuRouter = pipe(literal('menu'), Route.mapTo(MenuRoute))
const popoverRouter = pipe(literal('popover'), Route.mapTo(PopoverRoute))
const radioGroupRouter = pipe(
  literal('radio-group'),
  Route.mapTo(RadioGroupRoute),
)
const selectRouter = pipe(literal('select'), Route.mapTo(SelectRoute))
const switchRouter = pipe(literal('switch'), Route.mapTo(SwitchRoute))
const tabsRouter = pipe(literal('tabs'), Route.mapTo(TabsRoute))
const textareaRouter = pipe(literal('textarea'), Route.mapTo(TextareaRoute))

const routeParser = Route.oneOf(
  buttonRouter,
  checkboxRouter,
  comboboxRouter,
  dialogRouter,
  disclosureRouter,
  fieldsetRouter,
  inputRouter,
  listboxRouter,
  menuRouter,
  popoverRouter,
  radioGroupRouter,
  selectRouter,
  switchRouter,
  tabsRouter,
  textareaRouter,
  homeRouter,
)

const urlToAppRoute = Route.parseUrlWithFallback(routeParser, NotFoundRoute)

// MODEL

const Model = S.Struct({
  route: AppRoute,
  uiModel: UiModel,
})

type Model = typeof Model.Type

// MESSAGE

const CompletedNavigateInternal = m('CompletedNavigateInternal')
const CompletedLoadExternal = m('CompletedLoadExternal')
const ClickedLink = m('ClickedLink', {
  request: Runtime.UrlRequest,
})
const ChangedUrl = m('ChangedUrl', { url: Url })
const GotUiMessage = m('GotUiMessage', {
  message: UiMessage,
})

export const Message = S.Union(
  CompletedNavigateInternal,
  CompletedLoadExternal,
  ClickedLink,
  ChangedUrl,
  GotUiMessage,
)
export type Message = typeof Message.Type

// COMMAND

const NavigateInternal = Command.define('NavigateInternal')
const LoadExternal = Command.define('LoadExternal')

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url) => {
  const [initialUiModel, uiCommands] = uiInit()

  return [
    {
      route: urlToAppRoute(url),
      uiModel: initialUiModel,
    },
    uiCommands.map(
      Command.mapEffect(Effect.map(message => GotUiMessage({ message }))),
    ),
  ]
}

// UPDATE

const toUiMessage = (message: typeof UiMessage.Type): Message =>
  GotUiMessage({ message })

const toMobileMenuDialogMessage = (message: Ui.Dialog.Message): Message =>
  GotUiMessage({ message: GotMobileMenuDialogMessage({ message }) })

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command.Command<Message>>]>(),
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
            ] => [
              model,
              [
                NavigateInternal(
                  pushUrl(urlToString(url)).pipe(
                    Effect.as(CompletedNavigateInternal()),
                  ),
                ),
              ],
            ],
            External: ({
              href,
            }): [
              Model,
              ReadonlyArray<Command.Command<typeof CompletedLoadExternal>>,
            ] => [
              model,
              [
                LoadExternal(
                  load(href).pipe(Effect.as(CompletedLoadExternal())),
                ),
              ],
            ],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const [closedDialog, closeDialogCommands] = Ui.Dialog.update(
          model.uiModel.mobileMenuDialog,
          Ui.Dialog.Closed(),
        )

        return [
          evo(model, {
            route: () => urlToAppRoute(url),
            uiModel: uiModel =>
              evo(uiModel, {
                mobileMenuDialog: () => closedDialog,
              }),
          }),
          closeDialogCommands.map(
            Command.mapEffect(
              Effect.map(message => toMobileMenuDialogMessage(message)),
            ),
          ),
        ]
      },

      GotUiMessage: ({ message }) => {
        const [nextUiModel, uiCommands] = uiUpdate(model.uiModel, message)

        return [
          evo(model, { uiModel: () => nextUiModel }),
          uiCommands.map(
            Command.mapEffect(Effect.map(message => GotUiMessage({ message }))),
          ),
        ]
      },
    }),
  )

// VIEW

const {
  a,
  button,
  div,
  h1,
  header,
  keyed,
  li,
  main,
  nav,
  p,
  span,
  ul,
  AriaExpanded,
  AriaLabel,
  Autofocus,
  Class,
  Href,
  OnClick,
  Tabindex,
} = html<Message>()

type NavItem = Readonly<{
  label: string
  routeTag: string
  href: string
}>

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { label: 'Button', routeTag: 'Button', href: buttonRouter() },
  { label: 'Checkbox', routeTag: 'Checkbox', href: checkboxRouter() },
  { label: 'Combobox', routeTag: 'Combobox', href: comboboxRouter() },
  { label: 'Dialog', routeTag: 'Dialog', href: dialogRouter() },
  { label: 'Disclosure', routeTag: 'Disclosure', href: disclosureRouter() },
  { label: 'Fieldset', routeTag: 'Fieldset', href: fieldsetRouter() },
  { label: 'Input', routeTag: 'Input', href: inputRouter() },
  { label: 'Listbox', routeTag: 'Listbox', href: listboxRouter() },
  { label: 'Menu', routeTag: 'Menu', href: menuRouter() },
  { label: 'Popover', routeTag: 'Popover', href: popoverRouter() },
  { label: 'Radio Group', routeTag: 'RadioGroup', href: radioGroupRouter() },
  { label: 'Select', routeTag: 'Select', href: selectRouter() },
  { label: 'Switch', routeTag: 'Switch', href: switchRouter() },
  { label: 'Tabs', routeTag: 'Tabs', href: tabsRouter() },
  { label: 'Textarea', routeTag: 'Textarea', href: textareaRouter() },
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

const sidebarView = (currentRoute: AppRoute): Html =>
  nav(
    [
      Class(
        'hidden md:flex w-56 shrink-0 border-r border-gray-200 bg-gray-50 p-4 flex-col',
      ),
    ],
    [
      div(
        [Class('mb-6')],
        [
          a(
            [Href(homeRouter()), Class('block')],
            [h1([Class('text-lg font-bold text-gray-900')], ['Foldkit UI'])],
          ),
          span([Class('text-xs text-gray-500')], ['Component Showcase']),
        ],
      ),
      ul(
        [Class('flex flex-col gap-0.5')],
        NAV_ITEMS.map(navItem =>
          li(
            [],
            [
              a(
                [
                  Href(navItem.href),
                  Class(
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

const mobileMenuContent = (currentRoute: AppRoute): Html =>
  div(
    [Class('flex flex-col h-full')],
    [
      div(
        [
          Class(
            'flex items-center justify-between border-b border-gray-200 px-4 py-3',
          ),
        ],
        [
          a(
            [Href(homeRouter()), Class('block')],
            [
              div(
                [Class('flex flex-col')],
                [
                  span(
                    [Class('text-base font-bold text-gray-900')],
                    ['Foldkit UI'],
                  ),
                  span(
                    [Class('text-xs text-gray-500')],
                    ['Component Showcase'],
                  ),
                ],
              ),
            ],
          ),
          button(
            [
              Class(
                'p-2 rounded-md hover:bg-gray-200 transition text-gray-700 cursor-pointer',
              ),
              AriaLabel('Close menu'),
              OnClick(toMobileMenuDialogMessage(Ui.Dialog.Closed())),
            ],
            [Icon.xMark('w-6 h-6')],
          ),
        ],
      ),
      nav(
        [
          Class('flex-1 overflow-y-auto min-h-0 p-4'),
          Tabindex(-1),
          Autofocus(true),
        ],
        [
          ul(
            [Class('flex flex-col gap-0.5')],
            NAV_ITEMS.map(navItem =>
              li(
                [],
                [
                  a(
                    [
                      Href(navItem.href),
                      Class(
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

const mobileHeaderView = (model: Model): Html =>
  header(
    [
      Class(
        'md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3',
      ),
    ],
    [
      a(
        [Href(homeRouter()), Class('block')],
        [
          div(
            [Class('flex flex-col')],
            [
              span(
                [Class('text-base font-bold text-gray-900')],
                ['Foldkit UI'],
              ),
              span([Class('text-xs text-gray-500')], ['Component Showcase']),
            ],
          ),
        ],
      ),
      button(
        [
          Class(
            'p-2 rounded-md hover:bg-gray-200 transition text-gray-700 cursor-pointer',
          ),
          AriaExpanded(model.uiModel.mobileMenuDialog.isOpen),
          AriaLabel('Toggle menu'),
          OnClick(toMobileMenuDialogMessage(Ui.Dialog.Opened())),
        ],
        [Icon.menu('w-6 h-6')],
      ),
    ],
  )

const mobileMenuView = (model: Model): Html =>
  Ui.Dialog.view({
    model: model.uiModel.mobileMenuDialog,
    toMessage: toMobileMenuDialogMessage,
    panelContent: mobileMenuContent(model.route),
    panelAttributes: [Class('fixed inset-0 z-[60] bg-white flex flex-col')],
    backdropAttributes: [Class('fixed inset-0 z-[59]')],
    attributes: [Class('md:hidden')],
  })

const homeView = (): Html =>
  div(
    [Class('max-w-2xl')],
    [
      h1(
        [Class('text-2xl md:text-3xl font-bold text-gray-900 mb-4')],
        ['Foldkit UI Showcase'],
      ),
      p(
        [Class('text-gray-600 mb-4')],
        [
          'This is a showcase of every Foldkit UI component. Select a component from the menu to see it in action.',
        ],
      ),
      p(
        [Class('text-gray-600')],
        [
          'Each component is headless — you provide the markup and styling via a callback, and Foldkit handles accessibility, keyboard navigation, and state management.',
        ],
      ),
    ],
  )

const notFoundView = (path: string): Html =>
  div(
    [Class('max-w-2xl')],
    [
      h1(
        [Class('text-2xl md:text-3xl font-bold text-red-600 mb-4')],
        ['404 — Page Not Found'],
      ),
      p([Class('text-gray-600 mb-4')], [`The path "${path}" was not found.`]),
      a(
        [Href(homeRouter()), Class('text-accent-600 hover:underline')],
        ['Go Home'],
      ),
    ],
  )

const contentView = (model: Model): Html =>
  M.value(model.route).pipe(
    M.tagsExhaustive({
      Home: homeView,
      Button: () => View.button(model.uiModel, toUiMessage),
      Checkbox: () => View.checkbox(model.uiModel, toUiMessage),
      Combobox: () => View.combobox(model.uiModel, toUiMessage),
      Dialog: () => View.dialog(model.uiModel, toUiMessage),
      Disclosure: () => View.disclosure(model.uiModel, toUiMessage),
      Fieldset: () => View.fieldset(model.uiModel, toUiMessage),
      Input: () => View.input(model.uiModel, toUiMessage),
      Listbox: () => View.listbox(model.uiModel, toUiMessage),
      Menu: () => View.menu(model.uiModel, toUiMessage),
      Popover: () => View.popover(model.uiModel, toUiMessage),
      RadioGroup: () => View.radioGroup(model.uiModel, toUiMessage),
      Select: () => View.select(model.uiModel, toUiMessage),
      Switch: () => View.switch_(model.uiModel, toUiMessage),
      Tabs: () => View.tabs(model.uiModel, toUiMessage),
      Textarea: () => View.textarea(model.uiModel, toUiMessage),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

const view = (model: Model): Html =>
  div(
    [Class('flex flex-col md:flex-row min-h-screen bg-white')],
    [
      mobileHeaderView(model),
      mobileMenuView(model),
      sidebarView(model.route),
      main(
        [Class('flex-1 p-4 md:p-8 overflow-auto')],
        [keyed('div')(model.route._tag, [], [contentView(model)])],
      ),
    ],
  )

// RUN

const app = Runtime.makeApplication({
  Model,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
})

Runtime.run(app)
