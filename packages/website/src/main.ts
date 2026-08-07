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
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { KeyValueStore } from 'effect/unstable/persistence'
import {
  AsyncData,
  Calendar,
  Command,
  Dom,
  FieldValidation,
  Http,
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
import {
  DOCS_SIDEBAR_NAV_ID,
  MOBILE_MENU_NAV_ID,
  allPages,
  findActiveSectionKey,
} from './docsNav'
import {
  CompletedApplyTheme,
  CompletedInjectAnalytics,
  CompletedInjectSpeedInsights,
  CompletedLoadExternal,
  CompletedNavigateInternal,
  CompletedSaveSidebarState,
  CompletedSaveThemePreference,
  CompletedScrollMobileMenuActiveLinkIntoView,
  CompletedScrollSidebarActiveLinkIntoView,
  CompletedScrollToAnchor,
  CompletedScrollToTop,
  CompletedWaitBeforeHidingCopiedIndicator,
  FailedCopyLink,
  FailedCopySnippet,
  FailedSubscribeToNewsletter,
  GotApiReferenceMessage,
  GotAsyncCounterDemoMessage,
  GotComingFromReactMessage,
  GotDemoTabsMessage,
  GotExampleDetailMessage,
  GotMobileMenuDialogMessage,
  GotNotePlayerDemoMessage,
  GotPlaygroundMenuMessage,
  GotPlaygroundMessage,
  GotSearchMessage,
  GotUiPageMessage,
  Message,
  ResolvedTheme,
  SucceededCopyLink,
  SucceededCopySnippet,
  SucceededSubscribeToNewsletter,
  ThemePreference,
} from './message'
import * as Page from './page'
import { type ExampleSlug } from './page/example/meta'
import {
  AppRoute,
  isLandingHeaderAlwaysVisible,
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
import { docsView, landingView, newsletterView } from './view'

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
  preference: typeof ThemePreference.Type,
  systemTheme: typeof ResolvedTheme.Type,
): typeof ResolvedTheme.Type =>
  M.value(preference).pipe(
    M.withReturnType<typeof ResolvedTheme.Type>(),
    M.when('Dark', () => 'Dark'),
    M.when('Light', () => 'Light'),
    M.when('System', () => systemTheme),
    M.exhaustive,
  )

const emailRules = FieldValidation.makeRules({
  required: 'Email is required',
  rules: [FieldValidation.Rule.email('Please enter a valid email address')],
})

const EmailSubscriptionStatus = S.Literals([
  'Idle',
  'Submitting',
  'Succeeded',
  'Failed',
])
export type EmailSubscriptionStatus = typeof EmailSubscriptionStatus.Type

// FLAGS

export const Flags = S.Struct({
  themePreference: S.Option(ThemePreference),
  maybeSidebarState: S.Option(SidebarState),
  systemTheme: ResolvedTheme,
  isNarrowViewport: S.Boolean,
  isChromium: S.Boolean,
  currentYear: S.Number,
  today: Calendar.CalendarDate,
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

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const themePreference: Option.Option<typeof ThemePreference.Type> =
    yield* Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const json = yield* Effect.fromOption(
        Option.fromNullishOr(yield* store.get(THEME_STORAGE_KEY)),
      )
      const theme = yield* S.decodeEffect(S.fromJsonString(ThemePreference))(
        json,
      )
      return Option.some(theme)
    }).pipe(
      Effect.catch(() =>
        Effect.succeed(Option.none<typeof ThemePreference.Type>()),
      ),
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

  const systemTheme: typeof ResolvedTheme.Type = yield* Effect.sync(() =>
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

  return {
    themePreference,
    maybeSidebarState,
    systemTheme,
    isNarrowViewport,
    isChromium,
    currentYear,
    today,
  }
})

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  url: Url,
  copiedSnippets: S.HashSet(S.String),
  emailField: FieldValidation.Field(S.String),
  emailSubscriptionStatus: EmailSubscriptionStatus,
  maybeGitHubStarCount: S.Option(S.Number),
  currentYear: S.Number,
  mobileMenuDialog: Dialog.Model,
  isMobileTableOfContentsOpen: S.Boolean,
  activeSection: S.Option(S.String),
  isLandingHeaderVisible: S.Boolean,
  isNarrowViewport: S.Boolean,
  isChromium: S.Boolean,
  playground: S.Option(Page.Playground.Model),
  sidebarGroups: SidebarGroups,
  isMapMessagesUnderHoodOpen: S.Boolean,
  aiHeadingToggleCount: S.Number,
  themePreference: ThemePreference,
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
      const [asyncCounterDemo] = Page.AsyncCounterDemo.init()
      return Option.some(asyncCounterDemo)
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
      const [notePlayerDemo] = Page.NotePlayerDemo.init()
      return Option.some(notePlayerDemo)
    })
  } else {
    return Option.none()
  }
}

