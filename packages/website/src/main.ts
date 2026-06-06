import { BrowserKeyValueStore } from '@effect/platform-browser'
import { inject } from '@vercel/analytics'
import * as SpeedInsights from '@vercel/speed-insights'
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
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
} from 'effect/unstable/http'
import { KeyValueStore } from 'effect/unstable/persistence'
import {
  Calendar,
  Command,
  Dom,
  FieldValidation,
  ManagedResource,
  Runtime,
  Subscription,
  Ui,
} from 'foldkit'
import { type Document, html } from 'foldkit/html'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { Url, toString as urlToString } from 'foldkit/url'

import { DOCS_SIDEBAR_NAV_ID, allPages, findActiveSectionKey } from './docsNav'
import { GitHubStarsRemoteData } from './githubStars'
import {
  CompletedApplyTheme,
  CompletedInjectAnalytics,
  CompletedInjectSpeedInsights,
  CompletedLoadExternal,
  CompletedNavigateInternal,
  CompletedSaveSidebarState,
  CompletedSaveThemePreference,
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
  GotCoreConceptsGroupMessage,
  GotDemoTabsMessage,
  GotExampleDetailMessage,
  GotExamplesGroupMessage,
  GotFaqGroupMessage,
  GotFoldkitUiGroupMessage,
  GotForReactDevelopersGroupMessage,
  GotGetStartedGroupMessage,
  GotMobileMenuDialogMessage,
  GotNotePlayerDemoMessage,
  GotPatternsGroupMessage,
  GotPlaygroundMenuMessage,
  GotPlaygroundMessage,
  GotSearchMessage,
  GotSubmodelMapMessagesDisclosureMessage,
  GotTestingGroupMessage,
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
import { DemoTabs, docsView, landingView, newsletterView } from './view'

export type { Message } from './message'

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
  mobileMenuDialog: Ui.Dialog.Model,
  isMobileTableOfContentsOpen: S.Boolean,
  activeSection: S.Option(S.String),
  isLandingHeaderVisible: S.Boolean,
  isNarrowViewport: S.Boolean,
  isChromium: S.Boolean,
  playground: S.Option(Page.Playground.Model),
  getStartedGroup: Ui.Disclosure.Model,
  coreConceptsGroup: Ui.Disclosure.Model,
  forReactDevelopersGroup: Ui.Disclosure.Model,
  faqGroup: Ui.Disclosure.Model,
  testingGroup: Ui.Disclosure.Model,
  bestPracticesGroup: Ui.Disclosure.Model,
  patternsGroup: Ui.Disclosure.Model,
  foldkitUiGroup: Ui.Disclosure.Model,
  aiGroup: Ui.Disclosure.Model,
  examplesGroup: Ui.Disclosure.Model,
  apiReferenceGroup: Ui.Disclosure.Model,
  submodelMapMessagesDisclosure: Ui.Disclosure.Model,
  aiHeadingToggleCount: S.Number,
  themePreference: ThemePreference,
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  demoTabs: Ui.Tabs.Model,
  playgroundMenu: Ui.Menu.Model,
  asyncCounterDemo: Page.AsyncCounterDemo.Model,
  notePlayerDemo: Page.NotePlayerDemo.Model,
  uiPages: Page.UiPages.Model,
  comingFromReact: Page.ComingFromReact.Model,
  apiReference: Page.ApiReference.Model,
  exampleDetail: Page.Example.ExampleDetail.Model,
  search: Search.Model,
})

export type Model = typeof Model.Type

const PlaygroundMenu = Ui.Menu.create<ExampleSlug>()

// INIT

export type AppResources =
  | Page.NotePlayerDemo.AudioContextService
  | Search.PagefindService

export type AppManagedResources = ManagedResource.ServicesOf<
  typeof managedResources
>

const isGroupOpenOnBoot = (
  maybeSidebarState: Option.Option<SidebarState>,
  maybeActiveSectionKey: Option.Option<GroupKey>,
  key: GroupKey,
): boolean => {
  const isActiveSection = Option.exists(
    maybeActiveSectionKey,
    Equal.equals(key),
  )
  if (isActiveSection) {
    return true
  }
  return Option.match(maybeSidebarState, {
    onNone: () => Array.contains(DEFAULT_OPEN_GROUPS, key),
    onSome: ({ open }) => open[key] ?? false,
  })
}

