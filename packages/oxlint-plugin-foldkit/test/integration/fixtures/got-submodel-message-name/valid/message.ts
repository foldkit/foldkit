import { m } from 'foldkit/message'

import * as Child from './child'

export const OpenedChild = m('OpenedChild')
export const GotChildMessage = m('GotChildMessage', {
  message: Child.Message,
})
