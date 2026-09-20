// ✅ Good: fold the complete child result, then handle its OutMessage.

// main.ts

const applyRestoredTheme =
  (theme: Settings.Theme): Update.Step<Model, Message> =>
  stepModel => ({ model: stepModel, commands: [ApplyTheme({ theme })] })

const recordRestoredTheme =
  (theme: Settings.Theme): Update.Step<Model, Message> =>
  stepModel => ({
    model: modifyFields(stepModel, {
      maybeRestoredTheme: () => Option.some(theme),
    }),
  })

const foldSettingsOutMessage = Settings.OutMessage.match<
  Update.Step<Model, Message>
>({
  RestoredTheme:
    ({ theme }) =>
    stepModel =>
      Update.combine(stepModel, [
        recordRestoredTheme(theme),
        applyRestoredTheme(theme),
      ]),
})

const init = (username: string, savedTheme: Settings.Theme) => {
  const settingsBoot = Settings.boot({ theme: savedTheme })

  // ✅ Keep the complete child result instead of copying selected fields.
  return Update.foldChildInit(settingsBoot, {
    toParentModel: settings =>
      Model.make({ username, settings, maybeRestoredTheme: Option.none() }),
    toParentMessage: message => Message.GotSettingsMessage({ message }),
    // ✅ Handle the RestoredTheme OutMessage returned by Settings.boot.
    foldOutMessage: foldSettingsOutMessage,
  })
}