export const init: Runtime.RoutingApplicationInit<
  Model,
  Message,
  Flags,
  AppResources,
  AppManagedResources
> = (flags: Flags, url: Url) => {
  const themePreference = Option.getOrElse(
    flags.themePreference,
    () => 'System' as const,
  )
  const { systemTheme } = flags
  const resolvedTheme = resolveTheme(themePreference, systemTheme)

  const demoTabs = Tabs.init({
    id: 'demo-tabs',
  })

  const activeDemoTab: DemoTab.Tab = 'Architecture'

  const playgroundMenu = Menu.init({
    id: 'playground-menu',
    isAnimated: true,
  })

  const [uiPages, uiPagesCommands] = Page.UiPages.init(flags.today)
  const [comingFromReact, comingFromReactCommands] = Page.ComingFromReact.init()
  const initialRoute = urlToAppRoute(url)

  const asyncCounterDemo = reflectAsyncCounterDemoPresence(
    Option.none(),
    isAsyncCounterDemoVisible(initialRoute, activeDemoTab),
  )

  const notePlayerDemo = reflectNotePlayerDemoPresence(
    Option.none(),
    isNotePlayerDemoVisible(initialRoute, activeDemoTab),
  )

  const [apiReference, apiReferenceCommands] = Page.ApiReference.boot()

  const maybeInitialExampleSlug = pipe(
    initialRoute,
    Option.liftPredicate(route => route._tag === 'ExampleDetail'),
    Option.map(({ exampleSlug }) => exampleSlug),
  )
  const [exampleDetail, exampleDetailCommands] =
    Page.Example.ExampleDetail.boot(maybeInitialExampleSlug)

  const maybeInitialActiveSectionKey = findActiveSectionKey(
    initialRoute._tag,
    maybeInitialExampleSlug,
  )

  const mappedUiPagesCommands = Command.mapMessages(uiPagesCommands, message =>
    GotUiPageMessage({ message }),
  )

  const mappedComingFromReactCommands = Command.mapMessages(
    comingFromReactCommands,
    message => GotComingFromReactMessage({ message }),
  )

  const mappedApiReferenceCommands = Command.mapMessages(
    apiReferenceCommands,
    message => GotApiReferenceMessage({ message }),
  )

  const mappedExampleDetailCommands = Command.mapMessages(
    exampleDetailCommands,
    message => GotExampleDetailMessage({ message }),
  )

  return [
    {
      route: initialRoute,
      url,
      copiedSnippets: HashSet.empty(),
      emailField: FieldValidation.NotValidated({ value: '' }),
      emailSubscriptionStatus: 'Idle',
      maybeGitHubStarCount: Option.fromNullishOr(githubStarCount),
      currentYear: flags.currentYear,
      mobileMenuDialog: Dialog.init({ id: 'mobile-menu' }),
      isMobileTableOfContentsOpen: false,
      activeSection: Option.none(),
      aiHeadingToggleCount: 0,
      isLandingHeaderVisible: isLandingHeaderAlwaysVisible(initialRoute),
      isNarrowViewport: flags.isNarrowViewport,
      isChromium: flags.isChromium,
      playground: pipe(
        initialRoute,
        Option.liftPredicate(isPlaygroundRoute),
        Option.map(({ exampleSlug }) => Page.Playground.init(exampleSlug)),
      ),
      sidebarGroups: initialSidebarGroups(
        flags.maybeSidebarState,
        maybeInitialActiveSectionKey,
      ),
      isMapMessagesUnderHoodOpen: false,
      themePreference,
      systemTheme,
      resolvedTheme,
      demoTabs,
      activeDemoTab,
      playgroundMenu,
      asyncCounterDemo,
      notePlayerDemo,
      uiPages,
      comingFromReact,
      apiReference,
      exampleDetail,
      search: Search.init()[0],
    },
    [
      InjectAnalytics(),
      InjectSpeedInsights(),
      ApplyTheme({ theme: resolvedTheme }),
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
  ]
}

// UPDATE

const isPathnameEqual = (a: Url, b: Url): boolean => a.pathname === b.pathname

const foldMobileMenuDialog = Update.foldChild({
  update: Dialog.update,
  read: (model: Model) => Option.some(model.mobileMenuDialog),
  write: (model, nextMobileMenuDialog) =>
    evo(model, { mobileMenuDialog: () => nextMobileMenuDialog }),
  toParentMessage: message => GotMobileMenuDialogMessage({ message }),
  foldOutMessage: M.type<Dialog.OutMessage>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      Opened: () => model => [model, []],
      Closed: () => model => [model, []],
    }),
  ),
})

