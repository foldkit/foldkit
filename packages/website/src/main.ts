import {
  DateTime,
  Effect,
  Layer,
  Match,
  Option,
  Record,
  Schema,
  pipe,
} from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import {
  Calendar,
  Command,
  Dom,
  ManagedResource,
  Runtime,
  Subscription,
  Update,
} from 'foldkit'
import { UrlRequest, load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'
import { githubStarCount } from 'virtual:landing-data'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Dialog, Menu } from '@foldkit/ui'
import { inject } from '@vercel/analytics'
import * as SpeedInsights from '@vercel/speed-insights'

import { Deployment, isTelemetryEnabled } from './deployment'
import {
  DOCS_SIDEBAR_NAV_ID,
  MOBILE_MENU_NAV_ID,
  findActiveSectionKey,
} from './docsNav'
import { Message, ResolvedTheme, ThemePreference } from './message'
import { Model } from './model'
import {
  ApiReference,
  ComingFromReact,
  Core,
  Example,
  Home,
  Playground,
  Ui,
} from './page'
import {
  AppRoute,
  isPlaygroundRoute,
  playgroundRouter,
  urlToAppRoute,
} from './route'
import * as Search from './search'
import {
  GroupKey,
  SIDEBAR_STORAGE_KEY,
  SidebarGroups,
  SidebarState,
  SidebarStateJsonString,
} from './sidebarStorage'
import * as SnippetCopy from './snippetCopy'
import * as Subscriptions from './subscription'
import { ThemeSelector } from './view'
import { NARROW_VIEWPORT_QUERY } from './viewport'

export type { Message } from './message'
export { Model } from './model'
export type { TableOfContentsEntry } from './tableOfContentsEntry'
export { view } from './view/application'

export type AppResources = Search.PagefindService

export type AppManagedResources = ManagedResource.ServicesOf<
  typeof managedResources
>

// THEME

const THEME_STORAGE_KEY = 'theme-preference'

export { type ThemePreference, type ResolvedTheme } from './message'

