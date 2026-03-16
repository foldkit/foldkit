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
  DateTime,
  Effect,
  HashSet,
  Match as M,
  Number,
  Option,
  Schema as S,
  flow,
} from 'effect'
import { FieldValidation, Runtime, Ui } from 'foldkit'
import { Command } from 'foldkit/command'
import { load, pushUrl } from 'foldkit/navigation'
import { evo } from 'foldkit/struct'
import { makeSubscriptions } from 'foldkit/subscription'
import { Url, toString as urlToString } from 'foldkit/url'

import {
  ChangedUrl,
  ClickedLink,
  CompletedAnalyticsInjection,
  CompletedApplyTheme,
  CompletedCopyLink,
  CompletedExternalNavigation,
  CompletedInternalNavigation,
  CompletedSaveThemePreference,
  CompletedScroll,
  CompletedSpeedInsightsInjection,
  FailedCopy,
  FailedEmailSubscription,
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
  GotUiPageMessage,
  HiddenCopiedIndicator,
  type Message,
  ResolvedTheme,
  SucceededCopy,
  SucceededEmailSubscription,
  ThemePreference,
} from './message'
import * as Page from './page'
import { AppRoute, isLandingHeaderAlwaysVisible, urlToAppRoute } from './route'
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
})

export type Model = typeof Model.Type

// INIT

const init: Runtime.ApplicationInit<
  Model,
  Message,
  Flags,
  Page.NotePlayerDemo.AudioContextService
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

  const [asyncCounterDemo, asyncCounterDemoCommands] =
    Page.AsyncCounterDemo.init()
  const [notePlayerDemo, notePlayerDemoCommands] = Page.NotePlayerDemo.init()
  const [uiPages, uiPagesCommands] = Page.UiPages.init()
  const [comingFromReact, comingFromReactCommands] = Page.ComingFromReact.init()
  const [apiReference, apiReferenceCommands] = Page.ApiReference.init(
    Page.ApiReference.apiReference.modules,
  )

  const mappedAsyncCounterDemoCommands = asyncCounterDemoCommands.map(
    Effect.map(message => GotAsyncCounterDemoMessage({ message })),
  )

  const mappedNotePlayerDemoCommands = notePlayerDemoCommands.map(
    Effect.map(message => GotNotePlayerDemoMessage({ message })),
  )

  const mappedUiPagesCommands = uiPagesCommands.map(
    Effect.map(message => GotUiPageMessage({ message })),
  )

  const mappedComingFromReactCommands = comingFromReactCommands.map(
    Effect.map(message => GotComingFromReactMessage({ message })),
  )

  const mappedApiReferenceCommands = apiReferenceCommands.map(
    Effect.map(message => GotApiReferenceMessage({ message })),
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
): [
  Model,
  ReadonlyArray<
    Command<Message, never, Page.NotePlayerDemo.AudioContextService>
  >,
] =>
  M.value(message).pipe(
    M.withReturnType<
      [
        Model,
        ReadonlyArray<
          Command<Message, never, Page.NotePlayerDemo.AudioContextService>
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
              ReadonlyArray<Command<typeof CompletedInternalNavigation>>,
            ] => [
              model,
              [
                pushUrl(urlToString(url)).pipe(
                  Effect.as(CompletedInternalNavigation()),
                ),
              ],
            ],
            External: ({
              href,
            }): [
              Model,
              ReadonlyArray<Command<typeof CompletedExternalNavigation>>,
            ] => [
              model,
              [load(href).pipe(Effect.as(CompletedExternalNavigation()))],
            ],
          }),
        ),

      ChangedUrl: ({ url }) => {
        const nextRoute = urlToAppRoute(url)
        const [closedDialog, closeDialogCommands] = Ui.Dialog.update(
          model.mobileMenuDialog,
          Ui.Dialog.Closed(),
        )

        return [
          evo(model, {
            route: () => nextRoute,
            url: () => url,
            mobileMenuDialog: () => closedDialog,
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
            ...closeDialogCommands.map(
              Effect.map(message => GotMobileMenuDialogMessage({ message })),
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
              [subscribeToNewsletterLive(model.emailField.value)],
            ]
          : [evo(model, { emailField: () => result }), []]
      },

      SucceededEmailSubscription: () => [
        evo(model, {
          emailField: () => StringField.NotValidated({ value: '' }),
          emailSubscriptionStatus: () => 'Succeeded',
        }),
        [],
      ],

      FailedEmailSubscription: () => [
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
            Effect.map(message => GotMobileMenuDialogMessage({ message })),
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
          aiHeadingToggleCount: Number.increment,
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
            Effect.map(message => GotDemoTabsMessage({ message })),
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
            Effect.map(message => GotAsyncCounterDemoMessage({ message })),
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
            Effect.map(message => GotNotePlayerDemoMessage({ message })),
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
            Effect.map(message => GotComingFromReactMessage({ message })),
          ),
        ]
      },

      GotApiReferenceMessage: ({ message }) => {
        const [nextApiReference, apiReferenceCommands] =
          Page.ApiReference.update(model.apiReference, message)

        return [
          evo(model, { apiReference: () => nextApiReference }),
          apiReferenceCommands.map(
            Effect.map(message => GotApiReferenceMessage({ message })),
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
            Effect.map(message => GotUiPageMessage({ message })),
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
            Effect.map(message => GotGetStartedGroupMessage({ message })),
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
            Effect.map(message => GotCoreConceptsGroupMessage({ message })),
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
            Effect.map(message => GotGuidesGroupMessage({ message })),
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
            Effect.map(message => GotBestPracticesGroupMessage({ message })),
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
            Effect.map(message => GotPatternsGroupMessage({ message })),
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
            Effect.map(message => GotFoldkitUiGroupMessage({ message })),
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
            Effect.map(message => GotAiGroupMessage({ message })),
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
            Effect.map(message => GotExamplesGroupMessage({ message })),
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
            Effect.map(message => GotApiReferenceGroupMessage({ message })),
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
            Effect.map(message => GotExampleDetailMessage({ message })),
          ),
        ]
      },
    }),
    M.tag(
      'CompletedInternalNavigation',
      'CompletedExternalNavigation',
      'CompletedAnalyticsInjection',
      'CompletedSpeedInsightsInjection',
      'CompletedScroll',
      'CompletedApplyTheme',
      'CompletedSaveThemePreference',
      'CompletedCopyLink',
      'FailedCopy',
      () => [model, []],
    ),
    M.exhaustive,
  )

