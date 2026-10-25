// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Listbox } from '@foldkit/ui'

const Person = Schema.Literals([
  'Michael Bluth',
  'Lindsay Funke',
  'Tobias Funke',
])

// Declare a typed multi-select Listbox once at module scope:
const PeopleListbox = Listbox.Multi.create<typeof Person.Type>()

// Add a field to your Model for the multi-select Listbox Block, plus a field
// for the selected values your app actually cares about. Using the
// `Person` Schema keeps the field literal-typed end to end:
const Model = Schema.Struct({
  selectedPeople: Schema.Array(Person),
  listboxMulti: PeopleListbox.Model,
  // ...your other fields
})

// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})

const PeoplePickerDefinition = Block.makeDefinition('PeoplePicker', {
  Model,
  Message,
})

// At module scope, fold the OutMessage into your own Model. `Selected` carries
// the activated value. The parent owns the selection and decides what it
// means: for multi-select, toggle the value in and out of its array. The arm
// returns an Update.Step over the parent Model, which already has the next
// Listbox Model written back. The parent Definition infers the refined child
// payload and checks every named variant:
const foldListboxMultiOutMessage = PeoplePickerDefinition.makeOutMessageFold(
  PeopleListbox,
  {
    Selected: ({ value }) =>
      PeoplePickerDefinition.makeFieldsStep(() => ({
        selectedPeople: selectedPeople =>
          Array.contains(selectedPeople, value)
            ? Array.filter(selectedPeople, person => person !== value)
            : Array.append(selectedPeople, value),
      })),
  },
)

// The Binding wires the completed child Block into the parent: it delegates keyboard
// navigation, typeahead, and open/close to PeopleListbox.update, writes the
// next Listbox Model back, routes generated delivery and Command results, and
// hands any OutMessage to the OutMessage fold.
const PeopleListboxBinding = PeoplePickerDefinition.makeBinding(PeopleListbox, {
  field: 'listboxMulti',
  init: { contextToArgs: () => Tuple.make({ id: 'people' }) },
}).withOutMessagePolicy({ fold: foldListboxMultiOutMessage })

const PeoplePickerComposition = PeoplePickerDefinition.makeComposition({
  bindings: [PeopleListboxBinding],
})

// Initialize the fields the parent owns. The Composition initializes the
// bound Listbox Model with the Binding's unique id.
const init = PeoplePickerComposition.makeInit(() => ({
  model: {
    selectedPeople: [],
    // ...your other fields
  },
}))

const update = PeoplePickerComposition.makeUpdate({})

const people: ReadonlyArray<typeof Person.Type> = [
  'Michael Bluth',
  'Lindsay Funke',
  'Tobias Funke',
]

// Inside your view function, embed the Listbox via h.block. Multi-select
// stays open on selection so the user can toggle several items:
const view = PeoplePickerComposition.makeView((model, h) =>
  h.block(
    PeopleListboxBinding.embedView({
      slotId: 'people',
      model: model.listboxMulti,
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
              isSelected ? h.span([], ['✓']) : h.span([h.Class('w-4')]),
              h.span([], [person]),
            ],
          ),
        }),
        backdropClassName: 'fixed inset-0',
        anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
      },
    }),
  ),
)
