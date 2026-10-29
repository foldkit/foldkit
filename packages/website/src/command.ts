import { DateTime, Effect, Layer, Option, Schema } from 'effect'
import { Calendar, Dom } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'

import { inject } from '@vercel/analytics'
import * as SpeedInsights from '@vercel/speed-insights'

import { DARK_COLOR_SCHEME_QUERY } from './colorScheme'
import { ApplicationDefinition } from './definition'
import { DOCS_SIDEBAR_NAV_ID, MOBILE_MENU_NAV_ID } from './docsNav'
import { Message, type ResolvedTheme, ThemePreference } from './message'
import { ExampleSlug } from './page/example/meta'
import { playgroundRouter } from './route'
import {
  SIDEBAR_STORAGE_KEY,
  SidebarState,
  SidebarStateJsonString,
} from './sidebarStorage'
import { LocalStorage, SessionStorage } from './storage'
import { ApplyTheme, SaveThemePreference, THEME_STORAGE_KEY } from './theme'

// NOTE: Playground navigation loads a fresh document with COOP/COEP headers.
// Firefox can boot this standalone WebContainer embed, but its iframe preview
// stays blank and opening the URL needs a project connection route Foldkit lacks.
const detectPlaygroundSupport = (): boolean =>
  window.crossOriginIsolated === true &&
  typeof SharedArrayBuffer !== 'undefined' &&
  !navigator.userAgent.includes('Firefox/')

const loadBrowserEnvironment = Effect.gen(function* () {
  const themePreference: Option.Option<ThemePreference> = yield* Effect.gen(
    function* () {
      const store = yield* LocalStorage
      const json = yield* Effect.fromOption(
        Option.fromNullishOr(yield* store.get(THEME_STORAGE_KEY)),
      )
      const theme = yield* Schema.decodeEffect(
        Schema.fromJsonString(ThemePreference),
      )(json)
      return Option.some(theme)
    },
  ).pipe(Effect.catch(() => Effect.succeed(Option.none<ThemePreference>())))

  const maybeSidebarState: Option.Option<SidebarState> = yield* Effect.gen(
    function* () {
      const store = yield* SessionStorage
      const json = yield* Effect.fromOption(
        Option.fromNullishOr(yield* store.get(SIDEBAR_STORAGE_KEY)),
      )
      const state = yield* Schema.decodeEffect(SidebarStateJsonString)(json)

      return Option.some(state)
    },
  ).pipe(Effect.catch(() => Effect.succeed(Option.none<SidebarState>())))

  const systemTheme: ResolvedTheme = yield* Effect.sync(() =>
    window.matchMedia(DARK_COLOR_SCHEME_QUERY).matches ? 'Dark' : 'Light',
  )

  const isPlaygroundSupported = yield* Effect.sync(detectPlaygroundSupport)

  const currentYear = yield* DateTime.now.pipe(
    Effect.map(DateTime.getPartUtc('year')),
  )

  const today = yield* Calendar.today.local

  return Message.CompletedLoadBrowserEnvironment({
    maybeThemePreference: themePreference,
    maybeSidebarState,
    systemTheme,
    isPlaygroundSupported,
    currentYear,
    today,
  })
})

export const InjectAnalytics = ApplicationDefinition.makeCommand(
  'InjectAnalytics',
  {
    messages: [Message.CompletedInjectAnalytics],
    handler: function* () {
      return () =>
        Effect.sync(() => inject()).pipe(
          Effect.as(Message.CompletedInjectAnalytics()),
        )
    },
  },
)

export const LoadBrowserEnvironment = ApplicationDefinition.makeCommand(
  'LoadBrowserEnvironment',
  {
    messages: [Message.CompletedLoadBrowserEnvironment],
    handler: function* () {
      return () => loadBrowserEnvironment
    },
  },
)

export const InjectSpeedInsights = ApplicationDefinition.makeCommand(
  'InjectSpeedInsights',
  {
    messages: [Message.CompletedInjectSpeedInsights],
    handler: function* () {
      return () =>
        Effect.sync(() => SpeedInsights.injectSpeedInsights()).pipe(
          Effect.as(Message.CompletedInjectSpeedInsights()),
        )
    },
  },
)

