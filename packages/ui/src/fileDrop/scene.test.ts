import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { expect, given, scene, selector } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { FileDrop, FileDropLive, type ViewInputs } from './block.js'

type Overrides = Omit<ViewInputs, 'toView'>

class FileDropScene extends Block<FileDropScene, Overrides>()('FileDropScene', {
  Model: Schema.Struct({ fileDrop: FileDrop }),
}) {}

const FileDropSceneLive = FileDropScene.make(
  Effect.fn(function* (_id, overrides) {
    const fileDrop = yield* new FileDrop('fileDrop', { id: 'uploader' })

    return {
      model: { fileDrop },
      view: (model, h) =>
        model.fileDrop.view({
          toView: attributes =>
            h.label(attributes.root, [
              h.p([], ['Drop files or click to upload']),
              h.input(attributes.input),
            ]),
          ...overrides,
        }),
    }
  }),
).pipe(Layer.provide(FileDropLive))

const dropZone = selector('label')
const fileInput = selector('input[type="file"]')

describe('FileDrop', () => {
  describe('rendering', () => {
    it.effect('renders a label wrapping a hidden file input', () =>
      scene(
        FileDropSceneLive,
        {},
        expect(dropZone).toExist(),
        expect(fileInput).toExist(),
        expect(fileInput).toHaveAttr('id', 'uploader'),
      ),
    )

    it.effect('applies sr-only to the input so it stays hidden visually', () =>
      scene(FileDropSceneLive, {}, expect(fileInput).toHaveClass('sr-only')),
    )

    it.effect('does not set multiple on the input by default', () =>
      scene(
        FileDropSceneLive,
        {},
        expect(fileInput).not.toHaveAttr('multiple'),
      ),
    )

    it.effect('sets multiple when ViewConfig.multiple is true', () =>
      scene(
        FileDropSceneLive,
        { multiple: true },
        expect(fileInput).toHaveAttr('multiple'),
      ),
    )

    it.effect(
      'sets accept joined by commas when ViewConfig.accept is provided',
      () =>
        scene(
          FileDropSceneLive,
          { accept: ['application/pdf', '.doc'] },
          expect(fileInput).toHaveAttr('accept', 'application/pdf,.doc'),
        ),
    )
  })

  describe('drag state', () => {
    it.effect('does not set data-drag-over initially', () =>
      scene(
        FileDropSceneLive,
        {},
        expect(dropZone).not.toHaveAttr('data-drag-over'),
      ),
    )

    it.effect('sets data-drag-over on the root after EnteredDragZone', () =>
      scene(
        FileDropSceneLive,
        {},
        given({ fileDrop: { id: 'uploader', isDragOver: true } }),
        expect(dropZone).toHaveAttr('data-drag-over'),
      ),
    )
  })

  describe('disabled state', () => {
    it.effect('sets data-disabled on the root when disabled', () =>
      scene(
        FileDropSceneLive,
        { isDisabled: true },
        expect(dropZone).toHaveAttr('data-disabled'),
      ),
    )

    it.effect('disables the hidden input when disabled', () =>
      scene(
        FileDropSceneLive,
        { isDisabled: true },
        expect(fileInput).toBeDisabled(),
      ),
    )
  })
})
