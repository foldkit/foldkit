import { Layer } from 'effect'

import {
  FetchSearchResultsLayer,
  FocusSearchInputLayer,
  NavigateToResultLayer,
  ScrollToResultLayer,
} from './update'

export const EffectsLayer = Layer.mergeAll(
  FetchSearchResultsLayer,
  FocusSearchInputLayer,
  NavigateToResultLayer,
  ScrollToResultLayer,
)
