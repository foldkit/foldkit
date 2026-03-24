import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  KeyValueStore,
} from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { inject } from '@vercel/analytics'
import * as SpeedInsights from '@vercel/speed-insights'
import {
  Array,
  DateTime,
  Effect,
  HashSet,
  Layer,
  Match as M,
  Number as Number_,
  Option,
  Schema as S,
  Tracer,
  pipe,
} from 'effect'
import { Command, FieldValidation, Runtime, Ui } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { makeSubscriptions } from 'foldkit/subscription'
import { Url, toString as urlToString } from 'foldkit/url'

import { allPages } from './docsNav'
import {
  ChangedUrl,
  ClickedLink,
  CompletedApplyTheme,
  CompletedInjectAnalytics,
  CompletedInjectSpeedInsights,
  CompletedLoadExternal,
  CompletedNavigateInternal,
  CompletedSaveThemePreference,
  CompletedScroll,
  FailedCopy,
  FailedSubscribeEmail,
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
  GotFoldkitUiGroupMessage,
  GotGetStartedGroupMessage,
  GotGuidesGroupMessage,
  GotMobileMenuDialogMessage,
  GotNotePlayerDemoMessage,
  GotPatternsGroupMessage,
  GotSearchMessage,
  GotUiPageMessage,
  HiddenCopiedIndicator,
  type Message,
  ResolvedTheme,
  SucceededCopy,
  SucceededCopyLink,
  SucceededSubscribeEmail,
  ThemePreference,
} from './message'
import * as Page from './page'
import { AppRoute, isLandingHeaderAlwaysVisible, urlToAppRoute } from './route'
import * as Search from './search'
import * as Subscription from './subscription'
import { docsView, landingView, newsletterView } from './view'

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

const StringField = FieldValidation.makeField(S.String)
export type StringField = typeof StringField.Union.Type

const EmailSubscriptionStatus = S.Literal(
  'Idle',
  'Submitting',
  'Succeeded',
  'Failed',
)
export type EmailSubscriptionStatus = typeof EmailSubscriptionStatus.Type

// FLAGS

const Flags = S.Struct({
  themePreference: S.Option(ThemePreference),
  systemTheme: ResolvedTheme,
  isNarrowViewport: S.Boolean,
  currentYear: S.Number,
})

type Flags = typeof Flags.Type

export const NARROW_VIEWPORT_QUERY = '(max-width: 1023px)'

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const themePreference = yield* Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    const maybeJson = yield* store.get(THEME_STORAGE_KEY)
    const json = yield* maybeJson
    const theme = yield* S.decode(S.parseJson(ThemePreference))(json)
    return Option.some(theme)
  }).pipe(
    Effect.catchAll(() => Effect.succeed(Option.none())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

  const systemTheme: typeof ResolvedTheme.Type = yield* Effect.sync(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'Dark'
      : 'Light',
  )

  const isNarrowViewport = yield* Effect.sync(
    () => window.matchMedia(NARROW_VIEWPORT_QUERY).matches,
  )

  const currentYear = yield* DateTime.now.pipe(
    Effect.map(DateTime.getPartUtc('year')),
  )

  return {
    themePreference,
    systemTheme,
    isNarrowViewport,
    currentYear,
  }
})

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  url: Url,
  copiedSnippets: S.HashSet(S.String),
  emailField: StringField.Union,
  emailSubscriptionStatus: EmailSubscriptionStatus,
  currentYear: S.Number,
  mobileMenuDialog: Ui.Dialog.Model,
  isMobileTableOfContentsOpen: S.Boolean,
  activeSection: S.Option(S.String),
  isLandingHeaderVisible: S.Boolean,
  isNarrowViewport: S.Boolean,
  getStartedGroup: Ui.Disclosure.Model,
  coreConceptsGroup: Ui.Disclosure.Model,
  guidesGroup: Ui.Disclosure.Model,
  bestPracticesGroup: Ui.Disclosure.Model,
  patternsGroup: Ui.Disclosure.Model,
  foldkitUiGroup: Ui.Disclosure.Model,
  aiGroup: Ui.Disclosure.Model,
  examplesGroup: Ui.Disclosure.Model,
  apiReferenceGroup: Ui.Disclosure.Model,
  aiHeadingToggleCount: S.Number,
  themePreference: ThemePreference,
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  demoTabs: Ui.Tabs.Model,
  asyncCounterDemo: Page.AsyncCounterDemo.Model,
  notePlayerDemo: Page.NotePlayerDemo.Model,
  uiPages: Page.UiPages.Model,
  comingFromReact: Page.ComingFromReact.Model,
  apiReference: Page.ApiReference.Model,
  exampleDetail: Page.Example.ExampleDetail.Model,
  search: Search.Model,
})

