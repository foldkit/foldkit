import { Layer } from 'effect'

import {
  LoadCatalog,
  LoadExternal,
  LoadPainting,
  NavigateInternal,
  SaveDraft,
} from './command'

export const EffectsLayer = Layer.mergeAll(
  NavigateInternal.layer,
  LoadExternal.layer,
  LoadCatalog.layer,
  LoadPainting.layer,
  SaveDraft.layer,
)
