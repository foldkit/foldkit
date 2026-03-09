import { Effect, Match as M, Schema as S, pipe } from 'effect'
import { Route, Runtime } from 'foldkit'
import { Command } from 'foldkit/command'
import { Html, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { load, pushUrl } from 'foldkit/navigation'
import { literal, r } from 'foldkit/route'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { uiInit } from './init'
import { UiMessage } from './message'
import { UiModel } from './model'
import { uiUpdate } from './update'
import * as ButtonView from './view/button'
import * as CheckboxView from './view/checkbox'
import * as ComboboxView from './view/combobox'
import * as DialogView from './view/dialog'
import * as DisclosureView from './view/disclosure'
import * as FieldsetView from './view/fieldset'
import * as InputView from './view/input'
import * as ListboxView from './view/listbox'
import * as MenuView from './view/menu'
import * as PopoverView from './view/popover'
import * as RadioGroupView from './view/radioGroup'
import * as SelectView from './view/select'
import * as SwitchView from './view/switch'
import * as TabsView from './view/tabs'
import * as TextareaView from './view/textarea'

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

const NoOp = m('NoOp')
const ClickedLink = m('ClickedLink', {
  request: Runtime.UrlRequest,
})
const ChangedUrl = m('ChangedUrl', { url: Url })
const GotUiMessage = m('GotUiMessage', {
  message: UiMessage,
})

export const Message = S.Union(NoOp, ClickedLink, ChangedUrl, GotUiMessage)
export type Message = typeof Message.Type

// INIT

const init: Runtime.ApplicationInit<Model, Message> = (url: Url) => {
  const [initialUiModel, uiCommands] = uiInit()

  return [
    {
      route: urlToAppRoute(url),
      uiModel: initialUiModel,
    },
    uiCommands.map(Effect.map(message => GotUiMessage({ message }))),
  ]
}

// UPDATE

const toUiMessage = (message: typeof UiMessage.Type): Message =>
  GotUiMessage({ message })

const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<[Model, ReadonlyArray<Command<Message>>]>(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({
              url,
            }): [Model, ReadonlyArray<Command<typeof NoOp>>] => [
              model,
              [pushUrl(urlToString(url)).pipe(Effect.as(NoOp()))],
            ],
            External: ({
              href,
            }): [Model, ReadonlyArray<Command<typeof NoOp>>] => [
              model,
              [load(href).pipe(Effect.as(NoOp()))],
            ],
          }),
        ),

      ChangedUrl: ({ url }) => [
        evo(model, {
          route: () => urlToAppRoute(url),
        }),
        [],
      ],

      GotUiMessage: ({ message }) => {
        const [nextUiModel, uiCommands] = uiUpdate(model.uiModel, message)

        return [
          evo(model, { uiModel: () => nextUiModel }),
          uiCommands.map(Effect.map(message => GotUiMessage({ message }))),
        ]
      },
    }),
  )

// VIEW

const { a, div, h1, keyed, li, main, nav, p, span, ul, Class, Href } =
  html<Message>()

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

const sidebarView = (currentRoute: AppRoute): Html =>
  nav(
    [Class('w-56 shrink-0 border-r border-gray-200 bg-gray-50 p-4')],
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
                    `block px-3 py-1.5 rounded-md text-sm transition-colors ${
                      currentRoute._tag === navItem.routeTag
                        ? 'bg-accent-100 text-accent-700'
                        : 'text-gray-700 hover:bg-gray-200'
                    }`,
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

const homeView = (): Html =>
  div(
    [Class('max-w-2xl')],
    [
      h1(
        [Class('text-3xl font-bold text-gray-900 mb-4')],
        ['Foldkit UI Showcase'],
      ),
      p(
        [Class('text-gray-600 mb-4')],
        [
          'This is a showcase of every Foldkit UI component. Select a component from the sidebar to see it in action.',
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
        [Class('text-3xl font-bold text-red-600 mb-4')],
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
      Button: () => ButtonView.view(model.uiModel, toUiMessage),
      Checkbox: () => CheckboxView.view(model.uiModel, toUiMessage),
      Combobox: () => ComboboxView.view(model.uiModel, toUiMessage),
      Dialog: () => DialogView.view(model.uiModel, toUiMessage),
      Disclosure: () => DisclosureView.view(model.uiModel, toUiMessage),
      Fieldset: () => FieldsetView.view(model.uiModel, toUiMessage),
      Input: () => InputView.view(model.uiModel, toUiMessage),
      Listbox: () => ListboxView.view(model.uiModel, toUiMessage),
      Menu: () => MenuView.view(model.uiModel, toUiMessage),
      Popover: () => PopoverView.view(model.uiModel, toUiMessage),
      RadioGroup: () => RadioGroupView.view(model.uiModel, toUiMessage),
      Select: () => SelectView.view(model.uiModel, toUiMessage),
      Switch: () => SwitchView.view(model.uiModel, toUiMessage),
      Tabs: () => TabsView.view(model.uiModel, toUiMessage),
      Textarea: () => TextareaView.view(model.uiModel, toUiMessage),
      NotFound: ({ path }) => notFoundView(path),
    }),
  )

const view = (model: Model): Html =>
  div(
    [Class('flex min-h-screen bg-white')],
    [
      sidebarView(model.route),
      main(
        [Class('flex-1 p-8 overflow-auto')],
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
