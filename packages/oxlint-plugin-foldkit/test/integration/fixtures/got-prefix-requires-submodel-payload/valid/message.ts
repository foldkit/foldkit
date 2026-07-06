import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import * as Child from './child'

export const ReceivedWeather = m('ReceivedWeather', {
  temperature: S.Number,
})

export const GotChildMessage = m('GotChildMessage', {
  id: S.String,
  message: Child.Message,
})
