// page/settings.ts
import { Schema } from 'effect'
import { type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Theme = Schema.Literals(['Light', 'Dark', 'System'])
export type Theme = typeof Theme.Type

export const FontSize = Schema.Literals(['Small', 'Medium', 'Large'])
export type FontSize = typeof FontSize.Type

export const Model = Schema.Struct({
  theme: Theme,
  fontSize: FontSize,
  notificationsEnabled: Schema.Boolean,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ChangedTheme: { theme: Theme },
  ChangedFontSize: { fontSize: FontSize },
  ToggledNotifications: {},
})
export type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedTheme: ({ theme }) => ({
      model: evo(model, { theme: () => theme }),
    }),
    ChangedFontSize: ({ fontSize }) => ({
      model: evo(model, { fontSize: () => fontSize }),
    }),
    ToggledNotifications: () => ({
      model: evo(model, { notificationsEnabled: enabled => !enabled }),
    }),
  })
