import { Array } from 'effect'
import { File, Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import {
  ClickedRemoveFileDropDemoFile,
  GotFileDropBasicDemoMessage,
  type Message,
} from './message'
import type { Model } from './model'

// DEMO CONTENT

const dropZoneClassName =
  'flex flex-col items-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-6 py-10 text-center hover:border-accent-400 select-none data-[drag-over]:border-accent-500 data-[drag-over]:bg-accent-50 dark:data-[drag-over]:bg-accent-950/30 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const primaryTextClassName =
  'text-base font-medium text-gray-900 dark:text-white'

const secondaryTextClassName = 'text-sm text-gray-500 dark:text-gray-400'

const fileRowClassName =
  'flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 bg-cream dark:bg-gray-800'

const fileNameClassName =
  'text-sm font-medium text-gray-900 dark:text-white truncate'

const fileSizeClassName = 'text-xs text-gray-500 dark:text-gray-400'

const removeButtonClassName =
  'text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer'

const BYTES_PER_KB = 1024
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB

const formatFileSize = (bytes: number): string => {
  if (bytes < BYTES_PER_KB) {
    return `${bytes} B`
  }
  if (bytes < BYTES_PER_MB) {
    return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`
  }
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`
}

// VIEW

export const basicDemo = (model: Model): ReadonlyArray<Html> => {
  const h = html<Message>()

  return [
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
          toParentMessage: message => GotFileDropBasicDemoMessage({ message }),
        }),
        ...Array.match(model.fileDropBasicDemoFiles, {
          onEmpty: () => [],
          onNonEmpty: files =>
            files.map((file, fileIndex) =>
              h.div(
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
  ]
}
