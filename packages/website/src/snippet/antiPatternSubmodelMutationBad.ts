// ❌ Bad: the parent changes the Settings Model directly.

const handlers = {
  ClickedResetSettings: () => ({
    model: evo(model, {
      settings: settings => evo(settings, { theme: () => 'Light' }),
    }),
  }),
}
