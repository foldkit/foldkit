import { KeyValueStore } from '@effect/platform'
import { BrowserKeyValueStore } from '@effect/platform-browser'
import { inject } from '@vercel/analytics'
import * as SpeedInsights from '@vercel/speed-insights'
import classNames from 'classnames'
import {
  Array,
  Effect,
  HashSet,
  Match as M,
  Option,
  Schema as S,
  pipe,
} from 'effect'
import { Runtime, Ui } from 'foldkit'
import { Command } from 'foldkit/command'
import { Html, createKeyedLazy, createLazy } from 'foldkit/html'
import { m } from 'foldkit/message'
import { load, pushUrl } from 'foldkit/navigation'
import { UrlRequest } from 'foldkit/runtime'
import { evo } from 'foldkit/struct'
import { makeSubscriptions } from 'foldkit/subscription'
import { Url, toString as urlToString } from 'foldkit/url'

import {
  Alt,
  AriaCurrent,
  AriaExpanded,
  AriaHidden,
  AriaLabel,
  Class,
  Href,
  Id,
  OnClick,
  OnToggle,
  Open,
  Src,
  a,
  aside,
  button,
  details,
  div,
  empty,
  footer,
  h2,
  h3,
  header,
  img,
  keyed,
  li,
  main,
  nav,
  p,
  span,
  summary,
  ul,
} from './html'
import { Icon } from './icon'
import { Link } from './link'
import * as Page from './page'
import {
  AdvancedPatternsRoute,
  AppRoute,
  ArchitectureAndConceptsRoute,
  BestPracticesRoute,
  ComingFromReactRoute,
  DocsRoute,
  ExamplesRoute,
  FieldValidationRoute,
  FoldkitUiRoute,
  GettingStartedRoute,
  ProjectOrganizationRoute,
  RoutingAndNavigationRoute,
  WhyFoldkitRoute,
  advancedPatternsRouter,
  apiModuleRouter,
  architectureAndConceptsRouter,
  bestPracticesRouter,
  comingFromReactRouter,
  examplesRouter,
  fieldValidationRouter,
  foldkitUiRouter,
  gettingStartedRouter,
  homeRouter,
  projectOrganizationRouter,
  routingAndNavigationRouter,
  urlToAppRoute,
  whyFoldkitRouter,
} from './route'
import * as Subscription from './subscription'
import { themeSelector } from './view/themeSelector'

export type TableOfContentsEntry = {
  id: string
  text: string
  level: 'h2' | 'h3' | 'h4'
}

// THEME

const ThemePreference = S.Literal('Dark', 'Light', 'System')
const ResolvedTheme = S.Literal('Dark', 'Light')
const THEME_STORAGE_KEY = 'theme-preference'

export type ThemePreference = typeof ThemePreference.Type
export type ResolvedTheme = typeof ResolvedTheme.Type

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

const Flags = S.Struct({
  themePreference: S.Option(ThemePreference),
  systemTheme: ResolvedTheme,
  isNarrowViewport: S.Boolean,
})

type Flags = typeof Flags.Type

const getSystemTheme = (): ResolvedTheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'Dark'
    : 'Light'

export const NARROW_VIEWPORT_QUERY = '(max-width: 1023px)'

const getIsNarrowViewport = (): boolean =>
  window.matchMedia(NARROW_VIEWPORT_QUERY).matches

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const store = yield* KeyValueStore.KeyValueStore
  const maybeJson = yield* store.get(THEME_STORAGE_KEY)
  const json = yield* maybeJson
  const theme = yield* S.decode(S.parseJson(ThemePreference))(json)
  return {
    themePreference: Option.some(theme),
    systemTheme: getSystemTheme(),
    isNarrowViewport: getIsNarrowViewport(),
  }
}).pipe(
  Effect.catchAll(() =>
    Effect.succeed({
      themePreference: Option.none(),
      systemTheme: getSystemTheme(),
      isNarrowViewport: getIsNarrowViewport(),
    }),
  ),
  Effect.provide(BrowserKeyValueStore.layerLocalStorage),
)

// MODEL

export const Model = S.Struct({
  route: AppRoute,
  url: Url,
  copiedSnippets: S.HashSet(S.String),
  mobileMenuDialog: Ui.Dialog.Model,
  isMobileTableOfContentsOpen: S.Boolean,
  activeSection: S.Option(S.String),
  isLandingHeaderVisible: S.Boolean,
  isNarrowViewport: S.Boolean,
  apiReferenceGroup: Ui.Disclosure.Model,
  themePreference: ThemePreference,
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  demoTabs: Ui.Tabs.Model,
  asyncCounterDemo: Page.AsyncCounterDemo.Model,
  notePlayerDemo: Page.NotePlayerDemo.Model,
  foldkitUi: Page.FoldkitUi.Model,
  comingFromReact: Page.ComingFromReact.Model,
  apiReference: Page.ApiReference.Model,
})

export type Model = typeof Model.Type

// MESSAGE

