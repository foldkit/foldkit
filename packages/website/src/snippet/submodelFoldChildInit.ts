const foldSettingsOutMessage = Settings.OutMessage.match({
  RestoredTheme: ({ theme }) =>
    Update.makeStep((model: Model) => ({
      model,
      commands: [ApplyTheme({ theme })],
    })),
})

const init = (username: string, savedTheme: Settings.Theme) =>
  Update.foldChildInit(Settings.boot({ theme: savedTheme }), {
    toParentModel: settings =>
      Model.make({
        username,
        settings,
      }),
    toParentMessage: message => Message.GotSettingsMessage({ message }),
    foldOutMessage: foldSettingsOutMessage,
  })
