// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, span } from './html'

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

// Your own Message for handling the selected action:
const SelectedAction = m('SelectedAction', { value: S.String })

// Inside your update function's M.tagsExhaustive({...}), delegate to Menu.update:
GotMenuMessage: ({ message }) => {
  const [nextMenu, commands] = Ui.Menu.update(model.menu, message)

  return [
    // Merge the next state into your Model:
    evo(model, { menu: () => nextMenu }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(Effect.map(message => GotMenuMessage({ message }))),
    ),
  ]
}

type Action = 'Edit' | 'Duplicate' | 'Archive' | 'Delete'
const actions: ReadonlyArray<Action> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Delete',
]

// Inside your view function, render the menu:
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
