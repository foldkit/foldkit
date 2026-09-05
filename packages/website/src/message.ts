import { Schema } from 'effect'
import { Calendar } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Dialog, Menu } from '@foldkit/ui'

import {
  ApiReference,
  ComingFromReact,
  Core,
  Example,
  Home,
  Playground,
  Ui,
} from './page'
import * as Search from './search'
import { GroupKey, SidebarState } from './sidebarStorage'
import * as SnippetCopy from './snippetCopy'

// THEME

export const ThemePreference = Schema.Literals(['Dark', 'Light', 'System'])
export type ThemePreference = typeof ThemePreference.Type

export const ResolvedTheme = Schema.Literals(['Dark', 'Light'])
export type ResolvedTheme = typeof ResolvedTheme.Type

// MESSAGE

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
    isNarrowViewport: Schema.Boolean,
    isChromium: Schema.Boolean,
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
  GotThemeMenuMessage: { message: Menu.Message },
  ChangedSystemTheme: { theme: ResolvedTheme },
  ChangedViewportWidth: { isNarrow: Schema.Boolean },
  GotHomeMessage: { message: Home.Message },
  GotSnippetCopyMessage: { message: SnippetCopy.Message },
  GotCoreSubmodelPageMessage: { message: Core.SubmodelPage.Message },
  GotPlaygroundMessage: { message: Playground.Message },
  GotComingFromReactMessage: { message: ComingFromReact.Message },
  GotApiReferenceMessage: { message: ApiReference.Message },
  GotUiPageMessage: { message: Ui.Message },
  ToggledSidebarGroup: { key: GroupKey, isOpen: Schema.Boolean },
  GotExampleDetailMessage: { message: Example.ExampleDetail.Message },
  GotSearchMessage: { message: Search.Message },
})
export type Message = typeof Message.Type
