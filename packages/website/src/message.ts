import { Schema as S } from 'effect'
import { m } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

import { Dialog, Menu, Tabs } from '@foldkit/ui'

import * as Page from './page'
import * as Search from './search'
import { GroupKey } from './sidebarStorage'

// THEME

export const ThemePreference = S.Literals(['Dark', 'Light', 'System'])
export type ThemePreference = typeof ThemePreference.Type

export const ResolvedTheme = S.Literals(['Dark', 'Light'])
export type ResolvedTheme = typeof ResolvedTheme.Type

// MESSAGE

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const CompletedInjectAnalytics = m('CompletedInjectAnalytics')
export const CompletedInjectSpeedInsights = m('CompletedInjectSpeedInsights')
export const CompletedScrollToTop = m('CompletedScrollToTop')
export const CompletedScrollToAnchor = m('CompletedScrollToAnchor')
export const CompletedApplyTheme = m('CompletedApplyTheme')
export const CompletedSaveThemePreference = m('CompletedSaveThemePreference')
export const CompletedSaveSidebarState = m('CompletedSaveSidebarState')
export const CompletedScrollSidebarActiveLinkIntoView = m(
  'CompletedScrollSidebarActiveLinkIntoView',
)
export const CompletedScrollMobileMenuActiveLinkIntoView = m(
  'CompletedScrollMobileMenuActiveLinkIntoView',
)
export const SucceededCopyLink = m('SucceededCopyLink')
export const FailedCopyLink = m('FailedCopyLink')
export const ClickedLink = m('ClickedLink', {
  request: UrlRequest,
})
export const ChangedUrl = m('ChangedUrl', { url: Url })
export const ClickedCopySnippet = m('ClickedCopySnippet', {
  text: S.String,
})
export const ClickedCopyLink = m('ClickedCopyLink', {
  hash: S.String,
})
export const SucceededCopySnippet = m('SucceededCopySnippet', {
  text: S.String,
})
export const FailedCopySnippet = m('FailedCopySnippet')
export const HidCopiedIndicator = m('HidCopiedIndicator', {
  text: S.String,
})
export const UpdatedEmailField = m('UpdatedEmailField', { value: S.String })
export const SubmittedEmailForm = m('SubmittedEmailForm')
export const SucceededSubscribeToNewsletter = m(
  'SucceededSubscribeToNewsletter',
)
export const FailedSubscribeToNewsletter = m('FailedSubscribeToNewsletter')
export const SucceededFetchGitHubStars = m('SucceededFetchGitHubStars', {
  count: S.Number,
})
export const FailedFetchGitHubStars = m('FailedFetchGitHubStars', {
  error: S.String,
})
export const GotMobileMenuDialogMessage = m('GotMobileMenuDialogMessage', {
  message: Dialog.Message,
})
export const ClickedOpenMobileMenu = m('ClickedOpenMobileMenu')
export const ToggledMobileTableOfContents = m('ToggledMobileTableOfContents', {
  isOpen: S.Boolean,
})
export const ClickedMobileTableOfContentsLink = m(
  'ClickedMobileTableOfContentsLink',
  {
    sectionId: S.String,
  },
)
export const ChangedActiveSection = m('ChangedActiveSection', {
  sectionId: S.String,
})
export const SelectedThemePreference = m('SelectedThemePreference', {
  preference: ThemePreference,
})
export const ChangedSystemTheme = m('ChangedSystemTheme', {
  theme: ResolvedTheme,
})
export const { ChangedHeroVisibility } = Page.Landing
export const ChangedViewportWidth = m('ChangedViewportWidth', {
  isNarrow: S.Boolean,
})
export const ToggledAiHeading = m('ToggledAiHeading')
export const GotDemoTabsMessage = m('GotDemoTabsMessage', {
  message: Tabs.Message,
})
export const GotPlaygroundMenuMessage = m('GotPlaygroundMenuMessage', {
  message: Menu.Message,
})
export const GotPlaygroundMessage = m('GotPlaygroundMessage', {
  message: Page.Playground.Message,
})
export const GotAsyncCounterDemoMessage = m('GotAsyncCounterDemoMessage', {
  message: Page.AsyncCounterDemo.Message,
})
export const GotNotePlayerDemoMessage = m('GotNotePlayerDemoMessage', {
  message: Page.NotePlayerDemo.Message,
})
export const GotComingFromReactMessage = m('GotComingFromReactMessage', {
  message: Page.ComingFromReact.Message,
})
export const GotApiReferenceMessage = m('GotApiReferenceMessage', {
  message: Page.ApiReference.Message,
})
export const GotUiPageMessage = m('GotUiPageMessage', {
  message: Page.UiPages.Message,
})
export const ToggledSidebarGroup = m('ToggledSidebarGroup', {
  key: GroupKey,
  isOpen: S.Boolean,
})
export const GotExampleDetailMessage = m('GotExampleDetailMessage', {
  message: Page.Example.ExampleDetail.Message,
})
export const GotSearchMessage = m('GotSearchMessage', {
  message: Search.Message,
})
export const ToggledMapMessagesUnderHood = m('ToggledMapMessagesUnderHood', {
  isOpen: S.Boolean,
})

export const Message = S.Union([
  CompletedNavigateInternal,
  CompletedLoadExternal,
  CompletedInjectAnalytics,
  CompletedInjectSpeedInsights,
  CompletedScrollToTop,
  CompletedScrollToAnchor,
  CompletedApplyTheme,
  CompletedSaveThemePreference,
  CompletedSaveSidebarState,
  CompletedScrollSidebarActiveLinkIntoView,
  CompletedScrollMobileMenuActiveLinkIntoView,
  SucceededCopyLink,
  FailedCopyLink,
  ClickedLink,
  ChangedUrl,
  ClickedCopySnippet,
  ClickedCopyLink,
  SucceededCopySnippet,
  FailedCopySnippet,
  HidCopiedIndicator,
  UpdatedEmailField,
  SubmittedEmailForm,
  SucceededSubscribeToNewsletter,
  FailedSubscribeToNewsletter,
  SucceededFetchGitHubStars,
  FailedFetchGitHubStars,
  GotMobileMenuDialogMessage,
  ClickedOpenMobileMenu,
  ToggledMobileTableOfContents,
  ClickedMobileTableOfContentsLink,
  ChangedActiveSection,
  SelectedThemePreference,
  ChangedSystemTheme,
  ChangedHeroVisibility,
  ChangedViewportWidth,
  ToggledAiHeading,
  GotDemoTabsMessage,
  GotPlaygroundMenuMessage,
  GotPlaygroundMessage,
  GotAsyncCounterDemoMessage,
  GotNotePlayerDemoMessage,
  GotUiPageMessage,
  GotComingFromReactMessage,
  GotApiReferenceMessage,
  ToggledSidebarGroup,
  GotExampleDetailMessage,
  GotSearchMessage,
  ToggledMapMessagesUnderHood,
])
export type Message = typeof Message.Type
