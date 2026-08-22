import {
  Array,
  DateTime,
  Effect,
  HashSet,
  Layer,
  Match as M,
  Number as Number_,
  Option,
  Record as Record_,
  Schema as S,
  pipe,
} from 'effect'
import { KeyValueStore } from 'effect/unstable/persistence'
import {
  AsyncData,
  Calendar,
  Command,
  Dom,
  ManagedResource,
  Runtime,
  Subscription,
  Update,
} from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'
import { githubStarCount } from 'virtual:landing-data'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Dialog, Menu, Tabs } from '@foldkit/ui'
import { inject } from '@vercel/analytics'
import * as SpeedInsights from '@vercel/speed-insights'

import * as DemoTab from './demoTab'
import { Deployment, isTelemetryEnabled } from './deployment'
import {
  DOCS_SIDEBAR_NAV_ID,
  MOBILE_MENU_NAV_ID,
  allPages,
  findActiveSectionKey,
} from './docsNav'
import { Message, ResolvedTheme, ThemePreference } from './message'
import * as Page from './page'
import { Message as ApiReferenceMessage } from './page/apiReference/message'
import { ApiData } from './page/apiReference/model'
import { Message as ExampleDetailMessage } from './page/example/exampleDetail'
import { type ExampleSlug } from './page/example/meta'
import { ExampleSources } from './page/example/sources'
import {
  AppRoute,
  isPlaygroundRoute,
  playgroundRouter,
  urlToAppRoute,
} from './route'
import * as Search from './search'
import {
  DEFAULT_OPEN_GROUPS,
  GroupKey,
  SIDEBAR_STORAGE_KEY,
  SidebarGroups,
  SidebarState,
  SidebarStateJsonString,
} from './sidebarStorage'
import * as Subscriptions from './subscription'
import {
  blogView,
  canaryBanner,
  docsView,
  landingView,
  newsletterView,
} from './view'

export type { Message } from './message'

export type AppResources = Search.PagefindService

export type AppManagedResources = ManagedResource.ServicesOf<
  typeof managedResources
>

export type TableOfContentsEntry = {
  id: string
  text: string
  level: 'h2' | 'h3' | 'h4'
}

// THEME

const THEME_STORAGE_KEY = 'theme-preference'

export { type ThemePreference, type ResolvedTheme } from './message'

const resolveTheme = (
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme =>
  M.value(preference).pipe(
    M.withReturnType<ResolvedTheme>(),
    M.when('Dark', () => 'Dark'),
    M.when('Light', () => 'Light'),
    M.when('System', () => systemTheme),
    M.exhaustive,
  )

// FLAGS

export const Flags = S.Struct({
  currentYear: S.Number,
  today: Calendar.CalendarDate,
  deployment: Deployment,
  maybeApiData: S.Option(ApiData),
  maybeExampleSources: S.Option(ExampleSources),
})

type Flags = typeof Flags.Type

export const NARROW_VIEWPORT_QUERY = '(max-width: 1023px)'

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
      const theme = yield* S.decodeEffect(S.fromJsonString(ThemePreference))(
        json,
      )
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
      const state = yield* S.decodeEffect(SidebarStateJsonString)(json)
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

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  url: Url,
  deployment: Deployment,
  copiedSnippets: S.HashSet(S.String),
  maybeGitHubStarCount: S.Option(S.Number),
  currentYear: S.Number,
  mobileMenuDialog: Dialog.Model,
  isMobileTableOfContentsOpen: S.Boolean,
  activeSection: S.Option(S.String),
  isNarrowViewport: S.Boolean,
  maybeIsChromium: S.Option(S.Boolean),
  playground: S.Option(Page.Playground.Model),
  sidebarGroups: SidebarGroups,
  isMapMessagesUnderHoodOpen: S.Boolean,
  aiHeadingToggleCount: S.Number,
  maybeThemePreference: S.Option(ThemePreference),
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  demoTabs: Tabs.Model,
  activeDemoTab: DemoTab.Tab,
  playgroundMenu: Menu.Model,
  asyncCounterDemo: S.Option(Page.AsyncCounterDemo.Model),
  notePlayerDemo: S.Option(Page.NotePlayerDemo.Model),
  uiPages: Page.UiPages.Model,
  comingFromReact: Page.ComingFromReact.Model,
  apiReference: Page.ApiReference.Model,
  exampleDetail: Page.Example.ExampleDetail.Model,
  search: Search.Model,
})

