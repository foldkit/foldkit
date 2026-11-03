import { Clock, Effect, Layer, Match, Schema } from 'effect'
import { Dom, Render } from 'foldkit'
import { load, pushUrl, replaceUrl } from 'foldkit/navigation'

import { DomainCandidateRange } from '../shared/domain'
import { ApplicationDefinition } from './definition'
import {
  CART_BUTTON_ID,
  CART_CLOSE_BUTTON_ID,
  FILTERS_BUTTON_ID,
  TLD_FILTER_BUTTON_ID,
} from './focusTarget'
import { Message } from './message'
import { PageScrollKey, RESULTS_LIST_ID } from './resultsList'
import { searchRouter } from './route'
import { SEARCH_INPUT_SELECTOR, searchInputConfig } from './searchInput'

export const ReadCurrentTime = ApplicationDefinition.makeCommand(
  'ReadCurrentTime',
  {
    args: {
      searchGeneration: Schema.Number,
      ...DomainCandidateRange.fields,
      isRefreshRequested: Schema.Boolean,
    },
    messages: [Message.CompletedReadCurrentTime],
    handler: function* () {
      return args =>
        Effect.gen(function* () {
          const nowMillis = yield* Clock.currentTimeMillis
          return Message.CompletedReadCurrentTime({ ...args, nowMillis })
        })
    },
  },
)

export const ReplaceSearchUrl = ApplicationDefinition.makeCommand(
  'ReplaceSearchUrl',
  {
    args: { q: Schema.Option(Schema.String) },
    messages: [Message.CompletedReplaceSearchUrl],
    handler: function* () {
      return fields =>
        Effect.gen(function* () {
          yield* replaceUrl(searchRouter(fields))

          return Message.CompletedReplaceSearchUrl()
        })
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

export const LoadExternal = ApplicationDefinition.makeCommand('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  handler: function* () {
    return ({ href }) =>
      load(href).pipe(Effect.as(Message.CompletedLoadExternal()))
  },
})

export const FocusSearchInput = ApplicationDefinition.makeCommand(
  'FocusSearchInput',
  {
    messages: [Message.CompletedFocusSearchInput],
    handler: function* () {
      return () =>
        Dom.focus(SEARCH_INPUT_SELECTOR, { preventScroll: true }).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusSearchInput()),
        )
    },
  },
)

export const FocusCartButton = ApplicationDefinition.makeCommand(
  'FocusCartButton',
  {
    messages: [Message.CompletedFocusCartButton],
    handler: function* () {
      return () =>
        Dom.focus(`#${CART_BUTTON_ID}`, { preventScroll: true }).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusCartButton()),
        )
    },
  },
)

export const FocusFiltersButton = ApplicationDefinition.makeCommand(
  'FocusFiltersButton',
  {
    messages: [Message.CompletedFocusFiltersButton],
    handler: function* () {
      return () =>
        Dom.focus(`#${FILTERS_BUTTON_ID}`, { preventScroll: true }).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusFiltersButton()),
        )
    },
  },
)

export const FocusTldFilterButton = ApplicationDefinition.makeCommand(
  'FocusTldFilterButton',
  {
    messages: [Message.CompletedFocusTldFilterButton],
    handler: function* () {
      return () =>
        Dom.focus(`#${TLD_FILTER_BUTTON_ID}`, { preventScroll: true }).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusTldFilterButton()),
        )
    },
  },
)

export const FocusCartCloseButton = ApplicationDefinition.makeCommand(
  'FocusCartCloseButton',
  {
    messages: [Message.CompletedFocusCartCloseButton],
    handler: function* () {
      return () =>
        Dom.focus(`#${CART_CLOSE_BUTTON_ID}`, { preventScroll: true }).pipe(
          Effect.ignore,
          Effect.as(Message.CompletedFocusCartCloseButton()),
        )
    },
  },
)

