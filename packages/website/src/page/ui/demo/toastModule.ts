import { Schema } from 'effect'

import { Toast } from '@foldkit/ui'

export const ToastPayload = Schema.Struct({
  title: Schema.String,
  maybeDescription: Schema.Option(Schema.String),
})
export type ToastPayload = typeof ToastPayload.Type

export const DemoToast = Toast.makeBlock(ToastPayload)
