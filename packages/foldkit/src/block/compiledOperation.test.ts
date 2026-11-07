import { Effect, Layer, Schema } from 'effect'
import assert from 'node:assert/strict'
import { expectTypeOf, it } from 'vitest'

import type * as Command from '../command/index.js'
import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import {
  type InputOperationResult,
  assertCompiledOperationSource,
  isCompiledOperation,
  makeCompiledOperation,
  registerCompiledOperationSource,
} from './compiledOperation.js'
import { makeDefinition } from './define.js'
import type { ResolvedAuthoredOutput } from './delivery.js'
import {
  type FromAssemblyWithOutMessage,
  type FromAssemblyWithoutViewOrOutMessage,
  assemble,
} from './fromAssembly.js'
import { LocalMountsTypeId } from './identity.js'
import type {
  OperationRequirementsOfBlock,
  ValidateComposition,
  ValidateImplementationComposition,
} from './requirements.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type

it('registers a passive executor while preserving its complete callable contract', () => {
  const source = { key: Symbol('CompiledOperationSource') }
  let executionCount = 0
  const execute = (
    model: Model,
    payload: Readonly<{ amount: number }>,
    label = 'Count',
    ...suffixes: ReadonlyArray<string>
  ) => {
    executionCount += 1

    return {
      model: Model.make({ count: model.count + payload.amount }),
      label: `${label}${suffixes.join('')}`,
    }
  }

  const operation = makeCompiledOperation(source, execute)

  expectTypeOf(operation).parameters.toEqualTypeOf<Parameters<typeof execute>>()
  expectTypeOf(operation).returns.toEqualTypeOf<ReturnType<typeof execute>>()
  assert.equal(operation, execute)
  assert.equal(executionCount, 0)
  assert.equal(isCompiledOperation(operation), true)
  assert.doesNotThrow(() => assertCompiledOperationSource(operation, source))

  assert.deepEqual(operation(Model.make({ count: 2 }), { amount: 3 }), {
    model: Model.make({ count: 5 }),
    label: 'Count',
  })
  assert.equal(executionCount, 1)
})

it('rejects a different Composition and preserves the original registration', () => {
  const source = { key: Symbol('CompiledOperationSource') }
  const otherSource = { key: Symbol('CompiledOperationSource') }
  const execute = (model: Model) => ({ model })
  const operation = makeCompiledOperation(source, execute)

  assert.throws(
    () => assertCompiledOperationSource(operation, otherSource),
    /another Composition/,
  )
  assert.throws(
    () => makeCompiledOperation(otherSource, execute),
    /another Composition/,
  )
  assert.doesNotThrow(() => assertCompiledOperationSource(operation, source))
  assert.equal(makeCompiledOperation(source, execute), operation)
})

it('rejects unauthenticated ordinary functions', () => {
  const source = { key: Symbol('CompiledOperationSource') }
  const ordinary = (model: Model) => ({ model })

  assert.equal(isCompiledOperation(ordinary), false)
  assert.equal(isCompiledOperation({}), false)
  assert.throws(
    () => assertCompiledOperationSource(ordinary, source),
    /another Composition/,
  )
  assert.throws(
    () => Reflect.apply(assertCompiledOperationSource, undefined, [ordinary]),
    /another Composition/,
  )
  assert.throws(
    () =>
      Reflect.apply(makeCompiledOperation, undefined, [undefined, ordinary]),
    /original Composition/,
  )
})

it('recognizes an original authoring wrapper without allowing its source to change', () => {
  const source = { key: Symbol('CompiledOperationSource') }
  const alias = { key: source.key }
  const otherSource = { key: source.key }
  registerCompiledOperationSource(alias, source)
  const operation = makeCompiledOperation(alias, (model: Model) => ({ model }))

  assert.doesNotThrow(() => assertCompiledOperationSource(operation, alias))
  assert.doesNotThrow(() => assertCompiledOperationSource(operation, source))
  assert.doesNotThrow(() => registerCompiledOperationSource(alias, source))
  assert.throws(
    () => registerCompiledOperationSource(alias, otherSource),
    /source cannot be changed/,
  )
  assert.throws(
    () => registerCompiledOperationSource(source, otherSource),
    /source cannot be changed/,
  )
  assert.throws(
    () => assertCompiledOperationSource(operation, otherSource),
    /another Composition/,
  )
})

