import { Effect, Schema } from 'effect'
import { Block, Dom } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

const SearchState = defineTaggedUnion({
  Closed: {},
  Open: {},
})
type SearchState = typeof SearchState.Type

const Message = defineMessageUnion({
  PressedSearchShortcut: {},
  PressedEscape: {},
  PressedHomeShortcut: {},
})
type Message = typeof Message.Type

const keyBindings = (searchState: SearchState) =>
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

export class Search extends Block<Search>()('Search', {
  Model: Schema.Struct({ searchState: SearchState }),
  Message,
}) {}

export const SearchLive = Search.make(
  Effect.fn(function* () {
    return {
      model: { searchState: SearchState.Closed() },

      update: {
        PressedSearchShortcut: model => ({
          model: modifyFields(model, { searchState: () => SearchState.Open() }),
        }),
        PressedEscape: model => ({
          model: modifyFields(model, {
            searchState: () => SearchState.Closed(),
          }),
        }),
        PressedHomeShortcut: model => ({ model }),
      },

      subscriptions: {
        keyBindings: {
          dependencies: model => model.searchState,
          stream: keyBindings,
        },
      },
    }
  }),
)
