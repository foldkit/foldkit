import { Array, Effect, Layer, Match, Option, Schema, Stream } from 'effect'
import { Block, Command, Dom } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Dialog, Input } from '@foldkit/ui'
import type { RenderInfo } from '@foldkit/ui/dialog'

import { Issue, Project } from './domain/domain'

const MAX_RESULTS = 12
const INPUT_ID = 'workspace-command-search'
const RESULTS_ID = 'workspace-command-results'

export const ResultTarget = defineTaggedUnion({
  Issue: { issueId: Schema.String },
  Project: { projectId: Schema.String },
})
type ResultTarget = typeof ResultTarget.Type

const Model = Schema.Struct({
  query: Schema.String,
  activeResultIndex: Schema.Number,
  dialog: Dialog.Dialog,
})
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  RequestedOpen: {},
  RequestedClose: {},
  PressedOpenShortcut: {},
  UpdatedQuery: { value: Schema.String },
  PressedNextResult: { resultCount: Schema.Number },
  PressedPreviousResult: { resultCount: Schema.Number },
  PressedEnter: { maybeTarget: Schema.Option(ResultTarget) },
  ClickedResult: { target: ResultTarget },
  CompletedScrollActiveResult: {},
})
type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SelectedIssue: { issueId: Schema.String },
  SelectedProject: { projectId: Schema.String },
})
type OutMessage = typeof OutMessage.Type

export const ScrollActiveResult = Command.define('ScrollActiveResult', {
  args: { index: Schema.Number },
  messages: [Message.CompletedScrollActiveResult],
})

const ViewInput = Schema.Struct({
  issues: Schema.Array(Issue),
  projects: Schema.Array(Project),
})
type ViewInput = typeof ViewInput.Type

export class CommandPalette extends Block<CommandPalette, void, ViewInput>()(
  'CommandPalette',
  { Model, Message, OutMessage, Command: [ScrollActiveResult] },
) {}

const SearchResult = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  description: Schema.String,
  target: ResultTarget,
})
type SearchResult = typeof SearchResult.Type

const searchResults = (
  query: string,
  issues: ReadonlyArray<Issue>,
  projects: ReadonlyArray<Project>,
): ReadonlyArray<SearchResult> => {
  const searchText = query.trim().toLowerCase()

  const matchingProjects = Array.filter(projects, project =>
    `${project.name} ${project.description}`.toLowerCase().includes(searchText),
  )

  const projectResults = Array.map(matchingProjects, project =>
    SearchResult.make({
      id: `project-${project.id}`,
      title: project.name,
      description: 'Project',
      target: ResultTarget.Project({ projectId: project.id }),
    }),
  )

  const matchingIssues = Array.filter(issues, issue =>
    `${issue.identifier} ${issue.title}`.toLowerCase().includes(searchText),
  )

  const issueResults = Array.map(matchingIssues, issue =>
    SearchResult.make({
      id: `issue-${issue.id}`,
      title: issue.title,
      description: issue.identifier,
      target: ResultTarget.Issue({ issueId: issue.id }),
    }),
  )

  return Array.take([...projectResults, ...issueResults], MAX_RESULTS)
}

const closeDialog = (model: Model) => ({
  model,
  messages: [model.dialog.send(Dialog.Dialog.Message.RequestedClose())],
})

const openPalette = (model: Model) => {
  if (model.dialog.model.isOpen) {
    return { model }
  }

  return {
    model: modifyFields(model, {
      query: () => '',
      activeResultIndex: () => 0,
    }),
    messages: [model.dialog.send(Dialog.Dialog.Message.RequestedOpen())],
  }
}

const moveActiveResult = (
  model: Model,
  nextActiveResultIndex: number,
  resultCount: number,
) => ({
  model: modifyFields(model, {
    activeResultIndex: () => nextActiveResultIndex,
  }),
  commands: Array.filter(
    [ScrollActiveResult({ index: nextActiveResultIndex })],
    () => resultCount > 0,
  ),
})

const selectResult = (model: Model, target: ResultTarget) => ({
  ...closeDialog(model),
  outMessage: ResultTarget.match(target, {
    Issue: ({ issueId }) => OutMessage.SelectedIssue({ issueId }),
    Project: ({ projectId }) => OutMessage.SelectedProject({ projectId }),
  }),
})

const openShortcut: Stream.Stream<Message> = Dom.streamFromKeyBindings({
  bindings: [
    {
      keys: 'Mod+K',
      whileTyping: 'Allow',
      mapEvent: () => Message.PressedOpenShortcut(),
    },
  ],
})

const resultId = (result: SearchResult) => `workspace-command-${result.id}`

// NOTE: Combobox anchors an overlay; palette results stay in the Dialog's layout.
const searchInput = (
  model: Model,
  results: ReadonlyArray<SearchResult>,
  initialFocus: RenderInfo['initialFocus'],
  h: HtmlBuilder<Message, unknown>,
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
  model: Model,
  results: ReadonlyArray<SearchResult>,
  h: HtmlBuilder<Message, unknown>,
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

export const CommandPaletteLive = CommandPalette.make(
  Effect.fn(function* () {
    const dialog = yield* new Dialog.Dialog('dialog', {
      id: 'workspace-command-palette',
    })

    return {
      model: { query: '', activeResultIndex: 0, dialog },

      update: {
        RequestedOpen: openPalette,
        PressedOpenShortcut: openPalette,
        RequestedClose: closeDialog,
        UpdatedQuery: (model, { value }) => ({
          model: modifyFields(model, {
            query: () => value,
            activeResultIndex: () => 0,
          }),
          commands: [ScrollActiveResult({ index: 0 })],
        }),
        PressedNextResult: (model, { resultCount }) =>
          moveActiveResult(
            model,
            resultCount > 0 ? (model.activeResultIndex + 1) % resultCount : 0,
            resultCount,
          ),
        PressedPreviousResult: (model, { resultCount }) =>
          moveActiveResult(
            model,
            resultCount > 0
              ? (model.activeResultIndex - 1 + resultCount) % resultCount
              : 0,
            resultCount,
          ),
        PressedEnter: (model, { maybeTarget }) =>
          Option.match(maybeTarget, {
            onNone: () => ({ model }),
            onSome: target => selectResult(model, target),
          }),
        ClickedResult: (model, { target }) => selectResult(model, target),
        CompletedScrollActiveResult: model => ({ model }),
        ...dialog.on({
          Closed: model => ({
            model: { ...model, query: '', activeResultIndex: 0 },
          }),
        }),
      },

      commands: {
        ScrollActiveResult: ({ index }) =>
          Dom.scrollIntoView(
            `[data-command-palette-result-index="${index}"]`,
          ).pipe(
            Effect.ignore,
            Effect.as(Message.CompletedScrollActiveResult()),
          ),
      },

      stream: openShortcut,

      view: (model, h, { issues, projects }) => {
        const results = searchResults(model.query, issues, projects)

        return model.dialog.view({
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
                                h.Class(
                                  'text-base font-semibold text-slate-700',
                                ),
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
        })
      },
    }
  }),
).pipe(Layer.provide(Dialog.DialogLive))