export const RevealResultsListStart = ApplicationDefinition.makeCommand(
  'RevealResultsListStart',
  {
    messages: [Message.CompletedRevealResultsListStart],
    handler: function* () {
      return () =>
        Effect.sync(() => {
          const results = document.getElementById(RESULTS_LIST_ID)

          if (
            document.activeElement === results &&
            results?.matches(':focus-visible')
          ) {
            results.scrollIntoView({ block: 'start', behavior: 'instant' })
          }
        }).pipe(Effect.as(Message.CompletedRevealResultsListStart()))
    },
  },
)

export const ScrollPageToTop = ApplicationDefinition.makeCommand(
  'ScrollPageToTop',
  {
    messages: [Message.CompletedScrollPageToTop],
    handler: function* () {
      return () =>
        Effect.gen(function* () {
          yield* Render.afterCommit
          yield* Effect.sync(() => {
            window.scrollTo({ top: 0, behavior: 'instant' })
          })
          return Message.CompletedScrollPageToTop()
        })
    },
  },
)

const KEYBOARD_SCROLL_DISTANCE_PX = 40
const PAGE_SCROLL_FRACTION = 0.9

export const ScrollPage = ApplicationDefinition.makeCommand('ScrollPage', {
  args: { key: PageScrollKey },
  messages: [Message.CompletedScrollPage],
  handler: function* () {
    return ({ key }) =>
      Effect.sync(() => {
        const pageDistance = window.innerHeight * PAGE_SCROLL_FRACTION
        const top = Match.value(key).pipe(
          Match.when(
            'ArrowUp',
            () => window.scrollY - KEYBOARD_SCROLL_DISTANCE_PX,
          ),
          Match.when(
            'ArrowDown',
            () => window.scrollY + KEYBOARD_SCROLL_DISTANCE_PX,
          ),
          Match.when('PageUp', () => window.scrollY - pageDistance),
          Match.when('PageDown', () => window.scrollY + pageDistance),
          Match.when('Home', () => 0),
          Match.exhaustive,
        )
        window.scrollTo({ top, behavior: 'instant' })
      }).pipe(Effect.as(Message.CompletedScrollPage()))
  },
})

export const DismissSearchKeyboard = ApplicationDefinition.makeCommand(
  'DismissSearchKeyboard',
  {
    messages: [Message.CompletedDismissSearchKeyboard],
    handler: function* () {
      return () =>
        Effect.sync(() => {
          const input = document.getElementById(searchInputConfig.id)

          if (
            window.matchMedia(searchInputConfig.touchMediaQuery).matches &&
            input instanceof HTMLInputElement
          ) {
            input.blur()
          }
        }).pipe(Effect.as(Message.CompletedDismissSearchKeyboard()))
    },
  },
)

export const ReleaseEarlySearchListeners = ApplicationDefinition.makeCommand(
  'ReleaseEarlySearchListeners',
  {
    messages: [Message.CompletedReleaseEarlySearchListeners],
    handler: function* () {
      return () =>
        Effect.sync(() => {
          const isSearchStarted = document.documentElement.hasAttribute(
            'data-domains-search-started',
          )

          document.documentElement.removeAttribute(
            'data-domains-search-started',
          )
          document.dispatchEvent(new Event('domains:ready'))

          return Message.CompletedReleaseEarlySearchListeners({
            isSearchStarted,
          })
        })
    },
  },
)

export const EffectsLayer = Layer.mergeAll(
  ReadCurrentTime.layer,
  ReplaceSearchUrl.layer,
  NavigateInternal.layer,
  LoadExternal.layer,
  FocusSearchInput.layer,
  FocusCartButton.layer,
  FocusFiltersButton.layer,
  FocusTldFilterButton.layer,
  FocusCartCloseButton.layer,
  ScrollPage.layer,
  ScrollPageToTop.layer,
  RevealResultsListStart.layer,
  DismissSearchKeyboard.layer,
  ReleaseEarlySearchListeners.layer,
)
