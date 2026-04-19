import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { UrlRequest } from 'foldkit/runtime'
import { Url } from 'foldkit/url'

import * as Page from './page'
import { ExampleSlug } from './page/example/meta'
import * as Search from './search'

// THEME

export const ThemePreference = S.Literal('Dark', 'Light', 'System')
export type ThemePreference = typeof ThemePreference.Type

export const ResolvedTheme = S.Literal('Dark', 'Light')
export type ResolvedTheme = typeof ResolvedTheme.Type

// MESSAGE

export const CompletedNavigateInternal = m('CompletedNavigateInternal')
export const CompletedLoadExternal = m('CompletedLoadExternal')
export const CompletedOpenUrl = m('CompletedOpenUrl')
export const CompletedInjectAnalytics = m('CompletedInjectAnalytics')
export const CompletedInjectSpeedInsights = m('CompletedInjectSpeedInsights')
export const CompletedScroll = m('CompletedScroll')
export const CompletedApplyTheme = m('CompletedApplyTheme')
export const CompletedSaveThemePreference = m('CompletedSaveThemePreference')
export const SucceededCopyLink = m('SucceededCopyLink')
export const FailedCopy = m('FailedCopy')
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
export const SucceededCopy = m('SucceededCopy', { text: S.String })
export const HiddenCopiedIndicator = m('HiddenCopiedIndicator', {
  text: S.String,
})
export const UpdatedEmailField = m('UpdatedEmailField', { value: S.String })
export const SubmittedEmailForm = m('SubmittedEmailForm')
export const SucceededSubscribeEmail = m('SucceededSubscribeEmail')
export const FailedSubscribeEmail = m('FailedSubscribeEmail')
export const GotMobileMenuDialogMessage = m('GotMobileMenuDialogMessage', {
  message: Ui.Dialog.Message,
})
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
export const ChangedHeroVisibility = m('ChangedHeroVisibility', {
  isVisible: S.Boolean,
})
export const ChangedViewportWidth = m('ChangedViewportWidth', {
  isNarrow: S.Boolean,
})
export const ToggledAiHeading = m('ToggledAiHeading')
export const GotDemoTabsMessage = m('GotDemoTabsMessage', {
  message: Ui.Tabs.Message,
})
export const GotPlaygroundMenuMessage = m('GotPlaygroundMenuMessage', {
  message: Ui.Menu.Message,
})
export const SelectedPlaygroundExample = m('SelectedPlaygroundExample', {
  slug: ExampleSlug,
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
export const GotGetStartedGroupMessage = m('GotGetStartedGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotCoreConceptsGroupMessage = m('GotCoreConceptsGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotGuidesGroupMessage = m('GotGuidesGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotTestingGroupMessage = m('GotTestingGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotBestPracticesGroupMessage = m('GotBestPracticesGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotPatternsGroupMessage = m('GotPatternsGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotFoldkitUiGroupMessage = m('GotFoldkitUiGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotAiGroupMessage = m('GotAiGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotExamplesGroupMessage = m('GotExamplesGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotApiReferenceGroupMessage = m('GotApiReferenceGroupMessage', {
  message: Ui.Disclosure.Message,
})
export const GotExampleDetailMessage = m('GotExampleDetailMessage', {
  message: Page.Example.ExampleDetail.Message,
})
export const GotSearchMessage = m('GotSearchMessage', {
  message: Search.Message,
})

export const Message = S.Union(
  CompletedNavigateInternal,
  CompletedLoadExternal,
  CompletedOpenUrl,
  CompletedInjectAnalytics,
  CompletedInjectSpeedInsights,
  CompletedScroll,
  CompletedApplyTheme,
  CompletedSaveThemePreference,
  SucceededCopyLink,
  FailedCopy,
  ClickedLink,
  ChangedUrl,
  ClickedCopySnippet,
  ClickedCopyLink,
  SucceededCopy,
  HiddenCopiedIndicator,
  UpdatedEmailField,
  SubmittedEmailForm,
  SucceededSubscribeEmail,
  FailedSubscribeEmail,
  GotMobileMenuDialogMessage,
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
  SelectedPlaygroundExample,
  GotAsyncCounterDemoMessage,
  GotNotePlayerDemoMessage,
  GotUiPageMessage,
  GotComingFromReactMessage,
  GotApiReferenceMessage,
  GotGetStartedGroupMessage,
  GotCoreConceptsGroupMessage,
  GotGuidesGroupMessage,
  GotTestingGroupMessage,
  GotBestPracticesGroupMessage,
  GotPatternsGroupMessage,
  GotFoldkitUiGroupMessage,
  GotAiGroupMessage,
  GotExamplesGroupMessage,
  GotApiReferenceGroupMessage,
  GotExampleDetailMessage,
  GotSearchMessage,
)
export type Message = typeof Message.Type
