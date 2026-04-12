import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, div, span } from './html'

// Submodel wiring:
//   Model field: menu: Ui.Menu.Model
//   Init: Ui.Menu.init({ id: 'actions' })
//   Update: delegate via Ui.Menu.update

const GotMenuMessage = m('GotMenuMessage', {
  message: Ui.Menu.Message,
})

// Your own Message for handling the selected action:
const SelectedAction = m('SelectedAction', { value: S.String })

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