// COMMAND

const injectAnalytics: Command<typeof CompletedAnalyticsInjection> =
  Effect.sync(() => inject()).pipe(Effect.as(CompletedAnalyticsInjection()))

const injectSpeedInsights: Command<typeof CompletedSpeedInsightsInjection> =
  Effect.sync(() => SpeedInsights.injectSpeedInsights()).pipe(
    Effect.as(CompletedSpeedInsightsInjection()),
  )

const copySnippetToClipboard = (
  text: string,
): Command<typeof SucceededCopy | typeof FailedCopy> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(SucceededCopy({ text })),
    Effect.catchAll(() => Effect.succeed(FailedCopy())),
  )

const copyLinkToClipboard = (
  url: string,
): Command<typeof CompletedCopyLink | typeof FailedCopy> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(url),
    catch: () => new Error('Failed to copy link to clipboard'),
  }).pipe(
    Effect.as(CompletedCopyLink()),
    Effect.catchAll(() => Effect.succeed(FailedCopy())),
  )

const COPY_INDICATOR_DURATION = '2 seconds'

const hideIndicator = (text: string): Command<typeof HiddenCopiedIndicator> =>
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(
    Effect.as(HiddenCopiedIndicator({ text })),
  )

const scrollToTop: Command<typeof CompletedScroll> = Effect.sync(() => {
  window.scrollTo({ top: 0, behavior: 'instant' })
  return CompletedScroll()
})

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

const scrollToHash = (hash: string): Command<typeof CompletedScroll> =>
  Effect.sync(() => {
    focusAndScrollToHash(hash)
    return CompletedScroll()
  })

const scrollToHashAfterRender = (
  hash: string,
): Command<typeof CompletedScroll> =>
  Effect.async(resume => {
    requestAnimationFrame(() => {
      focusAndScrollToHash(hash)
      resume(Effect.succeed(CompletedScroll()))
    })
  })

const applyThemeToDocument = (
  theme: typeof ResolvedTheme.Type,
): Command<typeof CompletedApplyTheme> =>
  Effect.sync(() => {
    M.value(theme).pipe(
      M.when('Dark', () => document.documentElement.classList.add('dark')),
      M.when('Light', () => document.documentElement.classList.remove('dark')),
      M.exhaustive,
    )
    return CompletedApplyTheme()
  })

const BUTTONDOWN_SUBSCRIBE_URL =
  'https://buttondown.com/api/emails/embed-subscribe/foldkit'

const validateEmail = StringField.validate([
  FieldValidation.required('Email is required'),
  FieldValidation.email('Please enter a valid email address'),
])

const subscribeToNewsletter = (
  email: string,
): Command<
  typeof SucceededEmailSubscription | typeof FailedEmailSubscription,
  never,
  HttpClient.HttpClient
> =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const request = HttpClientRequest.post(BUTTONDOWN_SUBSCRIBE_URL).pipe(
      HttpClientRequest.bodyUrlParams({ email }),
    )
    const response = yield* client.execute(request)

    if (response.status >= 400) {
      return yield* Effect.fail('Subscription failed')
    }

    return SucceededEmailSubscription()
  }).pipe(
    Effect.scoped,
    Effect.catchAll(() => Effect.succeed(FailedEmailSubscription())),
  )

const subscribeToNewsletterLive = flow(
  subscribeToNewsletter,
  Effect.locally(HttpClient.currentTracerPropagation, false),
  Effect.provide(FetchHttpClient.layer),
)

const saveThemePreference = (
  preference: typeof ThemePreference.Type,
): Command<typeof CompletedSaveThemePreference> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(THEME_STORAGE_KEY, JSON.stringify(preference))
    return CompletedSaveThemePreference()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(CompletedSaveThemePreference())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

// VIEW

const view = (model: Model) =>
  M.value(model.route).pipe(
    M.tag('Home', () => landingView(model)),
    M.tag('Newsletter', () => newsletterView(model)),
    M.orElse(route => docsView(model, route)),
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
  systemTheme: Subscription.systemTheme,
  viewportWidth: Subscription.viewportWidth,
})

// RUN

const application = Runtime.makeApplication({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  subscriptions,
  container: document.getElementById('root')!,
  browser: {
    onUrlRequest: request => ClickedLink({ request }),
    onUrlChange: url => ChangedUrl({ url }),
  },
  resources: Page.NotePlayerDemo.AudioContextService.Default,
  devtools: {
    show: 'Always',
    mode: 'Inspect',
    banner:
      'Welcome to Foldkit DevTools. This site runs on Foldkit \u2014 navigate around or interact with the page and every action appears here as a Message. Click any row to see the Model state it produced.',
  },
})

Runtime.run(application)
