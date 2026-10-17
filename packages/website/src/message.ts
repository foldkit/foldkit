import { Schema } from 'effect'
import { Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Dialog } from '@foldkit/ui'

import { ResolvedTheme } from './colorScheme'
import {
  ApiReference,
  ComingFromReact,
  CoreBlockPage,
  ExampleDetail,
  Home,
  Playground,
  Ui,
} from './page'
import * as Search from './search'
import { GroupKey, SidebarState } from './sidebarStorage'
import * as SnippetCopy from './snippetCopy'
import * as SnippetDisclosure from './snippetDisclosure'
import { ThemePreference } from './themePreference'
import { ThemeMenu } from './view/themeMenu'

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
  GotMobileMenuDialogMessage: { message: Dialog.Message },
  ClickedOpenMobileMenu: {},
  ClickedOpenSearch: {},
  PressedSearchShortcut: {},
  ToggledMobileTableOfContents: { isOpen: Schema.Boolean },
  ClickedMobileTableOfContentsLink: { sectionId: Schema.String },
  ChangedActiveSection: { sectionId: Schema.String },
  GotThemeMenuMessage: { message: ThemeMenu.Message },
  ChangedSystemTheme: { theme: ResolvedTheme },
  ChangedViewportWidth: { isNarrow: Schema.Boolean },
  GotHomeMessage: { message: Home.Message },
  GotSnippetCopyMessage: { message: SnippetCopy.Message },
  GotSnippetDisclosureMessage: { message: SnippetDisclosure.Message },
  GotCoreBlockPageMessage: { message: CoreBlockPage.Message },
  GotPlaygroundMessage: { message: Playground.Message },
  GotComingFromReactMessage: { message: ComingFromReact.Message },
  GotApiReferenceMessage: { message: ApiReference.Message },
  GotUiPageMessage: { message: Ui.Message },
  ToggledSidebarGroup: { key: GroupKey, isOpen: Schema.Boolean },
  GotExampleDetailMessage: { message: ExampleDetail.Message },
  GotSearchMessage: { message: Search.Message },
})
export type Message = typeof Message.Type
