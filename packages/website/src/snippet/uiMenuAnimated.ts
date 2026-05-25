// Pseudocode walkthrough using the same Model, Messages, and update as
// the basic menu; only init and view change. Each labeled block below is
// an excerpt.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

// Only init and view differ from the basic menu: init adds isAnimated, the
// view uses data-[closed] selectors for enter/leave transitions.

// In your init function, set isAnimated: true to coordinate CSS transitions:
const init = () => [
  {
    menu: Ui.Menu.init({ id: 'actions', isAnimated: true }),
    // ...your other fields
  },
  [],
]

// Embed the Menu Message in your parent Message:
const GotMenuMessage = m('GotMenuMessage', {
  message: Ui.Menu.Message,
})

// Pair view and update behind a single Item-typed factory at module scope:
const ActionMenu = Ui.Menu.create<Action>()

// Inside your view function, use data-[closed] for enter/leave transitions:
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
      itemsClassName:
        'rounded-lg border shadow-lg transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
      itemToConfig: (action, { isActive }) => ({
        className: isActive ? 'bg-blue-100' : '',
        content: h.div([h.Class('px-3 py-2')], [action]),
      }),
      backdropClassName: 'fixed inset-0',
      anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
    },
    toParentMessage: message => GotMenuMessage({ message }),
  })
}
