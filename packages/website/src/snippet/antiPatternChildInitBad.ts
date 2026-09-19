// ❌ Bad: copying the Model and Commands drops the RestoredTheme OutMessage.

// main.ts

const init = (username: string, savedTheme: Settings.Theme) => {
  const settingsBoot = Settings.boot({ theme: savedTheme })
  const commands = Command.mapMessages(settingsBoot.commands, message =>
    Message.GotSettingsMessage({ message }),
  )

  // ❌ The parent keeps the Model and Commands but drops settingsBoot.outMessage.
  return {
    model: Model.make({
      username,
      settings: settingsBoot.model,
      maybeRestoredTheme: Option.none(),
    }),
    commands,
  }
}