const NoOp = m('NoOp')
const ClickedLink = m('ClickedLink', {
  request: UrlRequest,
})
const ChangedUrl = m('ChangedUrl', { url: Url })
export const ClickedCopySnippet = m('ClickedCopySnippet', {
  text: S.String,
})
export const ClickedCopyLink = m('ClickedCopyLink', {
  hash: S.String,
})
const SucceededCopy = m('SucceededCopy', { text: S.String })
const HiddenCopiedIndicator = m('HiddenCopiedIndicator', {
  text: S.String,
})
const GotMobileMenuDialogMessage = m('GotMobileMenuDialogMessage', {
  message: Ui.Dialog.Message,
})
const ToggledMobileTableOfContents = m(
  'ToggledMobileTableOfContents',
  {
    isOpen: S.Boolean,
  },
)
const ClickedMobileTableOfContentsLink = m(
  'ClickedMobileTableOfContentsLink',
  { sectionId: S.String },
)
export const ChangedActiveSection = m('ChangedActiveSection', {
  sectionId: S.String,
})
export const SelectedThemePreference = m('SelectedThemePreference', {
  preference: ThemePreference,
})
export const ChangedSystemTheme = m('ChangedSystemTheme', {
  theme: ResolvedTheme,
})
export const ChangedHeroVisibility = m('ChangedHeroVisibility', {
  isVisible: S.Boolean,
})
export const ChangedViewportWidth = m('ChangedViewportWidth', {
  isNarrow: S.Boolean,
})
const GotDemoTabsMessage = m('GotDemoTabsMessage', {
  message: Ui.Tabs.Message,
})
const GotAsyncCounterDemoMessage = m('GotAsyncCounterDemoMessage', {
  message: Page.AsyncCounterDemo.Message,
})
const GotNotePlayerDemoMessage = m('GotNotePlayerDemoMessage', {
  message: Page.NotePlayerDemo.Message,
})
const GotFoldkitUiMessage = m('GotFoldkitUiMessage', {
  message: Page.FoldkitUi.Message,
})
const GotComingFromReactMessage = m('GotComingFromReactMessage', {
  message: Page.ComingFromReact.Message,
})
const GotApiReferenceMessage = m('GotApiReferenceMessage', {
  message: Page.ApiReference.Message,
})
const GotApiReferenceGroupMessage = m('GotApiReferenceGroupMessage', {
  message: Ui.Disclosure.Message,
})

const Message = S.Union(
  NoOp,
  ClickedLink,
  ChangedUrl,
  ClickedCopySnippet,
  ClickedCopyLink,
  SucceededCopy,
  HiddenCopiedIndicator,
  GotMobileMenuDialogMessage,
  ToggledMobileTableOfContents,
  ClickedMobileTableOfContentsLink,
  ChangedActiveSection,
  SelectedThemePreference,
  ChangedSystemTheme,
  ChangedHeroVisibility,
  ChangedViewportWidth,
  GotDemoTabsMessage,
  GotAsyncCounterDemoMessage,
  GotNotePlayerDemoMessage,
  GotFoldkitUiMessage,
  GotComingFromReactMessage,
  GotApiReferenceMessage,
  GotApiReferenceGroupMessage,
)
export type Message = typeof Message.Type

const toFoldkitUiMessage = (
  message: Page.FoldkitUi.Message,
): Message => GotFoldkitUiMessage({ message })

// INIT

const init: Runtime.ApplicationInit<
  Model,
  Message,
  Flags,
  Page.NotePlayerDemo.AudioContextService
