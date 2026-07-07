import {
  Array,
  DateTime,
  Effect,
  Equal,
  HashSet,
  Layer,
  Match as M,
  Number as Number_,
  Option,
  Schema as S,
  pipe,
} from 'effect'
import { HttpClient, HttpClientRequest } from 'effect/unstable/http'
import { KeyValueStore } from 'effect/unstable/persistence'
import {
  Calendar,
  Command,
  Dom,
  FieldValidation,
  Http,
  ManagedResource,
  Runtime,
  Subscription,
} from 'foldkit'
import { type Document, html } from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { BrowserKeyValueStore } from '@effect/platform-browser'
import { Dialog, Disclosure, Menu, Tabs } from '@foldkit/ui'
import { inject } from '@vercel/analytics'
import * as SpeedInsights from '@vercel/speed-insights'

import * as DemoTab from './demoTab'
import {
  DOCS_SIDEBAR_NAV_ID,
  MOBILE_MENU_NAV_ID,
  allPages,
  findActiveSectionKey,
} from './docsNav'
import { GitHubStarsRemoteData } from './githubStars'
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
  FailedCopyLink,
  FailedCopySnippet,
  FailedFetchGitHubStars,
  FailedSubscribeToNewsletter,
  GotAiGroupMessage,
  GotApiReferenceGroupMessage,
  GotApiReferenceMessage,
  GotAsyncCounterDemoMessage,
  GotBestPracticesGroupMessage,
  GotComingFromReactMessage,
  GotComparisonsGroupMessage,
  GotCoreConceptsGroupMessage,
  GotDemoTabsMessage,
  GotExampleDetailMessage,
  GotExamplesGroupMessage,
  GotFaqGroupMessage,
  GotFoldkitUiGroupMessage,
  GotGetStartedGroupMessage,
  GotMobileMenuDialogMessage,
  GotNotePlayerDemoMessage,
  GotPatternsGroupMessage,
  GotPlaygroundMenuMessage,
  GotPlaygroundMessage,
  GotSearchMessage,
  GotSubmodelMapMessagesDisclosureMessage,
  GotTestingGroupMessage,
  GotToolingGroupMessage,
  GotUiPageMessage,
  HidCopiedIndicator,
  Message,
  ResolvedTheme,
  SucceededCopyLink,
  SucceededCopySnippet,
  SucceededFetchGitHubStars,
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
  type GroupKey,
  SIDEBAR_STORAGE_KEY,
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
  githubStars: GitHubStarsRemoteData.Union,
  currentYear: S.Number,
  mobileMenuDialog: Dialog.Model,
  isMobileTableOfContentsOpen: S.Boolean,
  activeSection: S.Option(S.String),
  isLandingHeaderVisible: S.Boolean,
  isNarrowViewport: S.Boolean,
  isChromium: S.Boolean,
  playground: S.Option(Page.Playground.Model),
  getStartedGroup: Disclosure.Model,
  coreConceptsGroup: Disclosure.Model,
  comparisonsGroup: Disclosure.Model,
  faqGroup: Disclosure.Model,
  testingGroup: Disclosure.Model,
  bestPracticesGroup: Disclosure.Model,
  patternsGroup: Disclosure.Model,
  toolingGroup: Disclosure.Model,
  foldkitUiGroup: Disclosure.Model,
  aiGroup: Disclosure.Model,
  examplesGroup: Disclosure.Model,
  apiReferenceGroup: Disclosure.Model,
  submodelMapMessagesDisclosure: Disclosure.Model,
  aiHeadingToggleCount: S.Number,
  themePreference: ThemePreference,
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  demoTabs: Tabs.Model,
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

