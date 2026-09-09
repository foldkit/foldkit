import { type Update } from 'foldkit'

export const update = (model: Model, message: Message) =>
  Message.match<Update.ReturnWithOutMessage<Model, Message, OutMessage>>(
    message,
    {
      SubmittedLoginForm: () => ({
        model,
        commands: [Authenticate(model.email, model.password)],
      }),
      SucceededAuthenticate: ({ sessionId }) => ({
        model,
        outMessage: OutMessage.SucceededLogin({ sessionId }),
      }),
    },
  )
