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
export const ToggledSignatureDisclosure = m('ToggledSignatureDisclosure', {
  id: S.String,
  isOpen: S.Boolean,
})

export const Message = S.Union([
  RequestedApiData,
  SucceededLoadApiData,
  FailedLoadApiData,
  ToggledSignatureDisclosure,
])
export type Message = typeof Message.Type
