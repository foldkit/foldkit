import { Schema } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

const SearchState = defineTaggedUnion({
  Closed: {},
  Open: {},
})
type SearchState = typeof SearchState.Type

const Model = Schema.Struct({
  searchState: SearchState,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  PressedSearchShortcut: {},
  PressedEscape: {},
  PressedHomeShortcut: {},
})
type Message = typeof Message.Type

const SearchDefinition = Block.makeDefinition('Search', { Model, Message })

const subscriptions = SearchDefinition.makeSubscriptions(entry => ({
  keyBindings: entry(
    'KeyBindings',
    { searchState: SearchState },
    {
      messages: [
        Message.PressedSearchShortcut,
        Message.PressedEscape,
        Message.PressedHomeShortcut,
      ],
      modelToDependencies: model => ({ searchState: model.searchState }),
      handler: function* () {
        return ({ searchState }) =>
          Dom.streamFromKeyBindings<Message>({
            bindings: [
              {
                keys: 'Mod+K',
                whileTyping: 'Allow',
                mapEvent: () => Message.PressedSearchShortcut(),
              },
              {
                keys: 'Escape',
                isEnabled: searchState._tag === 'Open',
                whileTyping: 'Allow',
                mapEvent: () => Message.PressedEscape(),
              },
              {
                keys: ['G', 'H'],
                mapEvent: () => Message.PressedHomeShortcut(),
              },
            ],
          })
      },
    },
  ),
}))
