import { Layer } from 'effect'

import { FocusSearchInput } from './command'
import { FetchSearchResults, NavigateToResult, ScrollToResult } from './update'

export const EffectsLayer = Layer.mergeAll(
  FetchSearchResults.layer,
  FocusSearchInput.layer,
  NavigateToResult.layer,
  ScrollToResult.layer,
)
