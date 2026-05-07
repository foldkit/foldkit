import { Data } from 'effect'

/** Error indicating that a DOM element matching the given selector was not found. */
export class ElementNotFound extends Data.TaggedError('ElementNotFound')<{
  readonly selector: string
}> {}
