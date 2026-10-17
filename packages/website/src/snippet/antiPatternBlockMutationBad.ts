// ❌ Bad: the parent changes the Settings Model directly.

const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedResetSettings: () => ({
      model: modifyFields(model, {
        settings: settings => modifyFields(settings, { theme: () => 'Light' }),
      }),
    }),
  }),
)