export type Model = typeof Model.Type

// INIT

type AppResources =
  | Page.NotePlayerDemo.AudioContextService
  | Search.PagefindService

const init: Runtime.RoutingProgramInit<Model, Message, Flags, AppResources> = (
  flags: Flags,
  url: Url,
) => {
  const themePreference = Option.getOrElse(
    flags.themePreference,
    () => 'System' as const,
  )
  const { systemTheme } = flags
  const resolvedTheme = resolveTheme(themePreference, systemTheme)

  const demoTabs = Ui.Tabs.init({
    id: 'demo-tabs',
  })

  const [asyncCounterDemo, asyncCounterDemoCommands] =
    Page.AsyncCounterDemo.init()
  const [notePlayerDemo, notePlayerDemoCommands] = Page.NotePlayerDemo.init()
  const [uiPages, uiPagesCommands] = Page.UiPages.init()
  const [comingFromReact, comingFromReactCommands] = Page.ComingFromReact.init()
  const [apiReference, apiReferenceCommands] = Page.ApiReference.init(
    Page.ApiReference.apiReference.modules,
  )

  const mappedAsyncCounterDemoCommands = asyncCounterDemoCommands.map(
    Command.mapEffect(
      Effect.map(message => GotAsyncCounterDemoMessage({ message })),
    ),
  )

  const mappedNotePlayerDemoCommands = notePlayerDemoCommands.map(
    Command.mapEffect(
      Effect.map(message => GotNotePlayerDemoMessage({ message })),
    ),
  )

  const mappedUiPagesCommands = uiPagesCommands.map(
    Command.mapEffect(Effect.map(message => GotUiPageMessage({ message }))),
  )

  const mappedComingFromReactCommands = comingFromReactCommands.map(
    Command.mapEffect(
      Effect.map(message => GotComingFromReactMessage({ message })),
    ),
  )

  const mappedApiReferenceCommands = apiReferenceCommands.map(
    Command.mapEffect(
      Effect.map(message => GotApiReferenceMessage({ message })),
    ),
  )

  const initialRoute = urlToAppRoute(url)

  return [
    {
      route: initialRoute,
      url,
      copiedSnippets: HashSet.empty(),
      emailField: StringField.NotValidated({ value: '' }),
      emailSubscriptionStatus: 'Idle',
      currentYear: flags.currentYear,
      mobileMenuDialog: Ui.Dialog.init({ id: 'mobile-menu' }),
      isMobileTableOfContentsOpen: false,
      activeSection: Option.none(),
      aiHeadingToggleCount: 0,
      isLandingHeaderVisible: isLandingHeaderAlwaysVisible(initialRoute),
      isNarrowViewport: flags.isNarrowViewport,
      getStartedGroup: {
        ...Ui.Disclosure.init({ id: 'get-started-group' }),
        isOpen: true,
      },
      coreConceptsGroup: {
        ...Ui.Disclosure.init({ id: 'core-concepts-group' }),
        isOpen: true,
      },
      guidesGroup: {
        ...Ui.Disclosure.init({ id: 'guides-group' }),
        isOpen: true,
      },
      bestPracticesGroup: {
        ...Ui.Disclosure.init({ id: 'best-practices-group' }),
        isOpen: true,
      },
      patternsGroup: {
        ...Ui.Disclosure.init({ id: 'patterns-group' }),
        isOpen: true,
      },
      foldkitUiGroup: {
        ...Ui.Disclosure.init({ id: 'foldkit-ui-group' }),
        isOpen: true,
      },
      aiGroup: {
        ...Ui.Disclosure.init({ id: 'ai-group' }),
        isOpen: true,
      },
      examplesGroup: {
        ...Ui.Disclosure.init({ id: 'examples-group' }),
        isOpen: true,
      },
      apiReferenceGroup: {
        ...Ui.Disclosure.init({ id: 'api-reference-group' }),
        isOpen: true,
      },
      themePreference,
      systemTheme,
      resolvedTheme,
      demoTabs,
      asyncCounterDemo,
      notePlayerDemo,
      uiPages,
      comingFromReact,
      apiReference,
      exampleDetail: Page.Example.ExampleDetail.init()[0],
      search: Search.init()[0],
    },
    [
      injectAnalytics,
      injectSpeedInsights,
      applyThemeToDocument(resolvedTheme),
      ...mappedAsyncCounterDemoCommands,
      ...mappedNotePlayerDemoCommands,
      ...mappedUiPagesCommands,
      ...mappedComingFromReactCommands,
      ...mappedApiReferenceCommands,
      ...Option.match(url.hash, {
        onNone: () => [],
        onSome: hash => [scrollToHashAfterRender(hash)],
      }),
    ],
  ]
}

