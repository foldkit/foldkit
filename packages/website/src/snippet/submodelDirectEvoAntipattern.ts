// AVOID: reaching into the child's Model from the parent's update.
// This bypasses Settings.update, so DevTools never sees the change,
// and any invariant Settings.update was enforcing is silently violated.
ClickedResetSettings: () => [
  evo(model, {
    settings: settings => ({ ...settings, theme: 'Light' }),
  }),
  [],
]
