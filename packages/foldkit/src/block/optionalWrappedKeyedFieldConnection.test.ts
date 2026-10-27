import {
  Array,
  Context,
  Effect,
  Option,
  Predicate,
  Schema,
  Scope,
  Tuple,
} from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { makeCompositionRuntime } from '../runtime/compositionRuntime.js'
import type {
  ResolvedSlowPhaseConfig,
  SlowSubscriptionDependenciesContext,
} from '../runtime/slowPhase.js'
import { modifyFields } from '../struct/index.js'
import { makeDefinition } from './define.js'
import { CurrentInstance } from './instanceContext.js'
import { normalizeKeyedFieldConfig } from './keyedFieldConnection.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const Entry = Schema.Struct({
  id: Schema.String,
  child: ChildModel,
  label: Schema.String,
})
const ParentModel = Schema.Struct({ maybeEntry: Schema.Option(Entry) })

const normalized = normalizeKeyedFieldConfig({
  Model: ParentModel,
  ChildModel,
  field: 'maybeEntry',
  key: 'id',
  childField: 'child',
  toParentMessage: (id: string, message: unknown) => ({ id, message }),
})

if (!Predicate.isObject(normalized)) {
  throw new Error('Expected a normalized keyed field configuration.')
}

const readAll = Reflect.get(normalized, 'readAll')
const keyOf = Reflect.get(normalized, 'key')
const writeAt = Reflect.get(normalized, 'writeAt')
if (
  !Predicate.isFunction(readAll) ||
  !Predicate.isFunction(keyOf) ||
  !Predicate.isFunction(writeAt)
) {
  throw new Error('Expected normalized keyed field accessors.')
}

const noneModel = ParentModel.make({ maybeEntry: Option.none() })
const firstEntry = Entry.make({
  id: 'first',
  child: ChildModel.make({ count: 1 }),
  label: 'First',
})
const firstModel = ParentModel.make({ maybeEntry: Option.some(firstEntry) })

it('lowers Option wrapper storage to zero or one keyed occurrences', () => {
  expect(Reflect.apply(readAll, undefined, [noneModel])).toEqual([])
  expect(Reflect.apply(readAll, undefined, [firstModel])).toEqual([firstEntry])
})

it('replaces only a matching wrapper child and preserves absent or different keys', () => {
  const nextChild = ChildModel.make({ count: 2 })

  expect(
    Reflect.apply(writeAt, undefined, [noneModel, 'first', nextChild]),
  ).toBe(noneModel)
  expect(
    Reflect.apply(writeAt, undefined, [firstModel, 'second', nextChild]),
  ).toBe(firstModel)
  expect(
    Reflect.apply(writeAt, undefined, [firstModel, 'first', nextChild]),
  ).toEqual(
    ParentModel.make({
      maybeEntry: Option.some(
        Entry.make({ id: 'first', child: nextChild, label: 'First' }),
      ),
    }),
  )
})

const OptionalKeyEntry = Schema.Struct({
  id: Schema.optionalKey(Schema.String),
  child: ChildModel,
})
const OptionalChildEntry = Schema.Struct({
  id: Schema.String,
  child: Schema.optionalKey(ChildModel),
})
const WrongKeyEntry = Schema.Struct({
  id: Schema.Boolean,
  child: ChildModel,
})
const MissingKeyEntry = Schema.Struct({ child: ChildModel })
const MissingChildEntry = Schema.Struct({ id: Schema.String })
const IncompatibleChildEntry = Schema.Struct({
  id: Schema.String,
  child: Schema.String,
})
const PrimaryEntry = Schema.Struct({
  _tag: Schema.Literal('Primary'),
  id: Schema.String,
  child: ChildModel,
})
const SecondaryEntry = Schema.Struct({
  _tag: Schema.Literal('Secondary'),
  id: Schema.String,
  child: ChildModel,
})
const InvalidParentModel = Schema.Struct({
  optionalStorage: Schema.optionalKey(Schema.Option(Entry)),
  optionalKey: Schema.Option(OptionalKeyEntry),
  optionalChild: Schema.Option(OptionalChildEntry),
  wrongKey: Schema.Option(WrongKeyEntry),
  missingKey: Schema.Option(MissingKeyEntry),
  missingChild: Schema.Option(MissingChildEntry),
  incompatibleChild: Schema.Option(IncompatibleChildEntry),
  ambiguous: Schema.Option(Schema.Union([PrimaryEntry, SecondaryEntry])),
})
const normalizeErased = (
  Model: unknown,
  field: string,
  key: string = 'id',
  childField: string = 'child',
  extra: globalThis.Record<string, unknown> = {},
) =>
  normalizeKeyedFieldConfig({
    Model,
    ChildModel,
    field,
    key,
    childField,
    toParentMessage: () => ({}),
    ...extra,
  })

