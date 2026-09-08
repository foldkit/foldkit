import { defineMessageUnion } from 'foldkit/message'

import { Message as ChildMessage } from './child'

const Message = defineMessageUnion({
  OpenedChild: {},
  ChildChanged: { message: ChildMessage, },
})
