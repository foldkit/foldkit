import { Effect, Option } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, span } from './html'

// Add a field to your Model for the Listbox Submodel:
const Model = S.Struct({
  listbox: Ui.Listbox.Model,
  // ...your other fields
})

// In your init function, initialize the Listbox Submodel with a unique id:
const init = () => [
  {
    listbox: Ui.Listbox.init({ id: 'character' }),
    // ...your other fields
  },
  [],
]

// Embed the Listbox Message in your parent Message:
const GotListboxMessage = m('GotListboxMessage', {
  message: Ui.Listbox.Message,
})

// In your update, delegate to Listbox.update:
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

// In your view, group items by a key and render a heading for each group.
// Items are grouped in the order they appear — make sure items with the same
// key are contiguous in the items array.

type Character = Readonly<{
  firstName: string
  lastName: string
}>

const characterName = (character: Character): string =>
  `${character.firstName} ${character.lastName}`

const characters: ReadonlyArray<Character> = [
  { firstName: 'Michael', lastName: 'Bluth' },
  { firstName: 'Gob', lastName: 'Bluth' },
  { firstName: 'George Michael', lastName: 'Bluth' },
  { firstName: 'Lindsay', lastName: 'Funke' },
  { firstName: 'Maeby', lastName: 'Funke' },
  { firstName: 'Tobias', lastName: 'Funke' },
]

Ui.Listbox.view({
  model: model.listbox,
  toParentMessage: message => GotListboxMessage({ message }),
  items: characters,
  itemToValue: characterName,
  // Group contiguous items by a shared key:
  itemGroupKey: character => character.lastName,
  // Render a heading for each group:
  groupToHeading: lastName => ({
    content: span([], [`${lastName}s`]),
    className: 'px-3 py-1 text-xs font-semibold uppercase text-gray-500',
  }),
  // Optional separator between groups:
  separatorAttributes: [Class('my-1 border-t')],
  itemToConfig: character => ({
    className:
      'px-3 py-2 cursor-pointer data-[active]:bg-blue-100 data-[selected]:font-semibold',
    content: div(
      [Class('flex items-center gap-2')],
      [span([], [characterName(character)])],
    ),
  }),
  buttonContent: span(
    [],
    [
      Option.getOrElse(
        model.listbox.maybeSelectedItem,
        () => 'Select a character',
      ),
    ],
  ),
  buttonClassName: 'w-full rounded-lg border px-3 py-2 text-left',
  itemsClassName: 'rounded-lg border shadow-lg',
  backdropClassName: 'fixed inset-0',
  anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
})
