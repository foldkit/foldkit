import { Subscription } from 'foldkit'

import * as ActiveSection from './activeSection'
import * as SearchShortcut from './searchShortcut'
import * as SystemTheme from './systemTheme'
import * as ViewportWidth from './viewportWidth'

export const subscriptions = Subscription.aggregate(
  ActiveSection.subscriptions,
  SearchShortcut.subscriptions,
  SystemTheme.subscriptions,
  ViewportWidth.subscriptions,
)
