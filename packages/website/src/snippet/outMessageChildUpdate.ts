export const update = LoginComposition.makeUpdate((model, message) =>
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
