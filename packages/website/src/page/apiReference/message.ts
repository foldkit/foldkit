import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { ApiData } from './model'

export const StartedLoadApiData = m('StartedLoadApiData')
export const SucceededLoadApiData = m('SucceededLoadApiData', {
  apiData: ApiData,
})
export const FailedLoadApiData = m('FailedLoadApiData', {
  error: S.String,
})
export const GotDisclosureMessage = m('GotDisclosureMessage', {
  id: S.String,
  message: Ui.Disclosure.Message,
})

export const Message = S.Union(
  StartedLoadApiData,
  SucceededLoadApiData,
  FailedLoadApiData,
  GotDisclosureMessage,
)
export type Message = typeof Message.Type
