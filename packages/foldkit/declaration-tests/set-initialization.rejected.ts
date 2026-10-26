import { Array, Option, Schema, Tuple } from 'effect'
import { Block, Message, Struct } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'

import {
  BaseRequiredBinding,
  ChildBlock,
  OptionalBinding,
  ParentDefinition,
  ParentMessage,
  ParentModel,
  ProjectedBinding,
  RequiredBinding,
  model,
  setRequired,
} from './set-initialization.accepted.js'

// @ts-expect-error The first child init argument is required.
initAndSet(RequiredBinding, model, { args: [] })
// @ts-expect-error The required child init argument remains numeric.
initAndSet(RequiredBinding, model, { args: ['wrong'] })
// @ts-expect-error Optional and rest child init arguments remain strings.
initAndSet(RequiredBinding, model, { args: [1, 'valid', 2] })
initAndSet(
  RequiredBinding,
  // @ts-expect-error The complete parent Model is required.
  { requiredChild: model.requiredChild },
  { args: [1] },
)
const commandsConfig = {
  args: Tuple.make(1),
  commands: Array.empty(),
}
// @ts-expect-error An aliased config cannot add parent Commands.
initAndSet(RequiredBinding, model, commandsConfig)
const writerConfig = {
  args: Tuple.make(1),
  toParentModel: () => model,
}
// @ts-expect-error An aliased config cannot provide a parent writer.
initAndSet(RequiredBinding, model, writerConfig)
const keyedConfig = { args: Tuple.make(1), key: 'child' }
// @ts-expect-error Singular replacement does not accept an occurrence key.
initAndSet(RequiredBinding, model, keyedConfig)

const recipe = setRequired(model, 1)
// @ts-expect-error The recipe remains passive and noncallable.
recipe(model)
// @ts-expect-error The recipe does not expose a Model.
recipe.model
// @ts-expect-error The recipe does not expose Commands.
recipe.commands

const MissingComposition = ParentDefinition.makeComposition()
const missingUpdate = MissingComposition.makeUpdate({
  RequestedSet: model => setRequired(model, 1),
})
// @ts-expect-error The helper preserves its exact Binding registration.
MissingComposition.prepareBlock({
  init: MissingComposition.makeInit(() => ({ model })),
  update: missingUpdate,
})
const ForeignBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'foreign',
  field: 'requiredChild',
  init: { contextToArgs: () => [0] },
}).withOutMessagePolicy({ fold: () => ParentDefinition.makeNoopStep() })
const ForeignComposition = ParentDefinition.makeComposition({
  bindings: [ForeignBinding],
})
const foreignUpdate = ForeignComposition.makeUpdate({
  RequestedSet: model => setRequired(model, 1),
})
// @ts-expect-error A sibling Binding does not satisfy the recipe registration.
ForeignComposition.prepareBlock({
  init: ForeignComposition.makeInit(() => ({
    model: {
      maybeChild: model.maybeChild,
      projectedChild: model.projectedChild,
      defaultChild: model.defaultChild,
      label: model.label,
    },
  })),
  update: foreignUpdate,
})

type RequiredRecipeWithoutServices = Block.BindingInitRecipe<
  typeof ParentModel.Type,
  typeof ParentMessage.Type,
  never,
  Block.RequirementOfBinding<typeof RequiredBinding>
>
// @ts-expect-error Child initialization Command Services remain required.
const recipeWithoutServices: RequiredRecipeWithoutServices = recipe
void recipeWithoutServices

const NoPolicyAccessorBinding = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'noPolicyAccessor',
  read: model => Option.some(model.projectedChild),
  write: (model, nextChild) =>
    Struct.modifyFields(model, { projectedChild: () => nextChild }),
})
// @ts-expect-error An accessor without init.toParentFields has no replacement policy.
initAndSet(NoPolicyAccessorBinding, model, { args: [1] })

const Entry = Schema.Struct({ id: Schema.String, child: ChildBlock.Model })
const KeyedModel = Schema.Struct({ entries: Schema.Array(Entry) })
const KeyedDefinition = Block.makeDefinition('RejectedSetKeyedParent', {
  Model: KeyedModel,
  Message: Message.defineMessageUnion({}),
})
const KeyedBinding = KeyedDefinition.makeBinding(ChildBlock, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  init: {
    instances: () => [],
    toItem: ({ key }, child) => ({ id: key, child }),
  },
})
// @ts-expect-error Keyed storage is not a singular replacement target.
initAndSet(KeyedBinding, KeyedModel.make({ entries: [] }), { args: [1] })
const GeneralKeyedBinding = KeyedDefinition.makeBinding(ChildBlock, {
  readAll: model => model.entries,
  key: entry => entry.id,
  read: entry => entry.child,
  writeAt: model => model,
  keySchema: Schema.String,
})
// @ts-expect-error General keyed accessors are not singular replacement targets.
initAndSet(GeneralKeyedBinding, KeyedModel.make({ entries: [] }), { args: [1] })

const selectedUnion = Math.random() > 0.5 ? RequiredBinding : OptionalBinding
// @ts-expect-error One concrete Binding determines one field and registration.
initAndSet(selectedUnion, model, { args: [1] })
const projectedUnion =
  Math.random() > 0.5 ? BaseRequiredBinding : ProjectedBinding
// @ts-expect-error A union of direct and projected policies is not one concrete Binding.
initAndSet(projectedUnion, model, { args: [1] })
const broadBinding: Block.AnyBinding = RequiredBinding
// @ts-expect-error Broad Binding types do not preserve one initialization policy.
initAndSet(broadBinding, model, { args: [1] })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyBinding: any = RequiredBinding
// @ts-expect-error Erased any Bindings cannot establish replacement evidence.
initAndSet(anyBinding, model, { args: [1] })
