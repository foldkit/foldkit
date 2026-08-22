import { type Update } from 'foldkit'

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    SubmittedLoginForm: () => ({
      model,
      commands: [Authenticate(model.email, model.password)],
    }),
    SucceededAuthenticate: ({ sessionId }) => ({
      model,
      outMessage: OutMessage.SucceededLogin({ sessionId }),
    }),
  })
