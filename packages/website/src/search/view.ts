import { clsx } from 'clsx'
import { Array, Match as M, Option, String, pipe } from 'effect'
import { Ui } from 'foldkit'
import { Html } from 'foldkit/html'

import {
  AriaActiveDescendant,
  AriaControls,
  AriaExpanded,
  AriaHasPopup,
  AriaLabel,
  AriaLive,
  AriaSelected,
  Autocomplete,
  Class,
  DataAttribute,
  Href,
  Id,
  InnerHTML,
  OnClick,
  OnInput,
  OnKeyDownPreventDefault,
  Placeholder,
  Role,
  Tabindex,
  Type,
  Value,
  a,
  div,
  empty,
  input,
  p,
  span,
} from '../html'
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
  toMessage: ToMessage,
): Option.Option<ParentMessage> =>
  M.value(key).pipe(
    M.when('ArrowDown', () =>
      Option.some(toMessage(PressedArrowKey({ direction: 'Down' }))),
    ),
    M.when('ArrowUp', () =>
      Option.some(toMessage(PressedArrowKey({ direction: 'Up' }))),
    ),
    M.when('Escape', () =>
      String.isNonEmpty(model.query)
        ? Option.some(toMessage(ClearedSearchQuery()))
        : Option.some(
            toMessage(GotSearchDialogMessage({ message: Ui.Dialog.Closed() })),
          ),
    ),
    M.when('Enter', () =>
      model.activeResultIndex >= 0
        ? pipe(
            model.searchState,
            resultsFromState,
            Array.get(model.activeResultIndex),
            Option.map(result =>
              toMessage(SelectedSearchResult({ url: result.url })),
            ),
          )
        : Option.none(),
    ),
    M.orElse(() => Option.none()),
  )

const searchInputView = (model: Model, toMessage: ToMessage): Html => {
  const isListboxVisible =
    model.searchState._tag === 'Ok' || model.searchState._tag === 'Loading'

  return div(
    [
      Class(
        'flex items-center gap-3 px-4 py-3 border-b border-gray-300 dark:border-gray-700',
      ),
    ],
    [
      Icon.magnifyingGlass('w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0'),
      input([
        Id(SEARCH_INPUT_ID),
        Type('text'),
        Role('combobox'),
        AriaExpanded(isListboxVisible),
        ...(isListboxVisible ? [AriaControls(RESULTS_LIST_ID)] : []),
        AriaHasPopup('listbox'),
        Autocomplete('off'),
        AriaLabel('Search documentation'),
        ...(model.activeResultIndex >= 0
          ? [AriaActiveDescendant(resultItemId(model.activeResultIndex))]
          : []),
        Placeholder('Search documentation...'),
        Value(model.query),
        Class(
          'flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none text-base',
        ),
        OnInput(value => toMessage(UpdatedSearchQuery({ query: value }))),
        OnKeyDownPreventDefault(key =>
          handleSearchInputKeyDown(key, model, toMessage),
        ),
      ]),
    ],
  )
}

const resultItemView = (
  result: typeof SearchResult.Type,
  index: number,
  isActive: boolean,
  toMessage: ToMessage,
): Html =>
  a(
    [
      Id(resultItemId(index)),
      Href(result.url),
      Role('option'),
      AriaSelected(isActive),
      Tabindex(-1),
      Class(
        clsx(
          'block px-4 py-3 transition hover:bg-gray-100 dark:hover:bg-gray-800/50',
          { 'bg-gray-100 dark:bg-gray-800/50': isActive },
        ),
      ),
      DataAttribute('search-result-index', `${index}`),
      OnClick(toMessage(SelectedSearchResult({ url: result.url }))),
    ],
    [
      div(
        [Class('flex items-baseline gap-2 mb-0.5')],
        [
          span(
            [Class('text-sm font-medium text-gray-900 dark:text-white')],
            [result.title],
          ),
          ...(String.isNonEmpty(result.section) &&
          result.section !== result.title
            ? [
                span(
                  [
                    Class(
                      'text-xs text-gray-500 dark:text-gray-400 bg-gray-200/70 dark:bg-gray-700/50 px-1.5 py-px rounded',
                    ),
                  ],
                  [result.section],
                ),
              ]
            : []),
        ],
      ),
      div(
        [
          Class(
            'text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 [&_mark]:bg-accent-200/60 [&_mark]:dark:bg-accent-800/40 [&_mark]:text-inherit [&_mark]:rounded-sm',
          ),
          InnerHTML(result.excerpt),
        ],
        [],
      ),
    ],
  )

