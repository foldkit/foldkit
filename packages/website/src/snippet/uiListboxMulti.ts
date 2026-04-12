import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, span } from './html'

// Your Model has a field for the Listbox.Multi Submodel:
const Model = S.Struct({
  listboxMulti: Ui.Listbox.Multi.Model,
  // ...your other fields
})

// Initialize it:
const initialModel = {
  listboxMulti: Ui.Listbox.Multi.init({ id: 'people' }),
}

// Embed the Listbox Message in your parent Message:
const GotListboxMultiMessage = m('GotListboxMultiMessage', {
  message: Ui.Listbox.Message,
})

// In your update, delegate to Listbox.Multi.update:
GotListboxMultiMessage: ({ message }) => {
  const [nextListbox, commands] = Ui.Listbox.Multi.update(
    model.listboxMulti,
    message,
  )

  return [
    evo(model, { listboxMulti: () => nextListbox }),
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotListboxMultiMessage({ message })),
      ),
    ),
  ]
}

// In your view, use Listbox.Multi.view — selectedItems is an array:
const people = ['Michael Bluth', 'Lindsay Funke', 'Tobias Funke']

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