export const CopyLink = ApplicationDefinition.makeCommand('CopyLink', {
  args: { url: Schema.String },
  messages: [Message.SucceededCopyLink, Message.FailedCopyLink],
  handler: function* () {
    return ({ url }) =>
      Effect.tryPromise({
        try: () => navigator.clipboard.writeText(url),
        catch: () => new Error('Failed to copy link to clipboard'),
      }).pipe(
        Effect.as(Message.SucceededCopyLink()),
        Effect.catch(() => Effect.succeed(Message.FailedCopyLink())),
      )
  },
})

export const ScrollToTop = ApplicationDefinition.makeCommand('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
  handler: function* () {
    return () =>
      Effect.sync(() => {
        window.scrollTo({ top: 0, behavior: 'instant' })
        return Message.CompletedScrollToTop()
      })
  },
})

export const ScrollToAnchor = ApplicationDefinition.makeCommand(
  'ScrollToAnchor',
  {
    args: { hash: Schema.String },
    messages: [Message.CompletedScrollToAnchor],
    handler: function* () {
      return ({ hash }) =>
        Effect.gen(function* () {
          const target = `#${CSS.escape(hash)}`
          yield* Dom.scrollIntoViewAfterPaint(target, { block: 'start' })
          yield* Dom.focus(target, { preventScroll: true, makeFocusable: true })
        }).pipe(Effect.ignore, Effect.as(Message.CompletedScrollToAnchor()))
    },
  },
)

export const ScrollSidebarActiveLinkIntoView =
  ApplicationDefinition.makeCommand('ScrollSidebarActiveLinkIntoView', {
    messages: [Message.CompletedScrollSidebarActiveLinkIntoView],
    handler: function* () {
      return () =>
        Dom.scrollIntoViewIfNotVisible(
          `#${DOCS_SIDEBAR_NAV_ID} [aria-current="page"]`,
        ).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedScrollSidebarActiveLinkIntoView()),
        )
    },
  })

const MOBILE_MENU_ACTIVE_LINK = `#${MOBILE_MENU_NAV_ID} [aria-current="page"]`

export const ScrollMobileMenuActiveLinkIntoView =
  ApplicationDefinition.makeCommand('ScrollMobileMenuActiveLinkIntoView', {
    messages: [Message.CompletedScrollMobileMenuActiveLinkIntoView],
    handler: function* () {
      return () =>
        Dom.scrollIntoViewIfNotVisible(MOBILE_MENU_ACTIVE_LINK, {
          when: 'Commit',
        }).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedScrollMobileMenuActiveLinkIntoView()),
        )
    },
  })

export const SaveSidebarState = ApplicationDefinition.makeCommand(
  'SaveSidebarState',
  {
    args: { state: SidebarState },
    messages: [Message.CompletedSaveSidebarState],
    handler: function* () {
      const store = yield* SessionStorage

      return ({ state }) =>
        Effect.gen(function* () {
          const json = yield* Schema.encodeEffect(SidebarStateJsonString)(state)
          yield* store.set(SIDEBAR_STORAGE_KEY, json)
          return Message.CompletedSaveSidebarState()
        }).pipe(
          Effect.catch(() =>
            Effect.succeed(Message.CompletedSaveSidebarState()),
          ),
        )
    },
  },
)

export const NavigateInternal = ApplicationDefinition.makeCommand(
  'NavigateInternal',
  {
    args: { url: Schema.String },
    messages: [Message.CompletedNavigateInternal],
    handler: function* () {
      return ({ url }) =>
        pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal()))
    },
  },
)

export const LoadPlayground = ApplicationDefinition.makeCommand(
  'LoadPlayground',
  {
    args: { exampleSlug: ExampleSlug },
    messages: [Message.CompletedLoadPlayground],
    handler: function* () {
      return ({ exampleSlug }) =>
        load(playgroundRouter({ exampleSlug })).pipe(
          Effect.as(Message.CompletedLoadPlayground()),
        )
    },
  },
)

export const LoadExternal = ApplicationDefinition.makeCommand('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  handler: function* () {
    return ({ href }) =>
      load(href).pipe(Effect.as(Message.CompletedLoadExternal()))
  },
})

export const EffectsLayer = Layer.mergeAll(
  InjectAnalytics.layer,
  LoadBrowserEnvironment.layer,
  InjectSpeedInsights.layer,
  ScrollToTop.layer,
  ScrollToAnchor.layer,
  ScrollSidebarActiveLinkIntoView.layer,
  ScrollMobileMenuActiveLinkIntoView.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
  LoadPlayground.layer,
  ApplyTheme.layer,
  SaveThemePreference.layer,
  SaveSidebarState.layer,
  CopyLink.layer,
)
