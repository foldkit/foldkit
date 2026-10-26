import { Array, Option, Schema, Tuple } from 'effect'
import { Block, Message } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'

import {
  ChildBlock,
  EntryBinding,
  Id,
  ParentDefinition,
  firstId,
  model,
  setEntry,
} from './set-optional-initialization.accepted.js'

// @ts-expect-error The exact branded occurrence key is required.
initAndSet(EntryBinding, model, { key: 'first', args: [1] })
// @ts-expect-error A keyed replacement requires its occurrence key.
initAndSet(EntryBinding, model, { args: [1] })
// @ts-expect-error The first child init argument is required.
initAndSet(EntryBinding, model, { key: firstId, args: [] })
// @ts-expect-error The required child init argument remains numeric.
initAndSet(EntryBinding, model, { key: firstId, args: ['wrong'] })
// @ts-expect-error Optional and rest child init arguments remain strings.
initAndSet(EntryBinding, model, { key: firstId, args: [1, 'valid', 2] })
initAndSet(
  EntryBinding,
  // @ts-expect-error The complete parent Model is required.
  { maybeEntry: Option.none() },
  { key: firstId, args: [1] },
)
const commandsConfig = {
  key: firstId,
  args: Tuple.make(1),
  commands: Array.empty(),
}
// @ts-expect-error An aliased config cannot add parent Commands.
initAndSet(EntryBinding, model, commandsConfig)
const writerConfig = {
  key: firstId,
  args: Tuple.make(1),
  toParentModel: () => model,
}
// @ts-expect-error An aliased config cannot provide a parent writer.
initAndSet(EntryBinding, model, writerConfig)

const LabeledEntry = Schema.Struct({
  id: Id,
  child: ChildBlock.Model,
  label: Schema.String,
})
const LabeledModel = Schema.Struct({
  maybeEntry: Schema.Option(LabeledEntry),
})
const LabeledDefinition = Block.makeDefinition('RejectedOptionalSetLabeled', {
  Model: LabeledModel,
  Message: Message.defineMessageUnion({}),
})
const LabeledBinding = LabeledDefinition.makeBinding(ChildBlock, {
  field: 'maybeEntry',
  key: 'id',
  childField: 'child',
})
// @ts-expect-error Additional parent-owned wrapper fields require Binding.init.
initAndSet(LabeledBinding, LabeledModel.make({ maybeEntry: Option.none() }), {
  key: firstId,
  args: [1],
})

const ArrayModel = Schema.Struct({ entries: Schema.Array(LabeledEntry) })
const ArrayDefinition = Block.makeDefinition('RejectedOptionalSetArray', {
  Model: ArrayModel,
  Message: Message.defineMessageUnion({}),
})
const ArrayBinding = ArrayDefinition.makeBinding(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
})
// @ts-expect-error Array storage is not a singular replacement target.
initAndSet(ArrayBinding, ArrayModel.make({ entries: [] }), {
  key: firstId,
  args: [1],
})

const recipe = setEntry(model, firstId, 1)
const MissingComposition = ParentDefinition.makeComposition()
const missingUpdate = MissingComposition.makeUpdate({
  RequestedSet: () => recipe,
})
// @ts-expect-error The helper preserves its exact Binding registration.
MissingComposition.prepareBlock({
  init: MissingComposition.makeInit(() => ({ model })),
  update: missingUpdate,
})
const broadBinding: Block.AnyBinding = EntryBinding
// @ts-expect-error Broad Binding types do not preserve one exact wrapper.
initAndSet(broadBinding, model, { key: firstId, args: [1] })
