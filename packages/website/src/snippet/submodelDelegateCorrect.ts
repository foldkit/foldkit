// CORRECT: dispatch the child's own Message and let Settings.update do
// the work. DevTools sees the ChangedTheme Message, and any invariant
// Settings.update enforces runs as designed.
ClickedResetSettings: () => {
  const [nextSettings, commands] = Settings.update(
    model.settings,
    Settings.ChangedTheme({ theme: 'Light' }),
  )
  return [
    evo(model, { settings: () => nextSettings }),
    Command.mapMessages(commands, message => GotSettingsMessage({ message })),
  ]
}
