import { Layer } from 'effect'

import * as AsyncCounterDemo from './asyncCounterDemo'
import * as NotePlayerDemo from './notePlayerDemo'
import * as HomeSubscription from './subscription'

export const EffectsLayer = Layer.mergeAll(
  AsyncCounterDemo.EffectsLayer,
  NotePlayerDemo.EffectsLayer,
  HomeSubscription.EffectsLayer,
)
