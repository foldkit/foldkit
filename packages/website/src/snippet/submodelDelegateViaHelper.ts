// CHILD

export const setTheme = (model: Model, theme: Theme) =>
  update(model, ChangedTheme({ theme }))

// PARENT UPDATE

const foldSettingsTheme = Update.foldChild({
  update: Settings.setTheme,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) => evo(model, { settings: () => nextSettings }),
  toParentMessage: message => GotSettingsMessage({ message }),
})

ClickedResetSettings: () => foldSettingsTheme(model, 'Light')
