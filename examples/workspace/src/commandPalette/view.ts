import { Array, Match, Option, Schema } from 'effect'
import type { Html } from 'foldkit/html'

import { Input } from '@foldkit/ui'
import type { RenderInfo } from '@foldkit/ui/dialog'

import { Issue, Project } from '../domain'
import {
  CommandPaletteComposition,
  type CommandPaletteViewBuilder,
  DialogBinding,
} from './composition'
import { Message, type Model } from './definition'
import { SearchResult, searchResults } from './search'

const ViewInputs = Schema.Struct({
  issues: Schema.Array(Issue),
  projects: Schema.Array(Project),
})

const INPUT_ID = 'workspace-command-search'
const RESULTS_ID = 'workspace-command-results'

const resultId = (result: typeof SearchResult.Type) =>
  `workspace-command-${result.id}`

// NOTE: Combobox anchors an overlay; palette results stay in the Dialog's layout.
const searchInput = (
  model: typeof Model.Type,
  results: ReadonlyArray<typeof SearchResult.Type>,
  initialFocus: RenderInfo['initialFocus'],
  h: CommandPaletteViewBuilder,
): Html => {
  const maybeActiveResult = Array.get(results, model.activeResultIndex)

  return Input.view(
    {
      id: INPUT_ID,
      value: model.query,
      placeholder: 'Search issues and projects…',
      onInput: value => Message.UpdatedQuery({ value }),
      toView: attributes =>
        h.div(
          [h.Class('border-b border-slate-100 p-4 sm:px-5')],
          [
            h.label(
              [...attributes.label, h.Class('sr-only')],
              ['Search issues and projects'],
            ),
            h.input([
              ...attributes.input,
              ...initialFocus,
              h.Class('input-control'),
              h.Role('combobox'),
              h.AriaExpanded(true),
              h.AriaAutocomplete('list'),
              h.AriaControls(RESULTS_ID),
              ...Option.match(maybeActiveResult, {
                onNone: () => [],
                onSome: result => [h.AriaActiveDescendant(resultId(result))],
              }),
              h.Autocomplete('off'),
              h.OnKeyDownPreventDefault(key =>
                Match.value(key).pipe(
                  Match.withReturnType<Option.Option<typeof Message.Type>>(),
                  Match.when('ArrowDown', () =>
                    Option.some(
                      Message.PressedNextResult({
                        resultCount: results.length,
                      }),
                    ),
                  ),
                  Match.when('ArrowUp', () =>
                    Option.some(
                      Message.PressedPreviousResult({
                        resultCount: results.length,
                      }),
                    ),
                  ),
                  Match.when('Enter', () =>
                    Option.some(
                      Message.PressedEnter({
                        maybeTarget: Option.map(
                          maybeActiveResult,
                          result => result.target,
                        ),
                      }),
                    ),
                  ),
                  Match.orElse(() => Option.none()),
                ),
              ),
            ]),
          ],
        ),
    },
    h,
  )
}

const resultList = (
  model: typeof Model.Type,
  results: ReadonlyArray<typeof SearchResult.Type>,
  h: CommandPaletteViewBuilder,
): Html =>
  h.ul(
    [
      h.Id(RESULTS_ID),
      h.Role('listbox'),
      h.AriaLabel('Search results'),
      h.Class(
        'max-h-[min(50dvh,420px)] space-y-1 overflow-y-auto overscroll-contain p-3',
      ),
    ],
    Array.map(results, (result, index) =>
      h.keyed('li')(
        result.id,
        [
          h.Id(resultId(result)),
          h.Role('option'),
          h.AriaLabel(`${result.description} ${result.title}`),
          h.AriaSelected(index === model.activeResultIndex),
          h.DataAttribute(
            'command-palette-result-index',
            globalThis.String(index),
          ),
          h.Class('command-option'),
          ...(index === model.activeResultIndex
            ? [h.DataAttribute('active', '')]
            : []),
          h.OnClick(Message.ClickedResult({ target: result.target })),
        ],
        [
          h.span(
            [h.Class('w-16 shrink-0 text-xs font-medium text-slate-500')],
            [result.description],
          ),
          h.span([h.Class('min-w-0 leading-6')], [result.title]),
        ],
      ),
    ),
  )

export const view = CommandPaletteComposition.makeView.withInputs<
  typeof ViewInputs.Type
>((model, viewInputs, h) => {
  const results = searchResults(
    model.query,
    viewInputs.issues,
    viewInputs.projects,
  )

  return h.block(
    DialogBinding.embedView({
      slotId: model.dialog.id,
      model: model.dialog,
      viewInputs: {
        toView: ({
          dialog,
          backdrop,
          panel,
          title,
          closeButton,
          initialFocus,
          isVisible,
        }) =>
          h.dialog(
            [
              ...dialog,
              h.Class(
                'fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-slate-700',
              ),
            ],
            isVisible
              ? [
                  h.div([
                    ...backdrop,
                    h.Class('fixed inset-0 bg-slate-950/35 backdrop-blur-xs'),
                  ]),
                  h.div(
                    [
                      ...panel,
                      h.Class(
                        'dialog-surface relative mx-auto mt-[max(1.5rem,10dvh)] w-[calc(100vw-2rem)] max-w-xl overflow-hidden text-sm font-medium',
                      ),
                    ],
                    [
                      h.header(
                        [
                          h.Class(
                            'flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4',
                          ),
                        ],
                        [
                          h.h2(
                            [
                              ...title,
                              h.Class('text-base font-semibold text-slate-700'),
                            ],
                            ['Go to…'],
                          ),
                          h.button(
                            [...closeButton, h.Class('button-compact')],
                            ['Close search'],
                          ),
                        ],
                      ),
                      searchInput(model, results, initialFocus, h),
                      resultList(model, results, h),
                      ...Array.match(results, {
                        onEmpty: () => [
                          h.p(
                            [
                              h.Role('status'),
                              h.Class(
                                'px-5 py-10 text-center text-sm text-slate-500',
                              ),
                            ],
                            ['No matching issues or projects.'],
                          ),
                        ],
                        onNonEmpty: () => [],
                      }),
                      h.p(
                        [
                          h.Class(
                            'border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500',
                          ),
                        ],
                        ['↑ ↓ to navigate · Enter to open · Esc to close'],
                      ),
                    ],
                  ),
                ]
              : [],
          ),
      },
    }),
  )
})