export const init: Runtime.RoutingProgramInit<
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

  const demoTabs = Ui.Tabs.init({
    id: 'demo-tabs',
  })

  const playgroundMenu = Ui.Menu.init({
    id: 'playground-menu',
    isAnimated: true,
  })

  const [asyncCounterDemo, asyncCounterDemoCommands] =
    Page.AsyncCounterDemo.init()
  const [notePlayerDemo, notePlayerDemoCommands] = Page.NotePlayerDemo.init()
  const [uiPages, uiPagesCommands] = Page.UiPages.init(flags.today)
  const [comingFromReact, comingFromReactCommands] = Page.ComingFromReact.init()
  const initialRoute = urlToAppRoute(url)

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

  const mappedAsyncCounterDemoCommands = Command.mapMessages(
    asyncCounterDemoCommands,
    message => GotAsyncCounterDemoMessage({ message }),
  )

  const mappedNotePlayerDemoCommands = Command.mapMessages(
    notePlayerDemoCommands,
    message => GotNotePlayerDemoMessage({ message }),
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
      mobileMenuDialog: Ui.Dialog.init({ id: 'mobile-menu' }),
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
      getStartedGroup: Ui.Disclosure.init({
        id: 'get-started-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'getStarted',
        ),
      }),
      coreConceptsGroup: Ui.Disclosure.init({
        id: 'core-concepts-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'coreConcepts',
        ),
      }),
      forReactDevelopersGroup: Ui.Disclosure.init({
        id: 'for-react-developers-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'forReactDevelopers',
        ),
      }),
      faqGroup: Ui.Disclosure.init({
        id: 'faq-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'faq',
        ),
      }),
      testingGroup: Ui.Disclosure.init({
        id: 'testing-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'testing',
        ),
      }),
      bestPracticesGroup: Ui.Disclosure.init({
        id: 'best-practices-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'bestPractices',
        ),
      }),
      patternsGroup: Ui.Disclosure.init({
        id: 'patterns-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'patterns',
        ),
      }),
      foldkitUiGroup: Ui.Disclosure.init({
        id: 'foldkit-ui-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'foldkitUi',
        ),
      }),
      aiGroup: Ui.Disclosure.init({
        id: 'ai-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'ai',
        ),
      }),
      examplesGroup: Ui.Disclosure.init({
        id: 'examples-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'examples',
        ),
      }),
      apiReferenceGroup: Ui.Disclosure.init({
        id: 'api-reference-group',
        isOpen: isGroupOpenOnBoot(
          flags.maybeSidebarState,
          maybeInitialActiveSectionKey,
          'apiReference',
        ),
      }),
      submodelMapMessagesDisclosure: Ui.Disclosure.init({
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
      ...mappedAsyncCounterDemoCommands,
      ...mappedNotePlayerDemoCommands,
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

const handleSidebarGroup = (
  prev: Ui.Disclosure.Model,
  message: Ui.Disclosure.Message,
  toModel: (next: Ui.Disclosure.Model) => Model,
  toParentMessage: (message: Ui.Disclosure.Message) => Message,
): readonly [
  Model,
  ReadonlyArray<
    Command.Command<Message, never, AppResources | AppManagedResources>
  >,
] => {
  const [next, commands] = Ui.Disclosure.update(prev, message)
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
          (group: Ui.Disclosure.Model): Ui.Disclosure.Model =>
            Option.exists(maybeNextActiveSectionKey, Equal.equals(key))
              ? Ui.Disclosure.reflectOpenState(group, true)
              : group
        const [closedMobileMenu, closeMobileMenuCommands] = Ui.Dialog.close(
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

        return [
          evo(model, {
            route: () => nextRoute,
            url: () => url,
            mobileMenuDialog: () => closedMobileMenu,
            apiReference: () => nextApiReference,
            exampleDetail: () => nextExampleDetail,
            playground: () =>
              pipe(
                nextRoute,
                Option.liftPredicate(isPlaygroundRoute),
                Option.map(({ exampleSlug }) =>
                  Page.Playground.init(exampleSlug),
                ),
              ),
            search: () => nextSearch,
            isLandingHeaderVisible: () =>
              isLandingHeaderAlwaysVisible(nextRoute),
            getStartedGroup: expandIfActive('getStarted'),
            coreConceptsGroup: expandIfActive('coreConcepts'),
            forReactDevelopersGroup: expandIfActive('forReactDevelopers'),
            faqGroup: expandIfActive('faq'),
            testingGroup: expandIfActive('testing'),
            bestPracticesGroup: expandIfActive('bestPractices'),
            patternsGroup: expandIfActive('patterns'),
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
              onNone: () => [ScrollToTop()],
              onSome: hash => [ScrollToAnchor({ hash })],
            }),
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

      GotMobileMenuDialogMessage: ({ message }) => {
        const [nextMobileMenuDialog, mobileMenuDialogCommands] =
          Ui.Dialog.update(model.mobileMenuDialog, message)

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
        const [nextDemoTabs, demoTabsCommands] = DemoTabs.update(
          model.demoTabs,
          message,
        )

        return [
          evo(model, { demoTabs: () => nextDemoTabs }),
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
          onSome: M.type<Ui.Menu.OutMessage<ExampleSlug>>().pipe(
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

      GotAsyncCounterDemoMessage: ({ message }) => {
        const [nextAsyncCounterDemo, asyncCounterDemoCommands] =
          Page.AsyncCounterDemo.update(model.asyncCounterDemo, message)

        return [
          evo(model, {
            asyncCounterDemo: () => nextAsyncCounterDemo,
          }),
          Command.mapMessages(asyncCounterDemoCommands, message =>
            GotAsyncCounterDemoMessage({ message }),
          ),
        ]
      },

      GotNotePlayerDemoMessage: ({ message }) => {
        const [nextNotePlayerDemo, notePlayerDemoCommands] =
          Page.NotePlayerDemo.update(model.notePlayerDemo, message)

        return [
          evo(model, {
            notePlayerDemo: () => nextNotePlayerDemo,
          }),
          Command.mapMessages(notePlayerDemoCommands, message =>
            GotNotePlayerDemoMessage({ message }),
          ),
        ]
      },

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

      GotForReactDevelopersGroupMessage: ({ message }) =>
        handleSidebarGroup(
          model.forReactDevelopersGroup,
          message,
          next => evo(model, { forReactDevelopersGroup: () => next }),
          message => GotForReactDevelopersGroupMessage({ message }),
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
        const [next, commands] = Ui.Disclosure.update(
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
  Dom.scrollIntoViewAfterPaint(
    `#${DOCS_SIDEBAR_NAV_ID} [aria-current="page"]`,
    { block: 'center' },
  ).pipe(Effect.ignore, Effect.as(CompletedScrollSidebarActiveLinkIntoView())),
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
    Effect.provideService(HttpClient.TracerPropagationEnabled, false),
    Effect.provide(FetchHttpClient.layer),
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
    Effect.provideService(HttpClient.TracerPropagationEnabled, false),
    Effect.provide(FetchHttpClient.layer),
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
    forReactDevelopers: model.forReactDevelopersGroup.isOpen,
    faq: model.faqGroup.isOpen,
    testing: model.testingGroup.isOpen,
    bestPractices: model.bestPracticesGroup.isOpen,
    patterns: model.patternsGroup.isOpen,
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
    M.tag('Newsletter', () => `Newsletter — ${SITE_NAME}`),
    M.tag('NotFound', () => `Not Found — ${SITE_NAME}`),
    M.tag(
      'ApiModule',
      ({ moduleSlug }) =>
        `${resolveApiModuleName(apiData, moduleSlug)} — API — ${SITE_NAME}`,
    ),
    M.tag('ExampleDetail', ({ exampleSlug }) =>
      pipe(
        allPages,
        Array.findFirst(({ _tag }) => _tag === `ExampleDetail:${exampleSlug}`),
        Option.match({
          onNone: () => `${exampleSlug} — Examples — ${SITE_NAME}`,
          onSome: ({ label }) => `${label} — Examples — ${SITE_NAME}`,
        }),
      ),
    ),
    M.tag('Playground', ({ exampleSlug }) =>
      pipe(
        allPages,
        Array.findFirst(({ _tag }) => _tag === `ExampleDetail:${exampleSlug}`),
        Option.match({
          onNone: () => `Playground — ${SITE_NAME}`,
          onSome: ({ label }) => `${label} — Playground — ${SITE_NAME}`,
        }),
      ),
    ),
    M.orElse(({ _tag }) =>
      pipe(
        allPages,
        Array.findFirst(page => page._tag === _tag),
        Option.match({
          onNone: () => SITE_NAME,
          onSome: page => `${page.label} — ${SITE_NAME}`,
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

export const managedResources = ManagedResource.lift(
  Page.Playground.managedResources,
)<Model, Message>({
  toChildModel: model => model.playground,
  toParentMessage: message => GotPlaygroundMessage({ message }),
})

// TRACER
// NOTE: Custom dev tracer disabled pending Effect v4 beta Tracer/Layer API rewrite.
// v4 beta removed Layer.setTracer and changed Tracer.make's signature; restore
// once we adopt the new Tracer construction pattern.
export const devTracerLayer: Layer.Layer<never> = Layer.empty
