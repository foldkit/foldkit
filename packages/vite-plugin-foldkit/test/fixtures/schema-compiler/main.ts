import { Schema } from 'effect'

import { User } from './schema.ts'

Object.assign(globalThis, {
  decodedUser: Schema.decodeUnknownSync(User)({ name: 'Ada', age: 36 }),
})
