import { Array, Effect, Layer, Option, Record } from 'effect'
import { Block } from 'foldkit'
import { UrlRequest } from 'foldkit/navigation'
import { modifyFields } from 'foldkit/struct'
import { type Url, toString as urlToString } from 'foldkit/url'
import { githubStarCount } from 'virtual:landing-data'

import { Dialog, DialogLive } from '@foldkit/ui'

import * as Command from './command'
import { type Deployment, isTelemetryEnabled } from './deployment'
import { findActiveSectionKeyForRoute } from './docsNav'
import { type Flags } from './flags'
import { Message, type ResolvedTheme, type ThemePreference } from './message'
import { Model } from './model'
import {
  ApiReference,
  ApiReferenceLive,
  BlockPage,
  BlockPageLive,
  ComingFromReact,
  ComingFromReactLive,
  ExampleDetail,
  ExampleDetailLive,
  Home,
  HomeLive,
  Playground,
  PlaygroundLive,
  Ui,
  UiLive,
} from './page'
import {
  ApplicationRoute,
  isPlaygroundRoute,
  maybeExampleSlugForRoute,
  urlToApplicationRoute,
} from './route'
import { Search, SearchLive } from './search'
import { initialSidebarGroups } from './sidebarStorage'
import { SnippetCopy, SnippetCopyLive } from './snippetCopy'
import { SnippetDisclosure, SnippetDisclosureLive } from './snippetDisclosure'
import { LocalStorage, SessionStorage } from './storage'
import { subscriptions, viewportWidthChanges } from './subscription'
import {
  ApplyTheme,
  SaveThemePreference,
  applyTheme,
  resolveTheme,
  saveThemePreference,
} from './theme'
import {
  handleChangedUrl,
  handleCompletedLoadBrowserEnvironment,
} from './update'
import { ThemeMenu } from './view/themeMenu'
import { view } from './view/view'

const UI_PAGES_KEY = 'ui'

const browserStartupCommands = (deployment: Deployment) => [
  Command.LoadBrowserEnvironment(),
  ...Array.filter(
    [Command.InjectAnalytics(), Command.InjectSpeedInsights()],
    () => isTelemetryEnabled(deployment),
  ),
]

const initialScrollCommands = (url: Url) => [
  Command.ScrollSidebarActiveLinkIntoView(),
  ...Option.match(url.hash, {
    onNone: () => [],
    onSome: hash => [Command.ScrollToAnchor({ hash })],
  }),
]

const applyThemePreference = (model: Model, preference: ThemePreference) => {
  const resolvedTheme = resolveTheme(preference, model.systemTheme)

  return {
    model: modifyFields(model, {
      maybeThemePreference: () => Option.some(preference),
      resolvedTheme: () => resolvedTheme,
    }),
    commands: [
      ApplyTheme({ theme: resolvedTheme }),
      SaveThemePreference({ preference }),
    ],
  }
}

export type ApplicationArgs = Readonly<{ flags: Flags; url: Url }>

