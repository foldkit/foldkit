export const update = LoginComposition.makeUpdate({
  SubmittedLoginForm: model => ({
    model,
    commands: [Authenticate(model.email, model.password)],
  }),
  SucceededAuthenticate: (model, { sessionId }) => ({
    model,
    outMessage: OutMessage.SucceededLogin({ sessionId }),
  }),
})
