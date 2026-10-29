import { Schema } from 'effect'
import { Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { ResolvedTheme } from './colorScheme'
import { GroupKey, SidebarState } from './sidebarStorage'
import { ThemePreference } from './themePreference'

// THEME

export { ResolvedTheme } from './colorScheme'
export { ThemePreference } from './themePreference'

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  CompletedLoadPlayground: {},
  CompletedInjectAnalytics: {},
  CompletedInjectSpeedInsights: {},
  CompletedScrollToTop: {},
  CompletedScrollToAnchor: {},
  CompletedApplyTheme: {},
  CompletedSaveThemePreference: {},
  CompletedSaveSidebarState: {},
  CompletedLoadBrowserEnvironment: {
    maybeThemePreference: Schema.Option(ThemePreference),
    maybeSidebarState: Schema.Option(SidebarState),
    systemTheme: ResolvedTheme,
    isPlaygroundSupported: Schema.Boolean,
    currentYear: Schema.Number,
    today: Calendar.CalendarDate,
  },
  CompletedScrollSidebarActiveLinkIntoView: {},
  CompletedScrollMobileMenuActiveLinkIntoView: {},
  SucceededCopyLink: {},
  FailedCopyLink: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  ClickedCopyLink: { hash: Schema.String },
  ClickedOpenMobileMenu: {},
  ClickedOpenSearch: {},
  PressedSearchShortcut: {},
  ToggledMobileTableOfContents: { isOpen: Schema.Boolean },
  ClickedMobileTableOfContentsLink: { sectionId: Schema.String },
  ChangedActiveSection: { sectionId: Schema.String },
  UpdatedNewsletterEmail: { value: Schema.String },
  ChangedSystemTheme: { theme: ResolvedTheme },
  ChangedViewportWidth: { isNarrow: Schema.Boolean },
  ToggledSidebarGroup: { key: GroupKey, isOpen: Schema.Boolean },
})
export type Message = typeof Message.Type
