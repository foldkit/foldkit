import { SettingsBinding } from './composition'
import { SettingsComposition } from './definition'
import type { User } from './user'

type ViewInputs = Readonly<{
  currentUser: User
}>

export const view = SettingsComposition.makeView.withInputs<ViewInputs>(
  (model, { currentUser }, h) =>
    h.div([], [h.h2([], [`Settings for ${currentUser.name}`])]),
)

h.block(
  SettingsBinding.embedView({
    slotId: 'settings',
    model: model.settings,
    viewInputs: { currentUser: model.currentUser },
  }),
)