const foldDemoTabs = Update.foldChild({
  update: DemoTab.DemoTabs.update,
  read: (model: Model) => Option.some(model.demoTabs),
  write: (model, nextDemoTabs) => evo(model, { demoTabs: () => nextDemoTabs }),
  toParentMessage: message => GotDemoTabsMessage({ message }),
  foldOutMessage: M.type<Tabs.OutMessage<DemoTab.Tab>>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      Selected:
        ({ value }) =>
        model => [
          evo(model, {
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
          [],
        ],
    }),
  ),
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
      model => [
        model,
        [LoadExternal({ href: playgroundRouter({ exampleSlug: value }) })],
      ],
  }),
)

const foldPlaygroundMenu = Update.foldChild({
  update: PlaygroundMenu.update,
  read: (model: Model) => Option.some(model.playgroundMenu),
  write: (model, nextPlaygroundMenu) =>
    evo(model, { playgroundMenu: () => nextPlaygroundMenu }),
  toParentMessage: message => GotPlaygroundMenuMessage({ message }),
  foldOutMessage: foldPlaygroundMenuOutMessage,
})

const foldAsyncCounterDemo = Update.foldChild({
  update: Page.AsyncCounterDemo.update,
  read: (model: Model) => model.asyncCounterDemo,
  write: (model, nextAsyncCounterDemo) =>
    evo(model, { asyncCounterDemo: () => Option.some(nextAsyncCounterDemo) }),
  toParentMessage: message => GotAsyncCounterDemoMessage({ message }),
})

const foldNotePlayerDemo = Update.foldChild({
  update: Page.NotePlayerDemo.update,
  read: (model: Model) => model.notePlayerDemo,
  write: (model, nextNotePlayerDemo) =>
    evo(model, { notePlayerDemo: () => Option.some(nextNotePlayerDemo) }),
  toParentMessage: message => GotNotePlayerDemoMessage({ message }),
})

const foldComingFromReact = Update.foldChild({
  update: Page.ComingFromReact.update,
  read: (model: Model) => Option.some(model.comingFromReact),
  write: (model, nextComingFromReact) =>
    evo(model, { comingFromReact: () => nextComingFromReact }),
  toParentMessage: message => GotComingFromReactMessage({ message }),
})

const foldApiReference = Update.foldChild({
  update: Page.ApiReference.update,
  read: (model: Model) => Option.some(model.apiReference),
  write: (model, nextApiReference) =>
    evo(model, { apiReference: () => nextApiReference }),
  toParentMessage: message => GotApiReferenceMessage({ message }),
})

const foldUiPages = Update.foldChild({
  update: Page.UiPages.update,
  read: (model: Model) => Option.some(model.uiPages),
  write: (model, nextUiPages) => evo(model, { uiPages: () => nextUiPages }),
  toParentMessage: message => GotUiPageMessage({ message }),
})

const foldExampleDetail = Update.foldChild({
  update: Page.Example.ExampleDetail.update,
  read: (model: Model) => Option.some(model.exampleDetail),
  write: (model, nextExampleDetail) =>
    evo(model, { exampleDetail: () => nextExampleDetail }),
  toParentMessage: message => GotExampleDetailMessage({ message }),
})

const foldSearch = Update.foldChild({
  update: Search.update,
  read: (model: Model) => Option.some(model.search),
  write: (model, nextSearch) => evo(model, { search: () => nextSearch }),
  toParentMessage: message => GotSearchMessage({ message }),
})

