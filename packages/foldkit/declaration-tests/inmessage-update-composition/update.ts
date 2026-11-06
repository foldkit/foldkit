import { modifyFields } from 'foldkit/struct'

import {
  ApplicationComposition,
  EditorBinding,
  makeInMessageUpdate,
} from './composition.js'
import {
  OutMessage,
  SaveDraft,
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageStep,
} from './definition.js'

export const increment = makeFieldsStep(() => ({ count: count => count + 1 }))
export const update = ApplicationComposition.makeUpdate({
  ClickedIncrement: increment,
  SubmittedForm: makeCommandsStep.fromMessage(input => [
    SaveDraft({ text: input.text }),
  ]),
  CompletedSaveDraft: makeNoopStep(),
})
const base = makeInMessageUpdate({
  RequestedSet: makeFieldsStep((model, input) => ({
    count: () => model.count + input.value,
  })),
  RequestedSubmit: makeOutMessageStep.fromMessage(input =>
    OutMessage.Submitted({ text: input.text }),
  ),
  RequestedSave: makeCommandsStep.fromMessage(input => [
    SaveDraft({ text: input.text }),
  ]),
})
export const focused = makeInMessageUpdate.compose(
  makeInMessageUpdate.each((model, _input, { before }) => ({
    model: modifyFields(model, {
      snapshots: snapshots => [...snapshots, before.count],
      seen: seen => [...seen, 'each'],
    }),
  })),
  makeInMessageUpdate.on(['RequestedSet'])((_model, input) =>
    makeFieldsStep(() => ({ seen: seen => [...seen, `set:${input.value}`] })),
  ),
  makeInMessageUpdate.except(['RequestedSubmit'])(() => increment),
)
export const inMessageUpdate = makeInMessageUpdate.compose(
  focused,
  makeInMessageUpdate.compose(
    base,
    makeInMessageUpdate.cases({
      RequestedSet: EditorBinding.informOfTextChange({ text: 'connected' }),
    }),
  ),
  makeInMessageUpdate.each((model, _input, { before }) => ({
    model: modifyFields(model, {
      snapshots: snapshots => [...snapshots, before.count],
      seen: seen => [...seen, 'after'],
    }),
  })),
)
