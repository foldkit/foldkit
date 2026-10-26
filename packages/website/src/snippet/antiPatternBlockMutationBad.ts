// ❌ Bad: the parent changes the Settings Model directly.

const update = ApplicationComposition.makeUpdate({
  ClickedResetSettings: model => ({
    model: modifyFields(model, {
      settings: settings => modifyFields(settings, { theme: () => 'Light' }),
    }),
  }),
})
