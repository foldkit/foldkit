// page/settings/block.ts
import { Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

export const Theme = Schema.Literals(['Light', 'Dark', 'System'])

export const FontSize = Schema.Literals(['Small', 'Medium', 'Large'])

export const Model = Schema.Struct({
  theme: Theme,
  fontSize: FontSize,
  notificationsEnabled: Schema.Boolean,
})

export const Message = defineMessageUnion({
  ChangedTheme: { theme: Theme },
  ChangedFontSize: { fontSize: FontSize },
  ToggledNotifications: {},
})
const SettingsComposition = Block.makeDefinition('Settings', {
  Model,
  Message,
}).makeComposition()

export const update = SettingsComposition.makeUpdate({
  ChangedTheme: (model, { theme }) => ({
    model: modifyFields(model, { theme: () => theme }),
  }),
  ChangedFontSize: (model, { fontSize }) => ({
    model: modifyFields(model, { fontSize: () => fontSize }),
  }),
  ToggledNotifications: model => ({
    model: modifyFields(model, { notificationsEnabled: enabled => !enabled }),
  }),
})
