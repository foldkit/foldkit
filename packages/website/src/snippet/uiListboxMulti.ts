// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, span } from './html'

// Add a field to your Model for the Listbox.Multi Submodel, plus a field
// for the selected values your app actually cares about:
const Model = S.Struct({
  selectedPeople: S.Array(S.String),
  listboxMulti: Ui.Listbox.Multi.Model,
  // ...your other fields
})

// In your init function, initialize the Listbox Submodel with a unique id:
const init = () => [
  {
    selectedPeople: [],
    listboxMulti: Ui.Listbox.Multi.init({ id: 'people' }),
    // ...your other fields
  },
  [],
]

// Embed the Listbox Message for keyboard/pointer events, plus your own
// Message for the actual selection:
const GotListboxMultiMessage = m('GotListboxMultiMessage', {
  message: Ui.Listbox.Message,
})
const ToggledPerson = m('ToggledPerson', { value: S.String })

// Inside your update function's M.tagsExhaustive({...}), delegate keyboard
// navigation, typeahead, and open/close to Listbox.Multi.update:
GotListboxMultiMessage: ({ message }) => {
  const [nextListbox, commands] = Ui.Listbox.Multi.update(
    model.listboxMulti,
    message,
  )

  return [
    // Merge the next state into your Model:
    evo(model, { listboxMulti: () => nextListbox }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotListboxMultiMessage({ message })),
      ),
    ),
  ]
}

// Still inside your update function's M.tagsExhaustive({...}), handle your
// own toggle Message:
ToggledPerson: ({ value }) => {
  // Ui.Listbox.Multi.selectItem gives you the next listbox state with the
  // value toggled in or out of the selection. Multi-select stays open on
  // selection, so the returned Commands are empty:
  const [nextListbox] = Ui.Listbox.Multi.selectItem(model.listboxMulti, value)

  return [
    evo(model, {
      selectedPeople: () =>
        Array.contains(model.selectedPeople, value)
          ? Array.filter(model.selectedPeople, person => person !== value)
          : Array.append(model.selectedPeople, value),
      listboxMulti: () => nextListbox,
    }),
    [],
  ]
}

const people = ['Michael Bluth', 'Lindsay Funke', 'Tobias Funke']

// Inside your view function, pass onSelectedItem to fire your ToggledPerson
// Message on selection — selectedItems is an array:
Ui.Listbox.Multi.view({
  model: model.listboxMulti,
  toParentMessage: message => GotListboxMultiMessage({ message }),
  onSelectedItem: value => ToggledPerson({ value }),
  items: people,
  buttonContent: span(
    [],
    [
      Array.isNonEmptyArray(model.selectedPeople)
        ? `${model.selectedPeople.length} selected`
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
