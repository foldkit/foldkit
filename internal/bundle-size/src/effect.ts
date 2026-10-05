import { Schema } from 'effect'

const Payload = Schema.Struct({ count: Schema.Number })
const payload = Schema.decodeUnknownSync(Payload)({ count: 1 })

document.body.textContent = globalThis.String(payload.count)