// UPDATE

const update = (
  model: Model,
  message: Message,
): readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, AppResources>>,
] =>
  M.value(message).pipe(
    M.withReturnType<
      readonly [
        Model,
        ReadonlyArray<Command.Command<Message, never, AppResources>>,
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
              ReadonlyArray<Command.Command<typeof CompletedNavigateInternal>>,
            ] => [
              model,
              [
                pushUrl(urlToString(url)).pipe(
                  Effect.as(CompletedNavigateInternal()),
                  NavigateInternal,
                ),
              ],
            ],
            External: ({
              href,
            }): [
              Model,
              ReadonlyArray<Command.Command<typeof CompletedLoadExternal>>,
            ] => [
              model,
              [
                load(href).pipe(
                  Effect.as(CompletedLoadExternal()),
                  LoadExternal,
                ),
              ],
            ],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const nextRoute = urlToAppRoute(url)
        const [closedMobileMenu, closeMobileMenuCommands] = Ui.Dialog.update(
          model.mobileMenuDialog,
          Ui.Dialog.Closed(),
        )
        const [closedSearchDialog, closeSearchDialogCommands] =
          Ui.Dialog.update(model.search.dialog, Ui.Dialog.Closed())

        return [
          evo(model, {
            route: () => nextRoute,
            url: () => url,
            mobileMenuDialog: () => closedMobileMenu,
            search: search => ({
              ...search,
              dialog: closedSearchDialog,
              query: '',
              searchState: Search.Idle(),
              activeResultIndex: -1,
            }),
            isLandingHeaderVisible: () =>
              isLandingHeaderAlwaysVisible(nextRoute),
            apiReferenceGroup: apiReferenceGroup =>
              nextRoute._tag === 'ApiModule'
                ? { ...apiReferenceGroup, isOpen: true }
                : apiReferenceGroup,
            exampleDetail: exampleDetail =>
              nextRoute._tag === 'ExampleDetail' &&
              model.route._tag === 'ExampleDetail' &&
              nextRoute.exampleSlug !== model.route.exampleSlug
                ? {
                    ...exampleDetail,
                    sourceFileTabs: Ui.Tabs.init({
                      id: 'source-file-tabs',
                    }),
                    maybeExampleUrl: Option.none(),
                  }
                : exampleDetail,
          }),
          [
            ...closeMobileMenuCommands.map(
              Command.mapEffect(
                Effect.map(message => GotMobileMenuDialogMessage({ message })),
              ),
            ),
            ...closeSearchDialogCommands.map(
              Command.mapEffect(
                Effect.map(message =>
                  GotSearchMessage({
                    message: Search.GotSearchDialogMessage({ message }),
                  }),
                ),
              ),
            ),
            ...Option.match(url.hash, {
              onNone: () => [scrollToTop],
              onSome: hash => [scrollToHash(hash)],
            }),
          ],
        ]
      },

      ClickedCopySnippet: ({ text }) => [model, [copySnippetToClipboard(text)]],

      ClickedCopyLink: ({ hash }) => [
        model,
        [
          copyLinkToClipboard(
            urlToString({ ...model.url, hash: Option.some(hash) }),
          ),
        ],
      ],

      SucceededCopy: ({ text }) =>
        HashSet.has(model.copiedSnippets, text)
          ? [model, []]
          : [
              evo(model, {
                copiedSnippets: HashSet.add(text),
              }),
              [hideIndicator(text)],
            ],

      HiddenCopiedIndicator: ({ text }) => [
        evo(model, {
          copiedSnippets: HashSet.remove(text),
        }),
        [],
      ],

      UpdatedEmailField: ({ value }) => [
        evo(model, {
          emailField: () => StringField.NotValidated({ value }),
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
              [subscribeToNewsletter(model.emailField.value)],
            ]
          : [evo(model, { emailField: () => result }), []]
      },

      SucceededSubscribeEmail: () => [
        evo(model, {
          emailField: () => StringField.NotValidated({ value: '' }),
          emailSubscriptionStatus: () => 'Succeeded',
        }),
        [],
      ],

      FailedSubscribeEmail: () => [
        evo(model, {
          emailSubscriptionStatus: () => 'Failed',
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
          mobileMenuDialogCommands.map(
            Command.mapEffect(
              Effect.map(message => GotMobileMenuDialogMessage({ message })),
            ),
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
            applyThemeToDocument(resolvedTheme),
            saveThemePreference(preference),
          ],
        ]
      },

      GotDemoTabsMessage: ({ message }) => {
        const [nextDemoTabs, demoTabsCommands] = Ui.Tabs.update(
          model.demoTabs,
          message,
        )

        return [
          evo(model, { demoTabs: () => nextDemoTabs }),
          demoTabsCommands.map(
            Command.mapEffect(
              Effect.map(message => GotDemoTabsMessage({ message })),
            ),
          ),
        ]
      },

      GotAsyncCounterDemoMessage: ({ message }) => {
        const [nextAsyncCounterDemo, asyncCounterDemoCommands] =
          Page.AsyncCounterDemo.update(model.asyncCounterDemo, message)

        return [
          evo(model, {
            asyncCounterDemo: () => nextAsyncCounterDemo,
          }),
          asyncCounterDemoCommands.map(
            Command.mapEffect(
              Effect.map(message => GotAsyncCounterDemoMessage({ message })),
            ),
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
          notePlayerDemoCommands.map(
            Command.mapEffect(
              Effect.map(message => GotNotePlayerDemoMessage({ message })),
            ),
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
          [applyThemeToDocument(resolvedTheme)],
        ]
      },

      GotComingFromReactMessage: ({ message }) => {
        const [nextComingFromReact, comingFromReactCommands] =
          Page.ComingFromReact.update(model.comingFromReact, message)

        return [
          evo(model, {
            comingFromReact: () => nextComingFromReact,
          }),
          comingFromReactCommands.map(
            Command.mapEffect(
              Effect.map(message => GotComingFromReactMessage({ message })),
            ),
          ),
        ]
      },

      GotApiReferenceMessage: ({ message }) => {
        const [nextApiReference, apiReferenceCommands] =
          Page.ApiReference.update(model.apiReference, message)

        return [
          evo(model, { apiReference: () => nextApiReference }),
          apiReferenceCommands.map(
            Command.mapEffect(
              Effect.map(message => GotApiReferenceMessage({ message })),
            ),
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
          uiPagesCommands.map(
            Command.mapEffect(
              Effect.map(message => GotUiPageMessage({ message })),
            ),
          ),
        ]
      },

      GotGetStartedGroupMessage: ({ message }) => {
        const [nextGetStartedGroup, getStartedGroupCommands] =
          Ui.Disclosure.update(model.getStartedGroup, message)

        return [
          evo(model, {
            getStartedGroup: () => nextGetStartedGroup,
          }),
          getStartedGroupCommands.map(
            Command.mapEffect(
              Effect.map(message => GotGetStartedGroupMessage({ message })),
            ),
          ),
        ]
      },

      GotCoreConceptsGroupMessage: ({ message }) => {
        const [nextCoreConceptsGroup, coreConceptsGroupCommands] =
          Ui.Disclosure.update(model.coreConceptsGroup, message)

        return [
          evo(model, {
            coreConceptsGroup: () => nextCoreConceptsGroup,
          }),
          coreConceptsGroupCommands.map(
            Command.mapEffect(
              Effect.map(message => GotCoreConceptsGroupMessage({ message })),
            ),
          ),
        ]
      },

      GotGuidesGroupMessage: ({ message }) => {
        const [nextGuidesGroup, guidesGroupCommands] = Ui.Disclosure.update(
          model.guidesGroup,
          message,
        )

        return [
          evo(model, {
            guidesGroup: () => nextGuidesGroup,
          }),
          guidesGroupCommands.map(
            Command.mapEffect(
              Effect.map(message => GotGuidesGroupMessage({ message })),
            ),
          ),
        ]
      },

      GotBestPracticesGroupMessage: ({ message }) => {
        const [nextBestPracticesGroup, bestPracticesGroupCommands] =
          Ui.Disclosure.update(model.bestPracticesGroup, message)

        return [
          evo(model, {
            bestPracticesGroup: () => nextBestPracticesGroup,
          }),
          bestPracticesGroupCommands.map(
            Command.mapEffect(
              Effect.map(message => GotBestPracticesGroupMessage({ message })),
            ),
          ),
        ]
      },

      GotPatternsGroupMessage: ({ message }) => {
        const [nextPatternsGroup, patternsGroupCommands] = Ui.Disclosure.update(
          model.patternsGroup,
          message,
        )

        return [
          evo(model, {
            patternsGroup: () => nextPatternsGroup,
          }),
          patternsGroupCommands.map(
            Command.mapEffect(
              Effect.map(message => GotPatternsGroupMessage({ message })),
            ),
          ),
        ]
      },

      GotFoldkitUiGroupMessage: ({ message }) => {
        const [nextFoldkitUiGroup, foldkitUiGroupCommands] =
          Ui.Disclosure.update(model.foldkitUiGroup, message)

        return [
          evo(model, {
            foldkitUiGroup: () => nextFoldkitUiGroup,
          }),
          foldkitUiGroupCommands.map(
            Command.mapEffect(
              Effect.map(message => GotFoldkitUiGroupMessage({ message })),
            ),
          ),
        ]
      },

      GotAiGroupMessage: ({ message }) => {
        const [nextAiGroup, aiGroupCommands] = Ui.Disclosure.update(
          model.aiGroup,
          message,
        )

        return [
          evo(model, {
            aiGroup: () => nextAiGroup,
          }),
          aiGroupCommands.map(
            Command.mapEffect(
              Effect.map(message => GotAiGroupMessage({ message })),
            ),
          ),
        ]
      },

      GotExamplesGroupMessage: ({ message }) => {
        const [nextExamplesGroup, examplesGroupCommands] = Ui.Disclosure.update(
          model.examplesGroup,
          message,
        )

        return [
          evo(model, {
            examplesGroup: () => nextExamplesGroup,
          }),
          examplesGroupCommands.map(
            Command.mapEffect(
              Effect.map(message => GotExamplesGroupMessage({ message })),
            ),
          ),
        ]
      },

      GotApiReferenceGroupMessage: ({ message }) => {
        const [nextApiReferenceGroup, apiReferenceGroupCommands] =
          Ui.Disclosure.update(model.apiReferenceGroup, message)

        return [
          evo(model, {
            apiReferenceGroup: () => nextApiReferenceGroup,
          }),
          apiReferenceGroupCommands.map(
            Command.mapEffect(
              Effect.map(message => GotApiReferenceGroupMessage({ message })),
            ),
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
          exampleDetailCommands.map(
            Command.mapEffect(
              Effect.map(message => GotExampleDetailMessage({ message })),
            ),
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
          searchCommands.map(
            Command.mapEffect(
              Effect.map(message => GotSearchMessage({ message })),
            ),
          ),
        ]
      },
    }),
    M.tag(
      'CompletedNavigateInternal',
      'CompletedLoadExternal',
      'CompletedInjectAnalytics',
      'CompletedInjectSpeedInsights',
      'CompletedScroll',
      'CompletedApplyTheme',
      'CompletedSaveThemePreference',
      'SucceededCopyLink',
      'FailedCopy',
      () => [model, []],
    ),
    M.exhaustive,
  )

// COMMAND

const InjectAnalytics = Command.define(
  'InjectAnalytics',
  CompletedInjectAnalytics,
)
const InjectSpeedInsights = Command.define(
  'InjectSpeedInsights',
  CompletedInjectSpeedInsights,
)
const CopySnippet = Command.define('CopySnippet', SucceededCopy, FailedCopy)
const CopyLink = Command.define('CopyLink', SucceededCopyLink, FailedCopy)
const HideCopiedIndicator = Command.define(
  'HideCopiedIndicator',
  HiddenCopiedIndicator,
)
const ScrollToTop = Command.define('ScrollToTop', CompletedScroll)
const ScrollToAnchor = Command.define('ScrollToAnchor', CompletedScroll)
const ApplyTheme = Command.define('ApplyTheme', CompletedApplyTheme)
const SubscribeToNewsletter = Command.define(
  'SubscribeToNewsletter',
  SucceededSubscribeEmail,
  FailedSubscribeEmail,
)
const SaveThemePreference = Command.define(
  'SaveThemePreference',
  CompletedSaveThemePreference,
)
const NavigateInternal = Command.define(
  'NavigateInternal',
  CompletedNavigateInternal,
)
const LoadExternal = Command.define('LoadExternal', CompletedLoadExternal)

const injectAnalytics = InjectAnalytics(
  Effect.sync(() => inject()).pipe(Effect.as(CompletedInjectAnalytics())),
)

const injectSpeedInsights = InjectSpeedInsights(
  Effect.sync(() => SpeedInsights.injectSpeedInsights()).pipe(
    Effect.as(CompletedInjectSpeedInsights()),
  ),
)

const copySnippetToClipboard = (text: string) =>
  CopySnippet(
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(text),
      catch: () => new Error('Failed to copy to clipboard'),
    }).pipe(
      Effect.as(SucceededCopy({ text })),
      Effect.catchAll(() => Effect.succeed(FailedCopy())),
    ),
  )

const copyLinkToClipboard = (url: string) =>
  CopyLink(
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(url),
      catch: () => new Error('Failed to copy link to clipboard'),
    }).pipe(
      Effect.as(SucceededCopyLink()),
      Effect.catchAll(() => Effect.succeed(FailedCopy())),
    ),
  )

