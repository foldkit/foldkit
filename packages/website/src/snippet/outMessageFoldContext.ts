const foldLoginOutMessage = Application.makeOutMessageFold(Login.LoginBlock, {
  RequestedMagicLink: ({ email }, { liftCommand }) =>
    Application.makeCommandsStep(model => [
      liftCommand(Login.SendMagicLink({ email, redirectRoute: model.route })),
    ]),
})
