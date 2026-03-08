import { Array, Effect, Match as M, Option } from 'effect'
import { evo } from 'foldkit/struct'

export const update = (
  model: Model,
  message: Message,
): [Model, ReadonlyArray<Command<Message>>] =>
  M.value(message).pipe(
    M.tagsExhaustive({
      GotLoginMessage: ({ message }) => {
        const [nextLogin, commands, maybeOutMessage] = Login.update(model.login, message)

        const mappedCommands = Array.map(
          commands,
          Effect.map(message => GotLoginMessage({ message })),
        )

        return Option.match(maybeOutMessage, {
          onNone: () => [evo(model, { login: () => nextLogin }), mappedCommands],
          onSome: outMessage =>
            M.value(outMessage).pipe(
              M.tagsExhaustive({
                SucceededLogin: ({ sessionId }) => [
                  LoggedIn({ sessionId }),
                  [...mappedCommands, saveSession(sessionId)],
                ],
              }),
            ),
        })
      },
    }),
  )
