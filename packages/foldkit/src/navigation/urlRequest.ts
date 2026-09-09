import { Schema } from 'effect'

import { defineTaggedUnion } from '../schema/index.js'
import { Url } from '../url/index.js'

/** Union of `Internal` and `External` URL request types. */
export const UrlRequest = defineTaggedUnion({
  Internal: { url: Url },
  External: { href: Schema.String },
})
/** Union of `Internal` and `External` URL request types. */
export type UrlRequest = typeof UrlRequest.Type
