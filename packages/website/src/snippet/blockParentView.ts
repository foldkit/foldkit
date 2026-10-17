// view.ts (parent)
import { ApplicationComposition, SettingsBinding } from './blockProfile'

export const view = ApplicationComposition.makeView((model, h) => ({
  title: `${model.displayName}'s profile`,
  body: h.div(
    [h.Class('min-h-screen bg-gray-50')],
    [
      h.block(
        SettingsBinding.embedView({
          slotId: 'settings',
          model: model.settings,
        }),
      ),
    ],
  ),
}))
