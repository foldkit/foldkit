import { Layer } from 'effect'

import {
  CopyLink,
  InjectAnalytics,
  InjectSpeedInsights,
  LoadBrowserEnvironment,
  LoadExternal,
  LoadPlayground,
  NavigateInternal,
  SaveSidebarState,
  ScrollMobileMenuActiveLinkIntoView,
  ScrollSidebarActiveLinkIntoView,
  ScrollToAnchor,
  ScrollToTop,
} from './command'
import { subscriptions } from './subscription'
import { ApplyTheme, SaveThemePreference } from './theme'

export const EffectsLayer = Layer.mergeAll(
  InjectAnalytics.layer,
  LoadBrowserEnvironment.layer,
  InjectSpeedInsights.layer,
  ScrollToTop.layer,
  ScrollToAnchor.layer,
  ScrollSidebarActiveLinkIntoView.layer,
  ScrollMobileMenuActiveLinkIntoView.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
  LoadPlayground.layer,
  ApplyTheme.layer,
  SaveThemePreference.layer,
  SaveSidebarState.layer,
  CopyLink.layer,
  subscriptions.layer,
)