export type Model = typeof Model.Type

const PlaygroundMenu = Menu.create<ExampleSlug>()

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
    onNone: () => Array.contains(DEFAULT_OPEN_GROUPS, key),
    onSome: ({ open }) => open[key] ?? false,
  })
}

const initialSidebarGroups = (
  maybeSidebarState: Option.Option<SidebarState>,
  maybeActiveSectionKey: Option.Option<GroupKey>,
): SidebarGroups => {
  const sidebarGroups: Record<GroupKey, boolean> = Record_.fromIterableWith(
    GroupKey.literals,
    key => [
      key,
      isGroupOpenOnBoot(maybeSidebarState, maybeActiveSectionKey, key),
    ],
  )
  return sidebarGroups
}

const isAsyncCounterDemoVisible = (
  route: AppRoute,
  activeDemoTab: DemoTab.Tab,
): boolean =>
  route._tag === 'Home' && DemoTab.isActive('Architecture')(activeDemoTab)

const reflectAsyncCounterDemoPresence = (
  maybeAsyncCounterDemo: Option.Option<Page.AsyncCounterDemo.Model>,
  isPresent: boolean,
): Option.Option<Page.AsyncCounterDemo.Model> => {
  if (isPresent) {
    return Option.orElse(maybeAsyncCounterDemo, () => {
      const asyncCounterDemoInitResult = Page.AsyncCounterDemo.init()
      return Option.some(asyncCounterDemoInitResult.model)
    })
  } else {
    return Option.none()
  }
}

const isNotePlayerDemoVisible = (
  route: AppRoute,
  activeDemoTab: DemoTab.Tab,
): boolean =>
  route._tag === 'Home' && DemoTab.isActive('Note Player')(activeDemoTab)

const reflectNotePlayerDemoPresence = (
  maybeNotePlayerDemo: Option.Option<Page.NotePlayerDemo.Model>,
  isPresent: boolean,
): Option.Option<Page.NotePlayerDemo.Model> => {
  if (isPresent) {
    return Option.orElse(maybeNotePlayerDemo, () => {
      const notePlayerDemoInitResult = Page.NotePlayerDemo.init()
      return Option.some(notePlayerDemoInitResult.model)
    })
  } else {
    return Option.none()
  }
}

const initApiReference = (
  maybeApiData: Option.Option<typeof ApiData.Type>,
): ReturnType<typeof Page.ApiReference.boot> => {
  const apiReferenceBootResult = Page.ApiReference.boot()
  return Option.match(maybeApiData, {
    onNone: () => apiReferenceBootResult,
    onSome: apiData => {
      const apiReferenceUpdateResult = Page.ApiReference.update(
        apiReferenceBootResult.model,
        ApiReferenceMessage.SucceededLoadApiData({ apiData }),
      )
      // NOTE: prerendered module pages seed a per-module slice of the API
      // data, so the boot Commands still run: the full reference replaces
      // the slice after hydration, keeping cross-module navigation working.
      return {
        ...apiReferenceBootResult,
        model: apiReferenceUpdateResult.model,
      }
    },
  })
}

