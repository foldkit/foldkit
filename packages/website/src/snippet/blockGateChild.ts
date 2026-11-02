import { Boolean, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Settings } from './blockSettingsContract'

export class SharedDevice extends Block<SharedDevice>()('SharedDevice', {
  Model: Schema.Struct({ isLocked: Schema.Boolean, settings: Settings }),
  Message: defineMessageUnion({ ClickedLockToggle: {} }),
}) {}

export const SharedDeviceLive = SharedDevice.toLayer(() => ({
  init: () => ({
    isLocked: true,
    settings: new Settings('settings', { initialTheme: 'System' }),
  }),

  update: {
    ClickedLockToggle: model => ({
      model: modifyFields(model, { isLocked: Boolean.not }),
    }),

    ...Settings.when(model => !model.isLocked),
  },

  view: (model, h) =>
    h.div(
      [h.AriaDisabled(model.isLocked)],
      [
        model.settings.view(),
        h.button(
          [h.OnClick(SharedDevice.Message.ClickedLockToggle())],
          [model.isLocked ? 'Unlock settings' : 'Lock settings'],
        ),
      ],
    ),
}))
