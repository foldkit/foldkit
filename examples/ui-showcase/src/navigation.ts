import clsx from 'clsx'
import { Array, Effect, Layer, Match, Option, Schema, pipe } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Dialog, Nav } from '@foldkit/ui'
import type { RenderInfo as DialogRenderInfo } from '@foldkit/ui/dialog'

import * as Icon from './domain/icon'
import {
  type ApplicationRoute,
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

const Model = Schema.Struct({
  mobileMenuDialog: Dialog.Dialog,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedOpenMobileMenu: {},
  RequestedCloseMobileMenu: {},
})
type Message = typeof Message.Type

type NavigationViewInput =
  | Readonly<{ _tag: 'MobileHeader' }>
  | Readonly<{ _tag: 'MobileMenu'; currentRoute: ApplicationRoute }>
  | Readonly<{ _tag: 'Sidebar'; currentRoute: ApplicationRoute }>

export class Navigation extends Block<Navigation, void, NavigationViewInput>()(
  'Navigation',
  { Model, Message },
) {}

export const NavigationLive = Navigation.make(
  Effect.fn(function* () {
    const mobileMenuDialog = yield* new Dialog.Dialog('mobileMenuDialog', {
      id: 'mobile-menu',
    })

    return {
      model: { mobileMenuDialog },

      update: {
        ClickedOpenMobileMenu: model => ({
          model,
          messages: [
            model.mobileMenuDialog.send(Dialog.Dialog.Message.RequestedOpen()),
          ],
        }),

        RequestedCloseMobileMenu: model => ({
          model,
          messages: [
            model.mobileMenuDialog.send(Dialog.Dialog.Message.RequestedClose()),
          ],
        }),
      },

      view: (model, h, input) =>
        Match.value(input).pipe(
          Match.tagsExhaustive({
            MobileHeader: () => mobileHeaderView(model, h),
            MobileMenu: ({ currentRoute }) =>
              mobileMenuView(model, currentRoute, h),
            Sidebar: ({ currentRoute }) => sidebarView(currentRoute, h),
          }),
        ),
    }
  }),
).pipe(Layer.provide(Dialog.DialogLive))

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

const navListView = (
  items: ReadonlyArray<Nav.ItemInfo>,
  linkClassName: (isActive: boolean) => string,
  h: HtmlBuilder<Message, unknown>,
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
  h: HtmlBuilder<Message, unknown>,
): Html => {
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

const mobileMenuContent = (
  currentRoute: ApplicationRoute,
  closeButton: DialogRenderInfo['closeButton'],
  h: HtmlBuilder<Message, unknown>,
): Html => {
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

const mobileMenuView = (
  model: Model,
  currentRoute: ApplicationRoute,
  h: HtmlBuilder<Message, unknown>,
): Html => {
  const mobileMenuDialogContent = ({
    dialog,
    backdrop,
    panel,
    closeButton,
    isVisible,
  }: DialogRenderInfo): Html =>
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
    )

  return model.mobileMenuDialog.view({ toView: mobileMenuDialogContent })
}

const mobileHeaderView = (
  model: Model,
  h: HtmlBuilder<Message, unknown>,
): Html =>
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
          h.AriaExpanded(model.mobileMenuDialog.model.isOpen),
          h.AriaLabel('Toggle menu'),
          h.OnClick(Message.ClickedOpenMobileMenu()),
        ],
        [Icon.menu('w-6 h-6')],
      ),
    ],
  )
