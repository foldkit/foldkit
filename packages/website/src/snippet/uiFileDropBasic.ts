import { Array, Effect, Layer, Schema } from 'effect'
import { Block, File } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { FileDrop } from '@foldkit/ui'
import type { FileDropAttributes as FileDropFileDropAttributes } from '@foldkit/ui/fileDrop'

export class Uploader extends Block<Uploader>()('Uploader', {
  Model: Schema.Struct({
    uploader: FileDrop.FileDrop,
    uploadedFiles: Schema.Array(File.File),
  }),
}) {}

export const UploaderLive = Uploader.make(
  Effect.fn(function* () {
    const uploader = yield* new FileDrop.FileDrop('uploader', {
      id: 'uploader',
    })

    return {
      model: { uploader, uploadedFiles: [] },

      update: {
        // `ReceivedFiles` arrives from a drop or an input change.
        // `RejectedNonFiles` fires when a drop carried no files, such as
        // dragged text; handle it to show a hint.
        ...uploader.on({
          ReceivedFiles: (model, { files }) => ({
            model: modifyFields(model, {
              uploadedFiles: Array.appendAll(files),
            }),
          }),
        }),
      },

      // Spread `root` onto a <label> so clicking opens the picker, and spread
      // `input` onto a hidden <input type="file"> nested inside. Style the
      // drag-over state via `data-drag-over`.
      view: (model, h) => {
        const fileDropView = (attributes: FileDropFileDropAttributes) =>
          h.label(
            [
              ...attributes.root,
              h.Class(
                'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-accent-400 data-[drag-over]:border-accent-500 data-[drag-over]:bg-accent-50',
              ),
            ],
            [
              h.p([], ['Drop files or click to browse']),
              h.span([h.Class('text-sm text-gray-500')], ['PDF, DOC, or DOCX']),
              h.input(attributes.input),
            ],
          )

        return model.uploader.view({
          multiple: true,
          accept: ['application/pdf', '.doc', '.docx'],
          toView: fileDropView,
        })
      },
    }
  }),
).pipe(Layer.provide(FileDrop.FileDropLive))