const isAsyncCounterDemoVisible = (
  route: AppRoute,
  demoTabs: Tabs.Model,
): boolean =>
  route._tag === 'Home' && DemoTab.isActive('Architecture')(demoTabs)

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
  demoTabs: Tabs.Model,
): boolean => route._tag === 'Home' && DemoTab.isActive('Note Player')(demoTabs)

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

  const playgroundMenu = Menu.init({
    id: 'playground-menu',
    isAnimated: true,
  })

  const [uiPages, uiPagesCommands] = Page.UiPages.init(flags.today)
  const [comingFromReact, comingFromReactCommands] = Page.ComingFromReact.init()
  const initialRoute = urlToAppRoute(url)

  const asyncCounterDemo = reflectAsyncCounterDemoPresence(
    Option.none(),
    isAsyncCounterDemoVisible(initialRoute, demoTabs),
  )

  const notePlayerDemo = reflectNotePlayerDemoPresence(
    Option.none(),
    isNotePlayerDemoVisible(initialRoute, demoTabs),
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
      githubStars: GitHubStarsRemoteData.Loading(),
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
      getStartedGroup: Disclosure.init({
        id: 'get-started-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'getStarted',
        ),
      }),
      coreConceptsGroup: Disclosure.init({
        id: 'core-concepts-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'coreConcepts',
        ),
      }),
      comparisonsGroup: Disclosure.init({
        id: 'comparisons-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'comparisons',
        ),
      }),
      faqGroup: Disclosure.init({
        id: 'faq-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'faq',
        ),
      }),
      testingGroup: Disclosure.init({
        id: 'testing-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'testing',
        ),
      }),
      bestPracticesGroup: Disclosure.init({
        id: 'best-practices-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'bestPractices',
        ),
      }),
      patternsGroup: Disclosure.init({
        id: 'patterns-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'patterns',
        ),
      }),
      toolingGroup: Disclosure.init({
        id: 'tooling-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'tooling',
        ),
      }),
      foldkitUiGroup: Disclosure.init({
        id: 'foldkit-ui-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'foldkitUi',
        ),
      }),
      aiGroup: Disclosure.init({
        id: 'ai-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'ai',
        ),
      }),
      examplesGroup: Disclosure.init({
        id: 'examples-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'examples',
        ),
      }),
      apiReferenceGroup: Disclosure.init({
        id: 'api-reference-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'apiReference',
        ),
      }),
      submodelMapMessagesDisclosure: Disclosure.init({
        id: 'submodel-map-messages-disclosure',
        isOpen: false,
      }),
      themePreference,
      systemTheme,
      resolvedTheme,
      demoTabs,
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
      FetchGitHubStars(),
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

