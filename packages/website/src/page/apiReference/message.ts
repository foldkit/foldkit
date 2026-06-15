import { Disclosure } from '@foldkit/ui'
import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import { ApiData } from './model'

export const RequestedApiData = m('RequestedApiData')
export const SucceededLoadApiData = m('SucceededLoadApiData', {
  apiData: ApiData,
})
export const FailedLoadApiData = m('FailedLoadApiData', {
  error: S.String,
})
export const GotDisclosureMessage = m('GotDisclosureMessage', {
  id: S.String,
  message: Disclosure.Message,
})

export const Message = S.Union([
  RequestedApiData,
  SucceededLoadApiData,
  FailedLoadApiData,
  GotDisclosureMessage,
])
export type Message = typeof Message.Type
