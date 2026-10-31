import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Dialog, DialogLive } from '../../dialog/block.js'

const Message = defineMessageUnion({
  ClickedToggle: {},
  ClickedSubmit: {},
})
type Message = typeof Message.Type

/** Constructor args for {@link DisabledButton}. `isInDialog` renders the
 *  submit button inside the Dialog's panel instead of at the top level. */
export type DisabledButtonArgs = Readonly<{ isInDialog: boolean }>

/** A test app with a submit button that starts disabled and a toggle that
 *  enables it, optionally rendered inside a Dialog. */
export class DisabledButton extends Block<DisabledButton, DisabledButtonArgs>()(
  'DisabledButton',
  {
    Model: Schema.Struct({ isEnabled: Schema.Boolean, dialog: Dialog }),
    Message,
  },
) {}

const submitButton = <AllowedMountRequirements>(
  isEnabled: boolean,
  h: HtmlBuilder<Message, AllowedMountRequirements>,
): Html =>
  h.button(
    [
      h.Class('submit'),
      ...(isEnabled
        ? [h.OnClick(Message.ClickedSubmit())]
        : [h.Disabled(true)]),
    ],
    ['Submit'],
  )

/** Implements {@link DisabledButton}. */
export const DisabledButtonLive = DisabledButton.make(
  Effect.fn(function* (_id, { isInDialog }) {
    const dialog = yield* new Dialog('dialog', { id: 'test-dialog' })

    return {
      model: { isEnabled: false, dialog },
      update: {
        ClickedToggle: model => ({
          model: modifyFields(model, { isEnabled: isEnabled => !isEnabled }),
        }),
        ClickedSubmit: model => ({ model }),
      },
      view: (model, h) =>
        h.div(
          [],
          [
            h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
            isInDialog
              ? model.dialog.view({
                  toView: ({ dialog, backdrop, panel, isVisible }) =>
                    h.dialog(
                      [...dialog],
                      isVisible
                        ? [
                            h.div([...backdrop]),
                            h.div(
                              [...panel],
                              [submitButton(model.isEnabled, h)],
                            ),
                          ]
                        : [],
                    ),
                })
              : submitButton(model.isEnabled, h),
          ],
        ),
    }
  }),
).pipe(Layer.provide(DialogLive))
