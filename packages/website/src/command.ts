import { DateTime, Effect, Option, Schema } from 'effect'
import type { KeyValueStore } from 'effect/persistence'
import { Calendar, Command, Dom } from 'foldkit'
import { load, pushUrl } from 'foldkit/navigation'

import { inject } from '@vercel/analytics'
import * as SpeedInsights from '@vercel/speed-insights'

import { DARK_COLOR_SCHEME_QUERY } from './colorScheme'
import { DOCS_SIDEBAR_NAV_ID, MOBILE_MENU_NAV_ID } from './docsNav'
import { Message, type ResolvedTheme, ThemePreference } from './message'
import { ExampleSlug } from './page/example/meta'
import { playgroundRouter } from './route'
import {
  SIDEBAR_STORAGE_KEY,
  SidebarState,
  SidebarStateJsonString,
} from './sidebarStorage'
import { THEME_STORAGE_KEY } from './theme'

// NOTE: Playground navigation loads a fresh document with COOP/COEP headers.
// Firefox can boot this standalone WebContainer embed, but its iframe preview
// stays blank and opening the URL needs a project connection route Foldkit lacks.
const detectPlaygroundSupport = (): boolean =>
  window.crossOriginIsolated === true &&
  typeof SharedArrayBuffer !== 'undefined' &&
  !navigator.userAgent.includes('Firefox/')

export const loadBrowserEnvironment = (
  localStorage: KeyValueStore.KeyValueStore,
  sessionStorage: KeyValueStore.KeyValueStore,
) =>
  Effect.gen(function* () {
    const themePreference: Option.Option<ThemePreference> = yield* Effect.gen(
      function* () {
        const json = yield* Effect.fromOption(
          Option.fromNullishOr(yield* localStorage.get(THEME_STORAGE_KEY)),
        )
        const theme = yield* Schema.decodeEffect(
          Schema.fromJsonString(ThemePreference),
        )(json)
        return Option.some(theme)
      },
    ).pipe(Effect.catch(() => Effect.succeed(Option.none<ThemePreference>())))

    const maybeSidebarState: Option.Option<SidebarState> = yield* Effect.gen(
      function* () {
        const json = yield* Effect.fromOption(
          Option.fromNullishOr(yield* sessionStorage.get(SIDEBAR_STORAGE_KEY)),
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

export const InjectAnalytics = Command.define('InjectAnalytics', {
  messages: [Message.CompletedInjectAnalytics],
})

export const LoadBrowserEnvironment = Command.define('LoadBrowserEnvironment', {
  messages: [Message.CompletedLoadBrowserEnvironment],
})

export const InjectSpeedInsights = Command.define('InjectSpeedInsights', {
  messages: [Message.CompletedInjectSpeedInsights],
})

export const CopyLink = Command.define('CopyLink', {
  args: { url: Schema.String },
  messages: [Message.SucceededCopyLink, Message.FailedCopyLink],
})

export const ScrollToTop = Command.define('ScrollToTop', {
  messages: [Message.CompletedScrollToTop],
})

export const ScrollToAnchor = Command.define('ScrollToAnchor', {
  args: { hash: Schema.String },
  messages: [Message.CompletedScrollToAnchor],
})

export const ScrollSidebarActiveLinkIntoView = Command.define(
  'ScrollSidebarActiveLinkIntoView',
  { messages: [Message.CompletedScrollSidebarActiveLinkIntoView] },
)

export const ScrollMobileMenuActiveLinkIntoView = Command.define(
  'ScrollMobileMenuActiveLinkIntoView',
  { messages: [Message.CompletedScrollMobileMenuActiveLinkIntoView] },
)

export const SaveSidebarState = Command.define('SaveSidebarState', {
  args: { state: SidebarState },
  messages: [Message.CompletedSaveSidebarState],
})

export const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
})

export const LoadPlayground = Command.define('LoadPlayground', {
  args: { exampleSlug: ExampleSlug },
  messages: [Message.CompletedLoadPlayground],
})

export const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
})

const MOBILE_MENU_ACTIVE_LINK = `#${MOBILE_MENU_NAV_ID} [aria-current="page"]`

export const makeCommandHandlers = (
  sessionStorage: KeyValueStore.KeyValueStore,
) => ({
  InjectAnalytics: () =>
    Effect.sync(() => inject()).pipe(
      Effect.as(Message.CompletedInjectAnalytics()),
    ),
  InjectSpeedInsights: () =>
    Effect.sync(() => SpeedInsights.injectSpeedInsights()).pipe(
      Effect.as(Message.CompletedInjectSpeedInsights()),
    ),
  CopyLink: ({ url }: Readonly<{ url: string }>) =>
    Effect.tryPromise({
      try: () => navigator.clipboard.writeText(url),
      catch: () => new Error('Failed to copy link to clipboard'),
    }).pipe(
      Effect.as(Message.SucceededCopyLink()),
      Effect.catch(() => Effect.succeed(Message.FailedCopyLink())),
    ),
  ScrollToTop: () =>
    Effect.sync(() => {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return Message.CompletedScrollToTop()
    }),
  ScrollToAnchor: ({ hash }: Readonly<{ hash: string }>) =>
    Effect.gen(function* () {
      const target = `#${CSS.escape(hash)}`
      yield* Dom.scrollIntoViewAfterPaint(target, { block: 'start' })
      yield* Dom.focus(target, { preventScroll: true, makeFocusable: true })
    }).pipe(Effect.ignore, Effect.as(Message.CompletedScrollToAnchor())),
  ScrollSidebarActiveLinkIntoView: () =>
    Dom.scrollIntoViewIfNotVisible(
      `#${DOCS_SIDEBAR_NAV_ID} [aria-current="page"]`,
    ).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollSidebarActiveLinkIntoView()),
    ),
  ScrollMobileMenuActiveLinkIntoView: () =>
    Dom.scrollIntoViewIfNotVisible(MOBILE_MENU_ACTIVE_LINK, {
      when: 'Commit',
    }).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedScrollMobileMenuActiveLinkIntoView()),
    ),
  SaveSidebarState: ({ state }: Readonly<{ state: SidebarState }>) =>
    Effect.gen(function* () {
      const json = yield* Schema.encodeEffect(SidebarStateJsonString)(state)
      yield* sessionStorage.set(SIDEBAR_STORAGE_KEY, json)
      return Message.CompletedSaveSidebarState()
    }).pipe(
      Effect.catch(() => Effect.succeed(Message.CompletedSaveSidebarState())),
    ),
  NavigateInternal: ({ url }: Readonly<{ url: string }>) =>
    pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
  LoadPlayground: ({ exampleSlug }: Readonly<{ exampleSlug: ExampleSlug }>) =>
    load(playgroundRouter({ exampleSlug })).pipe(
      Effect.as(Message.CompletedLoadPlayground()),
    ),
  LoadExternal: ({ href }: Readonly<{ href: string }>) =>
    load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})
