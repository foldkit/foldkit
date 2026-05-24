// The child's update grows a third `context` argument carrying the
// parent state it needs. The Context shape is declared by the child;
// the parent assembles it inline when delegating in its own update
// handler.
import { Match as M, Option } from 'effect'
import type { Command } from 'foldkit'
import { evo } from 'foldkit/struct'

import { PersistProfile, type Message } from './message'
import type { Model, OutMessage } from './model'
import type { User } from '../user'

type Context = Readonly<{
  currentUser: User
}>

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
]

export const update = (
  model: Model,
  message: Message,
  context: Context,
): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      ClickedSave: () => [
        evo(model, { isSaving: () => true }),
        // `context.currentUser` is read at update time; no copy lives
        // in `model`, so there is nothing to keep in sync:
        [
          PersistProfile({
            userId: context.currentUser.id,
            draft: model.draft,
          }),
        ],
        Option.none(),
      ],
      // ...other arms
    }),
  )

// Inside the parent's update handler, assemble the context from the
// parent Model and pass it through to the child's update:
GotSettingsMessage: ({ message }) => {
  const [nextSettings, commands, maybeOut] = Settings.update(
    parentModel.settings,
    message,
    { currentUser: parentModel.currentUser },
  )
  // ...usual wrapping of `commands` and pattern-match on `maybeOut`
}
