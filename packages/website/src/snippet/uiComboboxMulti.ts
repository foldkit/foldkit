import { Array } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, Placeholder, div, span } from './html'

// Multi-select uses Combobox.Multi — the dropdown stays open on selection
// and items toggle on/off. Selected items are stored in model.selectedItems.

const GotComboboxMultiMessage = m('GotComboboxMultiMessage', {
  message: Ui.Combobox.Message,
})

const filteredCities = Array.filter(cities, city =>
  city.toLowerCase().includes(model.comboboxMulti.inputValue.toLowerCase()),
)

Ui.Combobox.Multi.view({
  model: model.comboboxMulti,
  toParentMessage: message => GotComboboxMultiMessage({ message }),
  items: filteredCities,
  itemToValue: city => city,
  itemToDisplayText: city => city,
  itemToConfig: (city, { isSelected }) => ({
    className: 'px-3 py-2 cursor-pointer data-[active]:bg-blue-100',
    content: div(
      [Class('flex items-center gap-2')],
      [
        isSelected ? span([], ['✓']) : span([Class('w-4')], []),
        span([], [city]),
      ],
    ),
  }),
  inputAttributes: [
    Class('w-full rounded-lg border px-3 py-2'),
    Placeholder('Search cities...'),
  ],
  itemsAttributes: [Class('rounded-lg border shadow-lg')],
  backdropAttributes: [Class('fixed inset-0')],
  anchor: { placement: 'bottom-start', gap: 8, padding: 8 },
})