export class Application extends Block<Application, ApplicationArgs>()(
  'Application',
  {
    Model,
    Message,
    Command: [
      Command.InjectAnalytics,
      Command.LoadBrowserEnvironment,
      Command.InjectSpeedInsights,
      Command.CopyLink,
      Command.ScrollToTop,
      Command.ScrollToAnchor,
      Command.ScrollSidebarActiveLinkIntoView,
      Command.ScrollMobileMenuActiveLinkIntoView,
      Command.SaveSidebarState,
      Command.NavigateInternal,
      Command.LoadPlayground,
      Command.LoadExternal,
      ApplyTheme,
      SaveThemePreference,
    ],
  },
) {}

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags, url }) {
    const localStorage = yield* LocalStorage
    const sessionStorage = yield* SessionStorage

    const route = urlToApplicationRoute(url)

    const home = yield* new Home('maybeHome')
    const playground = yield* Playground.each('playground', {
      maybeIsSupported: Option.none(),
    })
    const uiPage = yield* Ui.each('uiPages', { today: flags.today })
    const snippetCopy = yield* new SnippetCopy('snippetCopy')
    const snippetDisclosure = yield* new SnippetDisclosure('snippetDisclosure')
    const mobileMenuDialog = yield* new Dialog.Dialog('mobileMenuDialog', {
      id: 'mobile-menu',
    })
    const themeMenu = yield* new ThemeMenu('themeMenu', { id: 'theme-menu' })
    const coreBlockPage = yield* new BlockPage('coreBlockPage')
    const comingFromReact = yield* new ComingFromReact('comingFromReact')
    const apiReference = yield* new ApiReference('apiReference', {
      maybeApiData: flags.maybeApiData,
    })
    const exampleDetail = yield* new ExampleDetail('exampleDetail', {
      maybeInitialSlug: maybeExampleSlugForRoute(route),
      maybeExampleSources: flags.maybeExampleSources,
    })
    const search = yield* new Search('search')

    const playgroundFor = (
      slug: string,
      maybeIsSupported: Option.Option<boolean>,
    ) => playground(slug, { maybeIsSupported })

    const maybeThemePreference = Option.none<ThemePreference>()
    const systemTheme: ResolvedTheme = 'Light'

    return {
      model: {
        route,
        url,
        deployment: flags.deployment,
        snippetCopy,
        snippetDisclosure,
        maybeGitHubStarCount: Option.fromNullishOr(githubStarCount),
        currentYear: flags.currentYear,
        newsletterEmail: '',
        mobileMenuDialog,
        isMobileTableOfContentsOpen: false,
        activeSection: Option.none(),
        isNarrowViewport: false,
        maybeIsPlaygroundSupported: Option.none(),
        playground: ApplicationRoute.matchOrElse(
          route,
          {
            Playground: ({ exampleSlug }) =>
              Option.some(playgroundFor(exampleSlug, Option.none())),
          },
          () => Option.none(),
        ),
        sidebarGroups: initialSidebarGroups(
          Option.none(),
          findActiveSectionKeyForRoute(route),
        ),
        coreBlockPage,
        maybeHome: ApplicationRoute.guards.Home(route)
          ? Option.some(home)
          : Option.none(),
        themeMenu,
        maybeThemePreference,
        systemTheme,
        resolvedTheme: systemTheme,
        uiPages: uiPage(UI_PAGES_KEY),
        comingFromReact,
        apiReference,
        exampleDetail,
        search,
      },

      start: [
        ...browserStartupCommands(flags.deployment),
        ...initialScrollCommands(url),
      ],

      update: {
        ClickedLink: (model, { request }) => ({
          model,
          commands: [
            UrlRequest.match(request, {
              Internal: ({ url }) =>
                // NOTE: WebContainer requires `window.crossOriginIsolated`,
                // which only becomes true when the document is loaded with
                // the COEP/COOP response headers set in deploy-website.yml
                // and vite.config.ts. SPA navigation reuses the previous
                // page's document (no headers), so we navigate to playground
                // URLs by loading a fresh document instead.
                isPlaygroundRoute(urlToApplicationRoute(url))
                  ? Command.LoadExternal({ href: urlToString(url) })
                  : Command.NavigateInternal({ url: urlToString(url) }),
              External: ({ href }) => Command.LoadExternal({ href }),
            }),
          ],
        }),

        ChangedUrl: handleChangedUrl({ home, playgroundFor }),

        ClickedCopyLink: (model, { hash }) => ({
          model,
          commands: [
            Command.CopyLink({
              url: urlToString(
                modifyFields(model.url, { hash: () => Option.some(hash) }),
              ),
            }),
          ],
        }),

        ClickedOpenMobileMenu: model => ({
          model,
          commands: [Command.ScrollMobileMenuActiveLinkIntoView()],
          messages: [
            model.mobileMenuDialog.send(Dialog.Dialog.Message.RequestedOpen()),
          ],
        }),

        ClickedOpenSearch: model => ({
          model,
          messages: [model.search.send(Search.Message.RequestedOpen())],
        }),

        PressedSearchShortcut: model => ({
          model,
          messages: [model.search.send(Search.Message.RequestedOpen())],
        }),

        ToggledMobileTableOfContents: (model, { isOpen }) => ({
          model: modifyFields(model, {
            isMobileTableOfContentsOpen: () => isOpen,
          }),
        }),

        ClickedMobileTableOfContentsLink: (model, { sectionId }) => ({
          model: modifyFields(model, {
            isMobileTableOfContentsOpen: () => false,
            activeSection: () => Option.some(sectionId),
          }),
        }),

        ChangedActiveSection: (model, { sectionId }) => ({
          model: modifyFields(model, {
            activeSection: () => Option.some(sectionId),
          }),
        }),

        UpdatedNewsletterEmail: (model, { value }) => ({
          model: modifyFields(model, { newsletterEmail: () => value }),
        }),

        ChangedViewportWidth: (model, { isNarrow }) => ({
          model: modifyFields(model, { isNarrowViewport: () => isNarrow }),
        }),

        CompletedLoadBrowserEnvironment: handleCompletedLoadBrowserEnvironment(
          today => uiPage(UI_PAGES_KEY, { today }),
        ),

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

        CompletedNavigateInternal: model => ({ model }),
        CompletedLoadExternal: model => ({ model }),
        CompletedLoadPlayground: model => ({ model }),
        CompletedInjectAnalytics: model => ({ model }),
        CompletedInjectSpeedInsights: model => ({ model }),
        CompletedScrollToTop: model => ({ model }),
        CompletedScrollToAnchor: model => ({ model }),
        CompletedScrollSidebarActiveLinkIntoView: model => ({ model }),
        CompletedScrollMobileMenuActiveLinkIntoView: model => ({ model }),
        CompletedApplyTheme: model => ({ model }),
        CompletedSaveThemePreference: model => ({ model }),
        CompletedSaveSidebarState: model => ({ model }),
        SucceededCopyLink: model => ({ model }),
        FailedCopyLink: model => ({ model }),

        ...home.on({
          SelectedPlaygroundExample: (model, { exampleSlug }) => ({
            model,
            commands: [Command.LoadPlayground({ exampleSlug })],
          }),
          UpdatedNewsletterEmail: (model, { value }) => ({
            model: modifyFields(model, { newsletterEmail: () => value }),
          }),
        }),

        ...themeMenu.on({
          Selected: (model, { value }) => applyThemePreference(model, value),
        }),
      },

      commands: {
        ...Command.makeCommandHandlers(sessionStorage),
        LoadBrowserEnvironment: () =>
          Command.loadBrowserEnvironment(localStorage, sessionStorage),
        ApplyTheme: ({ theme }) => applyTheme(theme),
        SaveThemePreference: ({ preference }) =>
          saveThemePreference(localStorage, preference),
      },

      stream: viewportWidthChanges,

      subscriptions,

      view,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      ApiReferenceLive,
      BlockPageLive,
      ComingFromReactLive,
      DialogLive,
      ExampleDetailLive,
      HomeLive,
      PlaygroundLive,
      SearchLive,
      SnippetCopyLive,
      SnippetDisclosureLive,
      ThemeMenu.Live,
      UiLive,
    ),
  ),
)