const COPY_INDICATOR_DURATION = '2 seconds'

const hideIndicator = (text: string) =>
  HideCopiedIndicator(
    Effect.sleep(COPY_INDICATOR_DURATION).pipe(
      Effect.as(HiddenCopiedIndicator({ text })),
    ),
  )

const scrollToTop = ScrollToTop(
  Effect.sync(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    return CompletedScroll()
  }),
)

const focusAndScrollToHash = (hash: string): void => {
  const element = document.getElementById(hash)

  if (element) {
    element.scrollIntoView({ behavior: 'instant' })

    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '-1')
    }

    element.focus({ preventScroll: true })
  }
}

const scrollToHash = (hash: string) =>
  ScrollToAnchor(
    Effect.sync(() => {
      focusAndScrollToHash(hash)
      return CompletedScroll()
    }),
  )

const scrollToHashAfterRender = (hash: string) =>
  ScrollToAnchor(
    Effect.async<typeof CompletedScroll.Type>(resume => {
      requestAnimationFrame(() => {
        focusAndScrollToHash(hash)
        resume(Effect.succeed(CompletedScroll()))
      })
    }),
  )

const applyThemeToDocument = (theme: typeof ResolvedTheme.Type) =>
  ApplyTheme(
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
  )

const BUTTONDOWN_SUBSCRIBE_URL =
  'https://buttondown.com/api/emails/embed-subscribe/foldkit'

