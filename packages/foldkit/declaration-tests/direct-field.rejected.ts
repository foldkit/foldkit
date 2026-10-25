import { Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'

import {
  ArrayChildModel,
  ChildMessage,
  ChildModel,
  CustomIgnoredMessageBinding,
  InitializedArgumentBinding,
  InitializedOptionalBinding,
  NestedOptionChildModel,
  ParentDefinition,
  ParentMessage,
  RequiredBinding,
  argumentChildBlock,
  arrayChildBlock,
  childBlock,
  initialize,
  nestedOptionChildBlock,
} from './direct-field.accepted.js'

// @ts-expect-error Missing parent fields are rejected.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: 'missing' })

const InvalidModel = Schema.Struct({
  number: Schema.Number,
  wrongOption: Schema.Option(Schema.String),
  nullable: Schema.NullOr(ChildModel),
  optional: Schema.optionalKey(ChildModel),
  wider: Schema.Struct({ count: Schema.Union([Schema.Number, Schema.String]) }),
  narrower: Schema.Struct({ count: Schema.Literal(1) }),
  extended: Schema.Struct({
    count: Schema.Number,
    extra: Schema.optionalKey(Schema.String),
  }),
  suspendedWrongOption: Schema.suspend(() => Schema.Option(Schema.String)),
  nestedTooDeep: Schema.Option(Schema.Option(NestedOptionChildModel)),
  arrayChildren: Schema.Array(ArrayChildModel),
  wrongArrayChild: Schema.Array(Schema.Number),
})
// eslint-disable-next-line foldkit/block-name-matches-variable
const InvalidDefinition = Block.makeDefinition('DeclaredInvalidFieldParent', {
  Model: InvalidModel,
  Message: ParentMessage,
})
// @ts-expect-error A primitive field cannot store this Child Model.
// oxfmt-ignore
InvalidDefinition.makeBinding(childBlock, { field: 'number' })
// @ts-expect-error An Option must contain the exact Child Model.
// oxfmt-ignore
InvalidDefinition.makeBinding(childBlock, { field: 'wrongOption' })
// @ts-expect-error Null is not optional-child storage.
// oxfmt-ignore
InvalidDefinition.makeBinding(childBlock, { field: 'nullable' })
// @ts-expect-error A missing property is not Option storage.
// oxfmt-ignore
InvalidDefinition.makeBinding(childBlock, { field: 'optional' })
// @ts-expect-error Wider child payloads are not exact storage.
// oxfmt-ignore
InvalidDefinition.makeBinding(childBlock, { field: 'wider' })
// @ts-expect-error Narrower storage cannot accept every child transition.
// oxfmt-ignore
InvalidDefinition.makeBinding(childBlock, { field: 'narrower' })
// @ts-expect-error The child may not discard extra optional fields.
// oxfmt-ignore
InvalidDefinition.makeBinding(childBlock, { field: 'extended' })
// @ts-expect-error A suspended Option must still contain the exact Child Model.
// oxfmt-ignore
InvalidDefinition.makeBinding(childBlock, { field: 'suspendedWrongOption' })
// @ts-expect-error Optional storage adds exactly one Option around the Child Model.
// oxfmt-ignore
InvalidDefinition.makeBinding(nestedOptionChildBlock, { field: 'nestedTooDeep' })
// @ts-expect-error An array of Array child Models is keyed storage and requires a key field.
// oxfmt-ignore
InvalidDefinition.makeBinding(arrayChildBlock, { field: 'arrayChildren' })
// @ts-expect-error A static Array child field must have the exact Array element type.
// oxfmt-ignore
InvalidDefinition.makeBinding(arrayChildBlock, { field: 'wrongArrayChild' })
// @ts-expect-error Direct storage cannot also provide a custom reader.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: 'maybeChild', read: () => Option.none() })
// @ts-expect-error Direct storage cannot also provide a custom writer.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: 'maybeChild', write: model => model })
// @ts-expect-error Static direct fields cannot supply keyed adapters.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: 'maybeChild', readAll: () => [] })
// @ts-expect-error Field selectors cannot coexist with arbitrary accessors.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: 'child', read: model => Option.some(model.child), write: model => model })
// @ts-expect-error Custom readers already own child presence.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { presentWhen: () => true, read: model => Option.some(model.child), write: model => model })
// @ts-expect-error Presence predicates use the owning parent Model.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: 'child', presentWhen: (model: { wrong: boolean }) => model.wrong })
// @ts-expect-error Presence predicates must return boolean.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: 'child', presentWhen: () => 'Home' })
// @ts-expect-error Authored parent Message constructors are no longer Binding configuration.
ParentDefinition.makeBinding(childBlock, {
  field: 'maybeChild',
  parentMessage: ParentMessage.IgnoredChildMessage,
})
// @ts-expect-error Authored child-to-parent Message mappers are no longer Binding configuration.
ParentDefinition.makeBinding(childBlock, {
  field: 'maybeChild',
  toParentMessage: () => ParentMessage.IgnoredChildMessage(),
})
// @ts-expect-error Authored parent-to-child Message routes are no longer Binding configuration.
ParentDefinition.makeBinding(childBlock, {
  field: 'maybeChild',
  fromParentMessage: {
    parentMessage: ParentMessage.IgnoredChildMessage,
    args: () => Option.some([ChildMessage.UpdatedCount({ count: 1 })]),
  },
})

const repeatedModelConfig: Readonly<{
  field: 'child'
  Model: typeof Schema.String
}> = {
  field: 'child',
  Model: Schema.String,
}
// @ts-expect-error Assigned configs cannot override the owning Definition's Model.
ParentDefinition.makeBinding(childBlock, repeatedModelConfig)

// @ts-expect-error init true is reserved for a child init callable with no required arguments.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { field: 'argumentChild', init: true })
// @ts-expect-error initial was replaced by init.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: 'child', initial: true })
// @ts-expect-error Required child storage requires the exact child init argument tuple.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { field: 'argumentChild', init: { contextToArgs: () => ['wrong'] } })
// @ts-expect-error Required child storage does not accept an optional argument tuple.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { field: 'argumentChild', init: { contextToArgs: () => Option.some([1]) } })
// @ts-expect-error Optional child storage requires an Option of the exact child init argument tuple.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { field: 'maybeArgumentChild', init: { contextToArgs: () => [1] } })
// @ts-expect-error An accessor Binding init policy requires a model projection.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { read: model => Option.some(model.argumentChild), write: (model, nextChild) => ({ ...model, argumentChild: nextChild }), init: { contextToArgs: () => [1] } })

// @ts-expect-error An accessor Binding init projection must use a declared exact child Model field.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { read: model => Option.some(model.argumentChild), write: (model, nextChild) => ({ ...model, argumentChild: nextChild }), init: { contextToArgs: () => [1], toParentFields: childModel => ({ route: childModel }) } })

// @ts-expect-error An accessor Binding init projection cannot use Option child storage.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { read: model => Option.some(model.argumentChild), write: (model, nextChild) => ({ ...model, argumentChild: nextChild }), init: { contextToArgs: () => [1], toParentFields: childModel => ({ maybeArgumentChild: Option.some(childModel) }) } })

// @ts-expect-error An accessor Binding init projection contributes exactly one parent Model field.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { read: model => Option.some(model.argumentChild), write: (model, nextChild) => ({ ...model, argumentChild: nextChild }), init: { contextToArgs: () => [1], toParentFields: childModel => ({ argumentChild: childModel, child: childModel }) } })

// @ts-expect-error An accessor Binding init projection cannot contribute an undeclared field.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { read: model => Option.some(model.argumentChild), write: (model, nextChild) => ({ ...model, argumentChild: nextChild }), init: { contextToArgs: () => [1], toParentFields: childModel => ({ argumentChild: childModel, undeclared: childModel }) } })

// @ts-expect-error init.model was replaced by init.toParentFields.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { read: model => Option.some(model.argumentChild), write: (model, nextChild) => ({ ...model, argumentChild: nextChild }), init: { contextToArgs: () => [1], model: childModel => ({ argumentChild: childModel }) } })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const returnAny = (): any => [1]
// @ts-expect-error An init argument resolver cannot return any.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { field: 'argumentChild', init: { contextToArgs: returnAny } })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resolverAny: any = () => [1]
// @ts-expect-error An init argument resolver cannot itself be any.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { field: 'argumentChild', init: { contextToArgs: resolverAny } })

// @ts-expect-error An init argument resolver context cannot be never.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { field: 'argumentChild', init: { contextToArgs: (_context: never) => [1] } })

const genericResolver = <Context extends Readonly<{ count: number }>>(
  context: Context,
): readonly [number] => [context.count]
// @ts-expect-error An init argument resolver must have one concrete call signature.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { field: 'argumentChild', init: { contextToArgs: genericResolver } })

const concreteResolver = (
  context: Readonly<{ count: number }>,
): readonly [number] => [context.count]
function overloadedResolver(): ReturnType<typeof concreteResolver>
function overloadedResolver(
  context: Readonly<{ count: number }>,
): ReturnType<typeof concreteResolver>
function overloadedResolver(
  context?: Readonly<{ count: number }>,
): readonly [number] {
  return [context?.count ?? 0]
}
// @ts-expect-error An init argument resolver must not be overloaded.
// oxfmt-ignore
ParentDefinition.makeBinding(argumentChildBlock, { field: 'argumentChild', init: { contextToArgs: overloadedResolver } })

const selectInitializedField = (): 'child' | 'argumentChild' => 'child'
// @ts-expect-error An initialized direct Binding requires one literal parent field.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: selectInitializedField(), init: true })

const selectInitialPolicy = ():
  | true
  | Readonly<{ contextToArgs: () => readonly [] }> => true
// @ts-expect-error An initialized direct Binding requires one concrete init policy.
// oxfmt-ignore
ParentDefinition.makeBinding(childBlock, { field: 'child', init: selectInitialPolicy() })

const UnregisteredComposition = ParentDefinition.makeComposition({
  bindings: [
    RequiredBinding,
    InitializedArgumentBinding,
    InitializedOptionalBinding,
    CustomIgnoredMessageBinding,
  ],
})
UnregisteredComposition.prepareBlock({
  // @ts-expect-error An initializer retains registration evidence for its initialized child graph.
  init: initialize,
  update: UnregisteredComposition.makeUpdate({
    IgnoredChildMessage: model => ({ model }),
  }),
  EffectsLayer: Layer.empty,
})
