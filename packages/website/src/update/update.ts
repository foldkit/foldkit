import { Option, Record } from 'effect'
import { Update } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { toString as urlToString } from 'foldkit/url'

import * as Command from '../command'
import {
  ApplicationComposition,
  MobileMenuDialogBinding,
  SearchBinding,
} from '../composition'
import { ApplicationDefinition } from '../definition'
import { isPlaygroundRoute, urlToApplicationRoute } from '../route'
import { ApplyTheme, resolveTheme } from '../theme'
import { handleChangedUrl } from './handleChangedUrl'
import { handleCompletedLoadBrowserEnvironment } from './handleCompletedLoadBrowserEnvironment'

export const update = ApplicationComposition.makeUpdate({
  ClickedLink: ApplicationDefinition.makeCommandsStep.fromMessage(
    ({ request }) =>
      UrlRequest.match(request, {
        Internal: ({ url }) => {
          // NOTE: WebContainer requires `window.crossOriginIsolated`,
          // which only becomes true when the document is loaded with
          // the COEP/COOP response headers set in deploy-website.yml
          // and vite.config.ts. SPA navigation reuses the previous
          // page's document (no headers), so we navigate to playground
          // URLs by loading a fresh document instead.
          if (isPlaygroundRoute(urlToApplicationRoute(url))) {
            return [Command.LoadExternal({ href: urlToString(url) })]
          }

          return [Command.NavigateInternal({ url: urlToString(url) })]
        },
        External: ({ href }) => [Command.LoadExternal({ href })],
      }),
  ),

  ChangedUrl: handleChangedUrl,

  ClickedCopyLink: ApplicationDefinition.makeCommandsStep((model, { hash }) => [
    Command.CopyLink({
      url: urlToString(
        modifyFields(model.url, { hash: () => Option.some(hash) }),
      ),
    }),
  ]),

  ClickedOpenMobileMenu: Update.combineSteps([
    MobileMenuDialogBinding.requestOpen(),
    ApplicationDefinition.makeCommandsStep(() => [
      Command.ScrollMobileMenuActiveLinkIntoView(),
    ]),
  ]),

  ClickedOpenSearch: SearchBinding.requestOpen(),

  PressedSearchShortcut: SearchBinding.requestOpen(),

  ToggledMobileTableOfContents:
    ApplicationDefinition.makeFieldsStep.fromMessage(({ isOpen }) => ({
      isMobileTableOfContentsOpen: () => isOpen,
    })),

  ClickedMobileTableOfContentsLink:
    ApplicationDefinition.makeFieldsStep.fromMessage(({ sectionId }) => ({
      isMobileTableOfContentsOpen: () => false,
      activeSection: () => Option.some(sectionId),
    })),

  ChangedActiveSection: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ sectionId }) => ({
      activeSection: () => Option.some(sectionId),
    }),
  ),

  UpdatedNewsletterEmail: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({ newsletterEmail: () => value }),
  ),

  ChangedViewportWidth: ApplicationDefinition.makeFieldsStep.fromMessage(
    ({ isNarrow }) => ({ isNarrowViewport: () => isNarrow }),
  ),

  CompletedLoadBrowserEnvironment: handleCompletedLoadBrowserEnvironment,

  ChangedSystemTheme: (model, { theme }) => {
    const resolvedTheme = resolveTheme(
      Option.getOrElse(model.maybeThemePreference, () => 'System'),
      theme,
    )

    return {
      model: modifyFields(model, {
        systemTheme: () => theme,
        resolvedTheme: () => resolvedTheme,
      }),
      commands: [ApplyTheme({ theme: resolvedTheme })],
    }
  },

  ToggledSidebarGroup: (model, { key, isOpen }) => {
    const nextModel = modifyFields(model, {
      sidebarGroups: Record.set(key, isOpen),
    })

    return {
      model: nextModel,
      commands: [
        Command.SaveSidebarState({
          state: { open: nextModel.sidebarGroups },
        }),
      ],
    }
  },

  CompletedNavigateInternal: ApplicationDefinition.makeNoopStep(),
  CompletedLoadExternal: ApplicationDefinition.makeNoopStep(),
  CompletedLoadPlayground: ApplicationDefinition.makeNoopStep(),
  CompletedInjectAnalytics: ApplicationDefinition.makeNoopStep(),
  CompletedInjectSpeedInsights: ApplicationDefinition.makeNoopStep(),
  CompletedScrollToTop: ApplicationDefinition.makeNoopStep(),
  CompletedScrollToAnchor: ApplicationDefinition.makeNoopStep(),
  CompletedScrollSidebarActiveLinkIntoView:
    ApplicationDefinition.makeNoopStep(),
  CompletedScrollMobileMenuActiveLinkIntoView:
    ApplicationDefinition.makeNoopStep(),
  CompletedApplyTheme: ApplicationDefinition.makeNoopStep(),
  CompletedSaveThemePreference: ApplicationDefinition.makeNoopStep(),
  CompletedSaveSidebarState: ApplicationDefinition.makeNoopStep(),
  SucceededCopyLink: ApplicationDefinition.makeNoopStep(),
  FailedCopyLink: ApplicationDefinition.makeNoopStep(),
})