it('completes a pure input executor beside unchanged constructor and tuple aliases', () => {
  const Message = defineMessageUnion({ Added: { amount: Schema.Number } })
  const OutMessage = defineMessageUnion({
    ChangedCount: { count: Schema.Number },
  })
  const Definition = makeDefinition('CompletedCompiledOperation', {
    Model,
    Message,
    OutMessage,
  })
  const Composition = Definition.makeComposition()
  let executionCount = 0
  const execute = (model: Model, count: number, suffix = 'Count') => {
    executionCount += 1

    return {
      model: modifyFields(model, { count: () => count }),
      outMessage: OutMessage.ChangedCount({ count }),
      suffix,
    }
  }
  const prepare = () =>
    Composition.prepareBlock({
      init: Composition.makeInit(() => ({ model: Model.make({ count: 0 }) })),
      update: Composition.makeUpdate({
        Added: (model, { amount }) => ({
          model: modifyFields(model, { count: count => count + amount }),
        }),
      }),
      operations: {
        requestSet: makeCompiledOperation(Composition, execute),
        requestAdd: Message.Added,
        requestAddFromAmount: (amount: number) => [Message.Added({ amount })],
      },
    })
  const block: FromAssemblyWithOutMessage<typeof Model, typeof prepare> =
    assemble(prepare)

  expectTypeOf(block.operations.requestSet).parameters.toEqualTypeOf<
    Parameters<typeof execute>
  >()
  expectTypeOf(block.operations.requestSet).returns.toEqualTypeOf<
    ReturnType<typeof execute>
  >()
  assert.equal(executionCount, 0)

  const setCount = block.operations.requestSet(block.init().model, 8)
  assert.equal(setCount.model.count, 8)
  assert.deepEqual(setCount.outMessage, OutMessage.ChangedCount({ count: 8 }))
  assert.equal(executionCount, 1)
  assert.equal(
    block.operations.requestAdd(setCount.model, { amount: 3 }).model.count,
    11,
  )
  assert.equal(
    block.operations.requestAddFromAmount(setCount.model, 4).model.count,
    12,
  )
})

it('rejects an input executor compiled for another graph under the same owner', () => {
  const Message = defineMessageUnion({ Ignored: {} })
  const Definition = makeDefinition('CompiledOperationGraphIdentity', {
    Model,
    Message,
  })
  const Composition = Definition.makeComposition()
  const otherComposition = Definition.makeComposition()
  const requestSet = makeCompiledOperation(
    Composition,
    (model: Model, count: number) => ({
      model: modifyFields(model, { count: () => count }),
    }),
  )

  assert.equal(Composition.owner, otherComposition.owner)
  assert.throws(
    () =>
      otherComposition.prepareBlock({
        init: otherComposition.makeInit(() => ({
          model: Model.make({ count: 0 }),
        })),
        update: otherComposition.makeUpdate({ Ignored: model => ({ model }) }),
        operations: { requestSet },
      }),
    /another Composition/,
  )
})

