import { Data } from 'effect'

/** Error raised when a `FileReader` operation fails. */
export class FileReadError extends Data.TaggedError('FileReadError')<{
  readonly reason: string
}> {}
