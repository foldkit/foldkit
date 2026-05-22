// page/settings.ts
import { Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'
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

export const ChangedTheme = m('ChangedTheme', { theme: Theme })
export const ChangedFontSize = m('ChangedFontSize', { fontSize: FontSize })
export const ToggledNotifications = m('ToggledNotifications')

export const Message = S.Union([
  ChangedTheme,
  ChangedFontSize,
  ToggledNotifications,
])
export type Message = typeof Message.Type

// UPDATE

export const update = (
  model: Model,
  message: Message,
): readonly [Model, ReadonlyArray<Command.Command<Message>>] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [Model, ReadonlyArray<Command.Command<Message>>]
    >(),
    M.tagsExhaustive({
      ChangedTheme: ({ theme }) => [evo(model, { theme: () => theme }), []],
      ChangedFontSize: ({ fontSize }) => [
        evo(model, { fontSize: () => fontSize }),
        [],
      ],
      ToggledNotifications: () => [
        evo(model, { notificationsEnabled: enabled => !enabled }),
        [],
      ],
    }),
  )
