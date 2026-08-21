import { Match as M, Option } from 'effect'
import { Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

const foldLoginOutMessage = M.type<Login.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    SucceededLogin:
      ({ sessionId }) =>
      () => ({
        model: LoggedIn({ sessionId }),
        commands: [SaveSession(sessionId)],
      }),
  }),
)

const foldLogin = Update.foldChild({
  update: Login.update,
  read: (model: Model) => Option.some(model.login),
  write: (model, nextLogin) => evo(model, { login: () => nextLogin }),
  toParentMessage: message => GotLoginMessage({ message }),
  foldOutMessage: foldLoginOutMessage,
})

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotLoginMessage: ({ message }) => foldLogin(model, message),
  })
