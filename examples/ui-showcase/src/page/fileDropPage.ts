import { Array, Effect, Layer, Match, Number, Schema } from 'effect'
import { Block, File } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { FileDrop } from '@foldkit/ui'
import type { FileDropAttributes } from '@foldkit/ui/fileDrop'

const Model = Schema.Struct({
  fileDropBasicDemo: FileDrop.FileDrop,
  fileDropBasicDemoFiles: Schema.Array(File.File),
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedRemoveFileDropDemoFile: { fileIndex: Schema.Number },
})
type Message = typeof Message.Type

export class FileDropPage extends Block<FileDropPage>()('FileDropPage', {
  Model,
  Message,
}) {}

export const FileDropPageLive = FileDropPage.make(
  Effect.fn(function* () {
    const fileDropBasicDemo = yield* new FileDrop.FileDrop(
      'fileDropBasicDemo',
      { id: 'file-drop-basic-demo' },
    )

    return {
      model: {
        fileDropBasicDemo,
        fileDropBasicDemoFiles: [],
      },

      update: {
        ClickedRemoveFileDropDemoFile: (model, { fileIndex }) => ({
          model: modifyFields(model, {
            fileDropBasicDemoFiles: Array.remove(fileIndex),
          }),
        }),

        ...fileDropBasicDemo.on({
          ReceivedFiles: (model, { files }) => ({
            model: modifyFields(model, {
              fileDropBasicDemoFiles: Array.appendAll(files),
            }),
          }),
          RejectedNonFiles: model => ({ model }),
        }),
      },

      view,
    }
  }),
).pipe(Layer.provide(FileDrop.FileDropLive))

const dropZoneClassName =
  'flex flex-col items-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center hover:border-accent-400 select-none data-[drag-over]:border-accent-500 data-[drag-over]:bg-accent-50'

const primaryTextClassName = 'text-base font-medium text-gray-900'

const secondaryTextClassName = 'text-sm text-gray-500'

const fileRowClassName =
  'flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 bg-white'

const fileNameClassName = 'text-sm font-medium text-gray-900 truncate'

const fileSizeClassName = 'text-xs text-gray-500'

const removeButtonClassName =
  'text-sm text-gray-500 hover:text-red-600 cursor-pointer'

const BYTES_PER_KB = 1024
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB

const formatFileSize = (bytes: number): string =>
  Match.value(bytes).pipe(
    Match.when(Number.isLessThan(BYTES_PER_KB), () => `${bytes} B`),
    Match.when(
      Number.isLessThan(BYTES_PER_MB),
      () => `${(bytes / BYTES_PER_KB).toFixed(1)} KB`,
    ),
    Match.orElse(() => `${(bytes / BYTES_PER_MB).toFixed(1)} MB`),
  )

const fileKey = (file: File.File): string =>
  `${File.name(file)}:${File.size(file)}:${file.lastModified}`

const view = (model: Model, h: HtmlBuilder<Message>): Html => {
  const fileDropView = (attributes: FileDropAttributes): Html =>
    h.label(
      [...attributes.root, h.Class(dropZoneClassName)],
      [
        h.p([h.Class(primaryTextClassName)], ['Drop files or click to browse']),
        h.p(
          [h.Class(secondaryTextClassName)],
          ['Any file type. This demo just lists them.'],
        ),
        h.input(attributes.input),
      ],
    )

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['File Drop']),
      h.div(
        [h.Class('flex flex-col gap-3 w-full max-w-md')],
        [
          model.fileDropBasicDemo.view({
            multiple: true,
            toView: fileDropView,
          }),
          ...Array.match(model.fileDropBasicDemoFiles, {
            onEmpty: () => [],
            onNonEmpty: files =>
              files.map((file, fileIndex) =>
                h.keyed('div')(
                  fileKey(file),
                  [h.Class(fileRowClassName)],
                  [
                    h.div(
                      [h.Class('flex flex-col min-w-0')],
                      [
                        h.span([h.Class(fileNameClassName)], [File.name(file)]),
                        h.span(
                          [h.Class(fileSizeClassName)],
                          [formatFileSize(File.size(file))],
                        ),
                      ],
                    ),
                    h.button(
                      [
                        h.Type('button'),
                        h.OnClick(
                          Message.ClickedRemoveFileDropDemoFile({
                            fileIndex,
                          }),
                        ),
                        h.Class(removeButtonClassName),
                      ],
                      ['Remove'],
                    ),
                  ],
                ),
              ),
          }),
        ],
      ),
    ],
  )
}
