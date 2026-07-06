import { Effect } from 'effect'
import { Mount } from 'foldkit'

import { CompletedMountResize } from './message'

export const MountResize = Mount.define(
  'MountResize',
  {},
  CompletedMountResize,
)(() => element => Effect.sync(() => resizeObserver.observe(element)))