const resolveTheme = (
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme =>
  Match.value(preference).pipe(
    Match.withReturnType<ResolvedTheme>(),
    Match.when('Dark', () => 'Dark'),
    Match.when('Light', () => 'Light'),
    Match.when('System', () => systemTheme),
    Match.exhaustive,
  )

// FLAGS

export const Flags = Schema.Struct({
  currentYear: Schema.Number,
  today: Calendar.CalendarDate,
  deployment: Deployment,
  maybeApiData: Schema.Option(ApiReference.ApiData),
  maybeExampleSources: Schema.Option(Example.ExampleSources),
})
type Flags = typeof Flags.Type

const CHROMIUM_BRANDS = new Set(['Chromium', 'Google Chrome', 'Microsoft Edge'])
const CHROMIUM_UA_PATTERN = /Chrome\/|Chromium\/|Edg\/|OPR\//

const detectChromium = (): boolean =>
  Option.match(Option.fromNullishOr(navigator.userAgentData?.brands), {
    onNone: () => CHROMIUM_UA_PATTERN.test(navigator.userAgent),
    onSome: brands => brands.some(({ brand }) => CHROMIUM_BRANDS.has(brand)),
  })

const loadBrowserEnvironment = Effect.gen(function* () {
  const themePreference: Option.Option<ThemePreference> = yield* Effect.gen(
    function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const json = yield* Effect.fromOption(
        Option.fromNullishOr(yield* store.get(THEME_STORAGE_KEY)),
      )
      const theme = yield* Schema.decodeEffect(
        Schema.fromJsonString(ThemePreference),
      )(json)
      return Option.some(theme)
    },
  ).pipe(
    Effect.catch(() => Effect.succeed(Option.none<ThemePreference>())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

  const maybeSidebarState: Option.Option<SidebarState> = yield* Effect.gen(
    function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const json = yield* Effect.fromOption(
        Option.fromNullishOr(yield* store.get(SIDEBAR_STORAGE_KEY)),
      )
      const state = yield* Schema.decodeEffect(SidebarStateJsonString)(json)
      return Option.some(state)
    },
  ).pipe(
    Effect.catch(() => Effect.succeed(Option.none<SidebarState>())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  )

  const systemTheme: ResolvedTheme = yield* Effect.sync(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'Dark'
      : 'Light',
  )

  const isNarrowViewport = yield* Effect.sync(
    () => window.matchMedia(NARROW_VIEWPORT_QUERY).matches,
  )

  const isChromium = yield* Effect.sync(detectChromium)

  const currentYear = yield* DateTime.now.pipe(
    Effect.map(DateTime.getPartUtc('year')),
  )

  const today = yield* Calendar.today.local

  return Message.CompletedLoadBrowserEnvironment({
    maybeThemePreference: themePreference,
    maybeSidebarState,
    systemTheme,
    isNarrowViewport,
    isChromium,
    currentYear,
    today,
  })
})

// INIT

const isGroupOpenOnBoot = (
  maybeSidebarState: Option.Option<SidebarState>,
  maybeActiveSectionKey: Option.Option<GroupKey>,
  key: GroupKey,
): boolean => {
  const isActiveSection = Option.exists(
    maybeActiveSectionKey,
    activeSectionKey => activeSectionKey === key,
  )
  if (isActiveSection) {
    return true
  }
  return Option.match(maybeSidebarState, {
    onNone: () => false,
    onSome: ({ open }) => open[key] ?? false,
  })
}

const initialSidebarGroups = (
  maybeSidebarState: Option.Option<SidebarState>,
  maybeActiveSectionKey: Option.Option<GroupKey>,
): SidebarGroups => {
  const sidebarGroups: globalThis.Record<GroupKey, boolean> =
    Record.fromIterableWith(GroupKey.literals, key => [
      key,
      isGroupOpenOnBoot(maybeSidebarState, maybeActiveSectionKey, key),
    ])
  return sidebarGroups
}

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  Flags,
  AppResources,
  AppManagedResources
> = (flags: Flags, url: Url) => {
  const maybeThemePreference = Option.none<ThemePreference>()
  const systemTheme: ResolvedTheme = 'Light'
  const resolvedTheme = systemTheme

  const uiPagesInit = Ui.init(flags.today)
  const comingFromReactInit = ComingFromReact.init()
  const initialRoute = urlToAppRoute(url)
  const maybeHome = pipe(
    initialRoute,
    Option.liftPredicate(route => route._tag === 'Home'),
    Option.map(() => Home.init().model),
  )

  const maybeInitialExampleSlug = pipe(
    initialRoute,
    Option.liftPredicate(route => route._tag === 'ExampleDetail'),
    Option.map(({ exampleSlug }) => exampleSlug),
  )
  const apiReferenceBoot = ApiReference.boot(flags.maybeApiData)
  const exampleDetailBoot = Example.ExampleDetail.boot(
    maybeInitialExampleSlug,
    flags.maybeExampleSources,
  )
  const searchInit = Search.init()
  const snippetCopyInit = SnippetCopy.init()
  const coreSubmodelPageInit = Core.SubmodelPage.init()

  const maybeInitialActiveSectionKey = findActiveSectionKey(
    initialRoute._tag,
    maybeInitialExampleSlug,
  )

  const mappedUiPagesCommands = Command.mapMessages(
    uiPagesInit.commands,
    message => Message.GotUiPageMessage({ message }),
  )

  const mappedComingFromReactCommands = Command.mapMessages(
    comingFromReactInit.commands,
    message => Message.GotComingFromReactMessage({ message }),
  )

  const mappedApiReferenceCommands = Command.mapMessages(
    apiReferenceBoot.commands,
    message => Message.GotApiReferenceMessage({ message }),
  )

  const mappedExampleDetailCommands = Command.mapMessages(
    exampleDetailBoot.commands,
    message => Message.GotExampleDetailMessage({ message }),
  )

  const analyticsCommands = isTelemetryEnabled(flags.deployment)
    ? [InjectAnalytics(), InjectSpeedInsights()]
    : []

  return {
    model: {
      route: initialRoute,
      url,
      deployment: flags.deployment,
      snippetCopy: snippetCopyInit.model,
      maybeGitHubStarCount: Option.fromNullishOr(githubStarCount),
      currentYear: flags.currentYear,
      mobileMenuDialog: Dialog.init({ id: 'mobile-menu' }),
      isMobileTableOfContentsOpen: false,
      activeSection: Option.none(),
      maybeHome,
      isNarrowViewport: false,
      maybeIsChromium: Option.none(),
      playground: pipe(
        initialRoute,
        Option.liftPredicate(isPlaygroundRoute),
        Option.map(({ exampleSlug }) => Playground.init(exampleSlug)),
      ),
      sidebarGroups: initialSidebarGroups(
        Option.none(),
        maybeInitialActiveSectionKey,
      ),
      coreSubmodelPage: coreSubmodelPageInit.model,
      themeMenu: Menu.init({ id: 'theme-menu' }),
      maybeThemePreference,
      systemTheme,
      resolvedTheme,
      uiPages: uiPagesInit.model,
      comingFromReact: comingFromReactInit.model,
      apiReference: apiReferenceBoot.model,
      exampleDetail: exampleDetailBoot.model,
      search: searchInit.model,
    },
    commands: [
      LoadBrowserEnvironment(),
      ...analyticsCommands,
      ...mappedUiPagesCommands,
      ...mappedComingFromReactCommands,
      ...mappedApiReferenceCommands,
      ...mappedExampleDetailCommands,
      ScrollSidebarActiveLinkIntoView(),
      ...Option.match(url.hash, {
        onNone: () => [],
        onSome: hash => [ScrollToAnchor({ hash })],
      }),
    ],
  }
}

// UPDATE

type UpdateStep = Update.Step<
  Model,
  Message,
  AppResources | AppManagedResources
>

const isPathnameEqual = (a: Url, b: Url): boolean => a.pathname === b.pathname

const foldThemeMenuOutMessage = Menu.OutMessage.match<
  Update.Step<Model, Message>,
  Menu.OutMessage<ThemePreference>
>({
  Selected:
    ({ value: preference }) =>
    model => {
      const resolvedTheme = resolveTheme(preference, model.systemTheme)

      return {
        model: evo(model, {
          maybeThemePreference: () => Option.some(preference),
          resolvedTheme: () => resolvedTheme,
        }),
        commands: [
          ApplyTheme({ theme: resolvedTheme }),
          SaveThemePreference({ preference }),
        ],
      }
    },
})

const readThemeMenu = (model: Model): Option.Option<Menu.Model> =>
  Option.some(model.themeMenu)

const writeThemeMenu = (model: Model, nextThemeMenu: Menu.Model): Model =>
  evo(model, { themeMenu: () => nextThemeMenu })

const toGotThemeMenuMessage = (message: Menu.Message): Message =>
  Message.GotThemeMenuMessage({ message })

const foldThemeMenu = Update.foldChild({
  update: ThemeSelector.ThemeMenu.update,
  read: readThemeMenu,
  write: writeThemeMenu,
  toParentMessage: toGotThemeMenuMessage,
  foldOutMessage: foldThemeMenuOutMessage,
})

const foldThemeMenuClose = Update.foldChildStep({
  update: ThemeSelector.ThemeMenu.close,
  read: readThemeMenu,
  write: writeThemeMenu,
  toParentMessage: toGotThemeMenuMessage,
  foldOutMessage: foldThemeMenuOutMessage,
})

const foldMobileMenuDialogOutMessage = Dialog.OutMessage.match<
  Update.Step<Model, Message>
>({
  Opened: () => model => ({ model }),
  Closed: () => model => ({ model }),
})

const readMobileMenuDialog = (model: Model): Option.Option<Dialog.Model> =>
  Option.some(model.mobileMenuDialog)

const writeMobileMenuDialog = (
  model: Model,
  nextMobileMenuDialog: Dialog.Model,
): Model => evo(model, { mobileMenuDialog: () => nextMobileMenuDialog })

const toGotMobileMenuDialogMessage = (message: Dialog.Message): Message =>
  Message.GotMobileMenuDialogMessage({ message })

const foldMobileMenuDialog = Update.foldChild({
  update: Dialog.update,
  read: readMobileMenuDialog,
  write: writeMobileMenuDialog,
  toParentMessage: toGotMobileMenuDialogMessage,
  foldOutMessage: foldMobileMenuDialogOutMessage,
})

const foldMobileMenuDialogClose = Update.foldChildStep({
  update: Dialog.close,
  read: readMobileMenuDialog,
  write: writeMobileMenuDialog,
  toParentMessage: toGotMobileMenuDialogMessage,
  foldOutMessage: foldMobileMenuDialogOutMessage,
})

const foldMobileMenuDialogOpen = Update.foldChildStep({
  update: Dialog.open,
  read: readMobileMenuDialog,
  write: writeMobileMenuDialog,
  toParentMessage: toGotMobileMenuDialogMessage,
  foldOutMessage: foldMobileMenuDialogOutMessage,
})

const foldSnippetCopy = Update.foldChild({
  update: SnippetCopy.update,
  read: (model: Model) => Option.some(model.snippetCopy),
  write: (model, nextSnippetCopy) =>
    evo(model, { snippetCopy: () => nextSnippetCopy }),
  toParentMessage: message => Message.GotSnippetCopyMessage({ message }),
})

const foldCoreSubmodelPage = Update.foldChild({
  update: Core.SubmodelPage.update,
  read: (model: Model) => Option.some(model.coreSubmodelPage),
  write: (model, nextCoreSubmodelPage) =>
    evo(model, { coreSubmodelPage: () => nextCoreSubmodelPage }),
  toParentMessage: message => Message.GotCoreSubmodelPageMessage({ message }),
})

const readHome = (model: Model): Option.Option<Home.Model> => model.maybeHome

const writeHome = (model: Model, nextHome: Home.Model): Model =>
  evo(model, { maybeHome: () => Option.some(nextHome) })

const toGotHomeMessage = (message: Home.Message): Message =>
  Message.GotHomeMessage({ message })

const foldHomeOutMessage = (outMessage: Home.OutMessage) =>
  Home.OutMessage.match<Update.Step<Model, Message>>(outMessage, {
    SelectedPlaygroundExample:
      ({ exampleSlug }) =>
      model => ({
        model,
        commands: [LoadPlayground({ exampleSlug })],
      }),
  })

const foldHome = Update.foldChild({
  update: Home.update,
  read: readHome,
  write: writeHome,
  toParentMessage: toGotHomeMessage,
  foldOutMessage: foldHomeOutMessage,
})

const reconcileHomePresence =
  (route: AppRoute): UpdateStep =>
  model =>
    Match.value(route).pipe(
      Match.withReturnType<ReturnType<UpdateStep>>(),
      Match.tag('Home', () => {
        const nextHome = Option.orElse(model.maybeHome, () =>
          Option.some(Home.init().model),
        )

        return { model: evo(model, { maybeHome: () => nextHome }) }
      }),
      Match.orElse(() => ({
        model: evo(model, { maybeHome: () => Option.none() }),
      })),
    )

const foldComingFromReact = Update.foldChild({
  update: ComingFromReact.update,
  read: (model: Model) => Option.some(model.comingFromReact),
  write: (model, nextComingFromReact) =>
    evo(model, { comingFromReact: () => nextComingFromReact }),
  toParentMessage: message => Message.GotComingFromReactMessage({ message }),
})

const readApiReference = (model: Model): Option.Option<ApiReference.Model> =>
  Option.some(model.apiReference)

const writeApiReference = (
  model: Model,
  nextApiReference: ApiReference.Model,
): Model => evo(model, { apiReference: () => nextApiReference })

const toGotApiReferenceMessage = (message: ApiReference.Message): Message =>
  Message.GotApiReferenceMessage({ message })

const foldApiReference = Update.foldChild({
  update: ApiReference.update,
  read: readApiReference,
  write: writeApiReference,
  toParentMessage: toGotApiReferenceMessage,
})

const foldApiReferenceRouteChanged = Update.foldChildStep({
  update: ApiReference.informRouteChanged,
  read: readApiReference,
  write: writeApiReference,
  toParentMessage: toGotApiReferenceMessage,
})

const foldUiPages = Update.foldChild({
  update: Ui.update,
  read: (model: Model) => Option.some(model.uiPages),
  write: (model, nextUiPages) => evo(model, { uiPages: () => nextUiPages }),
  toParentMessage: message => Message.GotUiPageMessage({ message }),
})

const readExampleDetail = (
  model: Model,
): Option.Option<Example.ExampleDetail.Model> =>
  Option.some(model.exampleDetail)

const writeExampleDetail = (
  model: Model,
  nextExampleDetail: Example.ExampleDetail.Model,
): Model => evo(model, { exampleDetail: () => nextExampleDetail })

const toGotExampleDetailMessage = (
  message: Example.ExampleDetail.Message,
): Message => Message.GotExampleDetailMessage({ message })

const foldExampleDetail = Update.foldChild({
  update: Example.ExampleDetail.update,
  read: readExampleDetail,
  write: writeExampleDetail,
  toParentMessage: toGotExampleDetailMessage,
})

const foldExampleDetailRouteChanged = Update.foldChild({
  update: Example.ExampleDetail.informRouteChanged,
  read: readExampleDetail,
  write: writeExampleDetail,
  toParentMessage: toGotExampleDetailMessage,
})

const readSearch = (model: Model): Option.Option<Search.Model> =>
  Option.some(model.search)

const writeSearch = (model: Model, nextSearch: Search.Model): Model =>
  evo(model, { search: () => nextSearch })

const toGotSearchMessage = (message: Search.Message): Message =>
  Message.GotSearchMessage({ message })

const foldSearch = Update.foldChild({
  update: Search.update,
  read: readSearch,
  write: writeSearch,
  toParentMessage: toGotSearchMessage,
})

const foldSearchRouteChanged = Update.foldChildStep({
  update: Search.informRouteChanged,
  read: readSearch,
  write: writeSearch,
  toParentMessage: toGotSearchMessage,
})

const foldSearchOpen = Update.foldChildStep({
  update: Search.open,
  read: readSearch,
  write: writeSearch,
  toParentMessage: toGotSearchMessage,
})

const foldPlayground = Update.foldChild({
  update: Playground.update,
  read: (model: Model) => model.playground,
  write: (model, nextPlayground) =>
    evo(model, { playground: () => Option.some(nextPlayground) }),
  toParentMessage: message => Message.GotPlaygroundMessage({ message }),
})

type UpdateReturn = Update.Return<
  Model,
  Message,
  AppResources | AppManagedResources
>

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    ClickedLink: ({ request }) =>
      UrlRequest.match<UpdateReturn>(request, {
        Internal: ({ url }) => {
          // NOTE: WebContainer requires `window.crossOriginIsolated`,
          // which only becomes true when the document is loaded with
          // the COEP/COOP response headers set in deploy-website.yml
          // and vite.config.ts. SPA navigation reuses the previous
          // page's document (no headers), so we navigate to playground
          // URLs by loading a fresh document instead.
          if (isPlaygroundRoute(urlToAppRoute(url))) {
            return {
              model,
              commands: [LoadExternal({ href: urlToString(url) })],
            }
          }
          return {
            model,
            commands: [NavigateInternal({ url: urlToString(url) })],
          }
        },
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),

    ChangedUrl: ({ url }) => {
      const nextRoute = urlToAppRoute(url)

      const maybeNextExampleSlug = pipe(
        nextRoute,
        Option.liftPredicate(route => route._tag === 'ExampleDetail'),
        Option.map(({ exampleSlug }) => exampleSlug),
      )

      const maybeNextActiveSectionKey = findActiveSectionKey(
        nextRoute._tag,
        maybeNextExampleSlug,
      )

      const nextSidebarGroups = Option.match(maybeNextActiveSectionKey, {
        onNone: () => model.sidebarGroups,
        onSome: activeSectionKey =>
          model.sidebarGroups[activeSectionKey]
            ? model.sidebarGroups
            : Record.set(model.sidebarGroups, activeSectionKey, true),
      })

      const routeSteps = Match.value(nextRoute).pipe(
        Match.withReturnType<ReadonlyArray<UpdateStep>>(),
        Match.tag('ApiModule', () => [foldApiReferenceRouteChanged]),
        Match.tag('ExampleDetail', ({ exampleSlug }) => [
          foldExampleDetailRouteChanged(exampleSlug),
        ]),
        Match.orElse(() => []),
      )

      const maybeScrollSidebar = Option.liftPredicate(
        ScrollSidebarActiveLinkIntoView(),
        () => !isPathnameEqual(model.url, url),
      )

      const maybeScrollToTop = Option.liftPredicate(
        ScrollToTop(),
        () => !isPathnameEqual(model.url, url),
      )

      const nextPlaygroundRoute = pipe(
        nextRoute,
        Option.liftPredicate(isPlaygroundRoute),
        Option.map(({ exampleSlug }) => Playground.init(exampleSlug)),
      )

      const writeRouteFields: UpdateStep = model => ({
        model: evo(model, {
          route: () => nextRoute,
          url: () => url,
          playground: () => nextPlaygroundRoute,
          sidebarGroups: () => nextSidebarGroups,
        }),
      })

      const scrollToRoute: UpdateStep = model => ({
        model,
        commands: [
          ...Option.match(url.hash, {
            onNone: () => Option.toArray(maybeScrollToTop),
            onSome: hash => [ScrollToAnchor({ hash })],
          }),
          ...Option.toArray(maybeScrollSidebar),
        ],
      })

      return Update.combine(model, [
        writeRouteFields,
        reconcileHomePresence(nextRoute),
        foldMobileMenuDialogClose,
        foldThemeMenuClose,
        foldSearchRouteChanged,
        ...routeSteps,
        scrollToRoute,
      ])
    },

    ClickedCopyLink: ({ hash }) => ({
      model,
      commands: [
        CopyLink({
          url: urlToString({ ...model.url, hash: Option.some(hash) }),
        }),
      ],
    }),

    ClickedOpenMobileMenu: () =>
      Update.combine(model, [
        foldMobileMenuDialogOpen,
        stepModel => ({
          model: stepModel,
          commands: [ScrollMobileMenuActiveLinkIntoView()],
        }),
      ]),

    ClickedOpenSearch: () => foldSearchOpen(model),

    PressedSearchShortcut: () => foldSearchOpen(model),

    GotMobileMenuDialogMessage: ({ message }) =>
      foldMobileMenuDialog(model, message),

    GotSnippetCopyMessage: ({ message }) => foldSnippetCopy(model, message),

    GotCoreSubmodelPageMessage: ({ message }) =>
      foldCoreSubmodelPage(model, message),

    ToggledMobileTableOfContents: ({ isOpen }) => ({
      model: evo(model, { isMobileTableOfContentsOpen: () => isOpen }),
    }),

    ClickedMobileTableOfContentsLink: ({ sectionId }) => ({
      model: evo(model, {
        isMobileTableOfContentsOpen: () => false,
        activeSection: () => Option.some(sectionId),
      }),
    }),

    ChangedActiveSection: ({ sectionId }) => ({
      model: evo(model, {
        activeSection: () => Option.some(sectionId),
      }),
    }),

    ChangedViewportWidth: ({ isNarrow }) => ({
      model: evo(model, { isNarrowViewport: () => isNarrow }),
    }),

    CompletedLoadBrowserEnvironment: ({
      maybeThemePreference,
      maybeSidebarState,
      systemTheme,
      isNarrowViewport,
      isChromium,
      currentYear,
      today,
    }) => {
      const themePreference: ThemePreference = Option.getOrElse(
        maybeThemePreference,
        () => 'System',
      )
      const resolvedTheme = resolveTheme(themePreference, systemTheme)
      const maybeExampleSlug = pipe(
        model.route,
        Option.liftPredicate(route => route._tag === 'ExampleDetail'),
        Option.map(({ exampleSlug }) => exampleSlug),
      )
      const maybeActiveSectionKey = findActiveSectionKey(
        model.route._tag,
        maybeExampleSlug,
      )
      const browserUiPagesInit = Ui.init(today)

      return {
        model: evo(model, {
          currentYear: () => currentYear,
          isNarrowViewport: () => isNarrowViewport,
          maybeIsChromium: () => Option.some(isChromium),
          sidebarGroups: () =>
            initialSidebarGroups(maybeSidebarState, maybeActiveSectionKey),
          maybeThemePreference: () => Option.some(themePreference),
          systemTheme: () => systemTheme,
          resolvedTheme: () => resolvedTheme,
          uiPages: () => browserUiPagesInit.model,
        }),
        commands: [
          ApplyTheme({ theme: resolvedTheme }),
          ...Command.mapMessages(browserUiPagesInit.commands, message =>
            Message.GotUiPageMessage({ message }),
          ),
        ],
      }
    },

    GotThemeMenuMessage: ({ message }) => foldThemeMenu(model, message),

    GotHomeMessage: ({ message }) => foldHome(model, message),

    ChangedSystemTheme: ({ theme }) => {
      const resolvedTheme = resolveTheme(
        Option.getOrElse(model.maybeThemePreference, () => 'System'),
        theme,
      )

      return {
        model: evo(model, {
          systemTheme: () => theme,
          resolvedTheme: () => resolvedTheme,
        }),
        commands: [ApplyTheme({ theme: resolvedTheme })],
      }
    },

    GotComingFromReactMessage: ({ message }) =>
      foldComingFromReact(model, message),

    GotApiReferenceMessage: ({ message }) => foldApiReference(model, message),

    GotUiPageMessage: ({ message }) => foldUiPages(model, message),

    ToggledSidebarGroup: ({ key, isOpen }) => {
      const nextModel = evo(model, {
        sidebarGroups: Record.set(key, isOpen),
      })
      return { model: nextModel, commands: [saveSidebarState(nextModel)] }
    },

    GotExampleDetailMessage: ({ message }) => foldExampleDetail(model, message),

    GotSearchMessage: ({ message }) => foldSearch(model, message),

    GotPlaygroundMessage: ({ message }) => foldPlayground(model, message),
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
  })

// COMMAND

const InjectAnalytics = Command.define('InjectAnalytics', {
  messages: [Message.CompletedInjectAnalytics],
  execute: Effect.sync(() => inject()).pipe(
    Effect.as(Message.CompletedInjectAnalytics()),
  ),
})

const LoadBrowserEnvironment = Command.define('LoadBrowserEnvironment', {
  messages: [Message.CompletedLoadBrowserEnvironment],
  execute: loadBrowserEnvironment,
})

const InjectSpeedInsights = Command.define('InjectSpeedInsights', {
  messages: [Message.CompletedInjectSpeedInsights],
  execute: Effect.sync(() => SpeedInsights.injectSpeedInsights()).pipe(
    Effect.as(Message.CompletedInjectSpeedInsights()),
  ),
})

const CopyLink = Command.define('CopyLink', {
  args: { url: Schema.String },
  messages: [Message.SucceededCopyLink, Message.FailedCopyLink],
  execute: ({ url }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(url),
      catch: () => new Error('Failed to copy link to clipboard'),
    }).pipe(
      Effect.as(Message.SucceededCopyLink()),
      Effect.catch(() => Effect.succeed(Message.FailedCopyLink())),
    ),
})

