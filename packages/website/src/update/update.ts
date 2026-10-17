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
import { Message } from '../message'
import { isPlaygroundRoute, urlToApplicationRoute } from '../route'
import { ApplyTheme, resolveTheme } from '../theme'
import { handleCompletedLoadBrowserEnvironment } from './browserEnvironment'
import { handleChangedUrl } from './changedUrl'

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match(request, {
        Internal: ({ url }) => {
          // NOTE: WebContainer requires `window.crossOriginIsolated`,
          // which only becomes true when the document is loaded with
          // the COEP/COOP response headers set in deploy-website.yml
          // and vite.config.ts. SPA navigation reuses the previous
          // page's document (no headers), so we navigate to playground
          // URLs by loading a fresh document instead.
          if (isPlaygroundRoute(urlToApplicationRoute(url))) {
            return {
              model,
              commands: [Command.LoadExternal({ href: urlToString(url) })],
            }
          }

          return {
            model,
            commands: [Command.NavigateInternal({ url: urlToString(url) })],
          }
        },
        External: ({ href }) => ({
          model,
          commands: [Command.LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) => handleChangedUrl(model, url),

    ClickedCopyLink: ({ hash }) => ({
      model,
      commands: [
        Command.CopyLink({
          url: urlToString(
            modifyFields(model.url, { hash: () => Option.some(hash) }),
          ),
        }),
      ],
    }),

    ClickedOpenMobileMenu: () =>
      Update.combine(model, [
        MobileMenuDialogBinding.open(),
        stepModel => ({
          model: stepModel,
          commands: [Command.ScrollMobileMenuActiveLinkIntoView()],
        }),
      ]),

    ClickedOpenSearch: () => SearchBinding.open()(model),

    PressedSearchShortcut: () => SearchBinding.open()(model),

    ToggledMobileTableOfContents: ({ isOpen }) => ({
      model: modifyFields(model, { isMobileTableOfContentsOpen: () => isOpen }),
    }),

    ClickedMobileTableOfContentsLink: ({ sectionId }) => ({
      model: modifyFields(model, {
        isMobileTableOfContentsOpen: () => false,
        activeSection: () => Option.some(sectionId),
      }),
    }),

    ChangedActiveSection: ({ sectionId }) => ({
      model: modifyFields(model, {
        activeSection: () => Option.some(sectionId),
      }),
    }),

    ChangedViewportWidth: ({ isNarrow }) => ({
      model: modifyFields(model, { isNarrowViewport: () => isNarrow }),
    }),

    CompletedLoadBrowserEnvironment: environment =>
      handleCompletedLoadBrowserEnvironment(model, environment),

    ChangedSystemTheme: ({ theme }) => {
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

    ToggledSidebarGroup: ({ key, isOpen }) => {
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

    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    CompletedLoadPlayground: () => ({ model }),
    CompletedInjectAnalytics: () => ({ model }),
    CompletedInjectSpeedInsights: () => ({ model }),
    CompletedScrollToTop: () => ({ model }),
    CompletedScrollToAnchor: () => ({ model }),
    CompletedScrollSidebarActiveLinkIntoView: () => ({ model }),
    CompletedScrollMobileMenuActiveLinkIntoView: () => ({ model }),
    CompletedApplyTheme: () => ({ model }),
    CompletedSaveThemePreference: () => ({ model }),
    CompletedSaveSidebarState: () => ({ model }),
    SucceededCopyLink: () => ({ model }),
    FailedCopyLink: () => ({ model }),
  }),
)