const validateEmail = StringField.validate([
  FieldValidation.required('Email is required'),
  FieldValidation.email('Please enter a valid email address'),
])

const subscribeToNewsletter = (email: string) =>
  SubscribeToNewsletter(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient
      const request = HttpClientRequest.post(BUTTONDOWN_SUBSCRIBE_URL).pipe(
        HttpClientRequest.bodyUrlParams({ email }),
      )
      const response = yield* client.execute(request)

      if (response.status >= 400) {
        return yield* Effect.fail('Subscription failed')
      }

      return SucceededSubscribeEmail()
    }).pipe(
      Effect.scoped,
      Effect.catchAll(() => Effect.succeed(FailedSubscribeEmail())),
      Effect.locally(HttpClient.currentTracerPropagation, false),
      Effect.provide(FetchHttpClient.layer),
    ),
  )

const saveThemePreference = (preference: typeof ThemePreference.Type) =>
  SaveThemePreference(
    Effect.gen(function* () {
      const store = yield* KeyValueStore.KeyValueStore
      yield* store.set(THEME_STORAGE_KEY, JSON.stringify(preference))
      return CompletedSaveThemePreference()
    }).pipe(
      Effect.catchAll(() => Effect.succeed(CompletedSaveThemePreference())),
      Effect.provide(BrowserKeyValueStore.layerLocalStorage),
    ),
  )

