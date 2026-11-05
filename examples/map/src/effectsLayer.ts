import { Layer } from 'effect'

import {
  FlyTo,
  FocusSearchInput,
  Geolocate,
  LockBodyScroll,
  UnlockBodyScroll,
} from './command'
import { MountMap } from './mount'

export const EffectsLayer = Layer.mergeAll(
  FlyTo.layer,
  Geolocate.layer,
  FocusSearchInput.layer,
  LockBodyScroll.layer,
  UnlockBodyScroll.layer,
  MountMap.layer,
)
