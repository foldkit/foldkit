import { Effect, Layer, Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'

import * as DragAndDrop from '@foldkit/ui/dragAndDrop'
import * as FileDrop from '@foldkit/ui/fileDrop'
import * as HoverIntent from '@foldkit/ui/hoverIntent'
import * as Tooltip from '@foldkit/ui/tooltip'

export const ApplicationKey = Symbol('UiLeafConsumer')
export const Message = defineMessageUnion({
  UpdatedShowDelay: { value: Schema.Number },
})
export const ApplicationDefinition = Block.makeDefinition('UiLeafConsumer', {
  key: ApplicationKey,
  Init: Schema.Tuple([]),
  Model: Schema.Struct({
    files: FileDrop.FileDropBlock.Model,
    hover: HoverIntent.HoverIntentBlock.Model,
    board: DragAndDrop.DragAndDropBlock.Model,
    tooltip: Tooltip.TooltipBlock.Model,
  }),
  Message,
  view: { kind: 'Element' },
})
export const FileDropBinding = ApplicationDefinition.makeBinding(
  FileDrop.FileDropBlock,
  {
    field: 'files',
    init: { contextToArgs: () => [{ id: 'files' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(FileDrop.FileDropBlock, {
    ReceivedFiles: () => model => ({ model }),
    RejectedNonFiles: () => model => ({ model }),
  }),
})
export const HoverIntentBinding = ApplicationDefinition.makeBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hover',
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(HoverIntent.HoverIntentBlock, {
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  }),
})
export const DragAndDropBinding = ApplicationDefinition.makeBinding(
  DragAndDrop.DragAndDropBlock,
  {
    field: 'board',
    init: { contextToArgs: () => [{ id: 'board' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(DragAndDrop.DragAndDropBlock, {
    StartedKeyboardDrag: () => model => ({ model }),
    ChangedKeyboardTarget: () => model => ({ model }),
    Reordered: () => model => ({ model }),
    Cancelled: () => model => ({ model }),
  }),
})
export const TooltipBinding = ApplicationDefinition.makeBinding(
  Tooltip.TooltipBlock,
  {
    field: 'tooltip',
    init: { contextToArgs: () => [{ id: 'tooltip' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(Tooltip.TooltipBlock, {
    Shown: () => model => ({ model }),
    Hidden: () => model => ({ model }),
  }),
})
export const ApplicationComposition = ApplicationDefinition.makeComposition({
  bindings: [
    FileDropBinding,
    HoverIntentBinding,
    DragAndDropBinding,
    TooltipBinding,
  ],
})
export const init = ApplicationComposition.makeInit(() => ({ model: {} }))
export const update = ApplicationComposition.makeUpdate({
  UpdatedShowDelay: (model, { value }) =>
    TooltipBinding.informShowDelayChanged(value)(model),
})
export const view = ApplicationComposition.makeView((model, h) =>
  h.div(
    [],
    [
      h.block(
        FileDropBinding.embedView({
          slotId: 'files',
          model: model.files,
          viewInputs: {
            toView: ({ root, input }) => h.label(root, [h.input(input)]),
          },
        }),
      ),
      h.block(
        HoverIntentBinding.embedView({
          slotId: 'hover',
          model: model.hover,
          viewInputs: {
            toView: ({ trigger, panel, isVisible }) =>
              h.div(
                [],
                [
                  h.button(trigger, ['Preview']),
                  ...(isVisible ? [h.div(panel, ['Preview details'])] : []),
                ],
              ),
          },
        }),
      ),
      h.block(
        DragAndDropBinding.embedView({
          slotId: 'board',
          model: model.board,
          viewInputs: {
            toView: ({ draggable }) =>
              h.div(
                draggable({ itemId: 'card', containerId: 'todo', index: 0 }),
                ['Card'],
              ),
          },
        }),
      ),
      h.block(
        TooltipBinding.embedView({
          slotId: 'tooltip',
          model: model.tooltip,
          viewInputs: {
            anchor: { placement: 'top' },
            toView: ({ trigger, panel, isVisible }) =>
              h.div(
                [],
                [
                  h.button(trigger, ['Help']),
                  ...(isVisible ? [h.div(panel, ['Tooltip details'])] : []),
                ],
              ),
          },
        }),
      ),
    ],
  ),
)
export const ApplicationBlock = ApplicationDefinition.makeBlock(
  Effect.gen(function* () {
    const files = yield* FileDropBinding
    const hover = yield* HoverIntentBinding
    const board = yield* DragAndDropBinding
    const tooltip = yield* TooltipBinding
    return { children: [files, hover, board, tooltip], init, update, view }
  }),
).provide(
  Layer.mergeAll(
    FileDrop.layer,
    HoverIntent.layer,
    DragAndDrop.layer,
    Tooltip.layer,
  ),
)