const initExampleDetail = (
  maybeInitialSlug: Option.Option<string>,
  maybeExampleSources: Option.Option<typeof ExampleSources.Type>,
): ReturnType<typeof Page.Example.ExampleDetail.boot> => {
  const exampleDetailBootResult =
    Page.Example.ExampleDetail.boot(maybeInitialSlug)
  return Option.match(maybeExampleSources, {
    onNone: () => exampleDetailBootResult,
    onSome: sources => {
      const exampleDetailUpdateResult = Page.Example.ExampleDetail.update(
        exampleDetailBootResult.model,
        ExampleDetailMessage.SucceededLoadExampleSources({ sources }),
      )
      return { model: exampleDetailUpdateResult.model }
    },
  })
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

  const demoTabs = Tabs.init({
    id: 'demo-tabs',
  })

  const activeDemoTab: DemoTab.Tab = 'Architecture'

  const playgroundMenu = Menu.init({
    id: 'playground-menu',
    isAnimated: true,
  })

  const uiPagesInitResult = Page.UiPages.init(flags.today)
  const comingFromReactInitResult = Page.ComingFromReact.init()
  const initialRoute = urlToAppRoute(url)

  const asyncCounterDemo = reflectAsyncCounterDemoPresence(
    Option.none(),
    isAsyncCounterDemoVisible(initialRoute, activeDemoTab),
  )

  const notePlayerDemo = reflectNotePlayerDemoPresence(
    Option.none(),
    isNotePlayerDemoVisible(initialRoute, activeDemoTab),
  )

  const maybeInitialExampleSlug = pipe(
    initialRoute,
    Option.liftPredicate(route => route._tag === 'ExampleDetail'),
    Option.map(({ exampleSlug }) => exampleSlug),
  )
  const initApiReferenceResult = initApiReference(flags.maybeApiData)

  const initExampleDetailResult = initExampleDetail(
    maybeInitialExampleSlug,
    flags.maybeExampleSources,
  )

  const maybeInitialActiveSectionKey = findActiveSectionKey(
    initialRoute._tag,
    maybeInitialExampleSlug,
  )

  const mappedUiPagesCommands = Command.mapMessages(
    uiPagesInitResult.commands ?? [],
    message => Message.GotUiPageMessage({ message }),
  )

  const mappedComingFromReactCommands = Command.mapMessages(
    comingFromReactInitResult.commands ?? [],
    message => Message.GotComingFromReactMessage({ message }),
  )

  const mappedApiReferenceCommands = Command.mapMessages(
    initApiReferenceResult.commands ?? [],
    message => Message.GotApiReferenceMessage({ message }),
  )

  const mappedExampleDetailCommands = Command.mapMessages(
    initExampleDetailResult.commands ?? [],
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
      copiedSnippets: HashSet.empty(),
      maybeGitHubStarCount: Option.fromNullishOr(githubStarCount),
      currentYear: flags.currentYear,
      mobileMenuDialog: Dialog.init({ id: 'mobile-menu' }),
      isMobileTableOfContentsOpen: false,
      activeSection: Option.none(),
      aiHeadingToggleCount: 0,
      isNarrowViewport: false,
      maybeIsChromium: Option.none(),
      playground: pipe(
        initialRoute,
        Option.liftPredicate(isPlaygroundRoute),
        Option.map(({ exampleSlug }) => Page.Playground.init(exampleSlug)),
      ),
      sidebarGroups: initialSidebarGroups(
        Option.none(),
        maybeInitialActiveSectionKey,
      ),
      isMapMessagesUnderHoodOpen: false,
      maybeThemePreference,
      systemTheme,
      resolvedTheme,
      demoTabs,
      activeDemoTab,
      playgroundMenu,
      asyncCounterDemo,
      notePlayerDemo,
      uiPages: uiPagesInitResult.model,
      comingFromReact: comingFromReactInitResult.model,
      apiReference: initApiReferenceResult.model,
      exampleDetail: initExampleDetailResult.model,
      search: Search.init().model,
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

const foldMobileMenuDialogOutMessage = M.type<Dialog.OutMessage>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Opened: () => model => ({ model }),
    Closed: () => model => ({ model }),
  }),
)

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

const foldDemoTabsOutMessage = M.type<Tabs.OutMessage<DemoTab.Tab>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({
        model: evo(model, {
          activeDemoTab: () => value,
          asyncCounterDemo: () =>
            reflectAsyncCounterDemoPresence(
              model.asyncCounterDemo,
              isAsyncCounterDemoVisible(model.route, value),
            ),
          notePlayerDemo: () =>
            reflectNotePlayerDemoPresence(
              model.notePlayerDemo,
              isNotePlayerDemoVisible(model.route, value),
            ),
        }),
      }),
  }),
)

const foldDemoTabs = Update.foldChild({
  update: DemoTab.DemoTabs.update,
  read: (model: Model) => Option.some(model.demoTabs),
  write: (model, nextDemoTabs) => evo(model, { demoTabs: () => nextDemoTabs }),
  toParentMessage: message => Message.GotDemoTabsMessage({ message }),
  foldOutMessage: foldDemoTabsOutMessage,
})

const foldPlaygroundMenuOutMessage: (
  outMessage: Menu.OutMessage<ExampleSlug>,
) => Update.Step<Model, Message> = M.type<Menu.OutMessage<ExampleSlug>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    // NOTE: `LoadExternal` (not `NavigateInternal`).
    // WebContainer requires `window.crossOriginIsolated`,
    // which is only true when the document is loaded with
    // COEP/COOP headers. SPA navigation reuses the previous
    // page's document (no headers), so playground URLs need
    // a fresh document load.
    Selected:
      ({ value }) =>
      model => ({
        model,
        commands: [
          LoadExternal({ href: playgroundRouter({ exampleSlug: value }) }),
        ],
      }),
  }),
)

