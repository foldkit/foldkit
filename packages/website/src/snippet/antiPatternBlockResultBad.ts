// ❌ Bad: manual copying drops the Commands returned with the child Model.

const update = ApplicationComposition.makeUpdate({
  ClickedResetSettings: model => {
    const settingsReset = Settings.setTheme(model.settings, 'Light')

    return {
      model: modifyFields(model, {
        settings: () => settingsReset.model,
      }),
    }
  },
})
