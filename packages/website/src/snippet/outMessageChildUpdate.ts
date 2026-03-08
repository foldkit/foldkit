import { Match as M, Option } from 'effect'
import { Command } from 'foldkit/command'

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>, Option.Option<OutMessage>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      SubmittedLoginForm: () => [
        model,
        [login(model.email, model.password)],
        Option.none(),
      ],
      SucceededLoginRequest: ({ sessionId }) => [
        model,
        [],
        Option.some(SucceededLogin({ sessionId })),
      ],
    }),
  )