// VIEW

const view = (model: Model) =>
  M.value(model.route).pipe(
    M.tag('Home', () => landingView(model)),
    M.tag('Newsletter', () => newsletterView(model)),
    M.orElse(route => docsView(model, route)),
  )

// TITLE

const SITE_NAME = 'Foldkit'

const routeTitle = (route: AppRoute): string =>
  M.value(route).pipe(
    M.tag('Home', () => SITE_NAME),
    M.tag('Newsletter', () => `Newsletter — ${SITE_NAME}`),
    M.tag('NotFound', () => `Not Found — ${SITE_NAME}`),
    M.tag(
      'ApiModule',
      ({ moduleSlug }) => `${moduleSlug} — API — ${SITE_NAME}`,
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

const SubscriptionDeps = S.Struct({
  aiHeading: S.Struct({
    isLandingPage: S.Boolean,
  }),
  activeSection: S.Struct({
    pageId: S.String,
    sections: S.Array(S.String),
  }),
  exampleUrl: S.OptionFromSelf(S.String),
  heroVisibility: S.Struct({
    isLandingPage: S.Boolean,
  }),
  searchShortcut: S.Struct({
    isDocsPage: S.Boolean,
  }),
  systemTheme: S.Struct({
    isSystemPreference: S.Boolean,
  }),
  viewportWidth: S.Null,
})

export type SubscriptionDeps = typeof SubscriptionDeps.Type

const subscriptions = makeSubscriptions(SubscriptionDeps)<Model, Message>({
  aiHeading: Subscription.aiHeading,
  activeSection: Subscription.activeSection,
  exampleUrl: Subscription.exampleUrl,
  heroVisibility: Subscription.heroVisibility,
  searchShortcut: Subscription.searchShortcut,
  systemTheme: Subscription.systemTheme,
  viewportWidth: Subscription.viewportWidth,
})

// TRACER

const devTracerLayer: Layer.Layer<never> = import.meta.hot
  ? Layer.setTracer(
      Tracer.make({
        context: f => f(),
        span: (name, _parent, _context, _links, startTime, kind) => {
          const attributes = new Map<string, unknown>()
          return {
            _tag: 'Span' as const,
            name,
            spanId: `${name}-${Date.now()}`,
            traceId: 'dev',
            sampled: true,
            parent: Option.none(),
            context: _context,
            links: [],
            kind,
            status: { _tag: 'Started' as const, startTime },
            attributes,
            end: (endTime: bigint) => {
              const durationMs = Number(endTime - startTime) / 1_000_000
              console.log(`[Command] ${name} ${durationMs.toFixed(1)}ms`)
            },
            attribute: (key: string, value: unknown) => {
              attributes.set(key, value)
            },
            event: () => {},
            addLinks: () => {},
          }
        },
      }),
    )
  : Layer.empty

// RUN

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  title: ({ route }) => routeTitle(route),
  subscriptions,
  container: document.getElementById('root')!,
  routing: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
  resources: Layer.mergeAll(
    Page.NotePlayerDemo.AudioContextService.Default,
    Search.PagefindService.Default,
    devTracerLayer,
  ),
  devtools: {
    show: 'Always',
    mode: 'Inspect',
    banner:
      'Welcome to Foldkit DevTools. This site runs on Foldkit \u2014 navigate around or interact with the page and every action appears here as a Message. Click any row to see the Model state it produced.',
  },
})

Runtime.run(program)
