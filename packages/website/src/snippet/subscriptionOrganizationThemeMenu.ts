// themeMenu.ts
import { Effect, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

const Message = defineMessageUnion({
  ClickedToggle: {},
  PressedEscape: {},
})
type Message = typeof Message.Type

export class ThemeMenu extends Block<ThemeMenu>()('ThemeMenu', {
  Model: Schema.Struct({ isOpen: Schema.Boolean }),
  Message,
}) {}

const escapePresses = (isOpen: boolean) =>
  isOpen
    ? Stream.fromEventListener<KeyboardEvent>(document, 'keydown').pipe(
        Stream.filter(event => event.key === 'Escape'),
        Stream.map(() => Message.PressedEscape()),
      )
    : Stream.empty

export const ThemeMenuLive = ThemeMenu.make(
  Effect.fn(function* () {
    return {
      model: { isOpen: false },

      update: {
        ClickedToggle: model => ({
          model: modifyFields(model, { isOpen: isOpen => !isOpen }),
        }),
        PressedEscape: model => ({
          model: modifyFields(model, { isOpen: () => false }),
        }),
      },

      subscriptions: {
        escapePresses: {
          dependencies: model => model.isOpen,
          stream: escapePresses,
        },
      },

      view: (model, h) =>
        h.div(
          [],
          [
            h.button(
              [
                h.AriaExpanded(model.isOpen),
                h.OnClick(ThemeMenu.Message.ClickedToggle()),
              ],
              ['Theme'],
            ),
          ],
        ),
    }
  }),
)
