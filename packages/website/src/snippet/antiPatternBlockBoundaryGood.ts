// ✅ Good: the child exposes a named Step that still runs its update.

export const setTheme = Settings.step((model, theme: Theme) =>
  update(model, Message.ChangedTheme({ theme })),
)

const SettingsComposition = Settings.makeComposition()

export const block = SettingsComposition.makeBlock({
  init,
  update,
  expose: { setTheme },
  EffectsLayer,
})

const update = ParentComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedResetSettings: () => SettingsBinding.setTheme('Light')(model),
  }),
)
