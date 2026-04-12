import { Effect, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, span } from './html'

// Your Model has a field for the Listbox Submodel:
const Model = S.Struct({
  listbox: Ui.Listbox.Model,
  // ...your other fields
})

// Initialize it:
const initialModel = {
  listbox: Ui.Listbox.init({ id: 'person', selectedItem: 'Michael Bluth' }),
}

// Embed the Listbox Message in your parent Message:
const GotListboxMessage = m('GotListboxMessage', {
  message: Ui.Listbox.Message,
})

// In your update, delegate to Listbox.update:
GotListboxMessage: ({ message }) => {
  const [nextListbox, commands] = Ui.Listbox.update(model.listbox, message)

  return [
    evo(model, { listbox: () => nextListbox }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotListboxMessage({ message }))),
    ),
  ]
}

// In your view:
const people = ['Michael Bluth', 'Lindsay Funke', 'Tobias Funke']

Ui.Listbox.view({
  model: model.listbox,
  toParentMessage: message => GotListboxMessage({ message }),
  items: people,
  buttonContent: span(
    [],
    [
      Option.getOrElse(
        model.listbox.maybeSelectedItem,
        () => 'Select a person',
      ),
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

// Programmatic selection (e.g. from a domain event):
// const [nextListbox, commands] = Ui.Listbox.selectItem(model.listbox, 'Lindsay Funke')