const handleSidebarGroup = (
  prev: Disclosure.Model,
  message: Disclosure.Message,
  toModel: (next: Disclosure.Model) => Model,
  toParentMessage: (message: Disclosure.Message) => Message,
): readonly [
  Model,
  ReadonlyArray<
    Command.Command<Message, never, AppResources | AppManagedResources>
  >,
] => {
  const [next, commands] = Disclosure.update(prev, message)
  const nextModel = toModel(next)
  return [
    nextModel,
    [
      ...Command.mapMessages(commands, toParentMessage),
      saveSidebarState(nextModel),
    ],
  ]
}

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

        const expandIfActive =
          (key: GroupKey) =>
          (group: Disclosure.Model): Disclosure.Model =>
            Option.exists(maybeNextActiveSectionKey, Equal.equals(key))
              ? Disclosure.reflectOpenState(group, true)
              : group

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
          isAsyncCounterDemoVisible(nextRoute, model.demoTabs),
        )

        const nextNotePlayerDemo = reflectNotePlayerDemoPresence(
          model.notePlayerDemo,
          isNotePlayerDemoVisible(nextRoute, model.demoTabs),
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
            getStartedGroup: expandIfActive('getStarted'),
            coreConceptsGroup: expandIfActive('coreConcepts'),
            comparisonsGroup: expandIfActive('comparisons'),
            faqGroup: expandIfActive('faq'),
            testingGroup: expandIfActive('testing'),
            bestPracticesGroup: expandIfActive('bestPractices'),
            patternsGroup: expandIfActive('patterns'),
            toolingGroup: expandIfActive('tooling'),
            foldkitUiGroup: expandIfActive('foldkitUi'),
            aiGroup: expandIfActive('ai'),
            examplesGroup: expandIfActive('examples'),
            apiReferenceGroup: expandIfActive('apiReference'),
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
              [HideCopiedIndicator({ text })],
            ],

      HidCopiedIndicator: ({ text }) => [
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

      SucceededFetchGitHubStars: ({ count }) => [
        evo(model, {
          githubStars: () => GitHubStarsRemoteData.Ok({ data: count }),
        }),
        [],
      ],

      FailedFetchGitHubStars: ({ error }) => [
        evo(model, {
          githubStars: () => GitHubStarsRemoteData.Failure({ error }),
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

      GotMobileMenuDialogMessage: ({ message }) => {
        const [nextMobileMenuDialog, mobileMenuDialogCommands] = Dialog.update(
          model.mobileMenuDialog,
          message,
        )

        return [
          evo(model, {
            mobileMenuDialog: () => nextMobileMenuDialog,
          }),
          Command.mapMessages(mobileMenuDialogCommands, message =>
            GotMobileMenuDialogMessage({ message }),
          ),
        ]
      },

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

      GotDemoTabsMessage: ({ message }) => {
        const [nextDemoTabs, demoTabsCommands] = DemoTab.DemoTabs.update(
          model.demoTabs,
          message,
        )

        const nextAsyncCounterDemo = reflectAsyncCounterDemoPresence(
          model.asyncCounterDemo,
          isAsyncCounterDemoVisible(model.route, nextDemoTabs),
        )

        const nextNotePlayerDemo = reflectNotePlayerDemoPresence(
          model.notePlayerDemo,
          isNotePlayerDemoVisible(model.route, nextDemoTabs),
        )

        return [
          evo(model, {
            demoTabs: () => nextDemoTabs,
            asyncCounterDemo: () => nextAsyncCounterDemo,
            notePlayerDemo: () => nextNotePlayerDemo,
          }),
          Command.mapMessages(demoTabsCommands, message =>
            GotDemoTabsMessage({ message }),
          ),
        ]
      },

      GotPlaygroundMenuMessage: ({ message }) => {
        const [nextMenu, menuCommands, maybeOutMessage] = PlaygroundMenu.update(
          model.playgroundMenu,
          message,
        )
        const mappedCommands = Command.mapMessages(menuCommands, message =>
          GotPlaygroundMenuMessage({ message }),
        )
        type UpdateReturn = readonly [
          Model,
          ReadonlyArray<Command.Command<Message>>,
        ]

        return Option.match(maybeOutMessage, {
          onNone: (): UpdateReturn => [
            evo(model, { playgroundMenu: () => nextMenu }),
            mappedCommands,
          ],
          onSome: M.type<Menu.OutMessage<ExampleSlug>>().pipe(
            M.withReturnType<UpdateReturn>(),
            M.tagsExhaustive({
              // NOTE: `LoadExternal` (not `NavigateInternal`).
              // WebContainer requires `window.crossOriginIsolated`,
              // which is only true when the document is loaded with
              // COEP/COOP headers. SPA navigation reuses the previous
              // page's document (no headers), so playground URLs need
              // a fresh document load.
              Selected: ({ value }) => [
                evo(model, { playgroundMenu: () => nextMenu }),
                [
                  ...mappedCommands,
                  LoadExternal({
                    href: playgroundRouter({ exampleSlug: value }),
                  }),
                ],
              ],
            }),
          ),
        })
      },

      GotAsyncCounterDemoMessage: ({ message }) =>
        Option.match(model.asyncCounterDemo, {
          onNone: () => [model, []],
          onSome: asyncCounterDemo => {
            const [nextAsyncCounterDemo, asyncCounterDemoCommands] =
              Page.AsyncCounterDemo.update(asyncCounterDemo, message)

            return [
              evo(model, {
                asyncCounterDemo: () => Option.some(nextAsyncCounterDemo),
              }),
              Command.mapMessages(asyncCounterDemoCommands, message =>
                GotAsyncCounterDemoMessage({ message }),
              ),
            ]
          },
        }),

      GotNotePlayerDemoMessage: ({ message }) =>
        Option.match(model.notePlayerDemo, {
          onNone: () => [model, []],
          onSome: notePlayerDemo => {
            const [nextNotePlayerDemo, notePlayerDemoCommands] =
              Page.NotePlayerDemo.update(notePlayerDemo, message)

            return [
              evo(model, {
                notePlayerDemo: () => Option.some(nextNotePlayerDemo),
              }),
              Command.mapMessages(notePlayerDemoCommands, message =>
                GotNotePlayerDemoMessage({ message }),
              ),
            ]
          },
        }),

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

      GotComingFromReactMessage: ({ message }) => {
        const [nextComingFromReact, comingFromReactCommands] =
          Page.ComingFromReact.update(model.comingFromReact, message)

        return [
          evo(model, {
            comingFromReact: () => nextComingFromReact,
          }),
          Command.mapMessages(comingFromReactCommands, message =>
            GotComingFromReactMessage({ message }),
          ),
        ]
      },

      GotApiReferenceMessage: ({ message }) => {
        const [nextApiReference, apiReferenceCommands] =
          Page.ApiReference.update(model.apiReference, message)

        return [
          evo(model, { apiReference: () => nextApiReference }),
          Command.mapMessages(apiReferenceCommands, message =>
            GotApiReferenceMessage({ message }),
          ),
        ]
      },

      GotUiPageMessage: ({ message }) => {
        const [nextUiPages, uiPagesCommands] = Page.UiPages.update(
          model.uiPages,
          message,
        )

        return [
          evo(model, { uiPages: () => nextUiPages }),
          Command.mapMessages(uiPagesCommands, message =>
            GotUiPageMessage({ message }),
          ),
        ]
      },

      GotGetStartedGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.getStartedGroup,
          message,
          next => evo(model, { getStartedGroup: () => next }),
          message => GotGetStartedGroupMessage({ message }),
        ),

      GotCoreConceptsGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.coreConceptsGroup,
          message,
          next => evo(model, { coreConceptsGroup: () => next }),
          message => GotCoreConceptsGroupMessage({ message }),
        ),

      GotComparisonsGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.comparisonsGroup,
          message,
          next => evo(model, { comparisonsGroup: () => next }),
          message => GotComparisonsGroupMessage({ message }),
        ),

      GotFaqGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.faqGroup,
          message,
          next => evo(model, { faqGroup: () => next }),
          message => GotFaqGroupMessage({ message }),
        ),

      GotTestingGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.testingGroup,
          message,
          next => evo(model, { testingGroup: () => next }),
          message => GotTestingGroupMessage({ message }),
        ),

      GotBestPracticesGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.bestPracticesGroup,
          message,
          next => evo(model, { bestPracticesGroup: () => next }),
          message => GotBestPracticesGroupMessage({ message }),
        ),

      GotPatternsGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.patternsGroup,
          message,
          next => evo(model, { patternsGroup: () => next }),
          message => GotPatternsGroupMessage({ message }),
        ),

      GotToolingGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.toolingGroup,
          message,
          next => evo(model, { toolingGroup: () => next }),
          message => GotToolingGroupMessage({ message }),
        ),

      GotFoldkitUiGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.foldkitUiGroup,
          message,
          next => evo(model, { foldkitUiGroup: () => next }),
          message => GotFoldkitUiGroupMessage({ message }),
        ),

      GotAiGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.aiGroup,
          message,
          next => evo(model, { aiGroup: () => next }),
          message => GotAiGroupMessage({ message }),
        ),

      GotExamplesGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.examplesGroup,
          message,
          next => evo(model, { examplesGroup: () => next }),
          message => GotExamplesGroupMessage({ message }),
        ),

      GotApiReferenceGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.apiReferenceGroup,
          message,
          next => evo(model, { apiReferenceGroup: () => next }),
          message => GotApiReferenceGroupMessage({ message }),
        ),

      GotSubmodelMapMessagesDisclosureMessage: ({ message }) => {
        const [next, commands] = Disclosure.update(
          model.submodelMapMessagesDisclosure,
          message,
        )
        return [
          evo(model, { submodelMapMessagesDisclosure: () => next }),
          Command.mapMessages(commands, message =>
            GotSubmodelMapMessagesDisclosureMessage({ message }),
          ),
        ]
      },

      GotExampleDetailMessage: ({ message }) => {
        const [nextExampleDetail, exampleDetailCommands] =
          Page.Example.ExampleDetail.update(model.exampleDetail, message)

        return [
          evo(model, {
            exampleDetail: () => nextExampleDetail,
          }),
          Command.mapMessages(exampleDetailCommands, message =>
            GotExampleDetailMessage({ message }),
          ),
        ]
      },

      GotSearchMessage: ({ message }) => {
        const [nextSearch, searchCommands] = Search.update(
          model.search,
          message,
        )

        return [
          evo(model, { search: () => nextSearch }),
          Command.mapMessages(searchCommands, message =>
            GotSearchMessage({ message }),
          ),
        ]
      },

      GotPlaygroundMessage: ({ message }) =>
        Option.match(model.playground, {
          onNone: () => [model, []],
          onSome: playgroundModel => {
            const [nextPlayground, playgroundCommands] = Page.Playground.update(
              playgroundModel,
              message,
            )
            return [
              evo(model, { playground: () => Option.some(nextPlayground) }),
              Command.mapMessages(playgroundCommands, message =>
                GotPlaygroundMessage({ message }),
              ),
            ]
          },
        }),
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

