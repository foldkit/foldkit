import { Layer } from 'effect'

import * as ActiveSection from './activeSection'
import * as SearchShortcut from './searchShortcut'
import * as SystemTheme from './systemTheme'
import * as ViewportWidth from './viewportWidth'

export const Live = Layer.mergeAll(
  ActiveSection.Live,
  SearchShortcut.Live,
  SystemTheme.Live,
  ViewportWidth.Live,
)