export const ScrollToTop = Command.define('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
  execute: Effect.sync(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    return Message.CompletedScrollToTop()
  }),
})

const ScrollToAnchor = Command.define('ScrollToAnchor', {
  args: { hash: Schema.String },
  messages: [Message.CompletedScrollToAnchor],
  execute: ({ hash }) =>
    Effect.gen(function* () {
      const target = `#${CSS.escape(hash)}`
      yield* Dom.scrollIntoViewAfterPaint(target, { block: 'start' })
      yield* Dom.focus(target, { preventScroll: true, makeFocusable: true })
    }).pipe(Effect.ignore, Effect.as(Message.CompletedScrollToAnchor())),
})

export const ScrollSidebarActiveLinkIntoView = Command.define(
  'ScrollSidebarActiveLinkIntoView',
  {
    messages: [Message.CompletedScrollSidebarActiveLinkIntoView],
    execute: Dom.scrollIntoViewIfNotVisible(
      `#${DOCS_SIDEBAR_NAV_ID} [aria-current="page"]`,
    ).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollSidebarActiveLinkIntoView()),
    ),
  },
)

const MOBILE_MENU_ACTIVE_LINK = `#${MOBILE_MENU_NAV_ID} [aria-current="page"]`

const ScrollMobileMenuActiveLinkIntoView = Command.define(
  'ScrollMobileMenuActiveLinkIntoView',
  {
    messages: [Message.CompletedScrollMobileMenuActiveLinkIntoView],
    execute: Dom.scrollIntoViewIfNotVisible(MOBILE_MENU_ACTIVE_LINK, {
      when: 'Commit',
    }).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollMobileMenuActiveLinkIntoView()),
    ),
  },
)

