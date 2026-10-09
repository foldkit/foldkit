import { Layer as EffectLayer } from 'effect'

import {
  FetchSearchResultsLayer,
  FocusSearchInputLayer,
  NavigateToResultLayer,
  ScrollToResultLayer,
} from './update'

export const Layer = EffectLayer.mergeAll(
  FetchSearchResultsLayer,
  FocusSearchInputLayer,
  NavigateToResultLayer,
  ScrollToResultLayer,
)
