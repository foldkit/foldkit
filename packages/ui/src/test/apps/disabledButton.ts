import { Effect, Option, Schema } from 'effect'
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
const DisabledButtonTestDefinition = Block.makeDefinition(
  'DisabledButtonTest',
  {
    key: DisabledButtonTestKey,
    Init: Schema.Tuple([]),
    view: { kind: 'Element' },
    Model,
    Message,
  },
)

// UPDATE

const foldDialogOutMessage = DisabledButtonTestDefinition.makeOutMessageFold(
  Dialog.DialogBlock,
  {
    Opened: DisabledButtonTestDefinition.makeNoopStep,
    Closed: DisabledButtonTestDefinition.makeNoopStep,
    CompletedClose: DisabledButtonTestDefinition.makeNoopStep,
  },
)

const DialogBinding = DisabledButtonTestDefinition.makeBinding(
  Dialog.DialogBlock,
  {
    field: 'dialog',
    init: { contextToArgs: () => [{ id: 'test-dialog' }] },
  },
).withOutMessagePolicy({ fold: foldDialogOutMessage })

const DisabledButtonTestComposition =
  DisabledButtonTestDefinition.makeComposition({
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
  ClickedToggle: DisabledButtonTestDefinition.makeFieldsStep(() => ({
    isEnabled: isEnabled => !isEnabled,
  })),
  ClickedSubmit: DisabledButtonTestDefinition.makeNoopStep(),
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

export const block = DisabledButtonTestDefinition.makeBlock(
  Effect.gen(function* () {
    const dialog = yield* DialogBinding
    return { children: [dialog], init, update, view: viewWithDialog }
  }),
).provide(Dialog.layer)