const foldPlaygroundMenu = Update.foldChild({
  update: PlaygroundMenu.update,
  read: (model: Model) => Option.some(model.playgroundMenu),
  write: (model, nextPlaygroundMenu) =>
    evo(model, { playgroundMenu: () => nextPlaygroundMenu }),
  toParentMessage: message => Message.GotPlaygroundMenuMessage({ message }),
  foldOutMessage: foldPlaygroundMenuOutMessage,
})

const foldAsyncCounterDemo = Update.foldChild({
  update: Page.AsyncCounterDemo.update,
  read: (model: Model) => model.asyncCounterDemo,
  write: (model, nextAsyncCounterDemo) =>
    evo(model, { asyncCounterDemo: () => Option.some(nextAsyncCounterDemo) }),
  toParentMessage: message => Message.GotAsyncCounterDemoMessage({ message }),
})

const foldNotePlayerDemo = Update.foldChild({
  update: Page.NotePlayerDemo.update,
  read: (model: Model) => model.notePlayerDemo,
  write: (model, nextNotePlayerDemo) =>
    evo(model, { notePlayerDemo: () => Option.some(nextNotePlayerDemo) }),
  toParentMessage: message => Message.GotNotePlayerDemoMessage({ message }),
})

const foldComingFromReact = Update.foldChild({
  update: Page.ComingFromReact.update,
  read: (model: Model) => Option.some(model.comingFromReact),
  write: (model, nextComingFromReact) =>
    evo(model, { comingFromReact: () => nextComingFromReact }),
  toParentMessage: message => Message.GotComingFromReactMessage({ message }),
})

const readApiReference = (
  model: Model,
): Option.Option<Page.ApiReference.Model> => Option.some(model.apiReference)

const writeApiReference = (
  model: Model,
  nextApiReference: Page.ApiReference.Model,
): Model => evo(model, { apiReference: () => nextApiReference })

const toGotApiReferenceMessage = (
  message: Page.ApiReference.Message,
): Message => Message.GotApiReferenceMessage({ message })

const foldApiReference = Update.foldChild({
  update: Page.ApiReference.update,
  read: readApiReference,
  write: writeApiReference,
  toParentMessage: toGotApiReferenceMessage,
})

const foldApiReferenceRouteChanged = Update.foldChildStep({
  update: Page.ApiReference.informRouteChanged,
  read: readApiReference,
  write: writeApiReference,
  toParentMessage: toGotApiReferenceMessage,
})

const foldUiPages = Update.foldChild({
  update: Page.UiPages.update,
  read: (model: Model) => Option.some(model.uiPages),
  write: (model, nextUiPages) => evo(model, { uiPages: () => nextUiPages }),
  toParentMessage: message => Message.GotUiPageMessage({ message }),
})

const readExampleDetail = (
  model: Model,
): Option.Option<Page.Example.ExampleDetail.Model> =>
  Option.some(model.exampleDetail)

const writeExampleDetail = (
  model: Model,
  nextExampleDetail: Page.Example.ExampleDetail.Model,
): Model => evo(model, { exampleDetail: () => nextExampleDetail })

const toGotExampleDetailMessage = (
  message: Page.Example.ExampleDetail.Message,
): Message => Message.GotExampleDetailMessage({ message })

const foldExampleDetail = Update.foldChild({
  update: Page.Example.ExampleDetail.update,
  read: readExampleDetail,
  write: writeExampleDetail,
  toParentMessage: toGotExampleDetailMessage,
})

