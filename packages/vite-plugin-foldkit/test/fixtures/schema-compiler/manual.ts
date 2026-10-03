import 'virtual:foldkit/schema-compiler'
import { Schema } from 'effect'

import { User } from './schema.ts'

Object.assign(globalThis, {
  manuallyDecodedUser: Schema.decodeUnknownSync(User)({ name: 'Ada', age: 36 }),
})
