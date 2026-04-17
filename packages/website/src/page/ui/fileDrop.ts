import { Array } from 'effect'
import { File, Ui } from 'foldkit'
import type { Html } from 'foldkit/html'

import {
  Class,
  OnClick,
  Type,
  button,
  div,
  input,
  label,
  p,
  span,
} from '../../html'
import type { Message as ParentMessage } from '../../main'
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

export const basicDemo = (
  model: Model,
  toParentMessage: (message: Message) => ParentMessage,
): ReadonlyArray<Html> => [
  div(
    [Class('flex flex-col gap-3 w-full max-w-md')],
    [
      Ui.FileDrop.view({
        model: model.fileDropBasicDemo,
        toParentMessage: message =>
          toParentMessage(GotFileDropBasicDemoMessage({ message })),
        multiple: true,
        toView: attributes =>
          label(
            [...attributes.root, Class(dropZoneClassName)],
            [
              p(
                [Class(primaryTextClassName)],
                ['Drop files or click to browse'],
              ),
              p(
                [Class(secondaryTextClassName)],
                ['Any file type. This demo just lists them.'],
              ),
              input(attributes.input),
            ],
          ),
      }),
      ...Array.match(model.fileDropBasicDemoFiles, {
        onEmpty: () => [],
        onNonEmpty: files =>
          files.map((file, fileIndex) =>
            div(
              [Class(fileRowClassName)],
              [
                div(
                  [Class('flex flex-col min-w-0')],
                  [
                    span([Class(fileNameClassName)], [File.name(file)]),
                    span(
                      [Class(fileSizeClassName)],
                      [formatFileSize(File.size(file))],
                    ),
                  ],
                ),
                button(
                  [
                    Type('button'),
                    OnClick(
                      toParentMessage(
                        ClickedRemoveFileDropDemoFile({ fileIndex }),
                      ),
                    ),
                    Class(removeButtonClassName),
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