const foldExampleDetailRouteChanged = Update.foldChild({
  update: Page.Example.ExampleDetail.informRouteChanged,
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

const foldPlayground = Update.foldChild({
  update: Page.Playground.update,
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
      M.value(request).pipe(
        M.tagsExhaustive({
          Internal: ({
            url,
          }): Readonly<{
            model: Model
            commands?: ReadonlyArray<
              Command.Command<
                | typeof Message.CompletedNavigateInternal
                | typeof Message.CompletedLoadExternal
              >
            >
            outMessage?: never
          }> => {
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
          External: ({
            href,
          }): Readonly<{
            model: Model
            commands?: ReadonlyArray<
              Command.Command<typeof Message.CompletedLoadExternal>
            >
            outMessage?: never
          }> => ({ model, commands: [LoadExternal({ href })] }),
        }),
      ),

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
            : Record_.set(model.sidebarGroups, activeSectionKey, true),
      })

      const routeSteps = M.value(nextRoute).pipe(
        M.withReturnType<ReadonlyArray<UpdateStep>>(),
        M.tag('ApiModule', () => [foldApiReferenceRouteChanged]),
        M.tag('ExampleDetail', ({ exampleSlug }) => [
          foldExampleDetailRouteChanged(exampleSlug),
        ]),
        M.orElse(() => []),
      )

      const maybeScrollSidebar = Option.liftPredicate(
        ScrollSidebarActiveLinkIntoView(),
        () => !isPathnameEqual(model.url, url),
      )

      const maybeScrollToTop = Option.liftPredicate(
        ScrollToTop(),
        () => !isPathnameEqual(model.url, url),
      )

      const nextAsyncCounterDemo = reflectAsyncCounterDemoPresence(
        model.asyncCounterDemo,
        isAsyncCounterDemoVisible(nextRoute, model.activeDemoTab),
      )

      const nextNotePlayerDemo = reflectNotePlayerDemoPresence(
        model.notePlayerDemo,
        isNotePlayerDemoVisible(nextRoute, model.activeDemoTab),
      )

      const nextPlaygroundRoute = pipe(
        nextRoute,
        Option.liftPredicate(isPlaygroundRoute),
        Option.map(({ exampleSlug }) => Page.Playground.init(exampleSlug)),
      )

      const writeRouteFields: UpdateStep = model => ({
        model: evo(model, {
          route: () => nextRoute,
          url: () => url,
          asyncCounterDemo: () => nextAsyncCounterDemo,
          notePlayerDemo: () => nextNotePlayerDemo,
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
        foldMobileMenuDialogClose,
        foldSearchRouteChanged,
        ...routeSteps,
        scrollToRoute,
      ])
    },

    ClickedCopySnippet: ({ text }) => ({
      model,
      commands: [CopySnippet({ text })],
    }),

    ClickedCopyLink: ({ hash }) => ({
      model,
      commands: [
        CopyLink({
          url: urlToString({ ...model.url, hash: Option.some(hash) }),
        }),
      ],
    }),

    SucceededCopySnippet: ({ text }) =>
      HashSet.has(model.copiedSnippets, text)
        ? { model }
        : {
            model: evo(model, {
              copiedSnippets: HashSet.add(text),
            }),
            commands: [WaitBeforeHidingCopiedIndicator({ text })],
          },

    CompletedWaitBeforeHidingCopiedIndicator: ({ text }) => ({
      model: evo(model, {
        copiedSnippets: HashSet.remove(text),
      }),
    }),

    ClickedOpenMobileMenu: () => {
      const mobileMenuDialogOpen = Dialog.open(model.mobileMenuDialog)

      return {
        model: evo(model, {
          mobileMenuDialog: () => mobileMenuDialogOpen.model,
        }),
        commands: [
          ...Command.mapMessages(mobileMenuDialogOpen.commands ?? [], message =>
            Message.GotMobileMenuDialogMessage({ message }),
          ),
          ScrollMobileMenuActiveLinkIntoView(),
        ],
      }
    },

    GotMobileMenuDialogMessage: ({ message }) =>
      foldMobileMenuDialog(model, message),

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
      const browserUiPagesInit = Page.UiPages.init(today)

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
          ...Command.mapMessages(browserUiPagesInit.commands ?? [], message =>
            Message.GotUiPageMessage({ message }),
          ),
        ],
      }
    },

    ToggledAiHeading: () => ({
      model: evo(model, {
        aiHeadingToggleCount: Number_.increment,
      }),
    }),

    SelectedThemePreference: ({ preference }) => {
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

    GotDemoTabsMessage: ({ message }) => foldDemoTabs(model, message),

    GotPlaygroundMenuMessage: ({ message }) =>
      foldPlaygroundMenu(model, message),

    GotAsyncCounterDemoMessage: ({ message }) =>
      foldAsyncCounterDemo(model, message),

    GotNotePlayerDemoMessage: ({ message }) =>
      foldNotePlayerDemo(model, message),

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
        sidebarGroups: Record_.set(key, isOpen),
      })
      return { model: nextModel, commands: [saveSidebarState(nextModel)] }
    },

    ToggledMapMessagesUnderHood: ({ isOpen }) => ({
      model: evo(model, { isMapMessagesUnderHoodOpen: () => isOpen }),
    }),

    GotExampleDetailMessage: ({ message }) => foldExampleDetail(model, message),

    GotSearchMessage: ({ message }) => foldSearch(model, message),

    GotPlaygroundMessage: ({ message }) => foldPlayground(model, message),
    CompletedNavigateInternal: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
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
    FailedCopySnippet: () => ({ model }),
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

