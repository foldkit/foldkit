// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Option, Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Listbox } from '@foldkit/ui'

type Character = Readonly<{
  firstName: string
  lastName: string
}>

const characterName = (character: Character): string =>
  `${character.firstName} ${character.lastName}`

// Declare the Listbox once at module scope, typed for the source item
// (`Character`). `view`'s `items` are typed as `ReadonlyArray<Character>`;
// the OutMessage carries the string returned by `itemToValue`:
const CharacterListbox = Listbox.create<Character>()

// Add a field to your Model for the Listbox Block, plus a field for
// the selected value your app actually cares about:
const Model = Schema.Struct({
  maybeCharacter: Schema.Option(Schema.String),
  listbox: CharacterListbox.Model,
  // ...your other fields
})

// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})

const CharacterPickerDefinition = Block.makeDefinition('CharacterPicker', {
  Model,
  Message,
})

const { makeFieldsStep } = CharacterPickerDefinition

// At module scope, fold the OutMessage into your own Model. On selection, the
// `Selected` variant carries the chosen item's string value (the result of
// `itemToValue`). The arm returns an Update.Step over the parent Model, which
// already has the next Listbox Model written back. The whole child Block
// preserves the refined string payload without repeated Step types:
const foldListboxOutMessage = CharacterPickerDefinition.makeOutMessageFold(
  CharacterListbox,
  {
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        maybeCharacter: () => Option.some(value),
      })),
  },
)

// The Binding wires the completed child Block into the parent: it delegates keyboard
// navigation, typeahead, and open/close to CharacterListbox.update, writes the
// next Listbox Model back, routes generated delivery and Command results, and
// hands any OutMessage to the OutMessage fold.
const CharacterListboxBinding = CharacterPickerDefinition.makeBinding(
  CharacterListbox,
  {
    field: 'listbox',
    init: { contextToArgs: () => Tuple.make({ id: 'character' }) },
  },
).withOutMessagePolicy({ fold: foldListboxOutMessage })

const CharacterPickerComposition = CharacterPickerDefinition.makeComposition({
  bindings: [CharacterListboxBinding],
})

// Initialize the fields the parent owns. The Composition initializes the
// bound Listbox Model with the Binding's unique id.
const init = CharacterPickerComposition.makeInit(() => ({
  model: {
    maybeCharacter: Option.none(),
    // ...your other fields
  },
}))

const update = CharacterPickerComposition.makeUpdate({})

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
const view = CharacterPickerComposition.makeView((model, h) =>
  h.block(
    CharacterListboxBinding.embedView({
      slotId: 'character',
      model: model.listbox,
      viewInputs: {
        items: characters,
        // The parent owns the selection and passes it in.
        maybeSelectedValue: model.maybeCharacter,
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
    }),
  ),
)
