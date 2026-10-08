import { Layer } from 'effect'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as NotePlayerDemo from './notePlayerDemo'
import * as HomeSubscription from './subscription'

export const Live = Layer.mergeAll(
  AsyncCounterDemo.Live,
  NotePlayerDemo.Live,
  HomeSubscription.Live,
)