const foldPlayground = Update.foldChild({
  update: Page.Playground.update,
  read: (model: Model) => model.playground,
  write: (model, nextPlayground) =>
    evo(model, { playground: () => Option.some(nextPlayground) }),
  toParentMessage: message => GotPlaygroundMessage({ message }),
})

export const update = (
  model: Model,
  message: Message,
): readonly [
  Model,
  ReadonlyArray<
    Command.Command<Message, never, AppResources | AppManagedResources>
  >,
] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [
        Model,
        ReadonlyArray<
          Command.Command<Message, never, AppResources | AppManagedResources>
        >,
      ]
    >(),
    M.tags({
      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({
              url,
            }): [
              Model,
              ReadonlyArray<
                Command.Command<
                  | typeof CompletedNavigateInternal
                  | typeof CompletedLoadExternal
                >
              >,
            ] => {
              // NOTE: WebContainer requires `window.crossOriginIsolated`,
              // which only becomes true when the document is loaded with
              // the COEP/COOP response headers set in deploy-website.yml
              // and vite.config.ts. SPA navigation reuses the previous
              // page's document (no headers), so we navigate to playground
              // URLs by loading a fresh document instead.
              if (isPlaygroundRoute(urlToAppRoute(url))) {
                return [model, [LoadExternal({ href: urlToString(url) })]]
              }
              return [model, [NavigateInternal({ url: urlToString(url) })]]
            },
            External: ({
              href,
            }): [
              Model,
              ReadonlyArray<Command.Command<typeof CompletedLoadExternal>>,
            ] => [model, [LoadExternal({ href })]],
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

        const [closedMobileMenu, closeMobileMenuCommands] = Dialog.close(
          model.mobileMenuDialog,
        )

        const [nextSearch, searchResetCommands] = Search.informRouteChanged(
          model.search,
        )

        const [nextApiReference, apiReferenceLoadCommands] = M.value(
          nextRoute,
        ).pipe(
          M.withReturnType<ReturnType<typeof Page.ApiReference.update>>(),
          M.tag('ApiModule', () =>
            Page.ApiReference.informRouteChanged(model.apiReference),
          ),
          M.orElse(() => [model.apiReference, []]),
        )

        const [nextExampleDetail, exampleDetailLoadCommands] = M.value(
          nextRoute,
        ).pipe(
          M.withReturnType<
            ReturnType<typeof Page.Example.ExampleDetail.update>
          >(),
          M.tag('ExampleDetail', ({ exampleSlug }) =>
            Page.Example.ExampleDetail.informRouteChanged(
              model.exampleDetail,
              exampleSlug,
            ),
          ),
          M.orElse(() => [model.exampleDetail, []]),
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

        return [
          evo(model, {
            route: () => nextRoute,
            url: () => url,
            asyncCounterDemo: () => nextAsyncCounterDemo,
            notePlayerDemo: () => nextNotePlayerDemo,
            mobileMenuDialog: () => closedMobileMenu,
            apiReference: () => nextApiReference,
            exampleDetail: () => nextExampleDetail,
            playground: () => nextPlaygroundRoute,
            search: () => nextSearch,
            isLandingHeaderVisible: () =>
              isLandingHeaderAlwaysVisible(nextRoute),
            sidebarGroups: () => nextSidebarGroups,
          }),
          [
            ...Command.mapMessages(closeMobileMenuCommands, message =>
              GotMobileMenuDialogMessage({ message }),
            ),
            ...Command.mapMessages(searchResetCommands, message =>
              GotSearchMessage({ message }),
            ),
            ...Command.mapMessages(apiReferenceLoadCommands, message =>
              GotApiReferenceMessage({ message }),
            ),
            ...Command.mapMessages(exampleDetailLoadCommands, message =>
              GotExampleDetailMessage({ message }),
            ),
            ...Option.match(url.hash, {
              onNone: () => Option.toArray(maybeScrollToTop),
              onSome: hash => [ScrollToAnchor({ hash })],
            }),
            ...Option.toArray(maybeScrollSidebar),
          ],
        ]
      },

      ClickedCopySnippet: ({ text }) => [model, [CopySnippet({ text })]],

      ClickedCopyLink: ({ hash }) => [
        model,
        [
          CopyLink({
            url: urlToString({ ...model.url, hash: Option.some(hash) }),
          }),
        ],
      ],

      SucceededCopySnippet: ({ text }) =>
        HashSet.has(model.copiedSnippets, text)
          ? [model, []]
          : [
              evo(model, {
                copiedSnippets: HashSet.add(text),
              }),
              [WaitBeforeHidingCopiedIndicator({ text })],
            ],

      CompletedWaitBeforeHidingCopiedIndicator: ({ text }) => [
        evo(model, {
          copiedSnippets: HashSet.remove(text),
        }),
        [],
      ],

      UpdatedEmailField: ({ value }) => [
        evo(model, {
          emailField: () => FieldValidation.NotValidated({ value }),
          emailSubscriptionStatus: () => 'Idle',
        }),
        [],
      ],

      SubmittedEmailForm: () => {
        const result = validateEmail(model.emailField.value)

        return result._tag === 'Valid'
          ? [
              evo(model, {
                emailField: () => result,
                emailSubscriptionStatus: () => 'Submitting',
              }),
              [SubscribeToNewsletter({ email: model.emailField.value })],
            ]
          : [evo(model, { emailField: () => result }), []]
      },

      SucceededSubscribeToNewsletter: () => [
        evo(model, {
          emailField: () => FieldValidation.NotValidated({ value: '' }),
          emailSubscriptionStatus: () => 'Succeeded',
        }),
        [],
      ],

      FailedSubscribeToNewsletter: () => [
        evo(model, {
          emailSubscriptionStatus: () => 'Failed',
        }),
        [],
      ],

      ClickedOpenMobileMenu: () => {
        const [nextMobileMenuDialog, mobileMenuDialogCommands] = Dialog.open(
          model.mobileMenuDialog,
        )

        return [
          evo(model, {
            mobileMenuDialog: () => nextMobileMenuDialog,
          }),
          [
            ...Command.mapMessages(mobileMenuDialogCommands, message =>
              GotMobileMenuDialogMessage({ message }),
            ),
            ScrollMobileMenuActiveLinkIntoView(),
          ],
        ]
      },

      GotMobileMenuDialogMessage: ({ message }) =>
        foldMobileMenuDialog(message)(model),

      ToggledMobileTableOfContents: ({ isOpen }) => [
        evo(model, { isMobileTableOfContentsOpen: () => isOpen }),
        [],
      ],

      ClickedMobileTableOfContentsLink: ({ sectionId }) => [
        evo(model, {
          isMobileTableOfContentsOpen: () => false,
          activeSection: () => Option.some(sectionId),
        }),
        [],
      ],

      ChangedActiveSection: ({ sectionId }) => [
        evo(model, {
          activeSection: () => Option.some(sectionId),
        }),
        [],
      ],

      ChangedHeroVisibility: ({ isVisible }) => [
        evo(model, { isLandingHeaderVisible: () => !isVisible }),
        [],
      ],

      ChangedViewportWidth: ({ isNarrow }) => [
        evo(model, { isNarrowViewport: () => isNarrow }),
        [],
      ],

      ToggledAiHeading: () => [
        evo(model, {
          aiHeadingToggleCount: Number_.increment,
        }),
        [],
      ],

      SelectedThemePreference: ({ preference }) => {
        const resolvedTheme = resolveTheme(preference, model.systemTheme)

        return [
          evo(model, {
            themePreference: () => preference,
            resolvedTheme: () => resolvedTheme,
          }),
          [
            ApplyTheme({ theme: resolvedTheme }),
            SaveThemePreference({ preference }),
          ],
        ]
      },

      GotDemoTabsMessage: ({ message }) => foldDemoTabs(message)(model),

      GotPlaygroundMenuMessage: ({ message }) =>
        foldPlaygroundMenu(message)(model),

      GotAsyncCounterDemoMessage: ({ message }) =>
        foldAsyncCounterDemo(message)(model),

      GotNotePlayerDemoMessage: ({ message }) =>
        foldNotePlayerDemo(message)(model),

      ChangedSystemTheme: ({ theme }) => {
        const resolvedTheme = resolveTheme(model.themePreference, theme)

        return [
          evo(model, {
            systemTheme: () => theme,
            resolvedTheme: () => resolvedTheme,
          }),
          [ApplyTheme({ theme: resolvedTheme })],
        ]
      },

      GotComingFromReactMessage: ({ message }) =>
        foldComingFromReact(message)(model),

      GotApiReferenceMessage: ({ message }) => foldApiReference(message)(model),

      GotUiPageMessage: ({ message }) => foldUiPages(message)(model),

      ToggledSidebarGroup: ({ key, isOpen }) => {
        const nextModel = evo(model, {
          sidebarGroups: Record_.set(key, isOpen),
        })
        return [nextModel, [saveSidebarState(nextModel)]]
      },

      ToggledMapMessagesUnderHood: ({ isOpen }) => [
        evo(model, { isMapMessagesUnderHoodOpen: () => isOpen }),
        [],
      ],

      GotExampleDetailMessage: ({ message }) =>
        foldExampleDetail(message)(model),

      GotSearchMessage: ({ message }) => foldSearch(message)(model),

      GotPlaygroundMessage: ({ message }) => foldPlayground(message)(model),
    }),
    M.tag(
      'CompletedNavigateInternal',
      'CompletedLoadExternal',
      'CompletedInjectAnalytics',
      'CompletedInjectSpeedInsights',
      'CompletedScrollToTop',
      'CompletedScrollToAnchor',
      'CompletedScrollSidebarActiveLinkIntoView',
      'CompletedScrollMobileMenuActiveLinkIntoView',
      'CompletedApplyTheme',
      'CompletedSaveThemePreference',
      'CompletedSaveSidebarState',
      'SucceededCopyLink',
      'FailedCopyLink',
      'FailedCopySnippet',
      () => [model, []],
    ),
    M.exhaustive,
  )

