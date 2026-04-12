import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, span } from './html'

// Your Model has a field for the Menu Submodel:
const Model = S.Struct({
  menu: Ui.Menu.Model,
  // ...your other fields
})

// Initialize it:
const initialModel = {
  menu: Ui.Menu.init({ id: 'actions' }),
}

// Wrap the Menu Message in your parent Message:
const GotMenuMessage = m('GotMenuMessage', {
  message: Ui.Menu.Message,
})

// Your own Message for handling the selected action:
const SelectedAction = m('SelectedAction', { value: S.String })

// In your update, delegate to Menu.update:
GotMenuMessage: ({ message }) => {
  const [nextMenu, commands] = Ui.Menu.update(model.menu, message)

  return [
    evo(model, { menu: () => nextMenu }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotMenuMessage({ message }))),
    ),
  ]
}

// In your view:
type Action = 'Edit' | 'Duplicate' | 'Archive' | 'Delete'
const actions: ReadonlyArray<Action> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Delete',
]

// Menu is fire-and-forget — use onSelectedItem to handle actions
// in your own update function instead of through the Submodel:
Ui.Menu.view({
  model: model.menu,
  toParentMessage: message => GotMenuMessage({ message }),
  items: actions,
  onSelectedItem: value => SelectedAction({ value }),
  buttonContent: span([], ['Options']),
  buttonClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
  itemsClassName: 'rounded-lg border shadow-lg',
  itemToConfig: (action, { isActive }) => ({
    className: isActive ? 'bg-blue-100' : '',
    content: div([Class('px-3 py-2')], [action]),
  }),
  isItemDisabled: action => action === 'Archive',
  backdropClassName: 'fixed inset-0',
  anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
})