> = (loadedFlags: Flags, url: Url) => {
  const themePreference = Option.getOrElse(
    loadedFlags.themePreference,
    () => 'System' as const,
  )
  const { systemTheme } = loadedFlags
  const resolvedTheme = resolveTheme(themePreference, systemTheme)

  const demoTabs = Ui.Tabs.init({
    id: 'demo-tabs',
  })

  const [asyncCounterDemo, asyncCounterDemoCommands] =
    Page.AsyncCounterDemo.init()
  const [notePlayerDemo, notePlayerDemoCommands] =
    Page.NotePlayerDemo.init()
  const [foldkitUi, foldkitUiCommands] = Page.FoldkitUi.init()
  const [comingFromReact, comingFromReactCommands] =
    Page.ComingFromReact.init()
  const [apiReference, apiReferenceCommands] = Page.ApiReference.init(
    Page.ApiReference.apiReference.modules,
  )

  const mappedAsyncCounterDemoCommands = asyncCounterDemoCommands.map(
    Effect.map(message => GotAsyncCounterDemoMessage({ message })),
  )

  const mappedNotePlayerDemoCommands = notePlayerDemoCommands.map(
    Effect.map(message => GotNotePlayerDemoMessage({ message })),
  )

  const mappedFoldkitUiCommands = foldkitUiCommands.map(message =>
    Effect.map(message, message => GotFoldkitUiMessage({ message })),
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
      mobileMenuDialog: Ui.Dialog.init({ id: 'mobile-menu' }),
      isMobileTableOfContentsOpen: false,
      activeSection: Option.none(),
      isLandingHeaderVisible: false,
      isNarrowViewport: loadedFlags.isNarrowViewport,
      apiReferenceGroup: {
        ...Ui.Disclosure.init({ id: 'api-reference-group' }),
        isOpen: initialRoute._tag === 'ApiModule',
      },
      themePreference,
      systemTheme,
      resolvedTheme,
      demoTabs,
      asyncCounterDemo,
      notePlayerDemo,
      foldkitUi,
      comingFromReact,
      apiReference,
    },
    [
      injectAnalytics,
      injectSpeedInsights,
      applyThemeToDocument(resolvedTheme),
      ...mappedAsyncCounterDemoCommands,
      ...mappedNotePlayerDemoCommands,
      ...mappedFoldkitUiCommands,
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
          Command<
            Message,
            never,
            Page.NotePlayerDemo.AudioContextService
          >
        >,
      ]
    >(),
    M.tagsExhaustive({
      NoOp: () => [model, []],

      ClickedLink: ({ request }) =>
        M.value(request).pipe(
          M.tagsExhaustive({
            Internal: ({
              url,
            }): [Model, ReadonlyArray<Command<typeof NoOp>>] => [
              model,
              [pushUrl(urlToString(url)).pipe(Effect.as(NoOp()))],
            ],
            External: ({
              href,
            }): [Model, ReadonlyArray<Command<typeof NoOp>>] => [
              model,
              [load(href).pipe(Effect.as(NoOp()))],
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
            apiReferenceGroup: apiReferenceGroup =>
              nextRoute._tag === 'ApiModule'
                ? { ...apiReferenceGroup, isOpen: true }
                : apiReferenceGroup,
          }),
          [
            ...closeDialogCommands.map(
              Effect.map(message =>
                GotMobileMenuDialogMessage({ message }),
              ),
            ),
            ...Option.match(url.hash, {
              onNone: () => [scrollToTop],
              onSome: hash => [scrollToHash(hash)],
            }),
          ],
        ]
      },

      ClickedCopySnippet: ({ text }) => [
        model,
        [copySnippetToClipboard(text)],
      ],

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

      GotMobileMenuDialogMessage: ({ message }) => {
        const [nextMobileMenuDialog, mobileMenuDialogCommands] =
          Ui.Dialog.update(model.mobileMenuDialog, message)

        return [
          evo(model, {
            mobileMenuDialog: () => nextMobileMenuDialog,
          }),
          mobileMenuDialogCommands.map(
            Effect.map(message =>
              GotMobileMenuDialogMessage({ message }),
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

      SelectedThemePreference: ({ preference }) => {
        const resolvedTheme = resolveTheme(
          preference,
          model.systemTheme,
        )

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
          Page.AsyncCounterDemo.update(
            model.asyncCounterDemo,
            message,
          )

        return [
          evo(model, {
            asyncCounterDemo: () => nextAsyncCounterDemo,
          }),
          asyncCounterDemoCommands.map(
            Effect.map(message =>
              GotAsyncCounterDemoMessage({ message }),
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
            Effect.map(message =>
              GotNotePlayerDemoMessage({ message }),
            ),
          ),
        ]
      },

      GotFoldkitUiMessage: ({ message }) => {
        const [nextFoldkitUi, foldkitUiCommands] =
          Page.FoldkitUi.update(model.foldkitUi, message)

        return [
          evo(model, { foldkitUi: () => nextFoldkitUi }),
          foldkitUiCommands.map(
            Effect.map(message => GotFoldkitUiMessage({ message })),
          ),
        ]
      },

      ChangedSystemTheme: ({ theme }) => {
        const resolvedTheme = resolveTheme(
          model.themePreference,
          theme,
        )

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
            Effect.map(message =>
              GotComingFromReactMessage({ message }),
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
            Effect.map(message =>
              GotApiReferenceMessage({ message }),
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
            Effect.map(message =>
              GotApiReferenceGroupMessage({ message }),
            ),
          ),
        ]
      },
    }),
  )

// COMMAND

const injectAnalytics: Command<typeof NoOp> = Effect.sync(() =>
  inject(),
).pipe(Effect.as(NoOp()))

const injectSpeedInsights: Command<typeof NoOp> = Effect.sync(() =>
  SpeedInsights.injectSpeedInsights(),
).pipe(Effect.as(NoOp()))

const copySnippetToClipboard = (
  text: string,
): Command<typeof SucceededCopy | typeof NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: () => new Error('Failed to copy to clipboard'),
  }).pipe(
    Effect.as(SucceededCopy({ text })),
    Effect.catchAll(() => Effect.succeed(NoOp())),
  )

const copyLinkToClipboard = (url: string): Command<typeof NoOp> =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(url),
    catch: () => new Error('Failed to copy link to clipboard'),
  }).pipe(
    Effect.as(NoOp()),
    Effect.catchAll(() => Effect.succeed(NoOp())),
  )

const COPY_INDICATOR_DURATION = '2 seconds'

const hideIndicator = (
  text: string,
): Command<typeof HiddenCopiedIndicator> =>
  Effect.sleep(COPY_INDICATOR_DURATION).pipe(
    Effect.as(HiddenCopiedIndicator({ text })),
  )

const scrollToTop: Command<typeof NoOp> = Effect.sync(() => {
  window.scrollTo({ top: 0, behavior: 'instant' })
  return NoOp()
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

const scrollToHash = (hash: string): Command<typeof NoOp> =>
  Effect.sync(() => {
    focusAndScrollToHash(hash)
    return NoOp()
  })

const scrollToHashAfterRender = (
  hash: string,
): Command<typeof NoOp> =>
  Effect.async(resume => {
    requestAnimationFrame(() => {
      focusAndScrollToHash(hash)
      resume(Effect.succeed(NoOp()))
    })
  })

const applyThemeToDocument = (
  theme: ResolvedTheme,
): Command<typeof NoOp> =>
  Effect.sync(() => {
    M.value(theme).pipe(
      M.when('Dark', () =>
        document.documentElement.classList.add('dark'),
      ),
      M.when('Light', () =>
        document.documentElement.classList.remove('dark'),
      ),
      M.exhaustive,
    )
    return NoOp()
  })

const saveThemePreference = (
  preference: ThemePreference,
): Command<typeof NoOp> =>
  Effect.gen(function* () {
    const store = yield* KeyValueStore.KeyValueStore
    yield* store.set(THEME_STORAGE_KEY, JSON.stringify(preference))
    return NoOp()
  }).pipe(
    Effect.catchAll(() => Effect.succeed(NoOp())),
    Effect.provide(BrowserKeyValueStore.layerLocalStorage),
  )

// VIEW

const sidebarView = (
  currentRoute: AppRoute,
  mobileMenuDialog: Ui.Dialog.Model,
  apiReferenceGroup: Ui.Disclosure.Model,
) => {
  const isOnApiModulePage = currentRoute._tag === 'ApiModule'

  const linkClass = (isActive: boolean) =>
    classNames(
      'block px-4 py-3 md:px-2.5 md:py-1 rounded transition text-base md:text-sm font-normal md:font-normal',
      {
        'bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-400':
          isActive,
        'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800':
          !isActive,
      },
    )

  const navLink = (href: string, isActive: boolean, label: string) =>
    li(
      [],
      [
        a(
          [
            Href(href),
            Class(linkClass(isActive)),
            ...(isActive ? [AriaCurrent('page')] : []),
          ],
          [label],
        ),
      ],
    )

  const navLinks = ul(
    [Class('space-y-1')],
    [
      navLink(
        whyFoldkitRouter.build({}),
        S.is(WhyFoldkitRoute)(currentRoute),
        'Why Foldkit?',
      ),
      navLink(
        comingFromReactRouter.build({}),
        S.is(ComingFromReactRoute)(currentRoute),
        'Coming from React',
      ),
      navLink(
        gettingStartedRouter.build({}),
        S.is(GettingStartedRoute)(currentRoute),
        'Getting Started',
      ),
      navLink(
        architectureAndConceptsRouter.build({}),
        S.is(ArchitectureAndConceptsRoute)(currentRoute),
        'Architecture & Concepts',
      ),
      navLink(
        routingAndNavigationRouter.build({}),
        S.is(RoutingAndNavigationRoute)(currentRoute),
        'Routing & Navigation',
      ),
      navLink(
        fieldValidationRouter.build({}),
        S.is(FieldValidationRoute)(currentRoute),
        'Field Validation',
      ),
      navLink(
        projectOrganizationRouter.build({}),
        S.is(ProjectOrganizationRoute)(currentRoute),
        'Project Organization',
      ),
      navLink(
        advancedPatternsRouter.build({}),
        S.is(AdvancedPatternsRoute)(currentRoute),
        'Advanced Patterns',
      ),
      navLink(
        bestPracticesRouter.build({}),
        S.is(BestPracticesRoute)(currentRoute),
        'Best Practices',
      ),
      navLink(
        examplesRouter.build({}),
        S.is(ExamplesRoute)(currentRoute),
        'Example Apps',
      ),
      navLink(
        foldkitUiRouter.build({}),
        S.is(FoldkitUiRoute)(currentRoute),
        'Foldkit UI',
      ),
      li(
        [],
        [
          Ui.Disclosure.view({
            model: apiReferenceGroup,
            toMessage: message =>
              GotApiReferenceGroupMessage({ message }),
            buttonClassName: classNames(
              linkClass(false),
              'w-full flex items-center justify-between cursor-pointer',
            ),
            buttonContent: div(
              [Class('flex items-center justify-between w-full')],
              [
                span([], ['API Reference']),
                span(
                  [
                    Class(
                      classNames('transition-transform', {
                        'rotate-180': apiReferenceGroup.isOpen,
                      }),
                    ),
                  ],
                  [Icon.chevronDown('w-4 h-4')],
                ),
              ],
            ),
            panelClassName: 'pl-4 space-y-1 mt-1',
            panelContent: ul(
              [],
              Array.map(
                Page.ApiReference.moduleSlugs,
                ({ slug, name }) =>
                  navLink(
                    apiModuleRouter.build({
                      moduleSlug: slug,
                    }),
                    isOnApiModulePage &&
                      currentRoute.moduleSlug === slug,
                    name,
                  ),
              ),
            ),
          }),
        ],
      ),
    ],
  )

  const desktopSidebar = aside(
    [
      AriaLabel('Documentation sidebar'),
      Class(
        'hidden md:flex fixed top-[var(--header-height)] bottom-0 left-0 z-40 w-64 bg-cream dark:bg-gray-900 border-r border-gray-300 dark:border-gray-800 flex-col',
      ),
    ],
    [
      nav(
        [
          AriaLabel('Documentation'),
          Class('flex-1 overflow-y-auto p-4'),
        ],
        [
          h2(
            [
              AriaHidden(true),
              Class(
                'text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3',
              ),
            ],
            ['Documentation'],
          ),
          navLinks,
        ],
      ),
    ],
  )

  const mobileMenuContent = div(
    [Class('flex flex-col h-full')],
    [
      div(
        [
          Class(
            'flex justify-between items-center p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] border-b border-gray-300 dark:border-gray-800 shrink-0',
          ),
        ],
        [
          a(
            [Href(homeRouter.build({}))],
            [
              img([
                Src('/logo.svg'),
                Alt('Foldkit'),
                Class('h-6 dark:invert'),
              ]),
            ],
          ),
          button(
            [
              Class(
                'p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              AriaLabel('Close menu'),
              OnClick(
                GotMobileMenuDialogMessage({
                  message: Ui.Dialog.Closed(),
                }),
              ),
            ],
            [Icon.close('w-6 h-6')],
          ),
        ],
      ),
      nav(
        [
          AriaLabel('Documentation'),
          Class('flex-1 overflow-y-auto p-4'),
        ],
        [navLinks],
      ),
      div(
        [
          Class(
            'p-4 border-t border-gray-300 dark:border-gray-800 shrink-0',
          ),
        ],
        [
          div(
            [Class('flex items-center justify-center gap-8')],
            [
              iconLink(Link.github, 'GitHub', Icon.github('w-6 h-6')),
              iconLink(Link.npm, 'npm', Icon.npm('w-8 h-8')),
            ],
          ),
        ],
      ),
    ],
  )

  const mobileMenu = Ui.Dialog.view({
    model: mobileMenuDialog,
    toMessage: message => GotMobileMenuDialogMessage({ message }),
    panelContent: mobileMenuContent,
    panelClassName:
      'fixed inset-0 z-[60] bg-cream dark:bg-gray-900 flex flex-col',
    backdropClassName: 'fixed inset-0 z-[59]',
    className: 'md:hidden',
  })

  return div([], [desktopSidebar, mobileMenu])
}

const iconLink = (link: string, ariaLabel: string, icon: Html) =>
  a(
    [
      Href(link),
      Class(
        'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition',
      ),
      AriaLabel(ariaLabel),
    ],
    [icon],
  )

const tableOfContentsEntryView = (
  level: TableOfContentsEntry['level'],
  id: string,
  text: string,
  isActive: boolean,
): Html =>
  keyed('li')(
    id,
    [
      Class(
        classNames({
          'ml-3': level === 'h3',
          'ml-6': level === 'h4',
        }),
      ),
    ],
    [
      a(
        [
          Href(`#${id}`),
          OnClick(ChangedActiveSection({ sectionId: id })),
          Class(
            classNames('transition block', {
              'text-accent-600 dark:text-accent-400 underline':
                isActive,
              'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white':
                !isActive,
            }),
          ),
          ...(isActive ? [AriaCurrent('location')] : []),
        ],
        [text],
      ),
    ],
  )

const lazyTocEntry = createKeyedLazy()

const tableOfContentsView = (
  entries: ReadonlyArray<TableOfContentsEntry>,
  maybeActiveSectionId: Option.Option<string>,
) =>
  aside(
    [
      Class(
        'hidden xl:block sticky top-[var(--header-height)] min-w-64 w-fit h-[calc(100vh-var(--header-height))] shrink-0 overflow-y-auto border-l border-gray-300 dark:border-gray-800 p-4',
      ),
    ],
    [
      h3(
        [
          AriaHidden(true),
          Class(
            'text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2',
          ),
        ],
        ['On This Page'],
      ),
      nav(
        [AriaLabel('Table of contents')],
        [
          ul(
            [Class('space-y-2 text-sm')],
            Array.map(entries, ({ level, id, text }) => {
              const isActive = Option.exists(
                maybeActiveSectionId,
                activeSectionId => activeSectionId === id,
              )

              return lazyTocEntry(id, tableOfContentsEntryView, [
                level,
                id,
                text,
                isActive,
              ])
            }),
          ),
        ],
      ),
    ],
  )

const mobileTableOfContentsView = (
  entries: ReadonlyArray<TableOfContentsEntry>,
  maybeActiveSectionId: Option.Option<string>,
  isOpen: boolean,
) => {
  const firstEntryText = Array.head(entries).pipe(
    Option.match({
      onNone: () => '',
      onSome: ({ text }) => text,
    }),
  )

  const activeSectionText = Option.match(maybeActiveSectionId, {
    onNone: () => firstEntryText,
    onSome: activeSectionId =>
      Option.match(
        Array.findFirst(entries, ({ id }) => id === activeSectionId),
        {
          onNone: () => firstEntryText,
          onSome: ({ text }) => text,
        },
      ),
  })

  return details(
    [
      Id('mobile-table-of-contents'),
      Open(isOpen),
      OnToggle(open =>
        ToggledMobileTableOfContents({ isOpen: open }),
      ),
      Class(
        'group xl:hidden fixed top-[var(--header-height)] left-0 right-0 md:left-64 z-40 bg-cream dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800',
      ),
    ],
    [
      summary(
        [
          Class(
            'flex items-center justify-between px-4 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden group-open:border-b group-open:border-gray-300 dark:group-open:border-gray-700',
          ),
        ],
        [
          div(
            [Class('flex items-center gap-2 min-w-0')],
            [
              span(
                [
                  Class(
                    'text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0',
                  ),
                ],
                ['On this page'],
              ),
              span(
                [
                  Class(
                    'text-sm text-gray-900 dark:text-white truncate',
                  ),
                ],
                [activeSectionText],
              ),
            ],
          ),
          span(
            [
              Class(
                'text-gray-500 dark:text-gray-400 shrink-0 ml-2 transition-transform group-open:rotate-180',
              ),
            ],
            [Icon.chevronDown('w-4 h-4')],
          ),
        ],
      ),
      nav(
        [
          AriaLabel('Table of contents'),
          Class('max-h-[50vh] overflow-y-auto'),
        ],
        [
          ul(
            [
              Class(
                'text-sm divide-y divide-gray-300 dark:divide-gray-700',
              ),
            ],
            Array.map(entries, ({ level, id, text }) => {
              const isActive = Option.match(maybeActiveSectionId, {
                onNone: () => false,
                onSome: activeSectionId => activeSectionId === id,
              })

              return keyed('li')(
                id,
                [],
                [
                  a(
                    [
                      Href(`#${id}`),
                      OnClick(
                        ClickedMobileTableOfContentsLink({
                          sectionId: id,
                        }),
                      ),
                      Class(
                        classNames(
                          'transition flex items-center justify-between py-3 px-4',
                          {
                            'pl-8': level === 'h3',
                            'pl-12': level === 'h4',
                            'text-accent-600 dark:text-accent-400':
                              isActive,
                            'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white':
                              !isActive,
                          },
                        ),
                      ),
                      ...(isActive ? [AriaCurrent('location')] : []),
                    ],
                    [
                      text,
                      isActive
                        ? Icon.check(
                            'w-4 h-4 text-accent-600 dark:text-accent-400',
                          )
                        : empty,
                    ],
                  ),
                ],
              )
            }),
          ),
        ],
      ),
    ],
  )
}

const view = (model: Model) =>
  M.value(model.route).pipe(
    M.tag('Home', () => landingView(model)),
    M.orElse(route => docsView(model, route)),
  )

const landingHeaderView = (model: Model) =>
  header(
    [
      Class(
        classNames(
          'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] bg-cream/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 flex items-center justify-between transition-transform duration-300',
          {
            '-translate-y-full': !model.isLandingHeaderVisible,
            'translate-y-0': model.isLandingHeaderVisible,
          },
        ),
      ),
    ],
    [
      a(
        [
          Href(homeRouter.build({})),
          Class('flex items-center gap-2'),
        ],
        [
          img([
            Src('/logo.svg'),
            Alt('Foldkit'),
            Class('h-6 md:h-8 dark:invert'),
          ]),
          span(
            [
              Class(
                'inline-block -rotate-6 rounded bg-accent-700 dark:bg-accent-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wider text-white dark:text-accent-900 select-none',
              ),
              AriaLabel('Beta'),
            ],
            ['Beta'],
          ),
        ],
      ),
      nav(
        [AriaLabel('Main'), Class('flex items-center gap-3')],
        [
          div(
            [Class('hidden md:flex')],
            [themeSelector(model.themePreference)],
          ),
          a(
            [
              Href(Link.gettingStarted),
              Class(
                'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-600 dark:bg-accent-500 text-white dark:text-accent-900 text-sm font-normal transition hover:bg-accent-700 dark:hover:bg-accent-600',
              ),
            ],
            ['Dive In', Icon.arrowRight('w-4 h-4')],
          ),
        ],
      ),
    ],
  )

const skipNavLink: Html = a(
  [
    Href('#main-content'),
    Class(
      'sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-accent-600 dark:focus:bg-accent-500 focus:text-white focus:text-sm focus:font-normal',
    ),
  ],
  ['Skip to main content'],
)

const landingFooter: Html = footer(
  [
    Class(
      'px-6 py-8 md:px-12 lg:px-20 text-center text-base text-gray-500 dark:text-gray-400',
    ),
  ],
  [
    p(
      [],
      [
        'Built with ',
        a(
          [
            Href(`${Link.websiteSource}/src/main.ts`),
            Class(
              'text-accent-600 dark:text-accent-500 underline decoration-accent-600/30 dark:decoration-accent-500/30 hover:decoration-accent-600 dark:hover:decoration-accent-500',
            ),
          ],
          ['Foldkit'],
        ),
        '.',
      ],
    ),
  ],
)

type DemoTab = 'Architecture' | 'Note Player'

const demoTabs: ReadonlyArray<DemoTab> = [
  'Architecture',
  'Note Player',
]

const demoTabButtonClassName =
  'px-3 py-2 text-sm font-normal cursor-pointer transition border border-gray-300 dark:border-gray-800 bg-cream dark:bg-gray-900 text-gray-500 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-t-lg lg:rounded-t-none lg:rounded-l-lg lg:border-r-0 mb-[-1px] lg:mb-0 lg:mr-[-1px] data-[selected]:relative data-[selected]:z-10 data-[selected]:bg-cream data-[selected]:dark:bg-gray-900 data-[selected]:text-gray-900 data-[selected]:dark:text-white data-[selected]:border-b-0 lg:data-[selected]:border-b lg:data-[selected]:border-r-0'

const demoTabPanelClassName =
  'flex-1 min-w-0 p-4 bg-cream dark:bg-gray-900 rounded-b-lg rounded-tr-lg lg:rounded-bl-lg lg:rounded-r-lg lg:rounded-tl-none border border-gray-300 dark:border-gray-800'

const landingView = (model: Model) => {
  const asyncCounterDemoView = Page.AsyncCounterDemo.view(
    model.asyncCounterDemo,
    message => GotAsyncCounterDemoMessage({ message }),
  )

  const notePlayerDemoView = Page.NotePlayerDemo.view(
    model.notePlayerDemo,
    message => GotNotePlayerDemoMessage({ message }),
  )

  const demoTabsView = Ui.Tabs.view<Message, DemoTab>({
    model: model.demoTabs,
    toMessage: message => GotDemoTabsMessage({ message }),
    tabs: demoTabs,
    tabToConfig: tab =>
      M.value(tab).pipe(
        M.when('Architecture', () => ({
          buttonClassName: demoTabButtonClassName,
          buttonContent: span([], ['Async Counter']),
          panelClassName: demoTabPanelClassName,
          panelContent: asyncCounterDemoView,
        })),
        M.when('Note Player', () => ({
          buttonClassName: demoTabButtonClassName,
          buttonContent: span([], ['Note Player']),
          panelClassName: demoTabPanelClassName,
          panelContent: notePlayerDemoView,
        })),
        M.exhaustive,
      ),
    orientation: model.isNarrowViewport ? 'Horizontal' : 'Vertical',
    className: 'lg:flex',
    tabListClassName: 'flex lg:flex-col gap-1',
  })

  return keyed('div')(
    'landing',
    [Class('flex flex-col min-h-screen')],
    [
      skipNavLink,
      landingHeaderView(model),
      main(
        [Id('main-content'), Class('flex-1')],
        [Page.Landing.view(model, demoTabsView)],
      ),
      landingFooter,
    ],
  )
}

const docsHeaderView = (model: Model) =>
  header(
    [
      Class(
        'fixed top-0 inset-x-0 z-50 h-[var(--header-height)] pt-[env(safe-area-inset-top,0px)] bg-cream dark:bg-gray-900 border-b border-gray-300 dark:border-gray-800 pl-2 pr-3 md:px-8 flex items-center justify-between transform-gpu',
      ),
    ],
    [
      div(
        [Class('flex items-center gap-2')],
        [
          button(
            [
              Class(
                'md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer',
              ),
              AriaExpanded(model.mobileMenuDialog.isOpen),
              AriaLabel('Toggle menu'),
              OnClick(
                GotMobileMenuDialogMessage({
                  message: Ui.Dialog.Opened(),
                }),
              ),
            ],
            [Icon.menu('w-6 h-6')],
          ),
          a(
            [
              Href(homeRouter.build({})),
              Class('flex items-center gap-2'),
            ],
            [
              img([
                Src('/logo.svg'),
                Alt('Foldkit'),
                Class('h-6 md:h-8 dark:invert'),
              ]),
              span(
                [
                  Class(
                    'inline-block -rotate-6 rounded bg-accent-700 dark:bg-accent-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase leading-none tracking-wider text-white dark:text-accent-900 select-none',
                  ),
                  AriaLabel('Beta'),
                ],
                ['Beta'],
              ),
            ],
          ),
        ],
      ),
      div(
        [Class('flex items-center gap-6 md:gap-8')],
        [
          themeSelector(model.themePreference),
          div(
            [Class('hidden md:flex items-center gap-3 md:gap-4')],
            [
              iconLink(
                Link.github,
                'GitHub',
                Icon.github('w-5 h-5 md:w-6 md:h-6'),
              ),
              iconLink(
                Link.npm,
                'npm',
                Icon.npm('w-6 h-6 md:w-8 md:h-8'),
              ),
            ],
          ),
        ],
      ),
    ],
  )

const toApiReferenceMessage = (
  message: Page.ApiReference.Message,
): Message => GotApiReferenceMessage({ message })

const apiReferenceView = (
  module: Page.ApiReference.ApiModule,
  apiReferenceModel: Page.ApiReference.Model,
): Html =>
  Page.ApiReference.view(
    module,
    apiReferenceModel,
    toApiReferenceMessage,
  )

const lazyApiReference = createLazy()

const docsView = (model: Model, docsRoute: DocsRoute) => {
  const content = M.value(docsRoute).pipe(
    M.tagsExhaustive({
      WhyFoldkit: Page.WhyFoldkit.view,
      ComingFromReact: () =>
        Page.ComingFromReact.view(
          model,
          model.comingFromReact,
          message => GotComingFromReactMessage({ message }),
        ),
      GettingStarted: () => Page.GettingStarted.view(model),
      ArchitectureAndConcepts: () =>
        Page.ArchitectureAndConcepts.view(model),
      RoutingAndNavigation: () => Page.Routing.view(model),
      FieldValidation: () => Page.FieldValidation.view(model),
      Examples: Page.Examples.view,
      BestPractices: () => Page.BestPractices.view(model),
      ProjectOrganization: () => Page.ProjectOrganization.view(model),
      AdvancedPatterns: () => Page.AdvancedPatterns.view(model),
      ApiModule: ({ moduleSlug }) =>
        pipe(
          moduleSlug,
          Page.ApiReference.slugToModule,
          Option.match({
            onSome: module =>
              lazyApiReference(apiReferenceView, [
                module,
                model.apiReference,
              ]),
            onNone: () =>
              Page.NotFound.view(moduleSlug, homeRouter.build({})),
          }),
        ),
      FoldkitUi: () =>
        Page.FoldkitUi.view(model.foldkitUi, toFoldkitUiMessage),
      NotFound: ({ path }) =>
        Page.NotFound.view(path, homeRouter.build({})),
    }),
  )

  const currentPageTableOfContents = M.value(docsRoute).pipe(
    M.tag('WhyFoldkit', () =>
      Option.some(Page.WhyFoldkit.tableOfContents),
    ),
    M.tag('ComingFromReact', () =>
      Option.some(Page.ComingFromReact.tableOfContents),
    ),
    M.tag('GettingStarted', () =>
      Option.some(Page.GettingStarted.tableOfContents),
    ),
    M.tag('ArchitectureAndConcepts', () =>
      Option.some(Page.ArchitectureAndConcepts.tableOfContents),
    ),
    M.tag('RoutingAndNavigation', () =>
      Option.some(Page.Routing.tableOfContents),
    ),
    M.tag('FieldValidation', () =>
      Option.some(Page.FieldValidation.tableOfContents),
    ),
    M.tag('BestPractices', () =>
      Option.some(Page.BestPractices.tableOfContents),
    ),
    M.tag('ProjectOrganization', () =>
      Option.some(Page.ProjectOrganization.tableOfContents),
    ),
    M.tag('AdvancedPatterns', () =>
      Option.some(Page.AdvancedPatterns.tableOfContents),
    ),
    M.tag('ApiModule', ({ moduleSlug }) =>
      pipe(
        moduleSlug,
        Page.ApiReference.slugToModule,
        Option.map(Page.ApiReference.toModuleTableOfContents),
      ),
    ),
    M.tag('FoldkitUi', () =>
      Option.some(Page.FoldkitUi.tableOfContents),
    ),
    M.tag('Examples', 'NotFound', () => Option.none()),
    M.exhaustive,
  )

  return keyed('div')(
    'docs',
    [Class('flex flex-col min-h-screen')],
    [
      skipNavLink,
      docsHeaderView(model),
      div(
        [Class('flex flex-1 pt-[var(--header-height)] md:pl-64')],
        [
          sidebarView(
            model.route,
            model.mobileMenuDialog,
            model.apiReferenceGroup,
          ),
          main(
            [
              Id('main-content'),
              Class(
                classNames(
                  'flex-1 min-w-0 bg-cream dark:bg-gray-900',
                  {
                    'pt-[var(--mobile-toc-height)]': Option.isSome(
                      currentPageTableOfContents,
                    ),
                  },
                ),
              ),
            ],
            [
              Option.match(currentPageTableOfContents, {
                onSome: tableOfContents =>
                  mobileTableOfContentsView(
                    tableOfContents,
                    model.activeSection,
                    model.isMobileTableOfContentsOpen,
                  ),
                onNone: () => empty,
              }),
              keyed('div')(
                M.value(docsRoute).pipe(
                  M.tag(
                    'ApiModule',
                    ({ moduleSlug }) => `ApiModule-${moduleSlug}`,
                  ),
                  M.orElse(({ _tag }) => _tag),
                ),
                [
                  Class(
                    'px-4 py-6 md:px-8 md:py-8 2xl:py-10 max-w-4xl mx-auto min-w-0',
                  ),
                ],
                [content],
              ),
            ],
          ),
          Option.match(currentPageTableOfContents, {
            onSome: tableOfContents =>
              tableOfContentsView(
                tableOfContents,
                model.activeSection,
              ),
            onNone: () => empty,
          }),
        ],
      ),
    ],
  )
}

// SUBSCRIPTION

const SubscriptionDeps = S.Struct({
  activeSection: S.Struct({
    pageId: S.String,
    sections: S.Array(S.String),
  }),
  heroVisibility: S.Struct({
    isLandingPage: S.Boolean,
  }),
  systemTheme: S.Struct({
    isSystemPreference: S.Boolean,
  }),
  viewportWidth: S.Null,
})

export type SubscriptionDeps = typeof SubscriptionDeps.Type

const subscriptions = makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  activeSection: Subscription.activeSection,
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
})

Runtime.run(application)