// COMMAND

const InjectAnalytics = Command.define('InjectAnalytics', {
  messages: [CompletedInjectAnalytics],
  execute: Effect.sync(() => inject()).pipe(
    Effect.as(CompletedInjectAnalytics()),
  ),
})

const InjectSpeedInsights = Command.define('InjectSpeedInsights', {
  messages: [CompletedInjectSpeedInsights],
  execute: Effect.sync(() => SpeedInsights.injectSpeedInsights()).pipe(
    Effect.as(CompletedInjectSpeedInsights()),
  ),
})

const CopySnippet = Command.define('CopySnippet', {
  args: { text: S.String },
  messages: [SucceededCopySnippet, FailedCopySnippet],
  execute: ({ text }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(text),
      catch: () => new Error('Failed to copy to clipboard'),
    }).pipe(
      Effect.as(SucceededCopySnippet({ text })),
      Effect.catch(() => Effect.succeed(FailedCopySnippet())),
    ),
})

const CopyLink = Command.define('CopyLink', {
  args: { url: S.String },
  messages: [SucceededCopyLink, FailedCopyLink],
  execute: ({ url }) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(url),
      catch: () => new Error('Failed to copy link to clipboard'),
    }).pipe(
      Effect.as(SucceededCopyLink()),
      Effect.catch(() => Effect.succeed(FailedCopyLink())),
    ),
})

