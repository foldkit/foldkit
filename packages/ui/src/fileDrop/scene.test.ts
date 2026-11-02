import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { expect, given, scene, selector } from 'foldkit/scene'

import { describe, it } from '@effect/vitest'

import { FileDrop, FileDropLive, type ViewInputs } from './block.js'

type Overrides = Omit<ViewInputs, 'toView'>

class FileDropScene extends Block<FileDropScene>()('FileDropScene', {
  Model: Schema.Struct({ fileDrop: FileDrop }),
}) {}

const makeFileDropSceneLive = (overrides: Overrides) =>
  FileDropScene.toLayer(() => ({
    init: () => ({
      fileDrop: new FileDrop('fileDrop', { id: 'uploader' }),
    }),
    view: (model, h) =>
      model.fileDrop.view({
        toView: attributes =>
          h.label(attributes.root, [
            h.p([], ['Drop files or click to upload']),
            h.input(attributes.input),
          ]),
        ...overrides,
      }),
  })).pipe(Layer.provide(FileDropLive))

const dropZone = selector('label')
const fileInput = selector('input[type="file"]')

describe('FileDrop', () => {
  describe('rendering', () => {
    it.effect('renders a label wrapping a hidden file input', () =>
      scene(
        makeFileDropSceneLive({}),
        expect(dropZone).toExist(),
        expect(fileInput).toExist(),
        expect(fileInput).toHaveAttr('id', 'uploader'),
      ),
    )

    it.effect('applies sr-only to the input so it stays hidden visually', () =>
      scene(
        makeFileDropSceneLive({}),
        expect(fileInput).toHaveClass('sr-only'),
      ),
    )

    it.effect('does not set multiple on the input by default', () =>
      scene(
        makeFileDropSceneLive({}),
        expect(fileInput).not.toHaveAttr('multiple'),
      ),
    )

    it.effect('sets multiple when ViewConfig.multiple is true', () =>
      scene(
        makeFileDropSceneLive({ multiple: true }),
        expect(fileInput).toHaveAttr('multiple'),
      ),
    )

    it.effect(
      'sets accept joined by commas when ViewConfig.accept is provided',
      () =>
        scene(
          makeFileDropSceneLive({ accept: ['application/pdf', '.doc'] }),
          expect(fileInput).toHaveAttr('accept', 'application/pdf,.doc'),
        ),
    )
  })

  describe('drag state', () => {
    it.effect('does not set data-drag-over initially', () =>
      scene(
        makeFileDropSceneLive({}),
        expect(dropZone).not.toHaveAttr('data-drag-over'),
      ),
    )

    it.effect('sets data-drag-over on the root after EnteredDragZone', () =>
      scene(
        makeFileDropSceneLive({}),
        given({ fileDrop: { id: 'uploader', isDragOver: true } }),
        expect(dropZone).toHaveAttr('data-drag-over'),
      ),
    )
  })

  describe('disabled state', () => {
    it.effect('sets data-disabled on the root when disabled', () =>
      scene(
        makeFileDropSceneLive({ isDisabled: true }),
        expect(dropZone).toHaveAttr('data-disabled'),
      ),
    )

    it.effect('disables the hidden input when disabled', () =>
      scene(
        makeFileDropSceneLive({ isDisabled: true }),
        expect(fileInput).toBeDisabled(),
      ),
    )
  })
})
