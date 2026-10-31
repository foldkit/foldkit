import { Array, Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Listbox } from '@foldkit/ui'

const Person = Schema.Literals([
  'Michael Bluth',
  'Lindsay Funke',
  'Tobias Funke',
])
type Person = typeof Person.Type

const PeopleListbox = Listbox.Multi.makeBlock<Person>()

const people: ReadonlyArray<Person> = [
  'Michael Bluth',
  'Lindsay Funke',
  'Tobias Funke',
]

export class PeoplePicker extends Block<PeoplePicker>()('PeoplePicker', {
  Model: Schema.Struct({
    listboxMulti: PeopleListbox,
    selectedPeople: Schema.Array(Person),
  }),
}) {}

export const PeoplePickerLive = PeoplePicker.make(
  Effect.fn(function* () {
    const listboxMulti = yield* new PeopleListbox('listboxMulti', {
      id: 'people',
    })

    return {
      model: { listboxMulti, selectedPeople: [] },

      update: {
        // `Selected` carries the activated value. For multi-select, toggle it
        // in and out of the parent's array.
        ...listboxMulti.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              selectedPeople: selectedPeople =>
                Array.contains(selectedPeople, value)
                  ? Array.filter(selectedPeople, person => person !== value)
                  : Array.append(selectedPeople, value),
            }),
          }),
        }),
      },

      // Multi-select stays open on selection so the user can toggle several
      // items
      view: (model, h) =>
        model.listboxMulti.view({
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
        }),
    }
  }),
).pipe(Layer.provide(PeopleListbox.Live))