const COPY_INDICATOR_DURATION = '2 seconds'

const WaitBeforeHidingCopiedIndicator = Command.define(
  'WaitBeforeHidingCopiedIndicator',
  {
    args: { text: S.String },
    messages: [CompletedWaitBeforeHidingCopiedIndicator],
    execute: ({ text }) =>
      Effect.sleep(COPY_INDICATOR_DURATION).pipe(
        Effect.as(CompletedWaitBeforeHidingCopiedIndicator({ text })),
      ),
  },
)

const ScrollToTop = Command.define('ScrollToTop', {
  messages: [CompletedScrollToTop],
  execute: Effect.sync(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    return CompletedScrollToTop()
  }),
})

const ScrollToAnchor = Command.define('ScrollToAnchor', {
  args: { hash: S.String },
  messages: [CompletedScrollToAnchor],
  execute: ({ hash }) =>
    Effect.gen(function* () {
      const target = `#${CSS.escape(hash)}`
      yield* Dom.scrollIntoViewAfterPaint(target, { block: 'start' })
      yield* Dom.focus(target, { preventScroll: true, makeFocusable: true })
    }).pipe(Effect.ignore, Effect.as(CompletedScrollToAnchor())),
})

const ScrollSidebarActiveLinkIntoView = Command.define(
  'ScrollSidebarActiveLinkIntoView',
  {
    messages: [CompletedScrollSidebarActiveLinkIntoView],
    execute: Dom.scrollIntoViewIfNotVisible(
      `#${DOCS_SIDEBAR_NAV_ID} [aria-current="page"]`,
    ).pipe(
      Effect.ignore,
      Effect.as(CompletedScrollSidebarActiveLinkIntoView()),
    ),
  },
)