const emptyPrompt: Html = div(
  [Class('px-4 py-12 text-center')],
  [
    p(
      [Class('text-sm text-gray-500 dark:text-gray-400')],
      ['Type to search the documentation...'],
    ),
  ],
)

const searchingIndicator: Html = div(
  [Class('px-4 py-12 text-center'), AriaLive('polite')],
  [p([Class('text-sm text-gray-500 dark:text-gray-400')], ['Searching...'])],
)

const noResultsView = (query: string): Html =>
  div(
    [Class('px-4 py-12 text-center'), AriaLive('polite')],
    [
      p(
        [Class('text-sm text-gray-500 dark:text-gray-400')],
        [`No results for \u201C${query}\u201D`],
      ),
    ],
  )

const resultListView = (
  results: ReadonlyArray<typeof SearchResult.Type>,
  activeResultIndex: number,
  toMessage: ToMessage,
): Html =>
  Array.match(results, {
    onEmpty: () => empty,
    onNonEmpty: nonEmptyResults =>
      div(
        [
          Id(RESULTS_LIST_ID),
          Role('listbox'),
          AriaLabel('Search results'),
          Class('max-h-[60vh] overflow-y-auto'),
        ],
        Array.map(nonEmptyResults, (result, index) =>
          resultItemView(result, index, index === activeResultIndex, toMessage),
        ),
      ),
  })

const resultsListView = (model: Model, toMessage: ToMessage): Html =>
  M.value(model.searchState).pipe(
    M.withReturnType<Html>(),
    M.tag('Idle', () => emptyPrompt),
    M.tag('Loading', ({ results }) =>
      Array.match(results, {
        onEmpty: () => searchingIndicator,
        onNonEmpty: () =>
          resultListView(results, model.activeResultIndex, toMessage),
      }),
    ),
    M.tag('Ok', ({ results }) =>
      Array.match(results, {
        onEmpty: () => noResultsView(model.query),
        onNonEmpty: () =>
          resultListView(results, model.activeResultIndex, toMessage),
      }),
    ),
    M.exhaustive,
  )

const resultCountAnnouncement = (model: Model): Html => {
  const results = resultsFromState(model.searchState)
  const count = results.length

  return span(
    [AriaLive('polite'), Class('sr-only')],
    count > 0 ? [`${count} results available`] : [],
  )
}

export const view = (model: Model, toMessage: ToMessage): Html =>
  Ui.Dialog.view({
    model: model.dialog,
    toMessage: message => toMessage(GotSearchDialogMessage({ message })),
    panelContent: div(
      [
        Class(
          'w-full max-w-xl mx-auto mt-[15vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-gray-700 overflow-hidden',
        ),
      ],
      [
        span(
          [Id('search-dialog-title'), Class('sr-only')],
          ['Search documentation'],
        ),
        searchInputView(model, toMessage),
        resultsListView(model, toMessage),
        resultCountAnnouncement(model),
      ],
    ),
    panelAttributes: [
      Class(
        'fixed inset-0 z-[60] overflow-y-auto px-4 sm:px-6 pointer-events-none [&>*]:pointer-events-auto',
      ),
    ],
    backdropAttributes: [
      Class('fixed inset-0 z-[59] bg-black/50 dark:bg-black/70'),
    ],
  })
