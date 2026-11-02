import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { ScrollActiveResult } from './command'
import { CommandPaletteComposition } from './composition'
import { makeNoopStep, makeStep } from './definition'
import type { UpdatedQuery } from './message'
import type { Model } from './model'
import { OutMessage } from './outMessage'
import { ResultTarget } from './resultTarget'
import { closeDialog, openPalette } from './steps'

const keepModel = makeNoopStep()

const handleUpdatedQuery = (model: Model, { value }: UpdatedQuery) => ({
  model: modifyFields(model, {
    query: () => value,
    activeResultIndex: () => 0,
  }),
  commands: [ScrollActiveResult({ index: 0 })],
})

const moveActiveResult = (nextActiveResultIndex: number, resultCount: number) =>
  makeStep(model => ({
    model: modifyFields(model, {
      activeResultIndex: () => nextActiveResultIndex,
    }),
    commands: Array.filter(
      [ScrollActiveResult({ index: nextActiveResultIndex })],
      () => resultCount > 0,
    ),
  }))

const selectResult = (
  model: Parameters<typeof closeDialog>[0],
  target: ResultTarget,
) => {
  const dialogClose = closeDialog(model)

  const outMessage = ResultTarget.match(target, {
    Issue: ({ issueId }) => OutMessage.SelectedIssue({ issueId }),
    Project: ({ projectId }) => OutMessage.SelectedProject({ projectId }),
  })

  return pipe(dialogClose, Update.withOutMessage(outMessage))
}

export const update = CommandPaletteComposition.makeUpdate({
  PressedOpenShortcut: openPalette,
  UpdatedQuery: handleUpdatedQuery,
  PressedNextResult: (model, { resultCount }) => {
    const nextActiveResultIndex =
      resultCount > 0 ? (model.activeResultIndex + 1) % resultCount : 0

    return moveActiveResult(nextActiveResultIndex, resultCount)(model)
  },
  PressedPreviousResult: (model, { resultCount }) => {
    const nextActiveResultIndex =
      resultCount > 0
        ? (model.activeResultIndex - 1 + resultCount) % resultCount
        : 0

    return moveActiveResult(nextActiveResultIndex, resultCount)(model)
  },
  PressedEnter: (model, { maybeTarget }) =>
    Option.match(maybeTarget, {
      onNone: () => keepModel(model),
      onSome: target => selectResult(model, target),
    }),
  ClickedResult: (model, { target }) => selectResult(model, target),
  CompletedScrollActiveResult: keepModel,
})
