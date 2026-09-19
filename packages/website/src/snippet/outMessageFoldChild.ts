import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

const foldLoginOutMessage = Login.OutMessage.match<Update.Step<Model, Message>>(
  {
    SucceededLogin:
      ({ sessionId }) =>
      () => ({
        model: LoggedIn({ sessionId }),
        commands: [SaveSession(sessionId)],
      }),
  },
)

const foldLogin = Update.foldChild({
  update: Login.update,
  read: (model: Model) => Option.some(model.login),
  write: (model, nextLogin) => modifyFields(model, { login: () => nextLogin }),
  toParentMessage: message => GotLoginMessage({ message }),
  foldOutMessage: foldLoginOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotLoginMessage: ({ message }) => foldLogin(model, message),
  })
