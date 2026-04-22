import { Schema as S } from 'effect'
import { Ui } from 'foldkit'

/** Payload shape for the showcase's toast stack. Consumer decides what goes
 *  in each entry; the Toast component owns only lifecycle and a11y. */
export const ToastPayload = S.Struct({
  title: S.String,
  maybeDescription: S.OptionFromSelf(S.String),
})
export type ToastPayload = typeof ToastPayload.Type

export const Toast = Ui.Toast.make(ToastPayload)
