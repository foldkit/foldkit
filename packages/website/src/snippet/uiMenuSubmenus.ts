// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema } from 'effect'
import { Update } from 'foldkit'
import { type HtmlBuilder, inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Menu } from '@foldkit/ui'

const Action = Schema.Literals([
  'Rename',
  'Duplicate',
  'Inbox',
  'Archive',
  'Email',
  'Copy link',
  'Delete',
])
type Action = typeof Action.Type

// One factory handles every level of the menu tree:
const ActionMenu = Menu.create<Action>()

const items: ReadonlyArray<Menu.Entry<Action>> = [
  'Rename',
  'Duplicate',
  Menu.submenu<Action>({
    id: 'organize',
    label: 'Organize',
    items: [
      'Inbox',
      'Archive',
      Menu.submenu<Action>({
        id: 'share',
        label: 'Share',
        items: ['Email', 'Copy link'],
      }),
    ],
  }),
  'Delete',
]

// The parent owns both the Menu Submodel and the selected action:
const Model = Schema.Struct({
  menu: Menu.Model,
  maybeSelectedAction: Schema.Option(Action),
  // ...your other fields
})
type Model = typeof Model.Type

// Initialize the root once; child menus are entries in items:
const init = () => ({
  model: {
    menu: Menu.init({ id: 'document-actions', isModal: true }),
    maybeSelectedAction: Option.none(),
    // ...your other fields
  },
})

const Message = defineMessageUnion({
  GotMenuMessage: { message: Menu.Message },
})
type Message = typeof Message.Type

// Submenu triggers open child menus; only leaf actions emit Selected:
const foldMenuOutMessage = Menu.OutMessage.match<
  Update.Step<Model, Message>,
  Menu.OutMessage<Action>
>({
  Selected:
    ({ value }) =>
    stepModel => ({
      model: modifyFields(stepModel, {
        maybeSelectedAction: () => Option.some(value),
      }),
    }),
})

// The same child fold handles Messages from every level:
const foldMenu = Update.foldChild({
  update: ActionMenu.update,
  read: (model: Model) => Option.some(model.menu),
  write: (model, nextMenu) => modifyFields(model, { menu: () => nextMenu }),
  toParentMessage: message => Message.GotMenuMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

// In the corresponding Message.match handler, call the fold:
GotMenuMessage: ({ message }) => foldMenu(model, message)

// Render the tree through one Submodel. submenuToConfig styles its triggers:
const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.div(
    [],
    [
      h.label([h.For(Menu.buttonId('document-actions'))], ['Document actions']),
      h.submodel({
        slotId: 'document-actions',
        model: model.menu,
        view: ActionMenu.view,
        viewInputs: {
          items,
          buttonContent: ih.span([], ['Actions']),
          buttonClassName: 'rounded-lg border px-3 py-2',
          itemsClassName: 'rounded-lg border shadow-lg',
          itemToConfig: (action, { isActive }) => ({
            className: isActive ? 'bg-blue-100' : '',
            content: ih.div([ih.Class('px-3 py-2')], [action]),
          }),
          submenuToConfig: (submenu, { isActive }) => ({
            className: isActive ? 'bg-blue-100' : '',
            content: ih.div(
              [ih.Class('flex justify-between gap-4 px-3 py-2')],
              [
                ih.span([], [submenu.label]),
                ih.span([ih.AriaHidden(true)], ['›']),
              ],
            ),
          }),
          backdropClassName: 'fixed inset-0',
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        },
        toParentMessage: message => Message.GotMenuMessage({ message }),
      }),
      h.p(
        [],
        [
          Option.match(model.maybeSelectedAction, {
            onNone: () => 'Choose an action.',
            onSome: action => `Selected: ${action}`,
          }),
        ],
      ),
    ],
  )
