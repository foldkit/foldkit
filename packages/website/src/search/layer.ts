import { Layer } from 'effect'

import { Dialog } from '@foldkit/ui'

import {
  FetchSearchResults,
  FocusSearchInput,
  NavigateToResult,
  ScrollToResult,
} from './update'

export const EffectsLayer = Layer.mergeAll(
  Dialog.EffectsLayer,
  FetchSearchResults.layer,
  FocusSearchInput.layer,
  NavigateToResult.layer,
  ScrollToResult.layer,
)

export const mounts = Dialog.mounts
