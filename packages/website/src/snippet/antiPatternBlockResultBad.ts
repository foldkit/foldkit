// ❌ Bad: manual copying drops the Commands returned with the child Model.

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedResetSettings: () => {
      const settingsReset = Settings.setTheme(model.settings, 'Light')

      return {
        model: modifyFields(model, {
          settings: () => settingsReset.model,
        }),
      }
    },
  }),
)
