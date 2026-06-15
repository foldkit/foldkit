import { Toast as UiToast } from '@foldkit/ui'
import { Schema as S } from 'effect'

/** Payload shape for the showcase's toast stack. Consumer decides what goes
 *  in each entry; the Toast component owns only lifecycle and a11y. */
export const ToastPayload = S.Struct({
  title: S.String,
  maybeDescription: S.Option(S.String),
})
export type ToastPayload = typeof ToastPayload.Type

export const Toast = UiToast.make(ToastPayload)
