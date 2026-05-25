import { Match as M, Option } from 'effect'
import { Command } from 'foldkit'

export const update = (
  model: Model,
  message: Message,
): [
  Model,
  ReadonlyArray<Command.Command<Message>>,
  Option.Option<OutMessage>,
] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      SubmittedLoginForm: () => [
        model,
        [Authenticate(model.email, model.password)],
        Option.none(),
      ],
      SucceededAuthenticate: ({ sessionId }) => [
        model,
        [],
        Option.some(SucceededLogin({ sessionId })),
      ],
    }),
  )
