import { Schema } from 'effect'

import { Toast as UiToast } from '@foldkit/ui'

/** Payload shape for the website's toast demo. Consumer decides what goes in
 *  each entry; the Toast component owns only lifecycle and a11y. */
export const ToastPayload = Schema.Struct({
  title: Schema.String,
  maybeDescription: Schema.Option(Schema.String),
})
export type ToastPayload = typeof ToastPayload.Type

export const Toast = UiToast.make(ToastPayload)