const InjectAnalytics = Command.define(
  'InjectAnalytics',
  CompletedInjectAnalytics,
)(Effect.sync(() => inject()).pipe(Effect.as(CompletedInjectAnalytics())))

const InjectSpeedInsights = Command.define(
  'InjectSpeedInsights',
  CompletedInjectSpeedInsights,
)(
  Effect.sync(() => SpeedInsights.injectSpeedInsights()).pipe(
    Effect.as(CompletedInjectSpeedInsights()),
  ),
)

const CopySnippet = Command.define(
  'CopySnippet',
  { text: S.String },
  SucceededCopySnippet,
  FailedCopySnippet,
)(({ text }) =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(SucceededCopySnippet({ text })),
    Effect.catch(() => Effect.succeed(FailedCopySnippet())),
  ),
)

const CopyLink = Command.define(
  'CopyLink',
  { url: S.String },
  SucceededCopyLink,
  FailedCopyLink,
)(({ url }) =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(url),
    catch: () => new Error('Failed to copy link to clipboard'),
  }).pipe(
    Effect.as(SucceededCopyLink()),
    Effect.catch(() => Effect.succeed(FailedCopyLink())),
  ),
)

const COPY_INDICATOR_DURATION = '2 seconds'

const HideCopiedIndicator = Command.define(
  'HideCopiedIndicator',
  { text: S.String },
  HidCopiedIndicator,
)(({ text }) =>
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(
    Effect.as(HidCopiedIndicator({ text })),
  ),
)