const CopySnippet = Command.define('CopySnippet', {
  args: { text: S.String },
  messages: [Message.SucceededCopySnippet, Message.FailedCopySnippet],
  execute: ({ text }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(text),
      catch: () => new Error('Failed to copy to clipboard'),
    }).pipe(
      Effect.as(Message.SucceededCopySnippet({ text })),
      Effect.catch(() => Effect.succeed(Message.FailedCopySnippet())),
    ),
})

const CopyLink = Command.define('CopyLink', {
  args: { url: S.String },
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

const COPY_INDICATOR_DURATION = '2 seconds'

const WaitBeforeHidingCopiedIndicator = Command.define(
  'WaitBeforeHidingCopiedIndicator',
  {
    args: { text: S.String },
    messages: [Message.CompletedWaitBeforeHidingCopiedIndicator],
    execute: ({ text }) =>
      Effect.sleep(COPY_INDICATOR_DURATION).pipe(
        Effect.as(Message.CompletedWaitBeforeHidingCopiedIndicator({ text })),
      ),
  },
)

const ScrollToTop = Command.define('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
  execute: Effect.sync(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    return Message.CompletedScrollToTop()
  }),
})

const ScrollToAnchor = Command.define('ScrollToAnchor', {
  args: { hash: S.String },
  messages: [Message.CompletedScrollToAnchor],
  execute: ({ hash }) =>
    Effect.gen(function* () {
      const target = `#${CSS.escape(hash)}`
      yield* Dom.scrollIntoViewAfterPaint(target, { block: 'start' })
      yield* Dom.focus(target, { preventScroll: true, makeFocusable: true })
    }).pipe(Effect.ignore, Effect.as(Message.CompletedScrollToAnchor())),
})

