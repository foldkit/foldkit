import { Layer } from 'effect'

import {
  FetchSearchResultsLayer,
  FocusSearchInputLayer,
  NavigateToResultLayer,
  ScrollToResultLayer,
} from './update'

export const layer = Layer.mergeAll(
  FetchSearchResultsLayer,
  FocusSearchInputLayer,
  NavigateToResultLayer,
  ScrollToResultLayer,
)
