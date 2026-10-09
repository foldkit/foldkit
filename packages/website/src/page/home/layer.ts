import { Layer as EffectLayer } from 'effect'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as NotePlayerDemo from './notePlayerDemo'
import * as HomeSubscription from './subscription'

export const Layer = EffectLayer.mergeAll(
  AsyncCounterDemo.Layer,
  NotePlayerDemo.Layer,
  HomeSubscription.Layer,
)
