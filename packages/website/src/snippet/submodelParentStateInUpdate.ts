import { Match as M } from 'effect'
import type { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import type { User } from '../user'
import { type Message, PersistSettings } from './message'
import type { Model } from './model'

// The Context shape is declared by the child. The parent assembles it
// inline when delegating in its own update handler.
type Context = Readonly<{
  currentUser: User
}>

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]

// The child's update grows a third `context` argument carrying the
// parent state it needs.
export const update = (
  model: Model,
  message: Message,
  context: Context,
): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ChangedTheme: ({ theme }) => [
        evo(model, { theme: () => theme }),
        [PersistSettings({ userId: context.currentUser.id, theme })],
      ],
      // ...other arms
    }),
  )

// Inside the parent's update handler, assemble the context from the
// parent Model and pass it through to the child's update:
GotSettingsMessage: ({ message }) => {
  const [nextSettings, commands] = Settings.update(model.settings, message, {
    currentUser: model.currentUser,
  })
  // ...usual wrapping of `commands`
}