const ScrollSidebarActiveLinkIntoView = Command.define(
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
      M.value(theme).pipe(
        M.when('Dark', () => {
          document.documentElement.classList.add('dark')
          setThemeColorMeta(DARK_THEME_COLOR)
        }),
        M.when('Light', () => {
          document.documentElement.classList.remove('dark')
          setThemeColorMeta(LIGHT_THEME_COLOR)
        }),
        M.exhaustive,
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
      const json = yield* S.encodeEffect(SidebarStateJsonString)(state)
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
  args: { url: S.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const body = M.value(model.route).pipe(
    M.tag('Home', () => landingView(model, h)),
    M.tag('Newsletter', () => newsletterView(model, h)),
    M.tag('Blog', 'BlogPost', route => blogView(model, route, h)),
    M.tag('Playground', () =>
      Option.match(model.playground, {
        onNone: () => h.empty,
        onSome: playgroundModel =>
          h.submodel({
            slotId: `playground-${playgroundModel.slug}`,
            model: playgroundModel,
            view: Page.Playground.view,
            viewInputs: { maybeIsChromium: model.maybeIsChromium },
            toParentMessage: message =>
              Message.GotPlaygroundMessage({ message }),
          }),
      }),
    ),
    M.orElse(route => docsView(model, route, h)),
  )

  return {
    title: routeTitle(model.route, model.apiReference.apiData),
    body: M.value(model.deployment).pipe(
      M.tagsExhaustive({
        Production: () => body,
        Canary: ({ commit }) => h.div([], [body, canaryBanner(commit)]),
      }),
    ),
  }
}

// TITLE

const SITE_NAME = 'Foldkit'

const resolveApiModuleName = (
  apiData: Page.ApiReference.ApiDataAsyncData,
  moduleSlug: string,
): string =>
  Option.match(AsyncData.getData(apiData), {
    onSome: data =>
      Option.match(
        Page.ApiReference.resolveModule(data.parsedApi, moduleSlug),
        {
          onSome: ({ name }) => name,
          onNone: () => Page.ApiReference.slugToModuleName(moduleSlug),
        },
      ),
    onNone: () => Page.ApiReference.slugToModuleName(moduleSlug),
  })

const routeTitle = (
  route: AppRoute,
  apiData: Page.ApiReference.ApiDataAsyncData,
): string =>
  M.value(route).pipe(
    M.tag('Home', () => SITE_NAME),
    M.tag('Newsletter', () => `Newsletter | ${SITE_NAME}`),
    M.tag('Blog', () => `Blog | ${SITE_NAME}`),
    M.tag('UiOverview', () => `Foldkit UI | ${SITE_NAME}`),
    M.tag('AiOverview', () => `AI | ${SITE_NAME}`),
    M.tag('Testing', () => `Testing | ${SITE_NAME}`),
    M.tag('Examples', () => `Examples | ${SITE_NAME}`),
    M.tag('BlogPost', ({ postSlug }) =>
      Option.match(Page.Blog.findPostBySlug(postSlug), {
        onNone: () => `Not Found | ${SITE_NAME}`,
        onSome: ({ frontmatter }) =>
          `${frontmatter.title} | Blog | ${SITE_NAME}`,
      }),
    ),
    M.tag('NotFound', () => `Not Found | ${SITE_NAME}`),
    M.tag(
      'ApiModule',
      ({ moduleSlug }) =>
        `${resolveApiModuleName(apiData, moduleSlug)} | API | ${SITE_NAME}`,
    ),
    M.tag('ExampleDetail', ({ exampleSlug }) =>
      pipe(
        allPages,
        Array.findFirst(({ _tag }) => _tag === `ExampleDetail:${exampleSlug}`),
        Option.match({
          onNone: () => `${exampleSlug} | Examples | ${SITE_NAME}`,
          onSome: ({ label }) => `${label} | Examples | ${SITE_NAME}`,
        }),
      ),
    ),
    M.tag('Playground', ({ exampleSlug }) =>
      pipe(
        allPages,
        Array.findFirst(({ _tag }) => _tag === `ExampleDetail:${exampleSlug}`),
        Option.match({
          onNone: () => `Playground | ${SITE_NAME}`,
          onSome: ({ label }) => `${label} | Playground | ${SITE_NAME}`,
        }),
      ),
    ),
    M.orElse(({ _tag }) =>
      pipe(
        allPages,
        Array.findFirst(page => page._tag === _tag),
        Option.match({
          onNone: () => SITE_NAME,
          onSome: page => `${page.label} | ${SITE_NAME}`,
        }),
      ),
    ),
  )

// SUBSCRIPTION

const uiPagesSubscriptions = Subscription.lift(Page.UiPages.subscriptions)<
  Model,
  Message
>({
  toChildModel: model => model.uiPages,
  toParentMessage: message => Message.GotUiPageMessage({ message }),
})

export const subscriptions = Subscription.aggregate<Model, Message>()(
  Subscriptions.AiHeading.subscriptions,
  Subscriptions.ActiveSection.subscriptions,
  uiPagesSubscriptions,
  Subscriptions.SearchShortcut.subscriptions,
  Subscriptions.SystemTheme.subscriptions,
  Subscriptions.ViewportWidth.subscriptions,
)

// MANAGED RESOURCES

const playgroundManagedResources = ManagedResource.lift(
  Page.Playground.managedResources,
)<Model, Message>({
  toChildModel: model => model.playground,
  toParentMessage: message => Message.GotPlaygroundMessage({ message }),
})

const notePlayerDemoManagedResources = ManagedResource.lift(
  Page.NotePlayerDemo.managedResources,
)<Model, Message>({
  toChildModel: model => model.notePlayerDemo,
  toParentMessage: message => Message.GotNotePlayerDemoMessage({ message }),
})

export const managedResources = ManagedResource.aggregate<Model, Message>()(
  playgroundManagedResources,
  notePlayerDemoManagedResources,
)

// TRACER
// NOTE: Custom dev tracer disabled pending Effect v4 beta Tracer/Layer API rewrite.
// v4 beta removed Layer.setTracer and changed Tracer.make's signature; restore
// once we adopt the new Tracer construction pattern.
export const devTracerLayer: Layer.Layer<never> = Layer.empty
