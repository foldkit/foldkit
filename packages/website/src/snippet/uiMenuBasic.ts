// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the Menu Submodel:
const Model = S.Struct({
  menu: Ui.Menu.Model,
  // ...your other fields
})

// In your init function, initialize the Menu Submodel with a unique id:
const init = () => [
  {
    menu: Ui.Menu.init({ id: 'actions' }),
    // ...your other fields
  },
  [],
]

// Embed the Menu Message in your parent Message:
const GotMenuMessage = m('GotMenuMessage', {
  message: Ui.Menu.Message,
})

type Action = 'Edit' | 'Duplicate' | 'Archive' | 'Delete'
const actions: ReadonlyArray<Action> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Delete',
]

// Pair view and update behind a single Item-typed factory at module scope:
const ActionMenu = Ui.Menu.create<Action>()

// Inside your update function's M.tagsExhaustive({...}), delegate to
// ActionMenu.update. The OutMessage's `Selected` carries the picked item
// directly (typed as `Action`):
GotMenuMessage: ({ message }) => {
  const [nextMenu, commands, maybeOutMessage] = ActionMenu.update(
    model.menu,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotMenuMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { menu: () => nextMenu }), mappedCommands],
    onSome: M.type<Ui.Menu.OutMessage<Action>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => {
          // The child has emitted `Selected`. The body commits the
          // child's next state as usual. In this arm the parent can
          // also update its own state or dispatch its own Commands,
          // for example transition a page, mutate domain state, or
          // trigger a downstream Command.
          return [evo(model, { menu: () => nextMenu }), mappedCommands]
        },
      }),
    ),
  })
}

// Inside your view function, render the menu via the factory's view:
const view = () => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'menu',
    model: model.menu,
    view: ActionMenu.view,
    viewInputs: {
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
}
