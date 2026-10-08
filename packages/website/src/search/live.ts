import { Layer } from 'effect'

import { PagefindService } from './pagefind'
import {
  FetchSearchResultsLive,
  FocusSearchInputLive,
  NavigateToResultLive,
  ScrollToResultLive,
} from './update'

export const Live = Layer.provide(
  Layer.mergeAll(
    FetchSearchResultsLive,
    FocusSearchInputLive,
    NavigateToResultLive,
    ScrollToResultLive,
  ),
  PagefindService.Default,
)
