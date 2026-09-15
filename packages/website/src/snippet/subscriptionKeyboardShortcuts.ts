import { Schema } from 'effect'
import { Subscription } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'

const SearchState = defineTaggedUnion({
  Closed: {},
  Open: {},
})

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

const subscriptions = Subscription.make<Model, Message>()(entry => ({
  keyboardShortcuts: entry(
    { searchState: SearchState },
    {
      modelToDependencies: model => ({ searchState: model.searchState }),
      dependenciesToStream: ({ searchState }) =>
        Subscription.keyboardShortcuts<Message>({
          bindings: [
            {
              shortcut: 'Mod+K',
              whileTyping: 'Allow',
              toMessage: () => Message.PressedSearchShortcut(),
            },
            {
              shortcut: 'Escape',
              isEnabled: searchState._tag === 'Open',
              whileTyping: 'Allow',
              toMessage: () => Message.PressedEscape(),
            },
            {
              shortcut: ['G', 'H'],
              toMessage: () => Message.PressedHomeShortcut(),
            },
          ],
        }),
    },
  ),
}))
