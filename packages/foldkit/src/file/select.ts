import { Array, Effect } from 'effect'

import type { File } from './file.js'

type OpenPickerOptions = Readonly<{
  accept: ReadonlyArray<string>
  multiple: boolean
}>

const openPicker = ({
  accept,
  multiple,
}: OpenPickerOptions): Effect.Effect<ReadonlyArray<File>> =>
  Effect.async<ReadonlyArray<File>>((resume, signal) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept.join(',')
    input.multiple = multiple
    input.style.display = 'none'

    const cleanup = () => {
      input.remove()
    }

    const handleChange = () => {
      const files = input.files
        ? Array.fromIterable<File>(input.files)
        : Array.empty<File>()
      cleanup()
      resume(Effect.succeed(files))
    }

    const handleCancel = () => {
      cleanup()
      resume(Effect.succeed(Array.empty<File>()))
    }

    input.addEventListener('change', handleChange)
    input.addEventListener('cancel', handleCancel)
    signal.addEventListener('abort', cleanup)

    document.body.appendChild(input)
    input.click()
  })

/**
 * Opens the native file picker allowing a single file to be selected. Resolves
 * with an array containing the selected file, or an empty array if the user
 * cancelled. Mirrors Elm's `File.Select.file`.
 *
 * The `accept` argument is a list of MIME types or file extensions that
 * restrict what the picker shows. Pass an empty array to allow any file.
 *
 * @example
 * ```typescript
 * SelectResume(
 *   File.select(['application/pdf']).pipe(
 *     Effect.map(files => SelectedResume({ files })),
 *   ),
 * )
 * ```
 */
export const select = (
  accept: ReadonlyArray<string>,
): Effect.Effect<ReadonlyArray<File>> => openPicker({ accept, multiple: false })

/**
 * Opens the native file picker allowing multiple files to be selected at
 * once. Resolves with the array of selected files, or an empty array if the
 * user cancelled. Mirrors Elm's `File.Select.files`.
 *
 * @example
 * ```typescript
 * SelectAttachments(
 *   File.selectMultiple(['image/*', 'application/pdf']).pipe(
 *     Effect.map(files => SelectedAttachments({ files })),
 *   ),
 * )
 * ```
 */
export const selectMultiple = (
  accept: ReadonlyArray<string>,
): Effect.Effect<ReadonlyArray<File>> => openPicker({ accept, multiple: true })
