// ❌ Don't reach into the child's Model from the parent's update.
// This bypasses Settings.update, so its invariants, Commands,
// and OutMessages are skipped.
ClickedResetSettings: () => ({
  model: evo(model, {
    settings: settings => evo(settings, { theme: () => 'Light' }),
  }),
})
