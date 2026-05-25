// ✅ The canonical form: Settings exports a `setTheme` helper that
// returns the same `[Model, Commands]` shape as `update`. The parent
// calls it directly without ever importing `ChangedTheme`. The child's
// Message surface stays internal; the helper is the public verb the
// parent sees.
ClickedResetSettings: () => {
  const [nextSettings, commands] = Settings.setTheme(model.settings, 'Light')
  return [
    evo(model, { settings: () => nextSettings }),
    Command.mapMessages(commands, message => GotSettingsMessage({ message })),
  ]
}