it('rejects invalid Option wrapper Schemas and mixed erased configs', () => {
  expect(() => normalizeErased(InvalidParentModel, 'optionalStorage')).toThrow(
    'requires a required Schema.Array of declared Struct wrappers or a required Schema.Option',
  )
  expect(() => normalizeErased(InvalidParentModel, 'optionalKey')).toThrow(
    'key field must be required',
  )
  expect(() => normalizeErased(InvalidParentModel, 'missingKey')).toThrow(
    'select a declared wrapper key field',
  )
  expect(() => normalizeErased(InvalidParentModel, 'wrongKey')).toThrow(
    'key field Schema must decode to a string or number',
  )
  expect(() => normalizeErased(InvalidParentModel, 'optionalChild')).toThrow(
    'childField must be required',
  )
  expect(() => normalizeErased(InvalidParentModel, 'missingChild')).toThrow(
    'select a declared childField',
  )
  expect(() =>
    normalizeErased(InvalidParentModel, 'incompatibleChild'),
  ).toThrow('childField must be required')
  expect(() => normalizeErased(InvalidParentModel, 'ambiguous')).toThrow(
    'requires a required Schema.Array of declared Struct wrappers or a required Schema.Option',
  )
  expect(() =>
    normalizeErased(ParentModel, 'maybeEntry', 'id', 'child', {
      readAll: () => [],
    }),
  ).toThrow('cannot also supply custom accessors')
  expect(() =>
    normalizeErased(ParentModel, 'maybeEntry', 'id', 'child', {
      init: { instances: () => [], toItem: () => ({}) },
    }),
  ).toThrow('parent owns its optional presence')
})

it('validates erased Option values before reading or writing them', () => {
  const invalidModel = { maybeEntry: undefined }
  const invalidKeyEntry = Entry.make({
    id: 'invalid',
    child: ChildModel.make({ count: 0 }),
    label: 'Invalid',
  })
  Reflect.set(invalidKeyEntry, 'id', Number.NaN)

  expect(() => Reflect.apply(readAll, undefined, [invalidModel])).toThrow(
    'must contain an Option Struct wrapper',
  )
  expect(() =>
    Reflect.apply(writeAt, undefined, [
      invalidModel,
      'first',
      ChildModel.make({ count: 2 }),
    ]),
  ).toThrow('must contain an Option Struct wrapper')
  expect(() => Reflect.apply(keyOf, undefined, [invalidKeyEntry])).toThrow(
    'requires string or finite number keys',
  )
})

const ChildMessage = defineMessageUnion({
  UpdatedCount: { count: Schema.Number },
  CompletedInitialization: { count: Schema.Number },
})
const Child = makeDefinition('OptionalWrappedKeyedChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const ChildComposition = Child.makeComposition()
const FinishInitialization = Child.makeCommand('FinishInitialization', {
  args: { count: Schema.Number },
  messages: [ChildMessage.CompletedInitialization],
  handler: function* () {
    return ({ count }) =>
      Effect.succeed(ChildMessage.CompletedInitialization({ count }))
  },
})
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((count: number) => ({
      model: ChildModel.make({ count }),
      commands: [FinishInitialization({ count })],
    })),
    update: ChildComposition.makeUpdate({
      UpdatedCount: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
      CompletedInitialization: (model, { count }) => ({
        model: modifyFields(model, { count: () => count }),
      }),
    }),
    operations: {
      setCount: (count: number) =>
        Tuple.make(ChildMessage.UpdatedCount({ count })),
    },
    EffectsLayer: FinishInitialization.layer,
  })
const ChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)
const ParentMessage = defineMessageUnion({
  IgnoredChildMessage: {},
  RequestedSetCount: { id: Schema.String, count: Schema.Number },
})
const Parent = makeDefinition('OptionalWrappedKeyedParent', {
  Model: ParentModel,
  Message: ParentMessage,
})
const ChildBinding = Parent.makeBinding(ChildBlock, {
  field: 'maybeEntry',
  key: 'id',
  childField: 'child',
})
const ParentComposition = Parent.makeComposition({ bindings: [ChildBinding] })
const prepareParentBlock = () =>
  ParentComposition.prepareBlock({
    init: ParentComposition.makeInit(() => ({ model: noneModel })),
    update: ParentComposition.makeUpdate({
      IgnoredChildMessage: model => Parent.makeNoopStep()(model),
      RequestedSetCount: (model, { id, count }) =>
        ChildBinding.setCount(id, count)(model),
    }),
    operations: {
      setCount: (id: string, count: number) =>
        Tuple.make(ParentMessage.RequestedSetCount({ id, count })),
    },
  })
const ParentBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ParentModel,
  typeof prepareParentBlock
> = Block.assemble(prepareParentBlock)

it('infers the wrapper key and keeps the child Block identity as placement', () => {
  expectTypeOf(
    ChildBinding.placement,
  ).toEqualTypeOf<'OptionalWrappedKeyedChild'>()
  expect(ChildBinding.placement).toBe('OptionalWrappedKeyedChild')
})

it('keeps keyed dynamic initialization and lifts its Commands', () => {
  const init = ParentComposition.makeInit(() =>
    ChildBinding.init({
      key: 'created',
      args: [4],
      toParentModel: child =>
        ParentModel.make({
          maybeEntry: Option.some(
            Entry.make({ id: 'created', child, label: 'Created' }),
          ),
        }),
    }),
  )
  const initialized = init()
  const command = Option.getOrThrow(Array.head(initialized.commands!))

  expect(initialized.model).toEqual(
    ParentModel.make({
      maybeEntry: Option.some(
        Entry.make({
          id: 'created',
          child: ChildModel.make({ count: 4 }),
          label: 'Created',
        }),
      ),
    }),
  )
  expect(command.name).toBe(
    'OptionalWrappedKeyedChild["created"]/FinishInitialization',
  )
})

it('folds generated Messages and exposed operations only into a matching Option wrapper', () => {
  const updated = ParentBlock.update(firstModel, {
    _tag: 'GotOptionalWrappedKeyedChildMessage',
    placement: 'OptionalWrappedKeyedChild',
    generation: 0,
    key: 'first',
    message: ChildMessage.UpdatedCount({ count: 3 }),
  })
  const absent = ParentBlock.update(noneModel, {
    _tag: 'GotOptionalWrappedKeyedChildMessage',
    placement: 'OptionalWrappedKeyedChild',
    generation: 0,
    key: 'first',
    message: ChildMessage.UpdatedCount({ count: 3 }),
  })
  const absentOperation = ParentBlock.operations.setCount(noneModel, 'first', 3)
  const differentKeyOperation = ParentBlock.operations.setCount(
    firstModel,
    'second',
    3,
  )

  expect(updated.model).toEqual(
    ParentModel.make({
      maybeEntry: Option.some(
        Entry.make({
          id: 'first',
          child: ChildModel.make({ count: 3 }),
          label: 'First',
        }),
      ),
    }),
  )
  expect(absent.model).toBe(noneModel)
  expect(absentOperation.model).toBe(noneModel)
  expect(differentKeyOperation.model).toBe(firstModel)
})

it('reconciles A to B to A with a fresh generation and rejects the stale origin', async () => {
  const maybeSlowSubscriptionDependencies: Option.Option<
    ResolvedSlowPhaseConfig<
      SlowSubscriptionDependenciesContext<typeof ParentModel.Type>
    >
  > = Option.none()

  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        const runtimeScope = yield* Scope.Scope
        const runtime = yield* makeCompositionRuntime({
          block: ParentBlock,
          initModel: firstModel,
          context: Context.empty(),
          runtimeScope,
          enqueueMessage: () => {},
          crashWith: cause => Effect.failCause(cause),
          maybeSlowSubscriptionDependencies,
        })
        yield* runtime.start

        const rootNode = Context.get(runtime.context, CurrentInstance)!.node
        const firstNode = rootNode.children.get(ChildBinding)!.get('first')!
        const toRootMessage = Reflect.get(firstNode, 'toRootMessage')
        const staleMessage = Reflect.apply(toRootMessage, firstNode, [
          ChildMessage.UpdatedCount({ count: 9 }),
        ])
        expect(runtime.externalMessageGuard(staleMessage)?.()).toBe(true)

        runtime.synchronize(
          ParentModel.make({
            maybeEntry: Option.some(
              Entry.make({
                id: 'second',
                child: ChildModel.make({ count: 2 }),
                label: 'Second',
              }),
            ),
          }),
        )
        expect(runtime.externalMessageGuard(staleMessage)).toBeUndefined()

        runtime.synchronize(firstModel)
        const replacementNode = rootNode.children
          .get(ChildBinding)!
          .get('first')!

        expect(replacementNode.generation).not.toBe(firstNode.generation)
        expect(runtime.externalMessageGuard(staleMessage)).toBeUndefined()
      }),
    ),
  )
})
