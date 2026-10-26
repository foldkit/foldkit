import { Layer } from 'effect'

import * as ActiveSection from './activeSection'
import * as SearchShortcut from './searchShortcut'
import * as SystemTheme from './systemTheme'
import * as ViewportWidth from './viewportWidth'

export const EffectsLayer = Layer.mergeAll(
  ActiveSection.subscriptions.layer,
  SearchShortcut.subscriptions.layer,
  SystemTheme.subscriptions.layer,
  ViewportWidth.subscriptions.layer,
)
