import { Array, Match as M, Number } from 'effect'
import { File, Submodel, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import {
  ClickedRemoveFileDropDemoFile,
  GotFileDropBasicDemoMessage,
  type UiMessage,
} from '../message'
import type { UiModel } from '../model'

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
  M.value(bytes).pipe(
    M.when(Number.isLessThan(BYTES_PER_KB), () => `${bytes} B`),
    M.when(
      Number.isLessThan(BYTES_PER_MB),
      () => `${(bytes / BYTES_PER_KB).toFixed(1)} KB`,
    ),
    M.orElse(() => `${(bytes / BYTES_PER_MB).toFixed(1)} MB`),
  )

const fileKey = (file: File.File): string =>
  `${File.name(file)}:${File.size(file)}:${file.lastModified}`

export const view = Submodel.defineView<UiModel, UiMessage>((model): Html => {
  const h = html<UiMessage>()

  return h.div(
    [],
    [
      h.h2([h.Class('text-2xl font-bold text-gray-900 mb-6')], ['File Drop']),
      h.div(
        [h.Class('flex flex-col gap-3 w-full max-w-md')],
        [
          h.submodel({
            slotId: model.fileDropBasicDemo.id,
            model: model.fileDropBasicDemo,
            view: Ui.FileDrop.view,
            viewInputs: {
              multiple: true,
              toView: attributes =>
                h.label(
                  [...attributes.root, h.Class(dropZoneClassName)],
                  [
                    h.p(
                      [h.Class(primaryTextClassName)],
                      ['Drop files or click to browse'],
                    ),
                    h.p(
                      [h.Class(secondaryTextClassName)],
                      ['Any file type. This demo just lists them.'],
                    ),
                    h.input(attributes.input),
                  ],
                ),
            },
            toParentMessage: message =>
              GotFileDropBasicDemoMessage({ message }),
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
                        h.OnClick(ClickedRemoveFileDropDemoFile({ fileIndex })),
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
})
