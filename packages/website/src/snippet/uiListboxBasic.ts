// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, span } from './html'

// Add a field to your Model for the Listbox Submodel, plus a field for
// the selected value your app actually cares about:
const Model = S.Struct({
  maybePerson: S.Option(S.String),
  listbox: Ui.Listbox.Model,
  // ...your other fields
})

// In your init function, initialize the Listbox Submodel with a unique id:
const init = () => [
  {
    maybePerson: Option.none(),
    listbox: Ui.Listbox.init({ id: 'person' }),
    // ...your other fields
  },
  [],
]

// Embed the Listbox Message for keyboard/pointer events, plus your own
// Message for the actual selection:
const GotListboxMessage = m('GotListboxMessage', {
  message: Ui.Listbox.Message,
})
const SelectedPerson = m('SelectedPerson', { value: S.String })

// Inside your update function's M.tagsExhaustive({...}), delegate keyboard
// navigation, typeahead, and open/close to Listbox.update:
GotListboxMessage: ({ message }) => {
  const [nextListbox, commands] = Ui.Listbox.update(model.listbox, message)

  return [
    // Merge the next state into your Model:
    evo(model, { listbox: () => nextListbox }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(Effect.map(message => GotListboxMessage({ message }))),
    ),
  ]
}

// Still inside your update function's M.tagsExhaustive({...}), handle your
// own selection Message:
SelectedPerson: ({ value }) => {
  // Ui.Listbox.selectItem gives you the next listbox state with the
  // selection reflected, plus the Commands that close the dropdown
  // and return focus to the button:
  const [nextListbox, commands] = Ui.Listbox.selectItem(model.listbox, value)

  return [
    evo(model, {
      maybePerson: () => Option.some(value),
      listbox: () => nextListbox,
    }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotListboxMessage({ message }))),
    ),
  ]
}

const people = ['Michael Bluth', 'Lindsay Funke', 'Tobias Funke']

// Inside your view function, pass onSelectedItem to fire your SelectedPerson
// Message on selection:
Ui.Listbox.view({
  model: model.listbox,
  toParentMessage: message => GotListboxMessage({ message }),
  onSelectedItem: value => SelectedPerson({ value }),
  items: people,
  buttonContent: span(
    [],
    [Option.getOrElse(model.maybePerson, () => 'Select a person')],
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