const ScrollToTop = Command.define(
  'ScrollToTop',
  CompletedScrollToTop,
)(
  Effect.sync(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    return CompletedScrollToTop()
  }),
)

const ScrollToAnchor = Command.define(
  'ScrollToAnchor',
  { hash: S.String },
  CompletedScrollToAnchor,
)(({ hash }) =>
  Effect.gen(function* () {
    const target = `#${CSS.escape(hash)}`
    yield* Dom.scrollIntoViewAfterPaint(target, { block: 'start' })
    yield* Dom.focus(target, { preventScroll: true, makeFocusable: true })
  }).pipe(Effect.ignore, Effect.as(CompletedScrollToAnchor())),
)

const ScrollSidebarActiveLinkIntoView = Command.define(
  'ScrollSidebarActiveLinkIntoView',
  CompletedScrollSidebarActiveLinkIntoView,
)(
  Dom.scrollIntoViewIfNotVisible(
    `#${DOCS_SIDEBAR_NAV_ID} [aria-current="page"]`,
  ).pipe(Effect.ignore, Effect.as(CompletedScrollSidebarActiveLinkIntoView())),
)

const MOBILE_MENU_ACTIVE_LINK = `#${MOBILE_MENU_NAV_ID} [aria-current="page"]`

const ScrollMobileMenuActiveLinkIntoView = Command.define(
  'ScrollMobileMenuActiveLinkIntoView',
  CompletedScrollMobileMenuActiveLinkIntoView,
)(
  Dom.scrollIntoViewIfNotVisible(MOBILE_MENU_ACTIVE_LINK, {
    when: 'Commit',
  }).pipe(
    Effect.ignore,
    Effect.as(CompletedScrollMobileMenuActiveLinkIntoView()),
  ),
)

const ApplyTheme = Command.define(
  'ApplyTheme',
  { theme: ResolvedTheme },
  CompletedApplyTheme,
)(({ theme }) =>
  Effect.sync(() => {
    M.value(theme).pipe(
      M.when('Dark', () => document.documentElement.classList.add('dark')),
      M.when('Light', () => document.documentElement.classList.remove('dark')),
      M.exhaustive,
    )
    return CompletedApplyTheme()
  }),
)

const BUTTONDOWN_SUBSCRIBE_URL =
  'https://buttondown.com/api/emails/embed-subscribe/foldkit'

const validateEmail = FieldValidation.validate(emailRules)

const SubscribeToNewsletter = Command.define(
  'SubscribeToNewsletter',
  { email: S.String },
  SucceededSubscribeToNewsletter,
  FailedSubscribeToNewsletter,
)(({ email }) =>
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
)

