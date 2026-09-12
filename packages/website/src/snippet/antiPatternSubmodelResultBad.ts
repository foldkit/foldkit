// ❌ Bad: manual copying drops the Commands returned with the child Model.

const handlers = {
  ClickedResetSettings: () => {
    const settingsReset = Settings.setTheme(model.settings, 'Light')

    return {
      model: evo(model, {
        settings: () => settingsReset.model,
      }),
    }
  },
}
