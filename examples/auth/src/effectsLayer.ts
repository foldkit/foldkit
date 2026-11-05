import { Layer } from 'effect'

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

export const EffectsLayer = Layer.mergeAll(
  SaveSession.layer,
  ClearSession.layer,
  LogError.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
  RedirectToLogin.layer,
  RedirectToDashboard.layer,
  RedirectToHome.layer,
)
