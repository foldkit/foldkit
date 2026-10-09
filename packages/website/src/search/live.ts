import { Layer } from 'effect'

import {
  FetchSearchResultsLive,
  FocusSearchInputLive,
  NavigateToResultLive,
  ScrollToResultLive,
} from './update'

export const Live = Layer.mergeAll(
  FetchSearchResultsLive,
  FocusSearchInputLive,
  NavigateToResultLive,
  ScrollToResultLive,
)
