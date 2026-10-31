import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { Listbox } from '@foldkit/ui'

type Character = Readonly<{
  firstName: string
  lastName: string
}>

const characterName = (character: Character): string =>
  `${character.firstName} ${character.lastName}`

// Typed for the source item. The `Selected` OutMessage carries the string
// returned by `itemToValue`.
const CharacterListbox = Listbox.makeBlock<Character>()

const characters: ReadonlyArray<Character> = [
  { firstName: 'Michael', lastName: 'Bluth' },
  { firstName: 'Gob', lastName: 'Bluth' },
  { firstName: 'George Michael', lastName: 'Bluth' },
  { firstName: 'Lindsay', lastName: 'Funke' },
  { firstName: 'Maeby', lastName: 'Funke' },
  { firstName: 'Tobias', lastName: 'Funke' },
]

export class CharacterPicker extends Block<CharacterPicker>()(
  'CharacterPicker',
  {
    Model: Schema.Struct({
      listbox: CharacterListbox,
      maybeCharacter: Schema.Option(Schema.String),
    }),
  },
) {}

export const CharacterPickerLive = CharacterPicker.make(
  Effect.fn(function* () {
    const listbox = yield* new CharacterListbox('listbox', { id: 'character' })

    return {
      model: { listbox, maybeCharacter: Option.none() },

      update: {
        ...listbox.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeCharacter: () => Option.some(value),
            }),
          }),
        }),
      },

      // Group items by a key and render a heading for each group. Items with
      // the same key must be contiguous in the items array.
      view: (model, h) =>
        model.listbox.view({
          items: characters,
          // The parent owns the selection and passes it in.
          maybeSelectedValue: model.maybeCharacter,
          itemToValue: characterName,
          // Group contiguous items by a shared key:
          itemGroupKey: character => character.lastName,
          // Render a heading for each group:
          groupToHeading: lastName => ({
            content: h.span([], [`${lastName}s`]),
            className:
              'px-3 py-1 text-xs font-semibold uppercase text-gray-500',
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
            [
              Option.getOrElse(
                model.maybeCharacter,
                () => 'Select a character',
              ),
            ],
          ),
          buttonClassName: 'w-full rounded-lg border px-3 py-2 text-left',
          itemsClassName: 'rounded-lg border shadow-lg',
          backdropClassName: 'fixed inset-0',
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        }),
    }
  }),
).pipe(Layer.provide(CharacterListbox.Live))
