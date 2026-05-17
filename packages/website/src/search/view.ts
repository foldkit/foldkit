import { clsx } from 'clsx'
import { Array, Match as M, Option, String, pipe } from 'effect'
import { Ui } from 'foldkit'
import { Html, html } from 'foldkit/html'

import { Icon } from '../icon'
import type { Message as ParentMessage } from '../main'
import { SEARCH_INPUT_ID } from './command'
import {
  ClearedSearchQuery,
  GotSearchDialogMessage,
  type Message,
  PressedArrowKey,
  type SearchResult,
  SelectedSearchResult,
  UpdatedSearchQuery,
} from './message'
import type { Model } from './model'
import { resultsFromState } from './model'

type ToMessage = (message: Message) => ParentMessage

const RESULTS_LIST_ID = 'search-results'
const resultItemId = (index: number): string => `search-result-${index}`

const handleSearchInputKeyDown = (
  key: string,
  model: Model,
  toParentMessage: ToMessage,
): Option.Option<ParentMessage> =>
  M.value(key).pipe(
    M.when('ArrowDown', () =>
      Option.some(toParentMessage(PressedArrowKey({ direction: 'Down' }))),
    ),
    M.when('ArrowUp', () =>
      Option.some(toParentMessage(PressedArrowKey({ direction: 'Up' }))),
    ),
    M.when('Escape', () =>
      String.isNonEmpty(model.query)
        ? Option.some(toParentMessage(ClearedSearchQuery()))
        : Option.some(
            toParentMessage(
              GotSearchDialogMessage({ message: Ui.Dialog.Closed() }),
            ),
          ),
    ),
    M.when('Enter', () =>
      model.activeResultIndex >= 0
        ? pipe(
            model.searchState,
            resultsFromState,
            Array.get(model.activeResultIndex),
            Option.map(result =>
              toParentMessage(SelectedSearchResult({ url: result.url })),
            ),
          )
        : Option.none(),
    ),
    M.orElse(() => Option.none()),
  )

const searchInputView = (model: Model, toParentMessage: ToMessage): Html => {
  const h = html<ParentMessage>()

  const isListboxVisible =
    model.searchState._tag === 'Ok' || model.searchState._tag === 'Loading'

  return h.div(
    [
      h.Class(
        'flex items-center gap-3 px-4 py-3 border-b border-gray-300 dark:border-gray-700',
      ),
    ],
    [
      Icon.magnifyingGlass('w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0'),
      h.input([
        h.Id(SEARCH_INPUT_ID),
        h.Type('text'),
        h.Role('combobox'),
        h.AriaExpanded(isListboxVisible),
        ...(isListboxVisible ? [h.AriaControls(RESULTS_LIST_ID)] : []),
        h.AriaHasPopup('listbox'),
        h.Autocomplete('off'),
        h.AriaLabel('Search documentation'),
        ...(model.activeResultIndex >= 0
          ? [h.AriaActiveDescendant(resultItemId(model.activeResultIndex))]
          : []),
        h.Placeholder('Search documentation...'),
        h.Value(model.query),
        h.Class(
          'flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none text-base',
        ),
        h.OnInput(value =>
          toParentMessage(UpdatedSearchQuery({ query: value })),
        ),
        h.OnKeyDownPreventDefault(key =>
          handleSearchInputKeyDown(key, model, toParentMessage),
        ),
      ]),
    ],
  )
}

const labelPillClassName =
  'text-xs text-gray-500 dark:text-gray-400 bg-gray-200/70 dark:bg-gray-700/50 px-1.5 py-px rounded'

const resultLabelText = (
  result: typeof SearchResult.Type,
): Option.Option<string> =>
  Option.firstSomeOf([
    Option.liftPredicate(result.kind, String.isNonEmpty),
    Option.liftPredicate(
      result.section,
      section => String.isNonEmpty(section) && section !== result.title,
    ),
  ])

const resultLabel = (result: typeof SearchResult.Type): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  return Option.match(resultLabelText(result), {
    onSome: text => [h.span([h.Class(labelPillClassName)], [text])],
    onNone: () => [],
  })
}

