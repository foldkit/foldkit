import { Layer as EffectLayer } from 'effect'

import * as ActiveSection from './activeSection'
import * as SearchShortcut from './searchShortcut'
import * as SystemTheme from './systemTheme'
import * as ViewportWidth from './viewportWidth'

export const Layer = EffectLayer.mergeAll(
  ActiveSection.Layer,
  SearchShortcut.Layer,
  SystemTheme.Layer,
  ViewportWidth.Layer,
)