const MOBILE_MENU_ACTIVE_LINK = `#${MOBILE_MENU_NAV_ID} [aria-current="page"]`

const ScrollMobileMenuActiveLinkIntoView = Command.define(
  'ScrollMobileMenuActiveLinkIntoView',
  {
    messages: [CompletedScrollMobileMenuActiveLinkIntoView],
    execute: Dom.scrollIntoViewIfNotVisible(MOBILE_MENU_ACTIVE_LINK, {
      when: 'Commit',
    }).pipe(
      Effect.ignore,
      Effect.as(CompletedScrollMobileMenuActiveLinkIntoView()),
    ),
  },
)

const ApplyTheme = Command.define('ApplyTheme', {
  args: { theme: ResolvedTheme },
  messages: [CompletedApplyTheme],
  execute: ({ theme }) =>
    Effect.sync(() => {
      M.value(theme).pipe(
        M.when('Dark', () => document.documentElement.classList.add('dark')),
        M.when('Light', () =>
          document.documentElement.classList.remove('dark'),
        ),
        M.exhaustive,
      )
      return CompletedApplyTheme()
    }),
})

const BUTTONDOWN_SUBSCRIBE_URL =
  'https://buttondown.com/api/emails/embed-subscribe/foldkit'

const validateEmail = FieldValidation.validate(emailRules)

const SubscribeToNewsletter = Command.define('SubscribeToNewsletter', {
  args: { email: S.String },
  messages: [SucceededSubscribeToNewsletter, FailedSubscribeToNewsletter],
  execute: ({ email }) =>
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const request = HttpClientRequest.post(BUTTONDOWN_SUBSCRIBE_URL).pipe(
        HttpClientRequest.bodyUrlParams({ email }),
      )
      const response = yield* client.execute(request)

      if (response.status >= 400) {
        return yield* Effect.fail('Subscription failed')
      }

      return SucceededSubscribeToNewsletter()
    }).pipe(
      Effect.catch(() => Effect.succeed(FailedSubscribeToNewsletter())),
      Effect.provide(Http.layer),
    ),
})

const SaveThemePreference = Command.define('SaveThemePreference', {
  args: { preference: ThemePreference },
  messages: [CompletedSaveThemePreference],
  execute: ({ preference }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(THEME_STORAGE_KEY, JSON.stringify(preference))
      return CompletedSaveThemePreference()
    }).pipe(
      Effect.catch(() => Effect.succeed(CompletedSaveThemePreference())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
})

const SaveSidebarState = Command.define('SaveSidebarState', {
  args: { state: SidebarState },
  messages: [CompletedSaveSidebarState],
  execute: ({ state }) =>
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      const json = yield* S.encodeEffect(SidebarStateJsonString)(state)
      yield* store.set(SIDEBAR_STORAGE_KEY, json)
      return CompletedSaveSidebarState()
    }).pipe(
      Effect.catch(() => Effect.succeed(CompletedSaveSidebarState())),
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
  messages: [CompletedNavigateInternal],
  execute: ({ url }) =>
    pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: S.String },
  messages: [CompletedLoadExternal],
  execute: ({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())),
})

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: routeTitle(model.route, model.apiReference.apiData),
  body: M.value(model.route).pipe(
    M.tag('Home', () => landingView(model, h)),
    M.tag('Newsletter', () => newsletterView(model, h)),
    M.tag('Playground', () =>
      Option.match(model.playground, {
        onNone: () => h.empty,
        onSome: playgroundModel =>
          h.submodel({
            slotId: `playground-${playgroundModel.slug}`,
            model: playgroundModel,
            view: Page.Playground.view,
            viewInputs: { isChromium: model.isChromium },
            toParentMessage: message => GotPlaygroundMessage({ message }),
          }),
      }),
    ),
    M.orElse(route => docsView(model, route, h)),
  ),
})

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
  toParentMessage: message => GotUiPageMessage({ message }),
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
  toParentMessage: message => GotPlaygroundMessage({ message }),
})

const notePlayerDemoManagedResources = ManagedResource.lift(
  Page.NotePlayerDemo.managedResources,
)<Model, Message>({
  toChildModel: model => model.notePlayerDemo,
  toParentMessage: message => GotNotePlayerDemoMessage({ message }),
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
