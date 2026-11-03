import { Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Scene from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { FileDropBlock, Model, type ViewInputs, layer } from './block.js'

type SceneViewInputs = Omit<Partial<ViewInputs>, 'toView'>

const FileDropSceneKey = Symbol('FileDropScene')
const FileDropSceneDefinition = Block.makeDefinition('FileDropScene', {
  key: FileDropSceneKey,
  Init: Block.makeInputContract<readonly []>(),
  Model: Schema.Struct({ fileDrop: FileDropBlock.Model }),
  Message: Schema.Never,
  view: { kind: 'Element', Inputs: Block.makeInputContract<SceneViewInputs>() },
})
const FileDropBinding = FileDropSceneDefinition.makeBinding(FileDropBlock, {
  field: 'fileDrop',
  init: { contextToArgs: () => [{ id: 'uploader' }] },
}).withOutMessagePolicy({
  fold: FileDropSceneDefinition.makeOutMessageFold(FileDropBlock, {
    ReceivedFiles: () => model => ({ model }),
    RejectedNonFiles: () => model => ({ model }),
  }),
})
const FileDropSceneComposition = FileDropSceneDefinition.makeComposition({
  bindings: [FileDropBinding],
})
const init = FileDropSceneComposition.makeInit(() => ({ model: {} }))
const update = FileDropSceneComposition.makeUpdate({})
const view = FileDropSceneComposition.makeView.withInputs(
  (model, overrides, h) =>
    h.block(
      FileDropBinding.embedView({
        slotId: 'file-drop',
        model: model.fileDrop,
        viewInputs: {
          ...overrides,
          toView: attrs =>
            h.label(attrs.root, [
              h.p([], ['Drop files or click to upload']),
              h.input(attrs.input),
            ]),
        },
      }),
    ),
)
const FileDropSceneBlock = FileDropSceneDefinition.makeBlock(
  Effect.gen(function* () {
    const fileDrop = yield* FileDropBinding

    return {
      children: [fileDrop],
      init,
      update,
      view,
    }
  }),
).provide(layer)

const dropZone = Scene.selector('label')
const fileInput = Scene.selector('input[type="file"]')

describe('FileDrop', () => {
  describe('rendering', () => {
    it.effect('renders a label wrapping a hidden file input', () =>
      Scene.scene(
        { block: FileDropSceneBlock, viewInputs: {} },
        Scene.init(),
        Scene.expect(dropZone).toExist(),
        Scene.expect(fileInput).toExist(),
        Scene.expect(fileInput).toHaveAttr('id', 'uploader'),
      ),
    )

    it.effect('applies sr-only to the input so it stays hidden visually', () =>
      Scene.scene(
        { block: FileDropSceneBlock, viewInputs: {} },
        Scene.init(),
        Scene.expect(fileInput).toHaveClass('sr-only'),
      ),
    )

    it.effect('does not set multiple on the input by default', () =>
      Scene.scene(
        { block: FileDropSceneBlock, viewInputs: {} },
        Scene.init(),
        Scene.expect(fileInput).not.toHaveAttr('multiple'),
      ),
    )

    it.effect('sets multiple when ViewConfig.multiple is true', () =>
      Scene.scene(
        { block: FileDropSceneBlock, viewInputs: { multiple: true } },
        Scene.init(),
        Scene.expect(fileInput).toHaveAttr('multiple'),
      ),
    )

    it.effect(
      'sets accept joined by commas when ViewConfig.accept is provided',
      () =>
        Scene.scene(
          {
            block: FileDropSceneBlock,
            viewInputs: { accept: ['application/pdf', '.doc'] },
          },
          Scene.init(),
          Scene.expect(fileInput).toHaveAttr('accept', 'application/pdf,.doc'),
        ),
    )
  })

  describe('drag state', () => {
    it.effect('does not set data-drag-over initially', () =>
      Scene.scene(
        { block: FileDropSceneBlock, viewInputs: {} },
        Scene.init(),
        Scene.expect(dropZone).not.toHaveAttr('data-drag-over'),
      ),
    )

    it.effect('sets data-drag-over on the root after EnteredDragZone', () =>
      Scene.scene(
        { block: FileDropSceneBlock, viewInputs: {} },
        Scene.given({
          fileDrop: Model.make({ id: 'uploader', isDragOver: true }),
        }),
        Scene.expect(dropZone).toHaveAttr('data-drag-over'),
      ),
    )
  })

  describe('disabled state', () => {
    it.effect('sets data-disabled on the root when disabled', () =>
      Scene.scene(
        { block: FileDropSceneBlock, viewInputs: { isDisabled: true } },
        Scene.init(),
        Scene.expect(dropZone).toHaveAttr('data-disabled'),
      ),
    )

    it.effect('disables the hidden input when disabled', () =>
      Scene.scene(
        { block: FileDropSceneBlock, viewInputs: { isDisabled: true } },
        Scene.init(),
        Scene.expect(fileInput).toBeDisabled(),
      ),
    )
  })
})
