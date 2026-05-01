import { Schema as S } from 'effect'
import { Ui } from 'foldkit'

/** Payload shape for the website's toast demo. Consumer decides what goes in
 *  each entry; the Toast component owns only lifecycle and a11y. */
export const ToastPayload = S.Struct({
  title: S.String,
  maybeDescription: S.Option(S.String),
})
export type ToastPayload = typeof ToastPayload.Type

export const Toast = Ui.Toast.make(ToastPayload)
