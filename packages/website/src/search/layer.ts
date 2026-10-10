import { Layer } from 'effect'

import {
  FetchSearchResults,
  FocusSearchInput,
  NavigateToResult,
  ScrollToResult,
} from './update'

export const EffectsLayer = Layer.mergeAll(
  FetchSearchResults.layer,
  FocusSearchInput.layer,
  NavigateToResult.layer,
  ScrollToResult.layer,
)
