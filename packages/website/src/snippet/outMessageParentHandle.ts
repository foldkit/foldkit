import { Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotLoginMessage: ({ message }) => {
      const loginUpdate = Login.update(model.login, message)

      const mappedCommands = Command.mapMessages(
        loginUpdate.commands ?? [],
        message => Message.GotLoginMessage({ message }),
      )

      if (loginUpdate.outMessage === undefined) {
        return {
          model: evo(model, { login: () => loginUpdate.model }),
          commands: mappedCommands,
        }
      } else {
        return Login.OutMessage.match<UpdateReturn>(loginUpdate.outMessage, {
          SucceededLogin: ({ sessionId }) => ({
            model: LoggedIn({ sessionId }),
            commands: [...mappedCommands, SaveSession(sessionId)],
          }),
        })
      }
    },
  })
