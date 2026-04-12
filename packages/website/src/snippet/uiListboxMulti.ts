import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, div, span } from './html'

// Multi-select uses Listbox.Multi — the dropdown stays open on selection
// and items toggle on/off.

const GotListboxMultiMessage = m('GotListboxMultiMessage', {
  message: Ui.Listbox.Message,
})

Ui.Listbox.Multi.view({
  model: model.listboxMulti,
  toParentMessage: message => GotListboxMultiMessage({ message }),
  items: people,
  buttonContent: span(
    [],
    [
      model.listboxMulti.selectedItems.length > 0
        ? `${model.listboxMulti.selectedItems.length} selected`
        : 'Select people',
    ],
  ),
  buttonClassName: 'w-full rounded-lg border px-3 py-2 text-left',
  itemsClassName: 'rounded-lg border shadow-lg',
  itemToConfig: (person, { isSelected, isActive }) => ({
    className: isActive ? 'bg-blue-100' : '',
    content: div(
      [Class('flex items-center gap-2 px-3 py-2')],
      [
        isSelected ? span([], ['✓']) : span([Class('w-4')], []),
        span([], [person]),
      ],
    ),
  }),
  backdropClassName: 'fixed inset-0',
  anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
})
