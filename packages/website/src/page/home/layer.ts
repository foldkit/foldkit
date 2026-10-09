import { Layer } from 'effect'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as NotePlayerDemo from './notePlayerDemo'
import * as HomeSubscription from './subscription'

export const layer = Layer.mergeAll(
  AsyncCounterDemo.layer,
  NotePlayerDemo.layer,
  HomeSubscription.layer,
)
