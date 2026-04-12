import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, div, span } from './html'

// Initialize with isAnimated: true for CSS transition coordination:
const initialModel = {
  menu: Ui.Menu.init({ id: 'actions', isAnimated: true }),
}

// Embed the Menu Message in your parent Message:
const GotMenuMessage = m('GotMenuMessage', {
  message: Ui.Menu.Message,
})

// In your view, use data-[closed] for enter/leave transitions:
Ui.Menu.view({
  model: model.menu,
  toParentMessage: message => GotMenuMessage({ message }),
  items: actions,
  onSelectedItem: value => SelectedAction({ value }),
  buttonContent: span([], ['Options']),
  buttonClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
  itemsClassName:
    'rounded-lg border shadow-lg transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
  itemToConfig: (action, { isActive }) => ({
    className: isActive ? 'bg-blue-100' : '',
    content: div([Class('px-3 py-2')], [action]),
  }),
  backdropClassName: 'fixed inset-0',
  anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
})
