import { Effect } from 'effect'

import { FileReadError } from './error.js'
import type { File } from './file.js'

type ReadMode = 'text' | 'dataUrl' | 'arrayBuffer'

const readFile = <Result>(
  file: File,
  mode: ReadMode,
  extract: (reader: FileReader) => Result | null,
): Effect.Effect<Result, FileReadError> =>
  Effect.async<Result, FileReadError>((resume, signal) => {
    const reader = new FileReader()

    const handleLoad = () => {
      const extracted = extract(reader)
      if (extracted === null) {
        resume(
          Effect.fail(
            new FileReadError({
              reason: `FileReader returned an unexpected result type for mode "${mode}"`,
            }),
          ),
        )
      } else {
        resume(Effect.succeed(extracted))
      }
    }

    const handleError = () => {
      const reason = reader.error?.message ?? 'Unknown FileReader error'
      resume(Effect.fail(new FileReadError({ reason })))
    }

    reader.addEventListener('load', handleLoad)
    reader.addEventListener('error', handleError)
    signal.addEventListener('abort', () => {
      reader.abort()
    })

    try {
      if (mode === 'text') {
        reader.readAsText(file)
      } else if (mode === 'dataUrl') {
        reader.readAsDataURL(file)
      } else {
        reader.readAsArrayBuffer(file)
      }
    } catch (thrown) {
      const reason = thrown instanceof Error ? thrown.message : String(thrown)
      resume(Effect.fail(new FileReadError({ reason })))
    }
  })

/**
 * Reads the file's contents as a UTF-8 string. Mirrors Elm's `File.toString`.
 *
 * Fails with a `FileReadError` if the browser's `FileReader` encounters an
 * error (e.g. the file was deleted while reading). Handle failures with
 * `Effect.catchAll` to convert them into a failure Message.
 *
 * @example
 * ```typescript
 * ReadResumeText(
 *   File.readAsText(file).pipe(
 *     Effect.map(text => GotResumeText({ text })),
 *     Effect.catchAll(error => Effect.succeed(FailedReadResume({ error: error.reason }))),
 *   ),
 * )
 * ```
 */
export const readAsText = (file: File): Effect.Effect<string, FileReadError> =>
  readFile(file, 'text', reader =>
    typeof reader.result === 'string' ? reader.result : null,
  )

/**
 * Reads the file's contents as a base64-encoded data URL. Useful for rendering
 * image previews without uploading the file first. Mirrors Elm's `File.toUrl`.
 *
 * @example
 * ```typescript
 * ReadImagePreview(
 *   File.readAsDataUrl(imageFile).pipe(
 *     Effect.map(dataUrl => GotImagePreview({ dataUrl })),
 *     Effect.catchAll(error => Effect.succeed(FailedReadImage({ error: error.reason }))),
 *   ),
 * )
 * ```
 */
export const readAsDataUrl = (
  file: File,
): Effect.Effect<string, FileReadError> =>
  readFile(file, 'dataUrl', reader =>
    typeof reader.result === 'string' ? reader.result : null,
  )

/**
 * Reads the file's contents as raw binary data. Mirrors Elm's `File.toBytes`.
 *
 * Use this when you need the full binary payload (e.g. to upload, hash, or
 * parse a custom file format). For images you usually want `readAsDataUrl`
 * instead.
 *
 * @example
 * ```typescript
 * UploadFile(
 *   File.readAsArrayBuffer(file).pipe(
 *     Effect.flatMap(buffer => uploadToServer(buffer)),
 *     Effect.map(() => SucceededUpload()),
 *     Effect.catchAll(error => Effect.succeed(FailedUpload({ reason: String(error) }))),
 *   ),
 * )
 * ```
 */
export const readAsArrayBuffer = (
  file: File,
): Effect.Effect<ArrayBuffer, FileReadError> =>
  readFile(file, 'arrayBuffer', reader =>
    reader.result instanceof ArrayBuffer ? reader.result : null,
  )
