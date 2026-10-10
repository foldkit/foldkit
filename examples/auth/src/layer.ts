import { Layer } from 'effect'

import { BrowserKeyValueStore } from '@effect/platform-browser'

import {
  ClearSession,
  LoadExternal,
  LogError,
  NavigateInternal,
  RedirectToDashboard,
  RedirectToHome,
  RedirectToLogin,
  SaveSession,
} from './command'
import { LoggedOut } from './page'

export const EffectsLayer = Layer.mergeAll(
  SaveSession.layer,
  ClearSession.layer,
  LogError.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
  RedirectToLogin.layer,
  RedirectToDashboard.layer,
  RedirectToHome.layer,
  LoggedOut.EffectsLayer,
)

export const AppLayer = Layer.provideMerge(
  EffectsLayer,
  BrowserKeyValueStore.layerLocalStorage,
)
