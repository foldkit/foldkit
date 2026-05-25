// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect, Match as M, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { childAttributes, html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

type Character = Readonly<{
  firstName: string
  lastName: string
}>

const characterName = (character: Character): string =>
  `${character.firstName} ${character.lastName}`

// Declare the Listbox once at module scope, typed for the source item
// (`Character`). `view`'s `items` are typed as `ReadonlyArray<Character>`;
// the OutMessage carries the string returned by `itemToValue`:
const CharacterListbox = Ui.Listbox.create<Character>()

// Add a field to your Model for the Listbox Submodel, plus a field for
// the selected value your app actually cares about:
const Model = S.Struct({
  maybeCharacter: S.Option(S.String),
  listbox: Ui.Listbox.Model,
  // ...your other fields
})

// In your init function, initialize the Listbox Submodel with a unique id:
const init = () => [
  {
    maybeCharacter: Option.none(),
    listbox: Ui.Listbox.init({ id: 'character' }),
    // ...your other fields
  },
  [],
]

// Wrap Listbox's Messages so they can flow through your update:
const GotListboxMessage = m('GotListboxMessage', {
  message: Ui.Listbox.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate
// keyboard navigation, typeahead, and open/close to
// CharacterListbox.update. On selection, the OutMessage's `Selected`
// variant carries the chosen item's string value (the result of
// `itemToValue`):
GotListboxMessage: ({ message }) => {
  const [nextListbox, commands, maybeOutMessage] = CharacterListbox.update(
    model.listbox,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotListboxMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { listbox: () => nextListbox }), mappedCommands],
    onSome: M.type<Ui.Listbox.OutMessage>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => [
          evo(model, {
            listbox: () => nextListbox,
            maybeCharacter: () => Option.some(value),
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}

const characters: ReadonlyArray<Character> = [
  { firstName: 'Michael', lastName: 'Bluth' },
  { firstName: 'Gob', lastName: 'Bluth' },
  { firstName: 'George Michael', lastName: 'Bluth' },
  { firstName: 'Lindsay', lastName: 'Funke' },
  { firstName: 'Maeby', lastName: 'Funke' },
  { firstName: 'Tobias', lastName: 'Funke' },
]

// Inside your view function, group items by a key and render a heading for
// each group. Items are grouped in the order they appear. Make sure items
// with the same key are contiguous in the items array:
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'character',
    model: model.listbox,
    view: CharacterListbox.view,
    viewInputs: {
      items: characters,
      itemToValue: characterName,
      // Group contiguous items by a shared key:
      itemGroupKey: character => character.lastName,
      // Render a heading for each group:
      groupToHeading: lastName => ({
        content: h.span([], [`${lastName}s`]),
        className: 'px-3 py-1 text-xs font-semibold uppercase text-gray-500',
      }),
      // Optional separator between groups:
      separatorAttributes: childAttributes([h.Class('my-1 border-t')]),
      itemToConfig: character => ({
        className:
          'px-3 py-2 cursor-pointer data-[active]:bg-blue-100 data-[selected]:font-semibold',
        content: h.div(
          [h.Class('flex items-center gap-2')],
          [h.span([], [characterName(character)])],
        ),
      }),
      buttonContent: h.span(
        [],
        [Option.getOrElse(model.maybeCharacter, () => 'Select a character')],
      ),
      buttonClassName: 'w-full rounded-lg border px-3 py-2 text-left',
      itemsClassName: 'rounded-lg border shadow-lg',
      backdropClassName: 'fixed inset-0',
      anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
    },
    toParentMessage: message => GotListboxMessage({ message }),
  })
}
