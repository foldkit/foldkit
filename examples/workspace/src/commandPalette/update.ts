import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { ScrollActiveResult } from './command'
import { CommandPaletteComposition, DialogBinding } from './composition'
import {
  Message,
  type Model,
  OutMessage,
  ResultTarget,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from './definition'

const keepModelStep = makeNoopStep()

const closeDialogStep = DialogBinding.requestClose()

const handleUpdatedQuery = (
  model: typeof Model.Type,
  { value }: typeof Message.UpdatedQuery.Type,
) => ({
  model: modifyFields(model, {
    query: () => value,
    activeResultIndex: () => 0,
  }),
  commands: [ScrollActiveResult({ index: 0 })],
})

const moveActiveResultStep = (
  nextActiveResultIndex: number,
  resultCount: number,
) =>
  makeStep(model => ({
    model: modifyFields(model, {
      activeResultIndex: () => nextActiveResultIndex,
    }),
    commands: Array.filter(
      [ScrollActiveResult({ index: nextActiveResultIndex })],
      () => resultCount > 0,
    ),
  }))

const openPaletteStep = makeStep(model => {
  if (model.dialog.isOpen) {
    return { model }
  }

  return Update.combineSteps([
    makeFieldsStep(() => ({
      query: () => '',
      activeResultIndex: () => 0,
    })),
    DialogBinding.requestOpen(),
  ])
})

const selectResult = (
  model: Parameters<typeof closeDialogStep>[0],
  target: typeof ResultTarget.Type,
) => {
  if (!model.dialog.isOpen) {
    return keepModelStep(model)
  }

  const dialogClose = closeDialogStep(model)

  const outMessage = ResultTarget.match(target, {
    Issue: ({ issueId }) => OutMessage.SelectedIssue({ issueId }),
    Project: ({ projectId }) => OutMessage.SelectedProject({ projectId }),
  })

  return pipe(dialogClose, Update.withOutMessage(outMessage))
}

export const update = CommandPaletteComposition.makeUpdate({
  RequestedOpen: openPaletteStep,
  PressedOpenShortcut: openPaletteStep,
  RequestedClose: closeDialogStep,
  UpdatedQuery: handleUpdatedQuery,
  PressedNextResult: (model, { resultCount }) => {
    const nextActiveResultIndex =
      resultCount > 0 ? (model.activeResultIndex + 1) % resultCount : 0

    return moveActiveResultStep(nextActiveResultIndex, resultCount)(model)
  },
  PressedPreviousResult: (model, { resultCount }) => {
    const nextActiveResultIndex =
      resultCount > 0
        ? (model.activeResultIndex - 1 + resultCount) % resultCount
        : 0

    return moveActiveResultStep(nextActiveResultIndex, resultCount)(model)
  },
  PressedEnter: (model, { maybeTarget }) =>
    Option.match(maybeTarget, {
      onNone: () => keepModelStep(model),
      onSome: target => selectResult(model, target),
    }),
  ClickedResult: (model, { target }) => selectResult(model, target),
  CompletedScrollActiveResult: keepModelStep,
})