const resultItemView = (
  result: typeof SearchResult.Type,
  index: number,
  isActive: boolean,
  toParentMessage: ToMessage,
): Html => {
  const h = html<ParentMessage>()

  return h.a(
    [
      h.Id(resultItemId(index)),
      h.Href(result.url),
      h.Role('option'),
      h.AriaSelected(isActive),
      h.Tabindex(-1),
      h.Class(
        clsx(
          'block px-4 py-3 transition hover:bg-gray-100 dark:hover:bg-gray-800/50',
          { 'bg-gray-100 dark:bg-gray-800/50': isActive },
        ),
      ),
      h.DataAttribute('search-result-index', `${index}`),
      h.OnClick(toParentMessage(SelectedSearchResult({ url: result.url }))),
    ],
    [
      h.div(
        [h.Class('flex items-baseline gap-2 mb-0.5')],
        [
          h.span(
            [h.Class('text-sm font-medium text-gray-900 dark:text-white')],
            [result.title],
          ),
          ...resultLabel(result),
        ],
      ),
      h.div(
        [
          h.Class(
            'text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 [&_mark]:bg-accent-200/60 [&_mark]:dark:bg-accent-800/40 [&_mark]:text-inherit [&_mark]:rounded-sm',
          ),
          h.InnerHTML(result.excerpt),
        ],
        [],
      ),
    ],
  )
}

const emptyPrompt: Html = (() => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('px-4 py-12 text-center')],
    [
      h.p(
        [h.Class('text-sm text-gray-500 dark:text-gray-400')],
        ['Type to search the documentation...'],
      ),
    ],
  )
})()

const searchingIndicator: Html = (() => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('px-4 py-12 text-center'), h.AriaLive('polite')],
    [
      h.p(
        [h.Class('text-sm text-gray-500 dark:text-gray-400')],
        ['Searching...'],
      ),
    ],
  )
})()

const noResultsView = (query: string): Html => {
  const h = html<ParentMessage>()

  return h.div(
    [h.Class('px-4 py-12 text-center'), h.AriaLive('polite')],
    [
      h.p(
        [h.Class('text-sm text-gray-500 dark:text-gray-400')],
        [`No results for “${query}”`],
      ),
    ],
  )
}

const resultListView = (
  results: ReadonlyArray<typeof SearchResult.Type>,
  activeResultIndex: number,
  toParentMessage: ToMessage,
): Html => {
  const h = html<ParentMessage>()

  return Array.match(results, {
    onEmpty: () => h.empty,
    onNonEmpty: nonEmptyResults =>
      h.div(
        [
          h.Id(RESULTS_LIST_ID),
          h.Role('listbox'),
          h.AriaLabel('Search results'),
          h.Class('max-h-[60dvh] overflow-y-auto'),
        ],
        Array.map(nonEmptyResults, (result, index) =>
          resultItemView(
            result,
            index,
            index === activeResultIndex,
            toParentMessage,
          ),
        ),
      ),
  })
}

const resultsListView = (model: Model, toParentMessage: ToMessage): Html =>
  M.value(model.searchState).pipe(
    M.withReturnType<Html>(),
    M.tag('Idle', () => emptyPrompt),
    M.tag('Loading', ({ results }) =>
      Array.match(results, {
        onEmpty: () => searchingIndicator,
        onNonEmpty: () =>
          resultListView(results, model.activeResultIndex, toParentMessage),
      }),
    ),
    M.tag('Ok', ({ results }) =>
      Array.match(results, {
        onEmpty: () => noResultsView(model.query),
        onNonEmpty: () =>
          resultListView(results, model.activeResultIndex, toParentMessage),
      }),
    ),
    M.exhaustive,
  )

const resultCountAnnouncement = (model: Model): Html => {
  const h = html<ParentMessage>()

  const results = resultsFromState(model.searchState)
  const count = results.length

  return h.span(
    [h.AriaLive('polite'), h.Class('sr-only')],
    count > 0 ? [`${count} results available`] : [],
  )
}

export const view = (model: Model, toParentMessage: ToMessage): Html => {
  const h = html<ParentMessage>()

  return Ui.Dialog.view({
    model: model.dialog,
    toParentMessage: message =>
      toParentMessage(GotSearchDialogMessage({ message })),
    panelContent: h.div(
      [
        h.Class(
          'w-full max-w-xl mx-auto mt-[15vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-gray-700 overflow-hidden',
        ),
      ],
      [
        h.span(
          [h.Id('search-dialog-title'), h.Class('sr-only')],
          ['Search documentation'],
        ),
        searchInputView(model, toParentMessage),
        resultsListView(model, toParentMessage),
        resultCountAnnouncement(model),
      ],
    ),
    panelAttributes: [
      h.Class(
        'fixed inset-0 z-[60] overflow-y-auto px-4 sm:px-6 pointer-events-none [&>*]:pointer-events-auto',
      ),
    ],
    backdropAttributes: [
      h.Class('fixed inset-0 z-[59] bg-black/50 dark:bg-black/70'),
    ],
  })
}
