import { Update } from 'foldkit'

export const update = Update.make((model: Model, message: Message) =>
  Message.match(message, {
    SubmittedLoginForm: () => ({
      model,
      commands: [Authenticate(model.email, model.password)],
    }),
    SucceededAuthenticate: ({ sessionId }) => ({
      model,
      outMessage: OutMessage.SucceededLogin({ sessionId }),
    }),
  }),
)
