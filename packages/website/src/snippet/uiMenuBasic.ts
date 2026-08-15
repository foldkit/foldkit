// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Menu } from '@foldkit/ui'

// Add a field to your Model for the Menu Submodel:
const Model = S.Struct({
  menu: Menu.Model,
  // ...your other fields
})

// In your init function, initialize the Menu Submodel with a unique id:
const init = () => [
  {
    menu: Menu.init({ id: 'actions' }),
    // ...your other fields
  },
  [],
]

// Embed the Menu Message in your parent Message:
const GotMenuMessage = m('GotMenuMessage', {
  message: Menu.Message,
})

type Action = 'Edit' | 'Duplicate' | 'Archive' | 'Delete'
const actions: ReadonlyArray<Action> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Delete',
]

// Pair view and update behind a single Item-typed factory at module scope:
const ActionMenu = Menu.create<Action>()

// At module scope, fold the OutMessage into your own Model. `Selected` carries
// the picked item directly (typed as `Action`). The arm returns an Update.Step
// over the parent Model, which already has the next Menu Model written back:
const foldMenuOutMessage = M.type<Menu.OutMessage<Action>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    // The child has emitted `Selected`. In this arm the parent can update
    // its own state or dispatch its own Commands, for example transition a
    // page, mutate domain state, or trigger a downstream Command.
    Selected: () => model => [model, []],
  }),
)

// Update.foldChild wires the child into the parent: it runs ActionMenu.update,
// writes the next Menu Model back, maps the Submodel's Commands into your
// Message type, and hands any OutMessage to foldOutMessage.
const foldMenu = Update.foldChild({
  update: ActionMenu.update,
  read: (model: Model) => Option.some(model.menu),
  write: (model, nextMenu) => evo(model, { menu: () => nextMenu }),
  toParentMessage: message => GotMenuMessage({ message }),
  foldOutMessage: foldMenuOutMessage,
})

// Inside your update function's M.tagsExhaustive({...}), call the fold:
GotMenuMessage: ({ message }) => foldMenu(model, message)

// Inside your view function, render the menu via the factory's view. The
// `buttonContent` below names the trigger. When the trigger is icon-only,
// give it a name with `ariaLabel`, or point `ariaLabelledBy` at a visible
// label element (target the trigger id with `Menu.buttonId('actions')` for a
// native `<label for>`). Either attribute is only emitted when provided, so
// the trigger never carries a dangling `aria-labelledby`.
const view = (h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'menu',
    model: model.menu,
    view: ActionMenu.view,
    viewInputs: {
      // ariaLabel: 'Options',
      items: actions,
      buttonContent: h.span([], ['Options']),
      buttonClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
      itemsClassName: 'rounded-lg border shadow-lg',
      itemToConfig: (action, { isActive }) => ({
        className: isActive ? 'bg-blue-100' : '',
        content: h.div([h.Class('px-3 py-2')], [action]),
      }),
      isItemDisabled: action => action === 'Archive',
      backdropClassName: 'fixed inset-0',
      anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
    },
    toParentMessage: message => GotMenuMessage({ message }),
  })
