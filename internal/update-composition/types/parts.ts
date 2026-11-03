import { modifyFields } from 'foldkit/struct'

import { makeComposableUpdates } from './authoring.js'
import { ApplicationComposition, makeFieldsStep, makeStep } from './domain.js'

export const updates = makeComposableUpdates(ApplicationComposition)

export const directStep = updates.each(
  makeFieldsStep(() => ({
    count: count => count + 1,
  })),
)

export const directSelectedStep = updates.on(['ChangedCount'])(
  makeFieldsStep((_model, { count }) => ({ count: () => count })),
)

export const directSelectedUnionStep = updates.on([
  'ChangedCount',
  'ChangedLabel',
])(makeFieldsStep(() => ({ count: count => count + 1 })))

export const directExcludedStep = updates.except(['ChangedLabel'])(
  makeFieldsStep(() => ({ count: count => count + 1 })),
)

export const inputCases = updates.cases({
  ChangedCount: makeFieldsStep((_model, { count }) => ({ count: () => count })),
})

export const labelCases = updates.cases({
  ChangedLabel: (model, { label }) => ({
    model: modifyFields(model, { label: () => label }),
  }),
})

export const settle = updates.each((model, message, { before }) => {
  const nextLabel = `${message._tag}:${model.count - before.count}`

  return makeStep(stepModel => ({
    model: modifyFields(stepModel, { label: () => nextLabel }),
  }))
})

export const sharedRaw = updates.each((model, message, { before }) => ({
  model: modifyFields(model, {
    label: () => `${before.label}:${message._tag}`,
  }),
}))

export const selected = updates.on(['ChangedCount'])(
  (model, { count }, { before }) => ({
    model: modifyFields(model, { label: () => `${before.count}:${count}` }),
  }),
)

export const otherMessages = updates.except(['ChangedLabel'])((
  model,
  message,
) => {
  const label =
    message._tag === 'ChangedCount' ? String(message.count) : 'Saved'

  return { model: modifyFields(model, { label: () => label }) }
})

export const completionCases = updates.cases({
  CompletedSave: model => ({ model }),
})

export const baseUpdate = updates({
  ChangedCount: makeFieldsStep((_model, { count }) => ({ count: () => count })),
  ChangedLabel: makeFieldsStep((_model, { label }) => ({ label: () => label })),
  CompletedSave: model => ({ model }),
})

export const focusedBundle = updates.compose(
  inputCases,
  labelCases,
  completionCases,
  settle,
)
export const jointUpdate = updates.compose(baseUpdate, focusedBundle)

export const anchoredUpdate = updates.compose(
  selected,
  baseUpdate,
  otherMessages,
)
