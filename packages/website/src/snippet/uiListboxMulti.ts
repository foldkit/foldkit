import { Array, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Listbox } from '@foldkit/ui'

const Person = Schema.Literals([
  'Michael Bluth',
  'Lindsay Funke',
  'Tobias Funke',
])
type Person = typeof Person.Type
// Declare a typed multi-select Listbox once at module scope:
const PeopleListbox = Listbox.Multi.makeBlock(Person)

// Add a field to your Model for the multi-select Listbox Block, plus a field
// for the selected values your app actually cares about. Using the
// `Person` Schema keeps the field literal-typed end to end:
const Model = Schema.Struct({
  selectedPeople: Schema.Array(Person),
  listboxMulti: PeopleListbox.Model,
  // ...your other fields
})
type Model = typeof Model.Type
// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

export const PeoplePickerKey = Symbol('PeoplePicker')
export const PeoplePickerBlock = Block.make('PeoplePicker', {
  key: PeoplePickerKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const {
  makeFieldsStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeComposition,
} = PeoplePickerBlock

// At module scope, fold the OutMessage into your own Model. `Selected` carries
// the activated value. The parent owns the selection and decides what it
// means: for multi-select, toggle the value in and out of its array. The arm
// returns an Update.Step over the parent Model, which already has the next
// Listbox Model written back. The parent Block infers the refined child
// payload and checks every named variant:
// The Binding declares placement, typed startup, and OutMessage policy.
// The construction Layer below supplies the child implementation.
const ListboxMultiBinding = makeRequiredFieldBinding(PeopleListbox, {
  field: 'listboxMulti',
  init: { contextToArgs: () => [{ id: 'people' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(PeopleListbox, {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        selectedPeople: selectedPeople =>
          Array.contains(selectedPeople, value)
            ? Array.filter(selectedPeople, person => person !== value)
            : Array.append(selectedPeople, value),
      })),
  }),
})

const PeoplePickerComposition = makeComposition({
  bindings: [ListboxMultiBinding],
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

const people: ReadonlyArray<Person> = [
  'Michael Bluth',
  'Lindsay Funke',
  'Tobias Funke',
]

// Inside your view function, embed the Listbox via h.block. Multi-select
// stays open on selection so the user can toggle several items:
const view = PeoplePickerComposition.makeView((model, h) =>
  h.block(
    ListboxMultiBinding.embedView({
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

export const layer = PeoplePickerBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(Listbox.Multi.layer))
