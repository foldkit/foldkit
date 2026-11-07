import { Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import * as Dialog from '../../dialog/block.js'

// MODEL

export const Model = Schema.Struct({
  isEnabled: Schema.Boolean,
  dialog: Dialog.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ClickedToggle: {},
  ClickedSubmit: {},
})
export type Message = typeof Message.Type

const DisabledButtonTestKey = Symbol('DisabledButtonTest')
const DisabledButtonTestBlock = Block.make('DisabledButtonTest', {
  key: DisabledButtonTestKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

// UPDATE

const foldDialogOutMessage = DisabledButtonTestBlock.makeOutMessageFold(
  Dialog.DialogBlock,
  {
    Opened: DisabledButtonTestBlock.makeNoopStep,
    Closed: DisabledButtonTestBlock.makeNoopStep,
    CompletedClose: DisabledButtonTestBlock.makeNoopStep,
  },
)

const DialogBinding = DisabledButtonTestBlock.makeRequiredFieldBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'test-dialog' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

const DisabledButtonTestComposition = DisabledButtonTestBlock.makeComposition({
  bindings: [DialogBinding],
})

// INIT

const makeInitialModel = (): Model => ({
  isEnabled: false,
  dialog: Dialog.Model.make({
    id: 'test-dialog',
    isOpen: false,
    isAnimated: false,
    animation: {
      id: 'test-dialog-panel',
      isShowing: false,
      transitionState: 'Idle',
      transitionGeneration: 0,
    },
    maybeFocusSelector: Option.none(),
  }),
})

const init = DisabledButtonTestComposition.makeInit(() => ({
  model: { isEnabled: false },
  steps: [DialogBinding.requestOpen()],
}))

export const initialModel = modifyFields(makeInitialModel(), {
  dialog: dialog => modifyFields(dialog, { isOpen: () => true }),
})

export const update = DisabledButtonTestComposition.makeUpdate({
  ClickedToggle: DisabledButtonTestBlock.makeFieldsStep(() => ({
    isEnabled: isEnabled => !isEnabled,
  })),
  ClickedSubmit: DisabledButtonTestBlock.makeNoopStep(),
})

// VIEW

const submitButton = <ParentMessage, AllowedMountRequirements>(
  isEnabled: boolean,
  h: HtmlBuilder<Message | ParentMessage, AllowedMountRequirements>,
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

/** Plain view, no dialog wrapper. */
export const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  return h.div(
    [],
    [
      h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
      submitButton(model.isEnabled, h),
    ],
  )
}

/** View with submit button inside a dialog's panel. */
export const viewWithDialog = DisabledButtonTestComposition.makeView(
  (model, h) => {
    return h.div(
      [],
      [
        h.button([h.OnClick(Message.ClickedToggle())], ['Toggle']),
        h.block(
          DialogBinding.embedView({
            slotId: model.dialog.id,
            model: model.dialog,
            viewInputs: {
              toView: ({ dialog, backdrop, panel, isVisible }) =>
                h.dialog(
                  [...dialog],
                  isVisible
                    ? [
                        h.div([...backdrop]),
                        h.div([...panel], [submitButton(model.isEnabled, h)]),
                      ]
                    : [],
                ),
            },
          }),
        ),
      ],
    )
  },
)

export const block = {
  block: DisabledButtonTestBlock,
  layer: DisabledButtonTestBlock.makeLayer({
    init,
    update,
    view: viewWithDialog,
  }).pipe(Layer.provide(Dialog.layer)),
}
