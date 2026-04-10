import { Schema as S } from 'effect'

/**
 * A file selected by the user. Direct alias for the browser's native `File`
 * type — opaque by convention (Foldkit never constructs files itself, only
 * receives them from `File.select`, `File.selectMultiple`, or from
 * `OnFileChange`/`OnDropFiles` event attributes).
 */
export type File = globalThis.File

/**
 * Schema that accepts any value that is an instance of the DOM `File` class.
 * Use in Model fields that hold user-selected files:
 *
 * ```ts
 * attachedResume: S.OptionFromSelf(File.File)
 * ```
 */
export const File: S.Schema<File> = S.instanceOf(globalThis.File)

/** The file's name including extension, as reported by the browser. */
export const name = (file: File): string => file.name

/** The file's size in bytes. */
export const size = (file: File): number => file.size

/** The file's MIME type (e.g. `"application/pdf"`), or empty string if the browser cannot determine one. */
export const mimeType = (file: File): string => file.type
