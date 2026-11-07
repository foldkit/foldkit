import { Array, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { initAndSet } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import * as Update from 'foldkit/update'

import * as Dialog from '../../dialog/index.js'

const TerminalDialogParentKey = Symbol('TerminalDialogParent')
/** @internal Parent fixture that discards a Dialog only after terminal cleanup. */
export const TerminalDialogParentBlock = Block.make('TerminalDialogParent', {
  key: TerminalDialogParentKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model: Schema.Struct({
    maybeDialogInstance: Schema.Option(
      Schema.Struct({ key: Schema.String, model: Dialog.DialogBlock.Model }),
    ),
    closedKeys: Schema.Array(Schema.String),
    completedKeys: Schema.Array(Schema.String),
  }),
  Message: defineMessageUnion({
    ClickedOpen: {},
    ClickedCancel: {},
    ClickedReplace: {},
  }),
  InMessage: defineInMessageUnion({
    RequestedOpen: { key: Schema.String, isAnimated: Schema.Boolean },
    RequestedCancel: {},
  }),
})

/** @internal Original keyed relationship used by terminal lifecycle assertions. */
export const MaybeDialogInstanceBinding =
  TerminalDialogParentBlock.makeOptionalKeyedFieldBinding(Dialog.DialogBlock, {
    field: 'maybeDialogInstance',
    key: 'key',
    childField: 'model',
  }).withOutMessagePolicy({
    fold: key =>
      TerminalDialogParentBlock.makeOutMessageFold(Dialog.DialogBlock, {
        Opened: () => TerminalDialogParentBlock.makeNoopStep(),
        Closed: () =>
          TerminalDialogParentBlock.makeFieldsStep(() => ({
            closedKeys: Array.append(key),
          })),
        CompletedClose: () =>
          TerminalDialogParentBlock.makeFieldsStep(() => ({
            completedKeys: Array.append(key),
            maybeDialogInstance: () => Option.none(),
          })),
      }),
  })
const TerminalDialogParentComposition =
  TerminalDialogParentBlock.makeComposition({
    bindings: [MaybeDialogInstanceBinding],
  })
const openDialog = (key: string, isAnimated: boolean) =>
  TerminalDialogParentBlock.makeStep(() =>
    Update.combineSteps([
      TerminalDialogParentBlock.makeStep(model =>
        initAndSet(MaybeDialogInstanceBinding, model, {
          key,
          args: [{ id: key, isAnimated }],
        }),
      ),
      MaybeDialogInstanceBinding.requestOpen(key),
    ]),
  )
const cancelDialog = TerminalDialogParentBlock.makeFieldsStep(() => ({
  maybeDialogInstance: () => Option.none(),
}))

/** @internal Constructs the real Dialog and its ordinary attached handlers. */
export const layer = TerminalDialogParentBlock.makeLayer({
  init: TerminalDialogParentComposition.makeInit(() => ({
    model: {
      maybeDialogInstance: Option.none(),
      closedKeys: [],
      completedKeys: [],
    },
  })),
  update: TerminalDialogParentComposition.makeUpdate({
    ClickedOpen: openDialog('first', false),
    ClickedReplace: openDialog('second', false),
    ClickedCancel: cancelDialog,
  }),
  inMessageUpdate: TerminalDialogParentComposition.makeInMessageUpdate({
    RequestedOpen: (model, { key, isAnimated }) =>
      openDialog(key, isAnimated)(model),
    RequestedCancel: cancelDialog,
  }),
  view: TerminalDialogParentComposition.makeView((model, h) =>
    h.div(
      [],
      [
        h.button(
          [
            h.Id('terminal-open'),
            h.OnClick(TerminalDialogParentBlock.Message.ClickedOpen()),
          ],
          ['Open'],
        ),
        h.button(
          [
            h.Id('terminal-cancel'),
            h.OnClick(TerminalDialogParentBlock.Message.ClickedCancel()),
          ],
          ['Cancel'],
        ),
        h.button(
          [
            h.Id('terminal-replace'),
            h.OnClick(TerminalDialogParentBlock.Message.ClickedReplace()),
          ],
          ['Replace'],
        ),
        h.p([h.Id('terminal-closed')], [model.closedKeys.join(',')]),
        h.p([h.Id('terminal-completed')], [model.completedKeys.join(',')]),
        ...Array.map(Option.toArray(model.maybeDialogInstance), instance =>
          h.block(
            MaybeDialogInstanceBinding.embedView({
              key: instance.key,
              slotId: instance.key,
              model: instance.model,
              viewInputs: {
                toView: ({ dialog, panel, title, closeButton }) =>
                  h.dialog(
                    [...dialog],
                    [
                      h.div(
                        [...panel],
                        [
                          h.h2([...title], ['Terminal Dialog']),
                          h.button([...closeButton], ['Close Dialog']),
                        ],
                      ),
                    ],
                  ),
              },
            }),
          ),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(Dialog.layer))
