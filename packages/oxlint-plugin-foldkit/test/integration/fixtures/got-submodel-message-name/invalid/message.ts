import { m } from 'foldkit/message'

import * as Child from './child'

export const OpenedChild = m('OpenedChild')
export const ChildChanged = m('ChildChanged', {
  message: Child.Message,
})
