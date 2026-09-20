const foldSettingsOutMessage = Settings.OutMessage.match<
  Update.Step<Model, Message>
>({
  RestoredTheme:
    ({ theme }) =>
    model => ({
      model,
      commands: [ApplyTheme({ theme })],
    }),
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
