import { Schema } from 'effect'

import { makeBlock as makeToastBlock } from '@foldkit/ui/toast'

/** Payload shape for the website's toast demo. Consumer decides what goes in
 *  each entry; the Toast component owns only lifecycle and a11y. */
export const ToastPayload = Schema.Struct({
  title: Schema.String,
  maybeDescription: Schema.Option(Schema.String),
})
export type ToastPayload = typeof ToastPayload.Type

export const ToastBlock = makeToastBlock(ToastPayload)
