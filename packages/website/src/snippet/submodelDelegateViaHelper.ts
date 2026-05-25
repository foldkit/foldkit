// ✅ page/settings.ts — setTheme wraps update; ChangedTheme stays internal
export const setTheme = (model: Model, theme: Theme) =>
  update(model, ChangedTheme({ theme }))

// main.ts — the parent calls the verb and maps the child's Commands
ClickedResetSettings: () => {
  const [nextSettings, commands] = Settings.setTheme(model.settings, 'Light')
  return [
    evo(model, { settings: () => nextSettings }),
    Command.mapMessages(commands, message => GotSettingsMessage({ message })),
  ]
}
