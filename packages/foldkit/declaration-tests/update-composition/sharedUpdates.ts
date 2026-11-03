import { Array } from 'effect'

import { SaveDraft } from './command.js'
import { makeUpdate } from './composition.js'
import { makeFieldsStep } from './definition.js'
import * as Editor from './editor.js'

export const countDispatch = makeUpdate.each(
  makeFieldsStep(() => ({
    dispatchCount: dispatchCount => dispatchCount + 1,
  })),
)

export const persistChanges = makeUpdate.except(['ReceivedDraft'])(
  (model, _message, { before }) => ({
    model,
    commands: Array.filter(
      [SaveDraft({ text: `${model.title}\n${Editor.text(model.editor)}` })],
      () =>
        model.title !== before.title ||
        Editor.text(model.editor) !== Editor.text(before.editor),
    ),
  }),
)

export const commonUpdates = makeUpdate.compose(countDispatch, persistChanges)
