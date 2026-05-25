// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Array, Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Declare a typed multi-select Listbox once at module scope:
const PeopleListbox = Ui.Listbox.Multi.create<string>()

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

// Wrap Listbox's Messages so they can flow through your update:
const GotListboxMultiMessage = m('GotListboxMultiMessage', {
  message: Ui.Listbox.Message,
})

// Delegate keyboard navigation, typeahead, and open/close to
// PeopleListbox.update. The OutMessage's `Selected` carries the toggled
// item and `wasAdded: boolean` indicating whether it was added or
// removed:
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
    onSome: M.type<Ui.Listbox.OutMessage>().pipe(
      M.tagsExhaustive({
        Selected: ({ value, wasAdded }) => [
          evo(model, {
            listboxMulti: () => nextListbox,
            selectedPeople: () =>
              wasAdded
                ? Array.append(model.selectedPeople, value)
                : Array.filter(
                    model.selectedPeople,
                    person => person !== value,
                  ),
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}

const people = ['Michael Bluth', 'Lindsay Funke', 'Tobias Funke']

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