// NOTE: mirrors --color-cream and --color-gray-900 in styles.css.
// src/themeColor.test.ts fails when these drift.
const LIGHT_THEME_COLOR = '#f8f7fb'
const DARK_THEME_COLOR = '#1e1c21'

const setThemeColorMeta = (color: string): void => {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (themeColorMeta !== null) {
    themeColorMeta.setAttribute('content', color)
  }
}

const ApplyTheme = Command.define('ApplyTheme', {
  args: { theme: ResolvedTheme },
  messages: [Message.CompletedApplyTheme],
  execute: ({ theme }) =>
    Effect.sync(() => {
      Match.value(theme).pipe(
        Match.when('Dark', () => {
          document.documentElement.classList.add('dark')
          setThemeColorMeta(DARK_THEME_COLOR)
        }),
        Match.when('Light', () => {
          document.documentElement.classList.remove('dark')
          setThemeColorMeta(LIGHT_THEME_COLOR)
        }),
        Match.exhaustive,
      )
      return Message.CompletedApplyTheme()
    }),
})

const SaveThemePreference = Command.define('SaveThemePreference', {
  args: { preference: ThemePreference },
  messages: [Message.CompletedSaveThemePreference],
  execute: ({ preference }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(THEME_STORAGE_KEY, JSON.stringify(preference))
      return Message.CompletedSaveThemePreference()
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(Message.CompletedSaveThemePreference()),
      ),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

const SaveSidebarState = Command.define('SaveSidebarState', {
  args: { state: SidebarState },
  messages: [Message.CompletedSaveSidebarState],
  execute: ({ state }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const json = yield* Schema.encodeEffect(SidebarStateJsonString)(state)
      yield* store.set(SIDEBAR_STORAGE_KEY, json)
      return Message.CompletedSaveSidebarState()
    }).pipe(
      Effect.catch(() => Effect.succeed(Message.CompletedSaveSidebarState())),
      Effect.provide(BrowserKeyValueStore.layerSessionStorage),
    ),
})

const modelToSidebarState = (model: Model): SidebarState => ({
  open: model.sidebarGroups,
})

const saveSidebarState = (model: Model) =>
  SaveSidebarState({ state: modelToSidebarState(model) })

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

export const LoadPlayground = Command.define('LoadPlayground', {
  args: { exampleSlug: Example.ExampleSlug },
  messages: [Message.CompletedLoadPlayground],
  execute: ({ exampleSlug }) =>
    load(playgroundRouter({ exampleSlug })).pipe(
      Effect.as(Message.CompletedLoadPlayground()),
    ),
})

// SUBSCRIPTION

const homeSubscriptions = Subscription.lift(Home.subscriptions)<Model, Message>(
  {
    toChildModel: model => Option.getOrThrow(model.maybeHome),
    toParentMessage: toGotHomeMessage,
    when: model => Option.isSome(model.maybeHome),
  },
)

const uiPagesSubscriptions = Subscription.lift(Ui.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.uiPages,
  toParentMessage: message => Message.GotUiPageMessage({ message }),
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
  Subscriptions.ActiveSection.subscriptions,
  homeSubscriptions,
  uiPagesSubscriptions,
  Subscriptions.SearchShortcut.subscriptions,
  Subscriptions.SystemTheme.subscriptions,
  Subscriptions.ViewportWidth.subscriptions,
)

// MANAGED RESOURCE

const playgroundManagedResources = ManagedResource.lift(
  Playground.managedResources,
)<Model, Message>({
  toChildModel: model => model.playground,
  toParentMessage: message => Message.GotPlaygroundMessage({ message }),
})

const homeManagedResources = ManagedResource.lift(Home.managedResources)<
  Model,
  Message
>({
  toChildModel: model => model.maybeHome,
  toParentMessage: toGotHomeMessage,
})

export const managedResources = ManagedResource.aggregate<Model, Message>()(
  homeManagedResources,
  playgroundManagedResources,
)

// TRACER
// NOTE: Custom dev tracer disabled pending Effect v4 beta Tracer/Layer API rewrite.
// v4 beta removed Layer.setTracer and changed Tracer.make's signature; restore
// once we adopt the new Tracer construction pattern.
export const devTracerLayer: Layer.Layer<never> = Layer.empty
