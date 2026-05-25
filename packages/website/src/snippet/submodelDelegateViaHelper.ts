// ✅ Even cleaner: Settings exports a `changeTheme` helper that returns
// the same `[Model, Commands]` shape as `update`. The parent calls it
// directly without ever importing `ChangedTheme`. The child Submodel's
// Message surface stays internal; the helper is the public verb.
ClickedResetSettings: () => {
  const [nextSettings, commands] = Settings.changeTheme(model.settings, 'Light')
  return [
    evo(model, { settings: () => nextSettings }),
    Command.mapMessages(commands, message => GotSettingsMessage({ message })),
  ]
}
