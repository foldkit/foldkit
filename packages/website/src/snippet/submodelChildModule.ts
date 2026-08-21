// page/settings.ts
import { Schema as S } from 'effect'
import { type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// MODEL

export const Theme = S.Literals(['Light', 'Dark', 'System'])
export type Theme = typeof Theme.Type

export const FontSize = S.Literals(['Small', 'Medium', 'Large'])
export type FontSize = typeof FontSize.Type

export const Model = S.Struct({
  theme: Theme,
  fontSize: FontSize,
  notificationsEnabled: S.Boolean,
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

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
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