const GITHUB_REPO_API_URL = 'https://api.github.com/repos/foldkit/foldkit'

const GitHubRepo = S.Struct({ stargazers_count: S.Number })

const FetchGitHubStars = Command.define(
  'FetchGitHubStars',
  SucceededFetchGitHubStars,
  FailedFetchGitHubStars,
)(
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const response = yield* client.execute(
      HttpClientRequest.get(GITHUB_REPO_API_URL),
    )

    if (response.status >= 400) {
      return yield* Effect.fail('Failed to fetch GitHub stars')
    }

    const body = yield* response.json
    const { stargazers_count } = yield* S.decodeUnknownEffect(GitHubRepo)(body)

    return SucceededFetchGitHubStars({ count: stargazers_count })
  }).pipe(
    Effect.catch(error =>
      Effect.succeed(
        FailedFetchGitHubStars({
          error:
            typeof error === 'string' ? error : 'Failed to fetch GitHub stars',
        }),
      ),
    ),
    Effect.provide(Http.layer),
  ),
)

const SaveThemePreference = Command.define(
  'SaveThemePreference',
  { preference: ThemePreference },
  CompletedSaveThemePreference,
)(({ preference }) =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(THEME_STORAGE_KEY, JSON.stringify(preference))
    return CompletedSaveThemePreference()
  }).pipe(
    Effect.catch(() => Effect.succeed(CompletedSaveThemePreference())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  ),
)

const SaveSidebarState = Command.define(
  'SaveSidebarState',
  { state: SidebarState },
  CompletedSaveSidebarState,
)(({ state }) =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const json = yield* S.encodeEffect(SidebarStateJsonString)(state)
    yield* store.set(SIDEBAR_STORAGE_KEY, json)
    return CompletedSaveSidebarState()
  }).pipe(
    Effect.catch(() => Effect.succeed(CompletedSaveSidebarState())),
    Effect.provide(BrowserKeyValueStore.layerSessionStorage),
  ),
)

const modelToSidebarState = (model: Model): SidebarState => ({
  open: {
    getStarted: model.getStartedGroup.isOpen,
    coreConcepts: model.coreConceptsGroup.isOpen,
    comparisons: model.comparisonsGroup.isOpen,
    faq: model.faqGroup.isOpen,
    testing: model.testingGroup.isOpen,
    bestPractices: model.bestPracticesGroup.isOpen,
    patterns: model.patternsGroup.isOpen,
    tooling: model.toolingGroup.isOpen,
    foldkitUi: model.foldkitUiGroup.isOpen,
    ai: model.aiGroup.isOpen,
    examples: model.examplesGroup.isOpen,
    apiReference: model.apiReferenceGroup.isOpen,
  } satisfies Record<GroupKey, boolean>,
})

const saveSidebarState = (model: Model) =>
  SaveSidebarState({ state: modelToSidebarState(model) })

const NavigateInternal = Command.define(
  'NavigateInternal',
  { url: S.String },
  CompletedNavigateInternal,
)(({ url }) => pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())))

const LoadExternal = Command.define(
  'LoadExternal',
  { href: S.String },
  CompletedLoadExternal,
)(({ href }) => load(href).pipe(Effect.as(CompletedLoadExternal())))

// VIEW

export const view = (model: Model): Document => {
  const h = html<Message>()

  return {
    title: routeTitle(model.route, model.apiReference.apiData),
    body: M.value(model.route).pipe(
      M.tag('Home', () => landingView(model)),
      M.tag('Newsletter', () => newsletterView(model)),
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
      M.orElse(route => docsView(model, route)),
    ),
  }
}

// TITLE

const SITE_NAME = 'Foldkit'

const resolveApiModuleName = (
  apiData: typeof Page.ApiReference.ApiDataRemoteData.Union.Type,
  moduleSlug: string,
): string =>
  M.value(apiData).pipe(
    M.tag('Ok', ({ data }) =>
      Option.match(
        Page.ApiReference.resolveModule(data.parsedApi, moduleSlug),
        {
          onSome: ({ name }) => name,
          onNone: () => Page.ApiReference.slugToModuleName(moduleSlug),
        },
      ),
    ),
    M.orElse(() => Page.ApiReference.slugToModuleName(moduleSlug)),
  )

const routeTitle = (
  route: AppRoute,
  apiData: typeof Page.ApiReference.ApiDataRemoteData.Union.Type,
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