if (false) {
  const Model = Schema.Struct({ count: Schema.Number })
  type Model = typeof Model.Type
  const OtherModel = Schema.Struct({ count: Schema.String })
  type OtherModel = typeof OtherModel.Type
  const Message = defineMessageUnion({ Ignored: {}, CompletedRecord: {} })
  type Message = typeof Message.Type
  const OutMessage = defineMessageUnion({
    ChangedCount: { count: Schema.Number },
  })
  const ForeignMessage = defineMessageUnion({ CompletedForeignWork: {} })
  const ForeignOutMessage = defineMessageUnion({
    ChangedLabel: { label: Schema.String },
  })

  const Definition = makeDefinition('CheckedCompiledOperation', {
    Model,
    Message,
    OutMessage,
  })
  const Composition = Definition.makeComposition()
  const Record = Definition.makeCommand('Record', {
    messages: [Message.CompletedRecord],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedRecord())
    },
  })
  const ForeignDefinition = makeDefinition('CheckedCompiledOperationForeign', {
    Model,
    Message: ForeignMessage,
  })
  const RunForeignWork = ForeignDefinition.makeCommand('RunForeignWork', {
    messages: [ForeignMessage.CompletedForeignWork],
    handler: function* () {
      return () => Effect.succeed(ForeignMessage.CompletedForeignWork())
    },
  })
  const init = Composition.makeInit(() => ({ model: Model.make({ count: 0 }) }))
  const update = Composition.makeUpdate({
    Ignored: model => ({ model }),
    CompletedRecord: model => ({ model }),
  })
  const requestRecord = makeCompiledOperation(Composition, (model: Model) => ({
    model,
    commands: [Record()],
  }))
  const recordedImplementation = {
    init,
    update,
    operations: { requestRecord },
    EffectsLayer: Record.layer,
  }

  Composition.prepareBlock(recordedImplementation)
  expectTypeOf<
    Update.RequirementsOfResult<ReturnType<typeof requestRecord>>
  >().toEqualTypeOf<Command.HandlerOf<typeof Record>>()
  const prepareRecorded = () => Composition.prepareBlock(recordedImplementation)
  const recordedBlock: FromAssemblyWithOutMessage<
    typeof Model,
    typeof prepareRecorded
  > = assemble(prepareRecorded)
  expectTypeOf<
    OperationRequirementsOfBlock<typeof recordedBlock>
  >().toEqualTypeOf<Command.HandlerOf<typeof Record>>()

  const rejectUnauthenticatedResult = (
    requestRecord: InputOperationResult<
      ReturnType<typeof recordedBlock.operations.requestRecord>
    >,
  ) => {
    const unauthenticatedImplementation = {
      init,
      update,
      operations: { requestRecord },
      EffectsLayer: Record.layer,
    }

    // @ts-expect-error Result evidence alone is not an authenticated input executor.
    Composition.prepareBlock(unauthenticatedImplementation)
  }

  void rejectUnauthenticatedResult

  const missingHandlerImplementation = {
    ...recordedImplementation,
    EffectsLayer: Layer.empty,
  }

  // @ts-expect-error An input-only Command still requires its original handler.
  Composition.prepareBlock(missingHandlerImplementation)

  type FallbackMissingHandler = ValidateImplementationComposition<
    typeof Definition,
    typeof missingHandlerImplementation
  >
  type FullMissingHandler = ValidateComposition<
    typeof Definition,
    typeof missingHandlerImplementation
  >
  expectTypeOf<
    unknown extends FallbackMissingHandler ? false : true
  >().toEqualTypeOf<true>()
  expectTypeOf<
    unknown extends FullMissingHandler ? false : true
  >().toEqualTypeOf<true>()

  const wrongInputModel = {
    init,
    update,
    operations: {
      requestSet: makeCompiledOperation(Composition, (_model: OtherModel) => ({
        model: Model.make({ count: 0 }),
      })),
    },
  }

  // @ts-expect-error A compiled executor must accept the exact owning Model.
  Composition.prepareBlock(wrongInputModel)

  const wrongOutputModel = {
    init,
    update,
    operations: {
      requestSet: makeCompiledOperation(Composition, (_model: Model) => ({
        model: OtherModel.make({ count: 'wrong' }),
      })),
    },
  }

  // @ts-expect-error A compiled executor must return the owning Model.
  Composition.prepareBlock(wrongOutputModel)

  const wrongCommandMessage = {
    init,
    update,
    operations: {
      requestForeignWork: makeCompiledOperation(
        Composition,
        (model: Model) => ({
          model,
          commands: [RunForeignWork()],
        }),
      ),
    },
    EffectsLayer: RunForeignWork.layer,
  }

  // @ts-expect-error Receive Commands can return only local dispatch Messages.
  Composition.prepareBlock(wrongCommandMessage)

  const wrongOutMessage = {
    init,
    update,
    operations: {
      requestLabel: makeCompiledOperation(Composition, (model: Model) => ({
        model,
        outMessage: ForeignOutMessage.ChangedLabel({ label: 'wrong' }),
      })),
    },
  }

  // @ts-expect-error A compiled executor cannot introduce another OutMessage union.
  Composition.prepareBlock(wrongOutMessage)

  const erasedOutput = (_model: Model): any => {
    throw new Error('Only compile-time coverage invokes this executor.')
  }
  const erasedRequirements = (
    model: Model,
  ): Update.Return<Model, Message, unknown> => ({ model })
  const erasedModel = (_model: any): Readonly<{ model: Model }> => ({
    model: Model.make({ count: 0 }),
  })
  const erasedOutputImplementation = {
    init,
    update,
    operations: {
      requestAny: makeCompiledOperation(Composition, erasedOutput),
    },
  }
  const erasedRequirementsImplementation = {
    init,
    update,
    operations: {
      requestAny: makeCompiledOperation(Composition, erasedRequirements),
    },
  }
  const erasedModelImplementation = {
    init,
    update,
    operations: { requestAny: makeCompiledOperation(Composition, erasedModel) },
  }

  // @ts-expect-error A compiled executor cannot erase its complete result.
  Composition.prepareBlock(erasedOutputImplementation)
  // @ts-expect-error A compiled executor cannot erase its Command requirements.
  Composition.prepareBlock(erasedRequirementsImplementation)
  // @ts-expect-error A compiled executor cannot erase its Model input.
  Composition.prepareBlock(erasedModelImplementation)

  const ChildDefinition = makeDefinition('CheckedCompiledOperationChild', {
    Model,
    Message,
  })
  const ChildComposition = ChildDefinition.makeComposition()
  const prepareChild = () =>
    ChildComposition.prepareBlock({
      init: ChildComposition.makeInit(() => ({
        model: Model.make({ count: 0 }),
      })),
      update: ChildComposition.makeUpdate({
        Ignored: model => ({ model }),
        CompletedRecord: model => ({ model }),
      }),
      operations: {
        requestIncrement: makeCompiledOperation(
          ChildComposition,
          (model: Model) => ({
            model: modifyFields(model, { count: count => count + 1 }),
          }),
        ),
      },
    })
  const ChildBlock: FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepareChild
  > = assemble(prepareChild)
  const ParentModel = Schema.Struct({ child: Model })
  type ParentModel = typeof ParentModel.Type
  const ParentDefinition = makeDefinition('CheckedCompiledOperationParent', {
    Model: ParentModel,
    Message,
  })
  const ChildBinding = ParentDefinition.makeRequiredFieldBinding(ChildBlock, {
    field: 'child',
  })
  const RegisteredComposition = ParentDefinition.makeComposition({
    bindings: [ChildBinding],
  })
  const UnregisteredComposition = ParentDefinition.makeComposition()
  const registeredInit = RegisteredComposition.makeInit(() => ({
    model: {},
  }))
  const unregisteredInit = UnregisteredComposition.makeInit(() => ({
    model: ParentModel.make({ child: Model.make({ count: 0 }) }),
  }))
  const registeredUpdate = RegisteredComposition.makeUpdate({
    Ignored: model => ({ model }),
    CompletedRecord: model => ({ model }),
  })
  const unregisteredUpdate = UnregisteredComposition.makeUpdate({
    Ignored: model => ({ model }),
    CompletedRecord: model => ({ model }),
  })
  const receiveIncrement = (
    _model: ParentModel,
  ): ResolvedAuthoredOutput<
    ReturnType<ReturnType<typeof ChildBinding.requestIncrement>>,
    typeof RegisteredComposition.bindings
  > => {
    throw new Error('Only compile-time coverage invokes this receiver.')
  }
  const registeredInput = makeCompiledOperation(
    RegisteredComposition,
    receiveIncrement,
  )
  const receiveUnregisteredIncrement = (
    _model: ParentModel,
  ): ReturnType<typeof receiveIncrement> => {
    throw new Error('Only compile-time coverage invokes this receiver.')
  }
  const unregisteredInput = makeCompiledOperation(
    UnregisteredComposition,
    receiveUnregisteredIncrement,
  )

  RegisteredComposition.prepareBlock({
    init: registeredInit,
    update: registeredUpdate,
    operations: { requestIncrementChild: registeredInput },
  })

  const unregisteredChildImplementation = {
    init: unregisteredInit,
    update: unregisteredUpdate,
    operations: { requestIncrementChild: unregisteredInput },
  }

  // @ts-expect-error An input-only child operation requires its registered Binding.
  UnregisteredComposition.prepareBlock(unregisteredChildImplementation)

  type FallbackUnregisteredChild = ValidateImplementationComposition<
    typeof ParentDefinition,
    typeof unregisteredChildImplementation
  >
  type FastUnregisteredChild = ValidateImplementationComposition<
    typeof ParentDefinition,
    typeof unregisteredChildImplementation &
      Readonly<{
        [LocalMountsTypeId]: readonly []
        bindings: readonly []
        subscriptions: Readonly<Record<never, never>>
        managedResources: Readonly<Record<never, never>>
        EffectsLayer: typeof Layer.empty
        hostHandlers: readonly []
      }>
  >
  type FullUnregisteredChild = ValidateComposition<
    typeof ParentDefinition,
    typeof unregisteredChildImplementation
  >
  expectTypeOf<
    unknown extends FallbackUnregisteredChild ? false : true
  >().toEqualTypeOf<true>()
  expectTypeOf<
    unknown extends FastUnregisteredChild ? false : true
  >().toEqualTypeOf<true>()
  expectTypeOf<
    unknown extends FullUnregisteredChild ? false : true
  >().toEqualTypeOf<true>()
}
