import { clsx } from 'clsx'
import { Array, Match, Option, String, pipe } from 'effect'
import { Submodel } from 'foldkit'
import { Html, type HtmlBuilder, inertHtml as ih } from 'foldkit/html'

import { Dialog } from '@foldkit/ui'

import { Icon } from '../icon'
import { Message, type SearchResult } from './message'
import type { Model } from './model'
import { SearchState, resultsFromState } from './model'
import { KEYBOARD_WARMUP_INPUT_ID, SEARCH_INPUT_ID } from './update'

const RESULTS_LIST_ID = 'search-results'
const resultItemId = (index: number): string => `search-result-${index}`

const handleSearchInputKeyDown = (
  key: string,
  model: Model,
): Option.Option<Message> =>
  Match.value(key).pipe(
    Match.when('ArrowDown', () =>
      Option.some(Message.PressedArrowKey({ direction: 'Down' })),
    ),
    Match.when('ArrowUp', () =>
      Option.some(Message.PressedArrowKey({ direction: 'Up' })),
    ),
    Match.when('Escape', () =>
      String.isNonEmpty(model.query)
        ? Option.some(Message.ClearedSearchQuery())
        : Option.none(),
    ),
    Match.when('Enter', () =>
      model.activeResultIndex >= 0
        ? pipe(
            model.searchState,
            resultsFromState,
            Array.get(model.activeResultIndex),
            Option.map(result =>
              Message.SelectedSearchResult({ url: result.url }),
            ),
          )
        : Option.none(),
    ),
    Match.orElse(() => Option.none()),
  )

const searchInputView = (model: Model, h: HtmlBuilder<Message>): Html => {
  const isListboxVisible =
    model.searchState._tag === 'Ok' || model.searchState._tag === 'Loading'

  return h.div(
    [
      h.Class(
        'flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800',
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
        h.OnInput(value => Message.UpdatedSearchQuery({ query: value })),
        h.OnKeyDownPreventDefault(key => handleSearchInputKeyDown(key, model)),
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

const resultLabel = (result: typeof SearchResult.Type): ReadonlyArray<Html> =>
  Option.match(resultLabelText(result), {
    onSome: text => [ih.span([ih.Class(labelPillClassName)], [text])],
    onNone: () => [],
  })

const resultItemView = (
  result: typeof SearchResult.Type,
  index: number,
  isActive: boolean,
  h: HtmlBuilder<Message>,
): Html =>
  h.a(
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
      h.OnClick(Message.SelectedSearchResult({ url: result.url })),
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
      h.div([
        h.Class(
          'text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 [&_mark]:bg-accent-200/60 [&_mark]:dark:bg-accent-800/40 [&_mark]:text-inherit [&_mark]:rounded-sm',
        ),
        h.InnerHTML(result.excerpt),
      ]),
    ],
  )

const emptyPrompt: Html = ih.div(
  [ih.Class('px-4 py-12 text-center')],
  [
    ih.p(
      [ih.Class('text-sm text-gray-500 dark:text-gray-400')],
      ['Type to search the documentation...'],
    ),
  ],
)

const searchingIndicator: Html = ih.div(
  [ih.Class('px-4 py-12 text-center'), ih.AriaLive('polite')],
  [
    ih.p(
      [ih.Class('text-sm text-gray-500 dark:text-gray-400')],
      ['Searching...'],
    ),
  ],
)

const noResultsView = (query: string): Html =>
  ih.div(
    [ih.Class('px-4 py-12 text-center'), ih.AriaLive('polite')],
    [
      ih.p(
        [ih.Class('text-sm text-gray-500 dark:text-gray-400')],
        [`No results for “${query}”`],
      ),
    ],
  )

const resultListView = (
  results: ReadonlyArray<typeof SearchResult.Type>,
  activeResultIndex: number,
  h: HtmlBuilder<Message>,
): Html =>
  Array.match(results, {
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
          resultItemView(result, index, index === activeResultIndex, h),
        ),
      ),
  })

const resultsListView = (model: Model, h: HtmlBuilder<Message>): Html =>
  SearchState.match<Html>(model.searchState, {
    Idle: () => emptyPrompt,
    Loading: ({ results }) =>
      Array.match(results, {
        onEmpty: () => searchingIndicator,
        onNonEmpty: () => resultListView(results, model.activeResultIndex, h),
      }),
    Ok: ({ results }) =>
      Array.match(results, {
        onEmpty: () => noResultsView(model.query),
        onNonEmpty: () => resultListView(results, model.activeResultIndex, h),
      }),
  })

const resultCountAnnouncement = (model: Model): Html => {
  const results = resultsFromState(model.searchState)
  const count = results.length

  return ih.span(
    [ih.AriaLive('polite'), ih.Class('sr-only')],
    count > 0 ? [`${count} results available`] : [],
  )
}

// NOTE: iOS Safari only shows the on-screen keyboard if `.focus()` runs
// synchronously inside the originating user-gesture event handler. The real
// search input doesn't exist in the DOM until the dialog renders, so it
// can't be focused inside the gesture. This always-rendered hidden input
// gives the search trigger's `h.OnClick` focus control something to focus
// inside the click handler, which opens the keyboard; the `FocusSearchInput`
// Command then transfers focus to the real input once the dialog renders, and
// iOS keeps the keyboard up across a programmatic focus transfer between two
// text inputs.
const keyboardWarmupInput: Html = ih.input([
  ih.Id(KEYBOARD_WARMUP_INPUT_ID),
  ih.Type('text'),
  ih.AriaHidden(true),
  ih.Tabindex(-1),
  ih.Class('fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none -z-10'),
])

export const view = Submodel.defineView<Model, Message>((model, h): Html =>
  h.div(
    [],
    [
      keyboardWarmupInput,
      h.submodel({
        slotId: model.dialog.id,
        model: model.dialog,
        view: Dialog.view,
        viewInputs: {
          toView: ({ dialog, backdrop, panel, title, isVisible }) =>
            h.dialog(
              [...dialog],
              isVisible
                ? [
                    h.div([
                      ...backdrop,
                      h.Class(
                        'fixed inset-0 z-[59] bg-black/50 dark:bg-black/70',
                      ),
                    ]),
                    h.div(
                      [
                        ...panel,
                        h.Class(
                          'fixed inset-0 z-[60] overflow-y-auto px-4 sm:px-6 pointer-events-none [&>*]:pointer-events-auto',
                        ),
                      ],
                      [
                        h.div(
                          [
                            h.Class(
                              'w-full max-w-xl mx-auto mt-[15vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-gray-700 overflow-hidden',
                            ),
                          ],
                          [
                            h.span(
                              [...title, h.Class('sr-only')],
                              ['Search documentation'],
                            ),
                            searchInputView(model, h),
                            resultsListView(model, h),
                            resultCountAnnouncement(model),
                          ],
                        ),
                      ],
                    ),
                  ]
                : [],
            ),
        },
        toParentMessage: message => Message.GotSearchDialogMessage({ message }),
      }),
    ],
  ),
)
