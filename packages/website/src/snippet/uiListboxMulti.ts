// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Listbox } from '@foldkit/ui'

const Person = S.Literals(['Michael Bluth', 'Lindsay Funke', 'Tobias Funke'])
type Person = typeof Person.Type

// Declare a typed multi-select Listbox once at module scope:
const PeopleListbox = Listbox.Multi.create<Person>()

// Add a field to your Model for the Listbox.Multi Submodel, plus a field
// for the selected values your app actually cares about. Using the
// `Person` Schema keeps the field literal-typed end to end:
const Model = S.Struct({
  selectedPeople: S.Array(Person),
  listboxMulti: Listbox.Multi.Model,
  // ...your other fields
})

// In your init function, initialize the Listbox Submodel with a unique id:
const init = () => [
  {
    selectedPeople: [],
    listboxMulti: Listbox.Multi.init({ id: 'people' }),
    // ...your other fields
  },
  [],
]

// Wrap Listbox's Messages so they can flow through your update:
const GotListboxMultiMessage = m('GotListboxMultiMessage', {
  message: Listbox.Message,
})

// Delegate keyboard navigation, typeahead, and open/close to
// PeopleListbox.update. The OutMessage's `Selected` carries the activated
// value. The parent owns the selection and decides what it means: for
// multi-select, toggle the value in and out of its array:
GotListboxMultiMessage: ({ message }) => {
  const [nextListbox, commands, maybeOutMessage] = PeopleListbox.update(
    model.listboxMulti,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotListboxMultiMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [
      evo(model, { listboxMulti: () => nextListbox }),
      mappedCommands,
    ],
    onSome: M.type<Listbox.OutMessage<Person>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => [
          evo(model, {
            listboxMulti: () => nextListbox,
            selectedPeople: () =>
              Array.contains(model.selectedPeople, value)
                ? Array.filter(model.selectedPeople, person => person !== value)
                : Array.append(model.selectedPeople, value),
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}

const people: ReadonlyArray<Person> = [
  'Michael Bluth',
  'Lindsay Funke',
  'Tobias Funke',
]

// Inside your view function, embed the Listbox via h.submodel. Multi-select
// stays open on selection so the user can toggle several items:
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'people',
    model: model.listboxMulti,
    view: PeopleListbox.view,
    viewInputs: {
      items: people,
      // The parent owns the selection and passes its full array in.
      selectedValues: model.selectedPeople,
      buttonContent: h.span(
        [],
        [
          Array.isReadonlyArrayNonEmpty(model.selectedPeople)
            ? `${model.selectedPeople.length} selected`
            : 'Select people',
        ],
      ),
      buttonClassName: 'w-full rounded-lg border px-3 py-2 text-left',
      itemsClassName: 'rounded-lg border shadow-lg',
      itemToConfig: (person, { isSelected, isActive }) => ({
        className: isActive ? 'bg-blue-100' : '',
        content: h.div(
          [h.Class('flex items-center gap-2 px-3 py-2')],
          [
            isSelected ? h.span([], ['✓']) : h.span([h.Class('w-4')], []),
            h.span([], [person]),
          ],
        ),
      }),
      backdropClassName: 'fixed inset-0',
      anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
    },
    toParentMessage: message => GotListboxMultiMessage({ message }),
  })
}
